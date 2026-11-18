from sqlalchemy import Boolean, Column, Integer, Numeric, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.ids import generar_uuid4

class PuntoAcopio(Base):
    __tablename__ = "puntos_acopios"

    id_punto_acopio = Column(UUID(as_uuid=True), primary_key=True, index=True, default=generar_uuid4)
    # id_localidad se queda como Integer — ver comentario en conjunto_residencial.py
    id_localidad = Column(Integer, ForeignKey("localidades.id_localidad"), nullable=False)
    nombre = Column(String(200), nullable=False)
    nombre_encargado = Column(String(100), nullable=True)
    direccion = Column(String(255), nullable=False)
    telefono_contacto = Column(String(15), nullable=True)
    # ¿Qué? Ruta de la foto del punto (/uploads/adjuntos/<uuid>.jpg|png|webp), subida por
    #       el Admin Sistema con POST /uploads/adjunto — no la foto en sí.
    # ¿Impacto? Opcional: un punto sin foto se ve igual que antes. Está en
    #           COLUMNAS_CON_ADJUNTOS (limpiar_adjuntos.py), o la limpieza la borraría.
    url_foto = Column(String(500), nullable=True)
    # ¿Qué? RQF-011/HU-017: "dar de baja" es un soft-delete — el punto deja
    #       de aparecer en el directorio de Residentes/Recicladores, pero
    #       el registro se conserva (igual que fecha_desvinculacion en
    #       administradores_conjuntos).
    activo = Column(Boolean, nullable=False, default=True)

    # ¿Qué? Datos del inventario de ECA de la UAESP (Resolución 698 de 2023, issue #664). Todos
    #       opcionales: un punto que el Admin Sistema crea a mano no los tiene.
    # ¿Para qué? numero_resolucion identifica cada ECA del Excel (el nombre no sirve: "ECA" se repite
    #           80 veces) y permite correr la importación varias veces sin duplicar. Ojo: la UAESP
    #           repite el 105 y el 605, así que a la segunda fila se le agrega "-2" ("105-2").
    # ¿Impacto? La API de edición no toca estas columnas: editar un punto no borra su origen.
    numero_resolucion = Column(String(10), nullable=True, unique=True)
    organizacion = Column(String(300), nullable=True)
    correo_contacto = Column(String(255), nullable=True)
    latitud = Column(Numeric(10, 7), nullable=True)
    longitud = Column(Numeric(10, 7), nullable=True)

    # Puente
    localidad = relationship("Localidad", back_populates="puntos_acopio")
    # ¿Qué? passive_deletes: la BD borra los comentarios sola (ON DELETE CASCADE)
    #       al eliminar el punto — SQLAlchemy no necesita cargarlos antes.
    comentarios = relationship("PuntoAcopioComentario", cascade="all, delete-orphan", passive_deletes=True)