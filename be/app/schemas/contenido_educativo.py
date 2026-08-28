from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, field_validator


class ContenidoEducativoBase(BaseModel):
    modulo_categoria: str
    titulo_tema: str
    cuerpo_texto: str
    url_video: Optional[str] = None
    url_guia: Optional[str] = None

    @field_validator("modulo_categoria", "titulo_tema", "cuerpo_texto")
    @classmethod
    def campos_obligatorios_no_vacios(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Este campo no puede quedar vacío.")
        return v


class ContenidoEducativoCreate(ContenidoEducativoBase):
    pass


class ContenidoEducativoUpdate(ContenidoEducativoBase):
    pass


class ContenidoEducativoResponse(ContenidoEducativoBase):
    id_contenido: UUID
    fecha_publicacion: date

    model_config = {"from_attributes": True}
