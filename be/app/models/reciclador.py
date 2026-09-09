from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, and_
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.reciclador_conjunto import RecicladorConjunto
from app.utils.ids import generar_uuid4


def _secondaryjoin_conjuntos_activos():
    """
    ¿Qué? Condición para unir recicladores_conjuntos con
          conjuntos_residenciales, solo para vínculos activos.
    ¿Para qué? El import de ConjuntoResidencial va DENTRO de la función —
              mismo motivo defensivo que ya usa conjunto_residencial.py
              para su propio secondaryjoin.
    """
    from app.models.conjunto_residencial import ConjuntoResidencial

    return and_(
        RecicladorConjunto.id_conjunto_residencial == ConjuntoResidencial.id_conjunto_residencial,
        RecicladorConjunto.fecha_revocacion.is_(None),
    )


class Reciclador(Base):
    __tablename__ = "recicladores"

    id_reciclador = Column(UUID(as_uuid=True), primary_key=True, index=True, default=generar_uuid4)
    id_usuario = Column(UUID(as_uuid=True), ForeignKey("usuarios.id_usuario"), unique=True, nullable=False)

    # localidad_id se queda como Integer — ver comentario en conjunto_residencial.py
    localidad_id = Column(Integer, ForeignKey("localidades.id_localidad"), nullable=True)

    nombre = Column(String(100), nullable=False)

    apellidos = Column(String(150), nullable=False)
    asociacion = Column(String(255), nullable=True)

    numero_telefonico = Column(String(15), nullable=True)

    # ¿Qué? Consentimiento explícito del reciclador para que su teléfono
    #       aparezca en el Directorio general (visible a cualquier usuario
    #       autenticado de la ciudad, no solo a su propio conjunto).
    # ¿Para qué? Antes el teléfono se mostraba siempre, sin que el
    #           reciclador hubiera decidido exponerlo con ese propósito
    #           específico — Ley 1581 de 2012 (Habeas Data) exige
    #           consentimiento para usar un dato personal con un fin
    #           distinto al que se recolectó.
    # ¿Impacto? Por defecto en falso (privacidad primero): el reciclador
    #           debe activarlo él mismo desde su Perfil para que el
    #           directorio muestre sus botones de Llamar/WhatsApp.
    mostrar_contacto_directorio = Column(Boolean, nullable=False, server_default="false")

    # Puentes del Reciclador
    usuario = relationship("Usuario", back_populates="reciclador")
    localidad = relationship("Localidad")
    conjuntos = relationship(
        "ConjuntoResidencial",
        secondary=RecicladorConjunto.__table__,
        primaryjoin=lambda: Reciclador.id_reciclador == RecicladorConjunto.id_reciclador,
        secondaryjoin=_secondaryjoin_conjuntos_activos,
        back_populates="recicladores",
        viewonly=True,
    )