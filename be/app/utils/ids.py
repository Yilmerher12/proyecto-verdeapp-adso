"""
Módulo: utils/ids.py
Descripción: Generador único de IDs UUIDv4 para las llaves primarias del proyecto.
"""
import uuid


def generar_uuid4() -> uuid.UUID:
    """
    ¿Qué? Genera un UUID versión 4 (100% aleatorio, sin ninguna fecha ni
          dato codificado adentro) con la librería estándar de Python.
    ¿Para qué? El profesor evaluador pidió reemplazar UUIDv7 por UUIDv4
              (issue #167) — v7 codifica la fecha/hora de creación en los
              primeros bits del propio identificador, y v4 no filtra nada.
    ¿Impacto? A diferencia de v7 (que necesitaba la librería externa
              `uuid_utils` por su lógica de timestamp), v4 es puramente
              aleatorio — `uuid.uuid4()` de la librería estándar ya devuelve
              un `uuid.UUID` compatible con `UUID(as_uuid=True)` de
              SQLAlchemy sin ninguna conversión adicional.
    """
    return uuid.uuid4()
