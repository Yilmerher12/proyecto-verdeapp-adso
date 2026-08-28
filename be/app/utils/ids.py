"""
Módulo: utils/ids.py
Descripción: Generador único de IDs UUIDv7 para las llaves primarias del proyecto.
"""
import uuid

import uuid_utils


def generar_uuid7() -> uuid.UUID:
    """
    ¿Qué? Genera un UUID versión 7 (incluye la fecha de creación en los
          primeros bits, más una parte aleatoria) y lo devuelve como
          `uuid.UUID` de la librería estándar de Python.
    ¿Para qué? Postgres 17 (la versión que usa este proyecto) todavía no
              tiene una función nativa para generar UUIDv7 — eso llegó en
              Postgres 18. Por eso se genera aquí, en Python, con la
              librería `uuid_utils` (más rápida que hacerlo a mano).
    ¿Impacto? `uuid_utils.uuid7()` devuelve su propia clase `uuid_utils.UUID`,
              que NO es la misma clase que `uuid.UUID` de la librería
              estándar (se confirmó con una prueba real contra Postgres).
              SQLAlchemy, con `UUID(as_uuid=True)`, espera un `uuid.UUID`
              estándar — sin esta conversión explícita, el driver de
              Postgres no sabría cómo guardar el valor. Usar siempre esta
              función (nunca `uuid_utils.uuid7()` directo) en el `default=`
              de cada columna de llave primaria.
    """
    return uuid.UUID(str(uuid_utils.uuid7()))
