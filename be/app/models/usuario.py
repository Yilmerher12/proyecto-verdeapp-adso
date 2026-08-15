from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario = Column(Integer, primary_key=True, index=True)
    id_rol = Column(Integer, ForeignKey("roles.id_rol"), nullable=False)
    correo_electronico = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)

    # Mantener este campo por control de estado en la aplicación
    is_active = Column(Boolean, default=True)

    # ¿Qué? Idioma preferido de la interfaz para este usuario ("es" o "en").
    # ¿Para qué? Que la preferencia de idioma siga a la persona entre dispositivos,
    #           no solo al navegador donde la eligió (eso lo cubre localStorage).
    # ¿Impacto? Sin esta columna, el idioma se perdería al iniciar sesión desde
    #           un dispositivo distinto al que lo configuró.
    locale = Column(String(10), nullable=False, default="es", server_default="es")

    # Puentes del Usuario
    rol = relationship("Role", back_populates="usuarios")
    residente = relationship("Residente", back_populates="usuario", uselist=False)
    reciclador = relationship("Reciclador", back_populates="usuario", uselist=False)
    # ¿Qué? Puente nuevo hacia el perfil de Administrador de Conjunto.
    # ¿Para qué? Igual que residente/reciclador: permite ir de un Usuario
    #           (login) a sus datos personales como administrador, si
    #           su id_rol corresponde a ADMIN_CONJUNTO (rol 4).
    # ¿Impacto? "uselist=False" porque cada Usuario tiene como máximo
    #           UN registro de AdministradorConjunto (sus datos personales),
    #           aunque ese mismo administrador pueda manejar VARIOS conjuntos
    #           (eso se resuelve en AdministradorConjunto.conjuntos, no aquí).
    administrador_conjunto = relationship(
        "AdministradorConjunto", back_populates="usuario", uselist=False
    )