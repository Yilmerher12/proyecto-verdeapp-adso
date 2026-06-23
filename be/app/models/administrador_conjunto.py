from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


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

    id_administrador = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), unique=True, nullable=False)

    nombre = Column(String(100), nullable=False)
    apellidos = Column(String(150), nullable=False)
    numero_telefonico = Column(String(15), nullable=True)

    # Puente al usuario de login (correo, contraseña, rol)
    usuario = relationship("Usuario", back_populates="administrador_conjunto")

    # Puente a los conjuntos que administra (puede ser varios)
    conjuntos = relationship(
        "ConjuntoResidencial",
        secondary="administradores_conjuntos",
        back_populates="administradores"
    )