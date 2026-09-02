from sqlalchemy import Column, DateTime, Integer, String, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.ids import generar_uuid7


class Usuario(Base):
    __tablename__ = "usuarios"

    # ¿Qué? UUIDv7 en vez de un entero autoincremental (1, 2, 3...).
    # ¿Para qué? El profesor señaló que un ID adivinable es una mala
    #           práctica de seguridad (permite enumerar registros).
    # ¿Impacto? id_rol NO se toca — sigue siendo Integer a propósito:
    #           `roles` es un catálogo fijo de 4 valores públicamente
    #           conocidos (ver RolId en app/models/rol.py), no hay nada
    #           que "adivinar" ahí, y migrarlo obligaría a rehacer el
    #           enum de roles y el contenido del JWT sin ningún beneficio
    #           real de seguridad.
    id_usuario = Column(UUID(as_uuid=True), primary_key=True, index=True, default=generar_uuid7)
    id_rol = Column(Integer, ForeignKey("roles.id_rol"), nullable=False)
    correo_electronico = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)

    # Mantener este campo por control de estado en la aplicación
    is_active = Column(Boolean, default=True)

    # ¿Qué? Columna NUEVA y separada de is_active a propósito — is_active
    #       ya significa "correo verificado" (queda en False justo después
    #       de registrarse, hasta que se confirma el correo). Si se
    #       reutilizara is_active para esto, a un usuario desactivado por
    #       un Administrador del Sistema le aparecería el mensaje de
    #       "verifica tu correo", que no tiene ningún sentido para una
    #       cuenta que ya estaba verificada.
    # ¿Para qué? RQF nuevo: el Admin del Sistema puede desactivar una
    #           cuenta (ver be/app/routers/admin.py) sin tocar el estado
    #           de verificación de correo.
    # ¿Impacto? default=True: ninguna cuenta existente queda desactivada
    #           por accidente al agregar esta columna.
    habilitado = Column(Boolean, nullable=False, default=True, server_default="true")

    # ¿Qué? Idioma preferido de la interfaz para este usuario ("es" o "en").
    # ¿Para qué? Que la preferencia de idioma siga a la persona entre dispositivos,
    #           no solo al navegador donde la eligió (eso lo cubre localStorage).
    # ¿Impacto? Sin esta columna, el idioma se perdería al iniciar sesión desde
    #           un dispositivo distinto al que lo configuró.
    locale = Column(String(10), nullable=False, default="es", server_default="es")

    # ¿Qué? HU-001/RQF-001 (CA-001.5, RN-003): bloqueo temporal por intentos
    #       fallidos de login — 5 intentos seguidos bloquean la cuenta 15 min.
    # ¿Para qué? Antes de esto, un atacante podía probar contraseñas contra
    #           un correo específico sin ningún límite por cuenta (el
    #           rate limit de slowapi es por IP, no por correo — ver
    #           docs/requisitos/RFs/RF-001_validar_usuario.md).
    # ¿Impacto? intentos_fallidos se resetea a 0 en cada login exitoso;
    #           bloqueado_hasta queda NULL mientras no haya bloqueo activo.
    intentos_fallidos = Column(Integer, nullable=False, default=0, server_default="0")
    bloqueado_hasta = Column(DateTime(timezone=True), nullable=True)

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