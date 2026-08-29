"""
Módulo: routers/geography.py
Descripción: Endpoints optimizados para el llenado dinámico de formularios geográficos.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional
from app.dependencies import get_current_user, get_db
from app.models.administrador_conjunto_asignacion import AdministradorConjuntoAsignacion
from app.models.localidad import Localidad
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.rol import RolId
from app.models.usuario import Usuario
from app.schemas.desvinculacion import ConjuntoSinAdministradorResponse
from app.schemas.geography import LocalidadResponse, ConjuntoResponse, UnidadResponse

router = APIRouter(
    prefix="/api/v1/geography",
    tags=["geography"],
)

# ¿Qué? Tope máximo de resultados por consulta de conjuntos.
# ¿Para qué? Bogotá tiene localidades con miles de conjuntos reales
#           registrados — sin este límite, un combobox de búsqueda podría
#           recibir toda la lista de una sola vez.
MAX_LIMIT_CONJUNTOS = 50


@router.get(
    "/localidades",
    response_model=List[LocalidadResponse],
    status_code=status.HTTP_200_OK,
    summary="Obtener todas las localidades de Bogotá"
)
def get_localidades(db: Session = Depends(get_db)):
    """Retorna las localidades ordenadas alfabéticamente para el primer Select."""
    stmt = select(Localidad).order_by(Localidad.nombre_localidad)
    return db.execute(stmt).scalars().all()


@router.get("/conjuntos/todos")
def listar_todos_los_conjuntos_verificados(
    search: Optional[str] = Query(None, description="Filtra por nombre de conjunto (contiene, sin distinguir mayúsculas)"),
    limit: int = Query(20, ge=1, le=MAX_LIMIT_CONJUNTOS),
    db: Session = Depends(get_db),
):
    """
    Devuelve conjuntos marcados como verificado=True, sin filtrar por
    localidad — opcionalmente filtrados por nombre y siempre acotados a
    `limit` resultados.

    ¿Qué cambió? Antes devolvía la lista completa sin límite. Con miles de
    conjuntos reales, este endpoint alimenta un combobox de búsqueda
    (InvitarAdminConjuntoForm) que necesita coincidencias acotadas, no todo
    el catálogo de una sola vez.
    """
    stmt = (
        select(
            ConjuntoResidencial.id_conjunto_residencial,
            ConjuntoResidencial.nombre_conjunto,
            Localidad.nombre_localidad,
        )
        .join(Localidad, ConjuntoResidencial.id_localidad == Localidad.id_localidad)
        .where(ConjuntoResidencial.verificado.is_(True))
    )
    if search:
        stmt = stmt.where(ConjuntoResidencial.nombre_conjunto.ilike(f"%{search}%"))
    stmt = stmt.order_by(Localidad.nombre_localidad, ConjuntoResidencial.nombre_conjunto).limit(limit)
    resultados = db.execute(stmt).all()

    return [
        {
            "id_conjunto_residencial": fila.id_conjunto_residencial,
            "nombre_conjunto": fila.nombre_conjunto,
            "nombre_localidad": fila.nombre_localidad,
        }
        for fila in resultados
    ]


@router.get(
    "/conjuntos/sin-administrador",
    response_model=List[ConjuntoSinAdministradorResponse],
    summary="Conjuntos verificados que hoy no tienen ningún administrador activo",
)
def listar_conjuntos_sin_administrador(
    search: Optional[str] = Query(None, description="Filtra por nombre de conjunto (contiene, sin distinguir mayúsculas)"),
    limit: int = Query(20, ge=1, le=MAX_LIMIT_CONJUNTOS),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    ¿Qué? RQF-016 / HU-024 (CA-024.2): de uso exclusivo del Administrador
          del Sistema, para elegir a qué conjunto asignar un Administrador
          de Conjunto adicional.
    ¿Para qué? Solo debe poder elegir conjuntos que no tengan ya un
              administrador activo (RN-003). `search` + `limit` acotan el
              resultado para que el combobox de AsignarConjuntoAdicionalForm
              no reciba miles de conjuntos de una sola vez.
    """
    if current_user.id_rol != RolId.ADMIN_SISTEMA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un Administrador del Sistema puede ver esta lista.",
        )

    ids_con_administrador_activo = select(AdministradorConjuntoAsignacion.id_conjunto_residencial).where(
        AdministradorConjuntoAsignacion.fecha_desvinculacion.is_(None)
    )

    stmt = (
        select(
            ConjuntoResidencial.id_conjunto_residencial,
            ConjuntoResidencial.nombre_conjunto,
            Localidad.nombre_localidad,
        )
        .join(Localidad, ConjuntoResidencial.id_localidad == Localidad.id_localidad)
        .where(
            ConjuntoResidencial.verificado.is_(True),
            ConjuntoResidencial.id_conjunto_residencial.not_in(ids_con_administrador_activo),
        )
    )
    if search:
        stmt = stmt.where(ConjuntoResidencial.nombre_conjunto.ilike(f"%{search}%"))
    stmt = stmt.order_by(Localidad.nombre_localidad, ConjuntoResidencial.nombre_conjunto).limit(limit)
    resultados = db.execute(stmt).all()

    return [
        {
            "id_conjunto_residencial": fila.id_conjunto_residencial,
            "nombre_conjunto": fila.nombre_conjunto,
            "nombre_localidad": fila.nombre_localidad,
        }
        for fila in resultados
    ]


@router.get(
    "/conjuntos/{id_localidad}",
    response_model=List[ConjuntoResponse],
    status_code=status.HTTP_200_OK,
    summary="Obtener conjuntos residenciales VERIFICADOS, filtrados por localidad"
)
def get_conjuntos_por_localidad(
    id_localidad: int,
    search: Optional[str] = Query(None, description="Filtra por nombre de conjunto (contiene, sin distinguir mayúsculas)"),
    limit: int = Query(20, ge=1, le=MAX_LIMIT_CONJUNTOS),
    db: Session = Depends(get_db),
):
    """
    Retorna los conjuntos cuyo id_localidad coincida con el número enviado en
    la ruta, PERO solo los que ya fueron verificados por un Administrador
    del Sistema.

    ¿Qué cambió? Antes este endpoint devolvía TODOS los conjuntos de la
    localidad, sin importar si estaban verificados. Como este es el
    endpoint que usa el formulario de registro público (Residentes y
    Recicladores eligiendo su conjunto), eso permitía que alguien se
    registrara en un conjunto que un Administrador del Sistema todavía
    no había confirmado — contradiciendo la decisión de seguridad de que
    solo conjuntos verificados deben ser seleccionables públicamente.

    Ahora también acepta `search` + `limit`: localidades como Usaquén
    tienen miles de conjuntos reales registrados, así que el combobox de
    registro busca por nombre en vez de recibir el catálogo completo.

    ¿Impacto? Si un conjunto recién creado (verificado=False) no aparece
    en el selector de registro, es el comportamiento esperado: debe
    esperar a que un Administrador del Sistema lo verifique primero.
    """
    stmt = select(ConjuntoResidencial).where(
        ConjuntoResidencial.id_localidad == id_localidad,
        ConjuntoResidencial.verificado.is_(True),
    )
    if search:
        stmt = stmt.where(ConjuntoResidencial.nombre_conjunto.ilike(f"%{search}%"))
    stmt = stmt.order_by(ConjuntoResidencial.nombre_conjunto).limit(limit)
    return db.execute(stmt).scalars().all()


@router.get(
    "/conjuntos",
    response_model=List[ConjuntoResponse],
    status_code=status.HTTP_200_OK,
    summary="Obtener la lista global de conjuntos residenciales verificados"
)
def get_todos_los_conjuntos(db: Session = Depends(get_db)):
    """
    ¿Qué cambió? Igual que el endpoint anterior — se agrega el filtro
    verificado=True. Este endpoint no se usa actualmente en ningún
    formulario visto hasta ahora, pero se corrige por consistencia: ningún
    endpoint de geografía debería exponer conjuntos no verificados salvo
    "/conjuntos/todos" (de uso exclusivo del Administrador del Sistema, que
    YA filtraba correctamente).
    """
    stmt = select(ConjuntoResidencial).where(ConjuntoResidencial.verificado.is_(True))
    return db.execute(stmt).scalars().all()


# ¿Qué? El summary decía "Endpoint adaptado para nomenclatura dinámica" —
#       no dejaba claro, ni en Swagger ni para quien lo llamara, que esto es
#       un placeholder que siempre responde vacío.
# ¿Para qué? El frontend actual no usa este endpoint (las unidades se crean
#           dinámicamente durante el registro del residente, ver
#           auth_service.register_user), pero queda expuesto en la API.
# ¿Impacto? Si en el futuro alguien lo conecta esperando una lista real,
#           ahora el summary lo avisa desde la documentación interactiva,
#           sin tener que leer el docstring.
@router.get(
    "/unidades/{id_conjunto_residencial}",
    response_model=List[UnidadResponse],
    status_code=status.HTTP_200_OK,
    summary="[Placeholder] Siempre devuelve una lista vacía",
)
def get_unidades_por_conjunto(id_conjunto_residencial: UUID, db: Session = Depends(get_db)):
    """
    Retorna un arreglo vacío a propósito. Las unidades habitacionales ahora
    se crean de forma dinámica durante el registro del residente — este
    endpoint no tiene ningún consumidor en el frontend actual.
    """
    return []