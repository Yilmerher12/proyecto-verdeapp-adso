"""
Módulo: schemas/novedad_enviada.py
Descripción: Schemas de las consultas de soporte que un Residente, Reciclador o
             Admin de Conjunto le ENVÍA al Admin Sistema (texto + imagen opcional)
             y de la bandeja "Soporte técnico" donde él las atiende.
¿Para qué? No confundir con schemas/novedad.py (RQF-015), que son los avisos
          que el Admin Sistema publica hacia todos.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.novedad_enviada import PRIORIDAD_POR_MOTIVO, EstadoNovedadEnviada, PrioridadNovedadEnviada
from app.schemas.agenda_conjunto import TEXTO_MAX_LENGTH
from app.utils.enlaces import ImagenPropia

# ¿Qué? Tope de la respuesta del Admin Sistema al autor.
RESPUESTA_MAX_LENGTH = 1000


class CrearNovedadEnviadaRequest(BaseModel):
    texto: str = Field(min_length=1, max_length=TEXTO_MAX_LENGTH)
    # ¿Qué? Issues #369 (CN-041) y #399 (CN-049): solo una imagen subida a
    #       VerdeApp (/uploads/adjuntos/<uuid>.jpg|png|webp), nunca un https://.
    # ¿Para qué? El formulario solo sube archivos, pero la API se puede llamar
    #           a mano con cualquier texto.
    # ¿Impacto? El Admin Sistema abre este enlace desde su bandeja; un https://
    #           externo podía llevarlo a una página falsa (phishing).
    url_imagen: ImagenPropia = None
    # ¿Qué? Solo lo usa el Admin de Conjunto (elige de cuál de sus conjuntos
    #       habla). Un Residente lo hereda de su unidad; un Reciclador no tiene.
    id_conjunto_residencial: Optional[UUID] = None
    # ¿Qué? Issue #512: clave del motivo elegido en el formulario; de ahí sale la prioridad.
    # ¿Impacto? Opcional para no romper clientes viejos: sin motivo la prioridad es MEDIA.
    motivo: Optional[str] = None

    @field_validator("motivo")
    @classmethod
    def validar_motivo(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in PRIORIDAD_POR_MOTIVO:
            raise ValueError("Motivo de consulta no válido.")
        return v


class NovedadEnviadaResponse(BaseModel):
    """¿Qué? Una consulta, tal como la ve su autor en "Historial de novedades" (con la respuesta si ya la tiene)."""
    id: UUID
    texto: str
    url_imagen: Optional[str] = None
    estado: str
    nombre_conjunto: Optional[str] = None
    respuesta: Optional[str] = None
    respondida_at: Optional[datetime] = None
    created_at: datetime


class PaginaDeNovedadesEnviadasResponse(BaseModel):
    """¿Qué? Issue #399: una página de "Historial de novedades" + cuántas hay en total, para pintar la paginación."""
    items: List[NovedadEnviadaResponse]
    total: int


class SoporteItemResponse(BaseModel):
    """¿Qué? Issue #512: una fila de la bandeja "Soporte técnico" del Admin Sistema."""
    id: UUID
    origen: str
    nombre_autor: str
    nombre_conjunto: str
    texto: str
    url_imagen: Optional[str] = None
    estado: str
    prioridad: str
    respuesta: Optional[str] = None
    respondida_at: Optional[datetime] = None
    created_at: datetime


class PaginaDeSoporteResponse(BaseModel):
    items: List[SoporteItemResponse]
    total: int


class ActualizarSoporteRequest(BaseModel):
    """
    ¿Qué? Lo que el Admin Sistema puede cambiar de una consulta: estado, prioridad y/o respuesta.
    ¿Impacto? Escribir una respuesta sin indicar estado la pasa a RESUELTA.
    """
    estado: Optional[EstadoNovedadEnviada] = None
    prioridad: Optional[PrioridadNovedadEnviada] = None
    respuesta: Optional[str] = Field(default=None, min_length=1, max_length=RESPUESTA_MAX_LENGTH)

    @model_validator(mode="after")
    def validar_algun_cambio(self) -> "ActualizarSoporteRequest":
        if self.estado is None and self.prioridad is None and self.respuesta is None:
            raise ValueError("Indica al menos un cambio: estado, prioridad o respuesta.")
        return self
