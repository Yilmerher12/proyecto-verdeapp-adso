"""
Módulo: services/auditoria_conjunto_service.py
Descripción: Lógica de negocio de la auditoría del Reciclador al conjunto
             (RQF-009) — validaciones y guardado de la foto de evidencia.
"""
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.auditoria_conjunto import AuditoriaConjunto
from app.models.reciclador import Reciclador
from app.models.tablas_asociacion import recicladores_conjuntos
from app.schemas.auditoria_conjunto import NivelDesempeno

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


def _obtener_reciclador(db: Session, id_usuario: int) -> Reciclador:
    reciclador = db.execute(select(Reciclador).where(Reciclador.id_usuario == id_usuario)).scalar_one_or_none()
    if reciclador is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes un perfil de reciclador.")
    return reciclador


def _verificar_autorizado(db: Session, id_reciclador: int, id_conjunto: int) -> None:
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

    CARPETA_EVIDENCIAS.mkdir(parents=True, exist_ok=True)
    nombre_archivo = f"{uuid.uuid4()}{extension}"
    (CARPETA_EVIDENCIAS / nombre_archivo).write_bytes(contenido)

    return f"/uploads/evidencias-auditoria/{nombre_archivo}"


async def crear_auditoria(
    db: Session,
    id_usuario_reciclador: int,
    id_conjunto_residencial: int,
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
    db.commit()
    db.refresh(auditoria)
    return auditoria


def listar_mias(db: Session, id_usuario_reciclador: int) -> list[AuditoriaConjunto]:
    """¿Qué? Auditorías ya enviadas por este reciclador, más recientes primero.
    ¿Para qué? El frontend las usa para saber cuándo fue la última auditoría
              de cada conjunto y así mostrar (o no) el aviso de "ya puedes
              auditar de nuevo" (ver issue #5: cadencia semanal)."""
    reciclador = _obtener_reciclador(db, id_usuario_reciclador)
    stmt = (
        select(AuditoriaConjunto)
        .where(AuditoriaConjunto.id_reciclador == reciclador.id_reciclador)
        .order_by(AuditoriaConjunto.created_at.desc())
    )
    return list(db.execute(stmt).scalars().all())
