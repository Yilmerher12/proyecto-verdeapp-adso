"""
Módulo: schemas/novedad_enviada.py
Descripción: Schemas de las novedades que un Residente, Reciclador o Admin de
             Conjunto le ENVÍA al Admin Sistema (texto + imagen opcional).
¿Para qué? No confundir con schemas/novedad.py (RQF-015), que son los avisos
          que el Admin Sistema publica hacia todos.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.agenda_conjunto import TEXTO_MAX_LENGTH
from app.utils.enlaces import ImagenPropia


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


class NovedadEnviadaResponse(BaseModel):
    """¿Qué? Una novedad, tal como la ve su autor en "Mis envíos"."""
    id: UUID
    texto: str
    url_imagen: Optional[str] = None
    estado: str
    nombre_conjunto: Optional[str] = None
    created_at: datetime


class PaginaDeNovedadesEnviadasResponse(BaseModel):
    """¿Qué? Issue #399: una página de "Mis envíos" + cuántas hay en total, para pintar la paginación."""
    items: List[NovedadEnviadaResponse]
    total: int
