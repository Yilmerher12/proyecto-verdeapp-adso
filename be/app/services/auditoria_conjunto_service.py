"""
Módulo: services/auditoria_conjunto_service.py
Descripción: Lógica de negocio de la auditoría del Reciclador al conjunto
             (RQF-009) — validaciones y guardado de la foto de evidencia.
"""
import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
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
from app.services.notificaciones_helpers import admins_del_conjunto, reciclador_esta_presente, residentes_del_conjunto
from app.utils.imagenes import guardar_imagen_subida

# ¿Qué? Carpeta donde quedan las fotos de evidencia, servida luego como
#       archivos estáticos en /uploads (ver main.py).
# ¿Para qué? Primera vez que el backend guarda archivos subidos por un
#           usuario — antes todo el contenido educativo usaba solo links
#           externos (YouTube, PDFs), nunca un archivo propio.
CARPETA_EVIDENCIAS = Path(__file__).parent.parent / "uploads" / "evidencias-auditoria"


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
    """Valida y guarda una foto de evidencia — ver utils/imagenes.py para
    el detalle de la validación (reutilizada también por los adjuntos de
    comunicados/novedades, ver routers/uploads.py)."""
    return await guardar_imagen_subida(archivo, CARPETA_EVIDENCIAS, "/uploads/evidencias-auditoria")


MAXIMO_FOTOS_EVIDENCIA = 3
HORAS_ENTRE_AUDITORIAS = 24


def _ya_audito_recientemente(db: Session, id_reciclador: UUID, id_conjunto: UUID) -> bool:
    """¿Qué? CA-010.3 / RN-002 de RQF-009: un reciclador no puede calificar el
    mismo conjunto dos veces en menos de 24 horas.
    ¿Para qué? Antes de esto, un reciclador podía enviar auditorías
    repetidas del mismo conjunto sin ninguna restricción de tiempo."""
    limite = datetime.now(timezone.utc) - timedelta(hours=HORAS_ENTRE_AUDITORIAS)
    stmt = select(AuditoriaConjunto.id_auditoria).where(
        AuditoriaConjunto.id_reciclador == id_reciclador,
        AuditoriaConjunto.id_conjunto_residencial == id_conjunto,
        AuditoriaConjunto.created_at > limite,
    )
    return db.execute(stmt).first() is not None


async def crear_auditoria(
    db: Session,
    id_usuario_reciclador: UUID,
    id_conjunto_residencial: UUID,
    nivel_desempeno: NivelDesempeno,
    tema_educativo: str,
    descripcion: str | None,
    evidencias: list[UploadFile],
) -> AuditoriaConjunto:
    reciclador = _obtener_reciclador(db, id_usuario_reciclador)
    _verificar_autorizado(db, reciclador.id_reciclador, id_conjunto_residencial)

    # ¿Qué? Control de presencia (mismo concepto que ya se aplica a las
    #       notificaciones del reciclador, ver notificaciones_helpers.py) —
    #       auditar solo tiene sentido con el reciclador físicamente en el
    #       conjunto, no en cualquier momento.
    # ¿Para qué? Antes de esto, un reciclador podía auditar un conjunto sin
    #           haber avisado su llegada — el único candado era el de 24h
    #           de abajo, sin relación con si de verdad estaba ahí.
    if not reciclador_esta_presente(db, id_conjunto_residencial, id_usuario_reciclador):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes avisar tu llegada a este conjunto antes de poder auditarlo.",
        )

    if _ya_audito_recientemente(db, reciclador.id_reciclador, id_conjunto_residencial):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya auditaste este conjunto hace menos de {HORAS_ENTRE_AUDITORIAS} horas.",
        )

    if not (1 <= len(evidencias) <= MAXIMO_FOTOS_EVIDENCIA):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Debes adjuntar entre 1 y {MAXIMO_FOTOS_EVIDENCIA} fotos de evidencia.",
        )

    # ¿Qué? Antes se procesaba una foto a la vez, esperando a que cada una
    #       terminara antes de empezar la siguiente ("for archivo in
    #       evidencias: await ...").
    # ¿Para qué? Con hasta 3 fotos por auditoría, esperar una por una
    #           multiplica por 3 el tiempo total. Con asyncio.gather, las 3
    #           se procesan al mismo tiempo — el tiempo total es el de la
    #           foto más lenta, no la suma de las 3.
    # ¿Impacto? Si CUALQUIER foto falla la validación, se cancela toda la
    #           auditoría igual que antes (ninguna se guarda a medias).
    rutas = await asyncio.gather(*[_guardar_evidencia(archivo) for archivo in evidencias])

    auditoria = AuditoriaConjunto(
        id_reciclador=reciclador.id_reciclador,
        id_conjunto_residencial=id_conjunto_residencial,
        nivel_desempeno=nivel_desempeno,
        tema_educativo=tema_educativo.strip(),
        descripcion=descripcion.strip() if descripcion else None,
        ruta_evidencia=rutas[0],
        ruta_evidencia_2=rutas[1] if len(rutas) > 1 else None,
        ruta_evidencia_3=rutas[2] if len(rutas) > 2 else None,
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
          "Ver" de la notificación AUDITORIA_PUBLICADA, o una fila del
          historial (Residente/Admin de Conjunto/Reciclador).
    ¿Impacto? Un Residente o Admin de Conjunto solo puede ver auditorías de
             un conjunto al que de verdad pertenecen. Un Reciclador solo
             puede ver las que ÉL mismo envió — no las de otros
             recicladores autorizados en el mismo conjunto. Sin esto,
             cualquiera con sesión podría ver auditorías ajenas adivinando ids.
    """
    auditoria = db.execute(
        select(AuditoriaConjunto).where(AuditoriaConjunto.id_auditoria == id_auditoria)
    ).scalar_one_or_none()
    if auditoria is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auditoría no encontrada.")

    if current_user.id_rol == RolId.RECICLADOR:
        reciclador = _obtener_reciclador(db, current_user.id_usuario)
        if auditoria.id_reciclador != reciclador.id_reciclador:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No es una auditoría tuya.")
        return auditoria

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
        # ¿Qué? Se desempata por orden_interno (contador interno siempre
        #       creciente, nunca expuesto en la API) además de created_at
        #       — dentro de una misma transacción, NOW() de Postgres
        #       devuelve el mismo valor para varias inserciones seguidas,
        #       así que created_at solo no basta para el orden. Antes se
        #       usaba id_auditoria para esto (funcionaba porque UUIDv7
        #       ordena cronológicamente), pero con UUIDv4 (issue #167) el
        #       ID ya no sirve como desempate — ver orden_interno en el
        #       modelo.
        .order_by(AuditoriaConjunto.created_at.desc(), AuditoriaConjunto.orden_interno.desc())
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
        .order_by(AuditoriaConjunto.created_at.desc(), AuditoriaConjunto.orden_interno.desc())
    )
    return list(db.execute(stmt).scalars().all())
