"""
Módulo: services/cuota_subidas_service.py
Descripción: Cuota de subidas de archivos por usuario (por minuto y por día) y
             registro de quién subió cada archivo.
¿Para qué? Issue #395 (CN-046): el límite de 30 por minuto de /uploads/adjunto
          cuenta por IP. Residente y Reciclador se registran solos, así que
          con varias cuentas o varias IPs se podía llenar el disco.
¿Impacto? Se cuenta con la tabla archivos_subidos, no con slowapi: slowapi no
          sabe de roles ni de "por día". El límite por IP del router se queda.
"""

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.archivo_subido import ArchivoSubido
from app.models.rol import RolId
from app.models.usuario import Usuario

# ¿Qué? (por minuto, por día) de cada rol.
# ¿Para qué? Residente y Reciclador solo suben la foto de una novedad (1 por
#           novedad) y se registran solos: cuota corta. Los administradores
#           suben adjuntos de comunicados, agenda y contenido, y sus cuentas
#           se crean por invitación: más margen.
# ¿Impacto? Son números a ojo; si un rol real queda corto, se cambian aquí.
CUOTAS_POR_ROL = {
    RolId.RESIDENTE: (3, 5),
    RolId.RECICLADOR: (3, 5),
    RolId.ADMIN_CONJUNTO: (30, 30),
    RolId.ADMIN_SISTEMA: (30, 30),
}


def verificar_cuota(db: Session, usuario: Usuario) -> None:
    """Responde 429 si el usuario ya llegó a su tope por minuto o por día."""
    por_minuto, por_dia = CUOTAS_POR_ROL[usuario.id_rol]
    ahora = datetime.now(timezone.utc)
    ultimo_minuto, ultimo_dia = db.execute(
        select(
            func.count().filter(ArchivoSubido.created_at >= ahora - timedelta(minutes=1)),
            func.count(),
        ).where(ArchivoSubido.id_usuario == usuario.id_usuario, ArchivoSubido.created_at >= ahora - timedelta(days=1))
    ).one()
    # ponytail: dos subidas simultáneas pueden pasar el tope por una; sin bloqueo de fila, alcanza para frenar un llenado de disco.
    if ultimo_minuto >= por_minuto:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Subiste {por_minuto} archivos en el último minuto. Espera un momento para subir otro.",
        )
    if ultimo_dia >= por_dia:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Llegaste al máximo de {por_dia} archivos subidos en un día. Intenta de nuevo mañana.",
        )


def registrar_subida(db: Session, usuario: Usuario, ruta: str) -> None:
    """Guarda de quién es el archivo recién subido; esa fila es la que cuenta para la cuota."""
    db.add(ArchivoSubido(id_usuario=usuario.id_usuario, ruta=ruta))
    db.commit()
