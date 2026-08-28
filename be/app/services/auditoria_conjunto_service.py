"""
Módulo: services/auditoria_conjunto_service.py
Descripción: Lógica de negocio de la auditoría del Reciclador al conjunto
             (RQF-009) — validaciones y guardado de la foto de evidencia.
"""
import io
import uuid
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.administrador_conjunto import AdministradorConjunto
from app.models.administrador_conjunto_asignacion import AdministradorConjuntoAsignacion
from app.models.auditoria_conjunto import AuditoriaConjunto
from app.models.notificacion import Notificacion, NotificacionDestinatario
from app.models.reciclador import Reciclador
from app.models.residente import Residente
from app.models.rol import RolId
from app.models.tablas_asociacion import recicladores_conjuntos
from app.models.unidad import Unidad
from app.models.usuario import Usuario
from app.schemas.auditoria_conjunto import NivelDesempeno
from app.services.notificaciones_helpers import admins_del_conjunto, residentes_del_conjunto

# ¿Qué? Carpeta donde quedan las fotos de evidencia, servida luego como
#       archivos estáticos en /uploads (ver main.py).
# ¿Para qué? Primera vez que el backend guarda archivos subidos por un
#           usuario — antes todo el contenido educativo usaba solo links
#           externos (YouTube, PDFs), nunca un archivo propio.
CARPETA_EVIDENCIAS = Path(__file__).parent.parent / "uploads" / "evidencias-auditoria"

TIPOS_IMAGEN_PERMITIDOS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024  # 5 MB


def _obtener_reciclador(db: Session, id_usuario: UUID) -> Reciclador:
    reciclador = db.execute(select(Reciclador).where(Reciclador.id_usuario == id_usuario)).scalar_one_or_none()
    if reciclador is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes un perfil de reciclador.")
    return reciclador


def _verificar_autorizado(db: Session, id_reciclador: UUID, id_conjunto: UUID) -> None:
    autorizado = db.execute(
        select(recicladores_conjuntos).where(
            recicladores_conjuntos.c.id_reciclador == id_reciclador,
            recicladores_conjuntos.c.id_conjunto_residencial == id_conjunto,
        )
    ).first()
    if autorizado is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No estás autorizado en ese conjunto.",
        )


async def _guardar_evidencia(archivo: UploadFile) -> str:
    """
    ¿Qué? Valida tipo/tamaño de la foto y la guarda en disco con un nombre
          aleatorio (evita que dos recicladores pisen el archivo del otro
          si ambos suben algo llamado "foto.jpg").
    ¿Impacto? Devuelve la ruta PÚBLICA (para guardar en la BD y servir al
             frontend), no la ruta absoluta del servidor.
    """
    extension = TIPOS_IMAGEN_PERMITIDOS.get(archivo.content_type or "")
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La evidencia debe ser una imagen JPG, PNG o WEBP.",
        )

    contenido = await archivo.read()
    if len(contenido) > TAMANO_MAXIMO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La imagen no puede superar 5 MB.",
        )
    if len(contenido) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La imagen está vacía.")

    # ¿Qué? El "Content-Type" de arriba lo escribe el navegador del cliente —
    #       es solo una etiqueta, no una garantía de que el archivo sea de
    #       verdad una imagen. Aquí se intenta abrir el archivo con Pillow,
    #       que sí revisa el contenido real (la estructura interna del
    #       archivo), no la etiqueta que lo acompaña.
    # ¿Para qué? Sin este chequeo, alguien podía renombrar cualquier archivo
    #           (ej. HTML con un script) a ".jpg" y declarar Content-Type
    #           "image/jpeg" a mano, y el backend lo aceptaba igual.
    # ¿Impacto? Un archivo que no es una imagen real (aunque tenga la
    #           etiqueta correcta) se rechaza antes de guardarse en disco.
    try:
        Image.open(io.BytesIO(contenido)).verify()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo no es una imagen válida.",
        )

    CARPETA_EVIDENCIAS.mkdir(parents=True, exist_ok=True)
    nombre_archivo = f"{uuid.uuid4()}{extension}"
    (CARPETA_EVIDENCIAS / nombre_archivo).write_bytes(contenido)

    return f"/uploads/evidencias-auditoria/{nombre_archivo}"


async def crear_auditoria(
    db: Session,
    id_usuario_reciclador: UUID,
    id_conjunto_residencial: UUID,
    nivel_desempeno: NivelDesempeno,
    tema_educativo: str,
    descripcion: str | None,
    evidencia: UploadFile,
) -> AuditoriaConjunto:
    reciclador = _obtener_reciclador(db, id_usuario_reciclador)
    _verificar_autorizado(db, reciclador.id_reciclador, id_conjunto_residencial)

    ruta_evidencia = await _guardar_evidencia(evidencia)

    auditoria = AuditoriaConjunto(
        id_reciclador=reciclador.id_reciclador,
        id_conjunto_residencial=id_conjunto_residencial,
        nivel_desempeno=nivel_desempeno,
        tema_educativo=tema_educativo.strip(),
        descripcion=descripcion.strip() if descripcion else None,
        ruta_evidencia=ruta_evidencia,
    )
    db.add(auditoria)
    db.flush()  # ¿Para qué? Necesitamos auditoria.id_auditoria antes de crear la notificación.

    _notificar_auditoria_publicada(db, auditoria)

    db.commit()
    db.refresh(auditoria)
    return auditoria


def _notificar_auditoria_publicada(db: Session, auditoria: AuditoriaConjunto) -> None:
    """
    ¿Qué? Avisa a los residentes y al Admin de Conjunto que hay una
          auditoría nueva — reutiliza el sistema de notificaciones que ya
          existe (mismo patrón que LLEGADA_RECICLADOR, SHUT_LLENO, etc.),
          solo con un tipo nuevo.
    ¿Para qué? El frontend la muestra aparte de las notificaciones
              normales (issue #5: "que no se mezcle con las de siempre"),
              usando `id_referencia` para saber qué auditoría abrir con
              el botón "Ver" sin tener que adivinar por conjunto/fecha.
    ¿Impacto? El Reciclador que la envió nunca recibe esta notificación —
             ni residentes ni Admin de Conjunto lo incluyen como destinatario.
    """
    destinatarios = set(residentes_del_conjunto(db, auditoria.id_conjunto_residencial)) | set(
        admins_del_conjunto(db, auditoria.id_conjunto_residencial)
    )
    if not destinatarios:
        return

    notif = Notificacion(
        tipo="AUDITORIA_PUBLICADA",
        id_conjunto_residencial=auditoria.id_conjunto_residencial,
        id_referencia=auditoria.id_auditoria,
        mensaje="El reciclador auditó la separación de residuos de tu conjunto.",
    )
    db.add(notif)
    db.flush()
    for id_usuario in destinatarios:
        db.add(NotificacionDestinatario(id_notificacion=notif.id, id_usuario=id_usuario))


def _pertenece_al_conjunto(db: Session, current_user: Usuario, id_conjunto: UUID) -> bool:
    """
    ¿Qué? Un Residente pertenece al conjunto si su unidad está ahí; un
          Admin de Conjunto pertenece si tiene una asignación ACTIVA a ese
          conjunto (RQF-016: un admin ya desvinculado no debe poder ver
          las auditorías del conjunto que dejó).
    """
    if current_user.id_rol == RolId.RESIDENTE:
        stmt = (
            select(Residente.id_residente)
            .join(Unidad, Residente.id_unidad == Unidad.id_unidad)
            .where(Residente.id_usuario == current_user.id_usuario, Unidad.id_conjunto_residencial == id_conjunto)
        )
        return db.execute(stmt).first() is not None

    if current_user.id_rol == RolId.ADMIN_CONJUNTO:
        stmt = select(AdministradorConjuntoAsignacion).where(
            AdministradorConjuntoAsignacion.id_conjunto_residencial == id_conjunto,
            AdministradorConjuntoAsignacion.fecha_desvinculacion.is_(None),
            AdministradorConjuntoAsignacion.id_administrador
            == select(AdministradorConjunto.id_administrador)
            .where(AdministradorConjunto.id_usuario == current_user.id_usuario)
            .scalar_subquery(),
        )
        return db.execute(stmt).first() is not None

    return False


def obtener_por_id(db: Session, current_user: Usuario, id_auditoria: UUID) -> AuditoriaConjunto:
    """
    ¿Qué? El detalle completo de UNA auditoría — lo que abre el botón
          "Ver" de la notificación AUDITORIA_PUBLICADA.
    ¿Impacto? Solo puede verla un Residente o Admin de Conjunto que de
             verdad pertenezca a ese conjunto — sin esto, cualquiera con
             sesión podría ver auditorías de conjuntos ajenos adivinando ids.
    """
    auditoria = db.execute(
        select(AuditoriaConjunto).where(AuditoriaConjunto.id_auditoria == id_auditoria)
    ).scalar_one_or_none()
    if auditoria is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auditoría no encontrada.")

    if not _pertenece_al_conjunto(db, current_user, auditoria.id_conjunto_residencial):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No perteneces a ese conjunto.")

    return auditoria


def _conjuntos_del_usuario(db: Session, current_user: Usuario) -> list[int]:
    """
    ¿Qué? A qué conjunto(s) pertenece quien pregunta — un Residente vive en
          uno solo; un Admin de Conjunto puede administrar varios a la vez.
    ¿Para qué? Que el historial funcione para ambos roles sin que el
              frontend tenga que decirle al backend cuál conjunto — se
              resuelve solo, igual que ya hace `/notificaciones/estado-shut`
              para el Residente.
    """
    if current_user.id_rol == RolId.RESIDENTE:
        stmt = (
            select(Unidad.id_conjunto_residencial)
            .join(Residente, Unidad.id_unidad == Residente.id_unidad)
            .where(Residente.id_usuario == current_user.id_usuario)
        )
        id_conjunto = db.execute(stmt).scalar_one_or_none()
        return [id_conjunto] if id_conjunto is not None else []

    if current_user.id_rol == RolId.ADMIN_CONJUNTO:
        administrador = db.execute(
            select(AdministradorConjunto).where(AdministradorConjunto.id_usuario == current_user.id_usuario)
        ).scalar_one_or_none()
        if administrador is None:
            return []
        return [c.id_conjunto_residencial for c in administrador.conjuntos]

    return []


def listar_historial(db: Session, current_user: Usuario) -> list[AuditoriaConjunto]:
    """
    ¿Qué? Todas las auditorías de el/los conjunto(s) del usuario en sesión,
          más recientes primero — a diferencia de la notificación
          AUDITORIA_PUBLICADA (que se pierde al marcarla leída), esto queda
          siempre consultable.
    ¿Para qué? Issue #5: un Residente o Admin de Conjunto debe poder volver
              a ver auditorías pasadas, no solo la más reciente que le avisó
              una notificación.
    """
    ids_conjuntos = _conjuntos_del_usuario(db, current_user)
    if not ids_conjuntos:
        return []

    stmt = (
        select(AuditoriaConjunto)
        .where(AuditoriaConjunto.id_conjunto_residencial.in_(ids_conjuntos))
        # ¿Qué? Se desempata por id_auditoria (siempre creciente) además de
        #       created_at — dentro de una misma transacción, NOW() de
        #       Postgres devuelve el mismo valor para varias inserciones
        #       seguidas, así que created_at solo no basta para el orden.
        .order_by(AuditoriaConjunto.created_at.desc(), AuditoriaConjunto.id_auditoria.desc())
        .limit(50)
    )
    return list(db.execute(stmt).scalars().all())


def listar_mias(db: Session, id_usuario_reciclador: UUID) -> list[AuditoriaConjunto]:
    """¿Qué? Auditorías ya enviadas por este reciclador, más recientes primero.
    ¿Para qué? El frontend las usa para saber cuándo fue la última auditoría
              de cada conjunto y así mostrar (o no) el aviso de "ya puedes
              auditar de nuevo" (ver issue #5: cadencia semanal)."""
    reciclador = _obtener_reciclador(db, id_usuario_reciclador)
    stmt = (
        select(AuditoriaConjunto)
        .where(AuditoriaConjunto.id_reciclador == reciclador.id_reciclador)
        .order_by(AuditoriaConjunto.created_at.desc(), AuditoriaConjunto.id_auditoria.desc())
    )
    return list(db.execute(stmt).scalars().all())
