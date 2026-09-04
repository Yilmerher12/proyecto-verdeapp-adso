"""
Módulo: routers/users.py
Descripción: Endpoints de usuario — perfil del usuario autenticado y preferencias.
¿Para qué? Proveer endpoints para que el usuario autenticado consulte y gestione su perfil
y preferencias de la aplicación (idioma, etc.).
¿Impacto? Sin este router, el frontend no podría mostrar los datos del usuario logueado
(nombre, email, fecha de registro, etc.) ni persistir preferencias como el idioma.
"""
import re
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.dependencies import get_current_user, get_db
from app.models.usuario import Usuario
from app.models.residente import Residente
from app.models.reciclador import Reciclador
from app.models.administrador_conjunto import AdministradorConjunto
from app.models.localidad import Localidad
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.unidad import Unidad
from app.models.rol import RolId
from app.schemas.user import UpdateLocaleRequest, UpdateProfileBody, UserResponse
from app.services.auth_service import update_user_locale
from app.utils.imagenes import guardar_imagen_subida

router = APIRouter(
    prefix="/api/v1/users",
    tags=["users"],
)

# ¿Qué? Misma carpeta base que ya usan las evidencias de auditoría y los
#       adjuntos de comunicados/novedades (be/app/uploads/), cada feature
#       en su propia subcarpeta.
CARPETA_FOTOS_PERFIL = Path(__file__).parent.parent / "uploads" / "perfiles"

# ¿Qué? Formato válido de teléfono local (RQF-008): solo dígitos, entre 7
#       (fijo con indicativo corto) y 10 (celular colombiano) caracteres.
TELEFONO_REGEX = re.compile(r"^\d{7,10}$")


@router.get("/me", summary="Obtiene el perfil del usuario activo")
def read_users_me(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Retorna la información del usuario en sesión, realizando los cruces relacionales
    exactos en PostgreSQL para inyectar los datos reales del registro al Frontend.
    """
    # Estructura base de respuesta unificada
    payload = {
        "id": current_user.id_usuario,
        "email": current_user.correo_electronico,
        "role_id": current_user.id_rol,
        "locale": current_user.locale,
        "first_name": "Administrador",
        "last_name": "del Sistema",
        "numero_telefonico": "No registrado",
        "nombre_conjunto": None,
        "torre": None,
        "apto": None,
        "asociacion": None,
        "nombre_localidad": None,
        # Lista de conjuntos que administra, solo aplica si es Administrador de Conjunto.
        "conjuntos_administrados": None,
        # Solo aplica al rol Reciclador — ver RolId.RECICLADOR más abajo.
        "mostrar_contacto_directorio": False,
        # ¿Qué? Vive en Usuario (no en las tablas por rol) — por eso se lee
        #       directo de current_user, igual para los 4 roles.
        "foto_perfil_url": current_user.foto_perfil_url,
    }

    # Consultas relacionales por estrategia de JOINs explícitos
    if current_user.id_rol == RolId.RESIDENTE:
        stmt = (
            select(
                Residente.nombre,
                Residente.apellidos,
                Residente.numero_telefonico,
                Unidad.torre,
                Unidad.apto,
                ConjuntoResidencial.nombre_conjunto
            )
            .join(Unidad, Residente.id_unidad == Unidad.id_unidad)
            .join(ConjuntoResidencial, Unidad.id_conjunto_residencial == ConjuntoResidencial.id_conjunto_residencial)
            .where(Residente.id_usuario == current_user.id_usuario)
        )
        res = db.execute(stmt).first()

        if res:
            payload["first_name"] = res.nombre
            payload["last_name"] = res.apellidos
            payload["numero_telefonico"] = res.numero_telefonico or "No registrado"
            payload["nombre_conjunto"] = res.nombre_conjunto
            payload["torre"] = res.torre
            payload["apto"] = res.apto

    elif current_user.id_rol == RolId.RECICLADOR:
        stmt = (
            select(
                Reciclador.nombre,
                Reciclador.apellidos,
                Reciclador.numero_telefonico,
                Reciclador.asociacion,
                Reciclador.mostrar_contacto_directorio,
                Localidad.nombre_localidad
            )
            .join(Localidad, Reciclador.localidad_id == Localidad.id_localidad)
            .where(Reciclador.id_usuario == current_user.id_usuario)
        )
        res = db.execute(stmt).first()

        if res:
            payload["first_name"] = res.nombre
            payload["last_name"] = res.apellidos
            payload["numero_telefonico"] = res.numero_telefonico or "No registrado"
            payload["asociacion"] = res.asociacion or "INDEPENDIENTE"
            payload["nombre_localidad"] = res.nombre_localidad
            payload["mostrar_contacto_directorio"] = res.mostrar_contacto_directorio

    elif current_user.id_rol == RolId.ADMIN_CONJUNTO:
        stmt = select(AdministradorConjunto).where(
            AdministradorConjunto.id_usuario == current_user.id_usuario
        )
        administrador = db.execute(stmt).scalar_one_or_none()

        if administrador:
            payload["first_name"] = administrador.nombre
            payload["last_name"] = administrador.apellidos
            payload["numero_telefonico"] = administrador.numero_telefonico or "No registrado"
            # ¿Qué? Nombres de todos los conjuntos que administra (puede ser varios).
            payload["conjuntos_administrados"] = [
                c.nombre_conjunto for c in administrador.conjuntos
            ]

    return payload


@router.put("/me", summary="Actualizar nombre, apellidos, teléfono y asociación del usuario")
def update_profile(
    body: UpdateProfileBody,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    nombre = body.nombre.strip()
    apellidos = body.apellidos.strip()
    if not nombre or not apellidos:
        raise HTTPException(status_code=422, detail="Nombre y apellidos son obligatorios.")

    telefono = (body.numero_telefonico or "").strip()
    if telefono and not TELEFONO_REGEX.match(telefono):
        raise HTTPException(
            status_code=400,
            detail="El número telefónico tiene un formato inválido.",
        )

    if current_user.id_rol == RolId.RESIDENTE:
        row = db.execute(select(Residente).where(Residente.id_usuario == current_user.id_usuario)).scalar_one_or_none()
        if row:
            row.nombre = nombre
            row.apellidos = apellidos
            row.numero_telefonico = telefono or "N/A"
    elif current_user.id_rol == RolId.RECICLADOR:
        row = db.execute(select(Reciclador).where(Reciclador.id_usuario == current_user.id_usuario)).scalar_one_or_none()
        if row:
            row.nombre = nombre
            row.apellidos = apellidos
            row.numero_telefonico = telefono or "N/A"
            asociacion = (body.asociacion or "").strip()
            row.asociacion = asociacion or "INDEPENDIENTE"
            row.mostrar_contacto_directorio = body.mostrar_contacto_directorio
    elif current_user.id_rol == RolId.ADMIN_CONJUNTO:
        row = db.execute(select(AdministradorConjunto).where(AdministradorConjunto.id_usuario == current_user.id_usuario)).scalar_one_or_none()
        if row:
            row.nombre = nombre
            row.apellidos = apellidos
            row.numero_telefonico = telefono or "N/A"
    else:
        raise HTTPException(status_code=403, detail="El perfil del administrador del sistema no es editable.")

    db.commit()
    return {"ok": True}


@router.post("/me/foto-perfil", status_code=201, summary="Subir o reemplazar la foto de perfil del usuario en sesión")
async def subir_foto_perfil(
    archivo: UploadFile,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    ¿Qué? A diferencia de PUT /me, este endpoint NO revisa el rol — la foto
          de perfil aplica por igual a los 4 roles, incluyendo el
          Administrador del Sistema (issue #170).
    ¿Para qué? Reutiliza guardar_imagen_subida (misma validación real de
              contenido que ya usan las evidencias de auditoría), en vez de
              aceptar un link externo que se puede romper solo.
    ¿Impacto? Si el usuario ya tenía una foto, se borra el archivo viejo del
              disco DESPUÉS de guardar el commit — para no ir acumulando
              fotos huérfanas cada vez que alguien cambia la suya. Si el
              borrado falla (ej. el archivo ya no existe), no se revierte
              nada — la foto nueva ya quedó guardada, que es lo que importa.
    """
    foto_anterior = current_user.foto_perfil_url

    url = await guardar_imagen_subida(archivo, CARPETA_FOTOS_PERFIL, "/uploads/perfiles")
    current_user.foto_perfil_url = url
    db.commit()

    if foto_anterior:
        ruta_anterior = CARPETA_FOTOS_PERFIL / Path(foto_anterior).name
        ruta_anterior.unlink(missing_ok=True)

    return {"url": url}


@router.patch(
    "/me/locale",
    response_model=UserResponse,
    summary="Actualizar idioma preferido del usuario (i18n)",
)
def update_locale(
    locale_data: UpdateLocaleRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    updated_user = update_user_locale(db=db, user=current_user, locale=locale_data.locale)

    return UserResponse(
        id=updated_user.id_usuario,
        email=updated_user.correo_electronico,
        role_id=updated_user.id_rol,
        is_active=updated_user.is_active,
        first_name="Usuario",
        last_name="VerdeApp",
        locale=updated_user.locale
    )