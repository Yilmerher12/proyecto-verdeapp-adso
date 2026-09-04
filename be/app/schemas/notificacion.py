from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class NotificacionEnviarBody(BaseModel):
    tipo: str  # LLEGADA_RECICLADOR | SHUT_LLENO | SHUT_LIBRE | FINALIZACION_RECICLADOR
    id_conjunto_residencial: Optional[UUID] = None  # required for reciclador, inferred for residente


class NotificacionResponse(BaseModel):
    id: UUID
    tipo: str
    mensaje: str
    # ¿Qué? Puntero opcional al registro relacionado (ej. id_auditoria para
    #       AUDITORIA_PUBLICADA) — la mayoría de tipos no lo usan.
    id_referencia: Optional[UUID] = None
    # ¿Qué? Opcional porque RQF-015 (novedades del Admin del Sistema) son
    #       de toda la plataforma, no de un conjunto — esas notificaciones
    #       no tienen id_conjunto_residencial.
    nombre_conjunto: Optional[str] = None
    leida: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class EstadoShutResponse(BaseModel):
    lleno: bool
    created_at: Optional[datetime] = None


class ContadorNoLeidasResponse(BaseModel):
    count: int


class EstadoRecicladorConjuntoResponse(BaseModel):
    """
    ¿Qué? El estado de UN conjunto autorizado, desde el punto de vista del
          reciclador en sesión — para que el frontend sepa, ANTES de que
          intente enviar una notificación, cuáles botones tienen sentido
          usar en ese conjunto puntual.
    """
    id_conjunto_residencial: UUID
    # ¿Qué? True si el reciclador ya avisó su llegada a este conjunto y
    #       todavía no ha avisado que se fue.
    presente: bool
    # ¿Qué? True si el último aviso de SHUT_LLENO/SHUT_LIBRE de este
    #       conjunto (de cualquier reciclador o residente) fue un lleno.
    shut_lleno: bool
    # ¿Qué? True si el reciclador SÍ podría enviar LLEGADA_RECICLADOR ahora
    #       mismo — es decir, no está presente Y no avisó llegada a este
    #       conjunto hace menos de 2 horas.
    # ¿Para qué? El candado de 2 horas ya existía antes del control de
    #           presencia, pero el frontend no tenía forma de saber si
    #           estaba activo — solo se enteraba al recibir el 400.
    puede_avisar_llegada: bool
