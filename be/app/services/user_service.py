"""
Módulo: services/user_service.py
Descripción: Lógica de negocio del perfil del usuario autenticado.
¿Para qué? Issue #218 — antes, routers/users.py armaba la respuesta del
           perfil y aplicaba las reglas de actualización directo en el
           router, con consultas SQL incluidas. Ahora vive aquí, como el
           resto del proyecto (comunicados, novedades, auditorías, puntos
           de acopio).
¿Impacto? read_users_me y update_profile necesitan un bloque de lógica
          distinto por cada uno de los 4 roles (cada uno guarda su nombre y
          teléfono en su propia tabla) — ver obtener_registro_de_perfil.
"""
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.administrador_conjunto import AdministradorConjunto
from app.models.localidad import Localidad
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.reciclador import Reciclador
from app.models.residente import Residente
from app.models.rol import RolId
from app.models.unidad import Unidad
from app.models.usuario import Usuario
from app.schemas.user import UpdateProfileBody
from app.utils.imagenes import guardar_imagen_subida

# ¿Qué? Misma carpeta base que ya usan las evidencias de auditoría y los
#       adjuntos de comunicados/novedades (be/app/uploads/), cada feature
#       en su propia subcarpeta.
CARPETA_FOTOS_PERFIL = Path(__file__).parent.parent / "uploads" / "perfiles"


def obtener_registro_de_perfil(db: Session, user: Usuario) -> Residente | Reciclador | AdministradorConjunto | None:
    """Devuelve la fila de datos personales del usuario según su rol.

    ¿Qué? Issue #220 (b13 del diagnóstico) — "¿en qué tabla vive el nombre
          real de esta persona, según su rol?" se resolvía de 3 formas
          parecidas pero distintas: aquí, en
          auth_service._obtener_nombre_real, y en actualizar_perfil (más
          abajo). Esta es ahora la única fuente de verdad para esa
          pregunta — las otras dos la reutilizan.
    ¿Para qué? Si se agrega un rol nuevo, o cambia qué tabla guarda el
              perfil de un rol existente, solo hay que tocar esta función.
    ¿Impacto? Devuelve None para Admin del Sistema (no tiene tabla de
              perfil propia) o si el usuario todavía no tiene fila creada.
              obtener_perfil (abajo) sigue con sus propias consultas por
              JOIN — necesita datos adicionales (localidad, conjunto,
              unidad) que esta función no trae, así que no es la misma
              duplicación.
    """
    if user.id_rol == RolId.RESIDENTE:
        return db.execute(select(Residente).where(Residente.id_usuario == user.id_usuario)).scalar_one_or_none()
    if user.id_rol == RolId.RECICLADOR:
        return db.execute(select(Reciclador).where(Reciclador.id_usuario == user.id_usuario)).scalar_one_or_none()
    if user.id_rol == RolId.ADMIN_CONJUNTO:
        return db.execute(select(AdministradorConjunto).where(AdministradorConjunto.id_usuario == user.id_usuario)).scalar_one_or_none()
    return None


def obtener_perfil(db: Session, current_user: Usuario) -> dict:
    """
    Arma la información del usuario en sesión, con los cruces relacionales
    exactos en PostgreSQL para inyectar los datos reales de la tabla de su
    rol (cada rol guarda nombre/apellidos/teléfono en su propia tabla).
    """
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

    if current_user.id_rol == RolId.RESIDENTE:
        # ¿Qué? Antes esta consulta no cruzaba con Localidad — nombre_localidad
        #       quedaba siempre en None para el Residente (sí funcionaba para
        #       Reciclador, más abajo). Como resultado, el Directorio nunca
        #       lograba preseleccionar la localidad del residente.
        # ¿Impacto? Necesario para poder restringir el filtro de la pestaña
        #           Recicladores a la localidad propia (issue del Directorio).
        stmt = (
            select(
                Residente.nombre,
                Residente.apellidos,
                Residente.numero_telefonico,
                Unidad.torre,
                Unidad.apto,
                ConjuntoResidencial.nombre_conjunto,
                Localidad.nombre_localidad,
            )
            .join(Unidad, Residente.id_unidad == Unidad.id_unidad)
            .join(ConjuntoResidencial, Unidad.id_conjunto_residencial == ConjuntoResidencial.id_conjunto_residencial)
            .join(Localidad, ConjuntoResidencial.id_localidad == Localidad.id_localidad)
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
            payload["nombre_localidad"] = res.nombre_localidad

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


def actualizar_perfil(db: Session, current_user: Usuario, body: UpdateProfileBody) -> None:
    # ¿Qué? Antes aquí se revisaba a mano que nombre/apellidos no estuvieran
    #       vacíos y que el teléfono cumpliera el formato (RQF-008).
    # ¿Impacto? Esas reglas ahora viven en UpdateProfileBody (schemas/user.py)
    #           — Pydantic las aplica antes de que esta función reciba el
    #           body, así que un dato inválido nunca llega hasta aquí.
    nombre = body.nombre.strip()
    apellidos = body.apellidos.strip()
    telefono = (body.numero_telefonico or "").strip()

    if current_user.id_rol == RolId.ADMIN_SISTEMA:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El perfil del administrador del sistema no es editable.")

    row = obtener_registro_de_perfil(db, current_user)
    if row:
        row.nombre = nombre
        row.apellidos = apellidos
        row.numero_telefonico = telefono or "N/A"
        if current_user.id_rol == RolId.RECICLADOR:
            asociacion = (body.asociacion or "").strip()
            row.asociacion = asociacion or "INDEPENDIENTE"
            row.mostrar_contacto_directorio = body.mostrar_contacto_directorio

    db.commit()


async def subir_foto_perfil(db: Session, current_user: Usuario, archivo: UploadFile) -> str:
    """
    ¿Qué? A diferencia de actualizar_perfil, esto NO revisa el rol — la foto
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

    return url
