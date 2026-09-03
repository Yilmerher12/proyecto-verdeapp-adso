"""
Módulo: routers/conjunto_panel.py
Descripción: Endpoints del panel propio del Administrador de Conjunto.
¿Para qué? Permitir que vea y edite SOLO los conjuntos que administra —
          nunca los de otro administrador, ni los de todo el sistema.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import List

from app.dependencies import get_current_user, get_db
from app.models.usuario import Usuario
from app.models.administrador_conjunto import AdministradorConjunto
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.rol import RolId
from app.models.solicitud_desvinculacion import EstadoSolicitudDesvinculacion, SolicitudDesvinculacion
from app.schemas.conjunto_panel import CodigoAccesoResponse, ConjuntoAdministradoResponse, EditarConjuntoRequest
from app.schemas.desvinculacion import SolicitarDesvinculacionRequest
from app.schemas.user import MessageResponse
from app.services import desvinculacion_service
from app.utils.codigo_acceso import generar_codigo_acceso

router = APIRouter(prefix="/api/v1/conjunto-panel", tags=["conjunto-panel"])


def _obtener_administrador_o_rechazar(db: Session, current_user: Usuario) -> AdministradorConjunto:
    """
    Confirma que quien hace la petición es realmente un Administrador de
    Conjunto y devuelve su registro de datos personales — así evitamos que
    cualquier otro rol consulte o edite conjuntos por esta ruta.
    """
    if current_user.id_rol != RolId.ADMIN_CONJUNTO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un Administrador de Conjunto puede acceder a este panel.",
        )

    stmt = select(AdministradorConjunto).where(
        AdministradorConjunto.id_usuario == current_user.id_usuario
    )
    administrador = db.execute(stmt).scalar_one_or_none()

    if not administrador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró tu perfil de administrador.",
        )

    return administrador


def _obtener_conjunto_propio_o_rechazar(
    db: Session, administrador: AdministradorConjunto, id_conjunto_residencial: UUID
) -> ConjuntoResidencial:
    """
    ¿Qué? Confirma que `id_conjunto_residencial` es uno de los que
          administra `administrador` y devuelve la fila del conjunto.
    ¿Para qué? Mismo chequeo de propiedad que ya hacía editar_mi_conjunto
              a mano — se extrae aquí porque el nuevo endpoint de
              regenerar código de acceso lo necesita igual.
    """
    ids_propios = {c.id_conjunto_residencial for c in administrador.conjuntos}
    if id_conjunto_residencial not in ids_propios:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para modificar este conjunto.",
        )

    stmt = select(ConjuntoResidencial).where(
        ConjuntoResidencial.id_conjunto_residencial == id_conjunto_residencial
    )
    conjunto = db.execute(stmt).scalar_one_or_none()

    if not conjunto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El conjunto no existe.",
        )

    return conjunto


@router.get("/mis-conjuntos", response_model=List[ConjuntoAdministradoResponse])
def listar_mis_conjuntos(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Devuelve todos los conjuntos que administra la persona en sesión."""
    administrador = _obtener_administrador_o_rechazar(db, current_user)

    ids_con_solicitud_pendiente = set(
        db.execute(
            select(SolicitudDesvinculacion.id_conjunto_residencial).where(
                SolicitudDesvinculacion.id_administrador == administrador.id_administrador,
                SolicitudDesvinculacion.estado == EstadoSolicitudDesvinculacion.PENDIENTE,
            )
        ).scalars().all()
    )

    return [
        ConjuntoAdministradoResponse(
            id_conjunto_residencial=c.id_conjunto_residencial,
            nombre_conjunto=c.nombre_conjunto,
            nit=c.nit,
            direccion=c.direccion,
            nombre_localidad=c.localidad.nombre_localidad,
            tiene_solicitud_pendiente=c.id_conjunto_residencial in ids_con_solicitud_pendiente,
            codigo_acceso=c.codigo_acceso,
        )
        for c in administrador.conjuntos
    ]


@router.patch("/mis-conjuntos/{id_conjunto_residencial}", response_model=MessageResponse)
def editar_mi_conjunto(
    id_conjunto_residencial: UUID,
    datos: EditarConjuntoRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    ¿Qué? Edita nombre, NIT o dirección de UN conjunto, solo si el usuario
          en sesión es uno de sus administradores asignados.
    ¿Para qué? Que el propio administrador pueda corregir datos sin
              depender del Administrador del Sistema para cada cambio menor.
    ¿Impacto? Si el conjunto solicitado no está entre los suyos, se rechaza
              con 403 — esto evita que un administrador edite conjuntos
              que no le pertenecen, aunque conozca su id.
    """
    administrador = _obtener_administrador_o_rechazar(db, current_user)
    conjunto = _obtener_conjunto_propio_o_rechazar(db, administrador, id_conjunto_residencial)

    conjunto.nombre_conjunto = datos.nombre_conjunto.strip().upper()
    conjunto.nit = datos.nit.strip() if datos.nit else None
    conjunto.direccion = datos.direccion.strip()
    db.commit()

    return MessageResponse(message="Conjunto actualizado correctamente.")


@router.post(
    "/mis-conjuntos/{id_conjunto_residencial}/solicitar-desvinculacion",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def solicitar_desvinculacion(
    id_conjunto_residencial: UUID,
    datos: SolicitarDesvinculacionRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """RQF-016 / HU-022: pide dejar de administrar uno de mis conjuntos. Queda pendiente hasta que el Admin Sistema la resuelva."""
    administrador = _obtener_administrador_o_rechazar(db, current_user)
    desvinculacion_service.solicitar_desvinculacion(
        db=db,
        administrador=administrador,
        id_conjunto=id_conjunto_residencial,
        motivo=datos.motivo,
    )
    return MessageResponse(message="Solicitud de desvinculación enviada. Un Administrador del Sistema la revisará.")


@router.post(
    "/mis-conjuntos/{id_conjunto_residencial}/regenerar-codigo-acceso",
    response_model=CodigoAccesoResponse,
)
def regenerar_codigo_acceso(
    id_conjunto_residencial: UUID,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    ¿Qué? Issue #168: genera un código de acceso NUEVO para uno de mis
          conjuntos, reemplazando el anterior.
    ¿Para qué? Si el código se filtró (por ejemplo, a alguien que no vive
              en el conjunto), el Admin de Conjunto puede rotarlo sin
              depender del Administrador del Sistema.
    ¿Impacto? No es "silencioso": cualquier residente que todavía no se
              haya registrado con el código viejo deberá pedir el nuevo.
              Se revisa contra TODOS los códigos existentes (no solo los
              de este lote) antes de guardar, para no depender solo de la
              probabilidad de choque de ~0.01%.
    """
    administrador = _obtener_administrador_o_rechazar(db, current_user)
    conjunto = _obtener_conjunto_propio_o_rechazar(db, administrador, id_conjunto_residencial)

    nuevo_codigo = generar_codigo_acceso()
    while db.execute(
        select(ConjuntoResidencial.id_conjunto_residencial).where(
            ConjuntoResidencial.codigo_acceso == nuevo_codigo
        )
    ).scalar_one_or_none():
        nuevo_codigo = generar_codigo_acceso()

    conjunto.codigo_acceso = nuevo_codigo
    db.commit()

    return CodigoAccesoResponse(codigo_acceso=nuevo_codigo)