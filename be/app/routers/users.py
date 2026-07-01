"""
Módulo: routers/users.py
Descripción: Endpoints de usuario — perfil del usuario autenticado y preferencias.
¿Para qué? Proveer endpoints para que el usuario autenticado consulte y gestione su perfil
y preferencias de la aplicación (idioma, etc.).
¿Impacto? Sin este router, el frontend no podría mostrar los datos del usuario logueado
(nombre, email, fecha de registro, etc.) ni persistir preferencias como el idioma.
"""
from fastapi import APIRouter, Depends
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
from app.schemas.user import UpdateLocaleRequest, UpdateProfileBody, UserResponse
from app.services.auth_service import update_user_locale

router = APIRouter(
    prefix="/api/v1/users",
    tags=["users"],
)


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
        "first_name": "Administrador",
        "last_name": "del Sistema",
        "numero_telefonico": "No registrado",
        "nombre_conjunto": None,
        "torre": None,
        "apto": None,
        "asociacion": None,
        "nombre_localidad": None,
        # ¿Qué? Lista de conjuntos que administra, solo aplica si
        #       current_user.id_rol == 4 (Administrador de Conjunto).
        "conjuntos_administrados": None,
    }

    # Consultas relacionales por estrategia de JOINs explícitos
    if current_user.id_rol == 2:  # Rol: Residente
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

    elif current_user.id_rol == 3:  # Rol: Reciclador
        stmt = (
            select(
                Reciclador.nombre,
                Reciclador.apellidos,
                Reciclador.numero_telefonico,
                Reciclador.asociacion,
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

    elif current_user.id_rol == 4:  # Rol: Administrador de Conjunto
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


@router.put("/me", summary="Actualizar nombre, apellidos y teléfono del usuario")
def update_profile(
    body: UpdateProfileBody,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from fastapi import HTTPException
    nombre = body.nombre.strip()
    apellidos = body.apellidos.strip()
    if not nombre or not apellidos:
        raise HTTPException(status_code=422, detail="Nombre y apellidos son obligatorios.")

    if current_user.id_rol == 2:
        row = db.execute(select(Residente).where(Residente.id_usuario == current_user.id_usuario)).scalar_one_or_none()
        if row:
            row.nombre = nombre
            row.apellidos = apellidos
            row.numero_telefonico = body.numero_telefonico or "N/A"
    elif current_user.id_rol == 3:
        row = db.execute(select(Reciclador).where(Reciclador.id_usuario == current_user.id_usuario)).scalar_one_or_none()
        if row:
            row.nombre = nombre
            row.apellidos = apellidos
            row.numero_telefonico = body.numero_telefonico or "N/A"
    elif current_user.id_rol == 4:
        row = db.execute(select(AdministradorConjunto).where(AdministradorConjunto.id_usuario == current_user.id_usuario)).scalar_one_or_none()
        if row:
            row.nombre = nombre
            row.apellidos = apellidos
            row.numero_telefonico = body.numero_telefonico or "N/A"
    else:
        raise HTTPException(status_code=403, detail="El perfil del administrador del sistema no es editable.")

    db.commit()
    return {"ok": True}


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
        locale=locale_data.locale
    )