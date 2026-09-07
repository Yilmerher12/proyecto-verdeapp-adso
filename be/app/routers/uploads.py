"""
Módulo: routers/uploads.py
Descripción: Endpoint genérico para subir el archivo adjunto de un
             comunicado, una novedad, o la guía de apoyo de un módulo de
             contenido educativo.
¿Para qué? Antes esos formularios pedían un link externo (URL) a un
          archivo ya hosteado en otro sitio — igual que nos pasó con el
          link roto de la guía de RCD, un link externo se puede romper en
          cualquier momento sin que el equipo se entere. Ahora se sube el
          archivo real, validado y guardado por VerdeApp mismo, igual que
          ya se hace con las fotos de evidencia de auditorías.
"""
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from app.dependencies import get_current_user
from app.models.rol import RolId
from app.models.usuario import Usuario
from app.utils.imagenes import guardar_imagen_subida

router = APIRouter(
    prefix="/api/v1/uploads",
    tags=["uploads"],
)

# ¿Qué? Misma carpeta base que ya usan las evidencias de auditoría
#       (be/app/uploads/), servida como archivos estáticos en /uploads
#       (ver main.py) — cada feature tiene su propia subcarpeta.
CARPETA_ADJUNTOS = Path(__file__).parent.parent / "uploads" / "adjuntos"

ROLES_PERMITIDOS = {RolId.ADMIN_CONJUNTO, RolId.ADMIN_SISTEMA}


@router.post("/adjunto", status_code=status.HTTP_201_CREATED)
async def subir_adjunto(
    archivo: UploadFile,
    permitir_pdf: bool = Query(
        False,
        description="La guía de apoyo del contenido educativo admite PDF además de imagen; comunicados/novedades no lo piden y siguen aceptando solo imagen.",
    ),
    current_user: Usuario = Depends(get_current_user),
):
    """
    ¿Qué? Solo el Administrador de Conjunto (comunicados) y el
          Administrador del Sistema (novedades, contenido educativo)
          pueden usar este endpoint.
    ¿Impacto? Devuelve {"url": "/uploads/adjuntos/<archivo>"} — esa URL es
             la que el frontend guarda como url_adjunto/url_guia,
             exactamente igual que si hubiera sido un link externo.
    """
    if current_user.id_rol not in ROLES_PERMITIDOS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para subir archivos adjuntos.",
        )

    url = await guardar_imagen_subida(archivo, CARPETA_ADJUNTOS, "/uploads/adjuntos", permitir_pdf=permitir_pdf)
    return {"url": url}
