from enum import IntEnum

from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


# Antes cada archivo escribía el número del rol a mano (1, 2, 3, 4), cada quien
# a su manera, y hasta duplicamos la misma "traducción" en dos archivos distintos
# sin darnos cuenta. Con esto, en cualquier parte del backend comparamos contra
# RolId.RESIDENTE en vez de contra el número 2 — si alguien se equivoca escribiendo
# el nombre, Python avisa con un error en vez de fallar en silencio como pasaba antes.
# Los números deben coincidir siempre con lo que ya sembramos en init_db.sql.
class RolId(IntEnum):
    ADMIN_SISTEMA = 1
    RESIDENTE = 2
    RECICLADOR = 3
    ADMIN_CONJUNTO = 4


class Role(Base):
    __tablename__ = "roles"

    id_rol = Column(Integer, primary_key=True, index=True)
    tipo_rol = Column(String(50), unique=True, nullable=False)

    usuarios = relationship("Usuario", back_populates="rol")