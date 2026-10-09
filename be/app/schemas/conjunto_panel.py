"""
Módulo: schemas/conjunto_panel.py
Descripción: Schemas para el panel propio del Administrador de Conjunto.
¿Para qué? Permitir que un Administrador de Conjunto vea y edite SOLO los
          datos de los conjuntos que tiene asignados (nunca de otros).
"""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

# ¿Qué? Issue #352 — tamaño de la columna nit (String(50)).
# ¿Impacto? Debe coincidir con NIT_MAX_LENGTH de fe/src/lib/validacion.ts.
NIT_MAX_LENGTH = 50
# ¿Qué? Tope razonable de apartamentos de un conjunto — evita un typo como 1200000.
# ¿Impacto? Debe coincidir con TOTAL_APARTAMENTOS_MAX de fe/src/lib/validacion.ts.
TOTAL_APARTAMENTOS_MAX = 20000


class ConjuntoAdministradoResponse(BaseModel):
    """¿Qué? Un conjunto que el Administrador de Conjunto en sesión administra."""
    id_conjunto_residencial: UUID
    nombre_conjunto: str
    nit: Optional[str] = None
    direccion: str
    nombre_localidad: str
    # ¿Qué? RQF-016: si ya hay una solicitud de desvinculación pendiente
    #       para este conjunto, para que el frontend oculte el botón de
    #       "solicitar desvinculación" en vez de dejar que el usuario
    #       choque con el error de solicitud duplicada (RN-002).
    tiene_solicitud_pendiente: bool = False
    # ¿Qué? Issue #168 — el código que el admin reparte fuera de la app
    #       para que un Residente demuestre que vive en este conjunto al
    #       registrarse. Todo conjunto ya tiene uno desde que se creó
    #       (ver default en el modelo), nunca es None.
    codigo_acceso: str
    # ¿Qué? Cuántos apartamentos tiene el conjunto (lo define su Admin) y
    #       cuántos de ellos ya tienen al menos un residente con cuenta
    #       activa. Se cuentan APARTAMENTOS, no cuentas: dos residentes en
    #       el mismo apartamento cuentan una vez.
    total_apartamentos: Optional[int] = None
    apartamentos_registrados: int = 0
    residentes_registrados: int = 0


class CodigoAccesoResponse(BaseModel):
    """¿Qué? Respuesta al (re)generar el código de acceso de un conjunto."""
    codigo_acceso: str


class EditarConjuntoRequest(BaseModel):
    """
    ¿Qué? Datos editables de un conjunto por su propio administrador: el NIT
          y la cantidad total de apartamentos.
    ¿Para qué? Issue #180: nombre y dirección vienen ya verificados desde el
              dataset oficial de Bogotá (ver seed.py) — un Admin de Conjunto
              no debería poder sobreescribir ese dato institucional sin
              ningún control ni rastro. El NIT es distinto: el dataset
              oficial no lo trae (queda NULL al importar), así que dejarlo
              editable es la única forma de completarlo con el dato real.
    """
    nit: Optional[str] = Field(default=None, max_length=NIT_MAX_LENGTH)
    # ¿Qué? Opcional: si no viene en la petición no se toca; si viene como
    #       null se borra (vuelve a "sin definir").
    total_apartamentos: Optional[int] = Field(default=None, ge=1, le=TOTAL_APARTAMENTOS_MAX)