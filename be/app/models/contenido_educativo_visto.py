from sqlalchemy import Column, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class ContenidoEducativoVisto(Base):
    """
    ¿Qué? Un módulo del catálogo que un Residente ya abrió.
    ¿Para qué? Mostrarle "Visto" y su avance ("2 de 6 lecciones vistas") desde
              cualquier dispositivo, y dejar constancia de que abrió el contenido.
    ¿Impacto? Una fila por Residente y módulo (clave compuesta): abrir la misma
              lección otra vez no duplica nada. "Visto" significa que abrió la
              lección, no que reprodujo el video completo. Si se elimina el
              usuario o el módulo, sus filas se eliminan con él.
    """
    __tablename__ = "contenido_educativo_vistos"

    id_usuario = Column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id_usuario", ondelete="CASCADE"),
        primary_key=True,
    )
    id_contenido = Column(
        UUID(as_uuid=True),
        ForeignKey("contenido_educativo.id_contenido", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    visto_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
