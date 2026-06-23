"""
Módulo: routers/conjunto_panel.py
Descripción: Endpoints del panel propio del Administrador de Conjunto.
¿Para qué? Permitir que vea y edite SOLO los conjuntos que administra —
          nunca los de otro administrador, ni los de todo el sistema.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import List

from app.dependencies import get_current_user, get_db
from app.models.usuario import Usuario
from app.models.administrador_conjunto import AdministradorConjunto
from app.models.conjunto_residencial import ConjuntoResidencial
from app.schemas.conjunto_panel import ConjuntoAdministradoResponse, EditarConjuntoRequest
from app.schemas.user import MessageResponse

router = APIRouter(prefix="/api/v1/conjunto-panel", tags=["conjunto-panel"])

ID_ROL_ADMIN_CONJUNTO = 4


def _obtener_administrador_o_rechazar(db: Session, current_user: Usuario) -> AdministradorConjunto:
    """
    ¿Qué? Confirma que quien hace la petición es realmente un Administrador
          de Conjunto (rol 4) y devuelve su registro de datos personales.
    ¿Para qué? Evitar que cualquier otro rol consulte o edite conjuntos
              por esta ruta.
    """
    if current_user.id_rol != ID_ROL_ADMIN_CONJUNTO:
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


@router.get("/mis-conjuntos", response_model=List[ConjuntoAdministradoResponse])
def listar_mis_conjuntos(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Devuelve todos los conjuntos que administra la persona en sesión."""
    administrador = _obtener_administrador_o_rechazar(db, current_user)

    return [
        ConjuntoAdministradoResponse(
            id_conjunto_residencial=c.id_conjunto_residencial,
            nombre_conjunto=c.nombre_conjunto,
            nit=c.nit,
            direccion=c.direccion,
            nombre_localidad=c.localidad.nombre_localidad,
        )
        for c in administrador.conjuntos
    ]


@router.patch("/mis-conjuntos/{id_conjunto_residencial}", response_model=MessageResponse)
def editar_mi_conjunto(
    id_conjunto_residencial: int,
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

    ids_propios = {c.id_conjunto_residencial for c in administrador.conjuntos}
    if id_conjunto_residencial not in ids_propios:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para editar este conjunto.",
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

    conjunto.nombre_conjunto = datos.nombre_conjunto.strip().upper()
    conjunto.nit = datos.nit.strip() if datos.nit else None
    conjunto.direccion = datos.direccion.strip()
    db.commit()

    return MessageResponse(message="Conjunto actualizado correctamente.")