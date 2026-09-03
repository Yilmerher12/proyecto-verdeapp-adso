from sqlalchemy import Column, String, ForeignKey, and_
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.administrador_conjunto_asignacion import AdministradorConjuntoAsignacion
from app.models.conjunto_residencial import ConjuntoResidencial
from app.utils.ids import generar_uuid4


class AdministradorConjunto(Base):
    """
    ¿Qué? Datos personales de un Administrador de Conjunto.
    ¿Para qué? Es un rol nuevo: una persona que administra uno o varios
              conjuntos residenciales por contrato (por ejemplo, una
              empresa de administración de copropiedades).
    ¿Impacto? Esta cuenta NUNCA se crea desde el registro público.
              Solo un Administrador del Sistema puede crearla. A qué
              conjunto(s) tiene acceso se define en la tabla aparte
              "administradores_conjuntos" (ver modelo
              administrador_conjunto_asignacion.py), porque un mismo
              administrador puede manejar varios conjuntos a la vez.
    """
    __tablename__ = "administradores_conjunto"

    id_administrador = Column(UUID(as_uuid=True), primary_key=True, index=True, default=generar_uuid4)
    id_usuario = Column(UUID(as_uuid=True), ForeignKey("usuarios.id_usuario"), unique=True, nullable=False)

    nombre = Column(String(100), nullable=False)
    apellidos = Column(String(150), nullable=False)
    numero_telefonico = Column(String(15), nullable=True)

    # Puente al usuario de login (correo, contraseña, rol)
    usuario = relationship("Usuario", back_populates="administrador_conjunto")

    # ¿Qué? Puente a los conjuntos que administra ACTIVAMENTE (puede ser
    #       varios) — excluye los que ya desvinculó (RQF-016).
    # ¿Para qué? secondary= por sí solo no permite filtrar la tabla
    #           intermedia, así que se define el join a mano para excluir
    #           las filas con fecha_desvinculacion ya puesta.
    # ¿Impacto? viewonly=True porque las asignaciones se crean/terminan a
    #           mano (ver admin_conjunto_service.py), nunca escribiendo a
    #           través de esta relación.
    conjuntos = relationship(
        ConjuntoResidencial,
        secondary=AdministradorConjuntoAsignacion.__table__,
        primaryjoin=lambda: AdministradorConjunto.id_administrador == AdministradorConjuntoAsignacion.id_administrador,
        secondaryjoin=lambda: and_(
            AdministradorConjuntoAsignacion.id_conjunto_residencial == ConjuntoResidencial.id_conjunto_residencial,
            AdministradorConjuntoAsignacion.fecha_desvinculacion.is_(None),
        ),
        back_populates="administradores",
        viewonly=True,
    )