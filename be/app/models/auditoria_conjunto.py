"""
Módulo: models/auditoria_conjunto.py
Descripción: Auditoría que el Reciclador hace del desempeño de separación
             de residuos de un conjunto (RQF-009).
¿Para qué? Es de una sola vía (reciclador → conjunto, nunca al revés) y
          global al conjunto entero — no por residente individual, porque
          no hay forma de saber qué unidad entregó qué material. Decisión
          documentada en el issue #5 del backlog.
¿Impacto? `ruta_evidencia` es obligatoria a propósito: la calificación no
          se apoya solo en la palabra del reciclador, siempre trae una foto
          de respaldo. `tema_educativo` es texto libre porque así vive
          `contenido_educativo.modulo_categoria` — sirve para conectar esta
          auditoría con el catálogo educativo (RQF-013) sin inventar una
          tabla de categorías que hoy no existe.
"""
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Identity, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.utils.ids import generar_uuid4


class AuditoriaConjunto(Base):
    __tablename__ = "auditorias_conjunto"

    id_auditoria = Column(UUID(as_uuid=True), primary_key=True, index=True, default=generar_uuid4)
    id_reciclador = Column(
        UUID(as_uuid=True), ForeignKey("recicladores.id_reciclador", ondelete="CASCADE"), nullable=False
    )
    id_conjunto_residencial = Column(
        UUID(as_uuid=True),
        ForeignKey("conjuntos_residenciales.id_conjunto_residencial", ondelete="CASCADE"),
        nullable=False,
    )
    # ¿Qué? Uno de: EXCELENTE | BUENA | REGULAR | DEFICIENTE (ver
    #       NivelDesempeno en schemas/auditoria_conjunto.py — la validación
    #       real de estos 4 valores vive ahí, no en la base de datos).
    nivel_desempeno = Column(String(20), nullable=False)
    tema_educativo = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=True)
    # ¿Qué? Ruta pública (ej. "/uploads/evidencias-auditoria/<uuid>.jpg"),
    #       no la ruta absoluta en disco del servidor.
    ruta_evidencia = Column(String(500), nullable=False)
    # ¿Qué? Hasta 2 fotos adicionales, opcionales — el reciclador puede
    #       documentar hasta 3 fotos en total (decisión 2026-08-27). Se
    #       usan columnas fijas en vez de una tabla aparte porque el máximo
    #       es un número fijo y pequeño, no una lista de tamaño libre.
    ruta_evidencia_2 = Column(String(500), nullable=True)
    ruta_evidencia_3 = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # ¿Qué? Contador interno, SOLO para desempatar el orden — nunca se
    #       expone en ningún schema/response de la API.
    # ¿Para qué? "created_at" no alcanza para ordenar "más reciente
    #           primero": dentro de una misma transacción, NOW() de
    #           Postgres devuelve el mismo valor para varias inserciones
    #           seguidas (2 recicladores auditando el mismo conjunto casi
    #           al mismo tiempo cae en esto seguido). Antes se desempataba
    #           con id_auditoria porque UUIDv7 ordena cronológicamente por
    #           diseño — pero al migrar a UUIDv4 (100% aleatorio, issue
    #           #167) ese desempate dejó de servir, y un test que dependía
    #           de este orden empezó a fallar de verdad (no en teoría).
    # ¿Impacto? "GENERATED ALWAYS AS IDENTITY" es un contador que Postgres
    #           garantiza estrictamente creciente por fila insertada — no
    #           es adivinable como llave primaria porque JAMÁS se expone
    #           al cliente, solo se usa del lado del servidor en el
    #           ORDER BY (ver auditoria_conjunto_service.py).
    orden_interno = Column(BigInteger, Identity(always=True), nullable=False, unique=True)

    reciclador = relationship("Reciclador")
    conjunto = relationship("ConjuntoResidencial")
