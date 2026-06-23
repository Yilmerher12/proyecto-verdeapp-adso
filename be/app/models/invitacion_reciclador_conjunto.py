"""
Módulo: models/invitacion_reciclador_conjunto.py
Descripción: Modelo de invitación de un Admin de Conjunto hacia un Reciclador.
¿Para qué? Representar la "solicitud de autorización" que el Admin de Conjunto
           envía a un Reciclador ya existente, para que trabaje en su conjunto.
¿Impacto? A diferencia de InvitacionAdminConjunto (que crea una cuenta nueva al
          aceptar), aquí el reciclador YA existe — aceptar solo crea la fila en
          recicladores_conjuntos, vinculando ambos.
"""

from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class InvitacionRecicladorConjunto(Base):
    __tablename__ = "invitaciones_reciclador_conjunto"

    id = Column(String(36), primary_key=True)
    id_reciclador = Column(Integer, ForeignKey("recicladores.id_reciclador", ondelete="CASCADE"), nullable=False)
    id_conjunto_residencial = Column(
        Integer, ForeignKey("conjuntos_residenciales.id_conjunto_residencial", ondelete="CASCADE"), nullable=False
    )
    invitado_por_id = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)

    # ¿Qué? Estado de la invitación: PENDIENTE, ACEPTADA o RECHAZADA.
    # ¿Para qué? A diferencia de un booleano "used", el Reciclador puede
    #           rechazar explícitamente — el Admin de Conjunto necesita
    #           saber la diferencia entre "no ha respondido" y "dijo que no".
    estado = Column(String(20), nullable=False, default="PENDIENTE")

    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True))

    reciclador = relationship("Reciclador")
    conjunto_residencial = relationship("ConjuntoResidencial")