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

    @field_validator("modulo_categoria")
    @classmethod
    def modulo_categoria_no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Este campo no puede quedar vacío.")
        return v

    # ¿Qué? HU-012/HU-013 (CA-012.1, CA-012.3, CA-013.3) piden un mínimo de
    #       5 caracteres en el título y 20 en el cuerpo, no solo "no vacío".
    # ¿Para qué? Antes de esto, un título de 2 letras o un cuerpo de 4
    #           caracteres pasaba sin error — el catálogo educativo podía
    #           terminar con módulos casi sin contenido real.
    # ¿Impacto? Aplica al crear Y al editar, porque ContenidoEducativoUpdate
    #           hereda de esta misma clase base.
    @field_validator("titulo_tema")
    @classmethod
    def titulo_tema_longitud_minima(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 5:
            raise ValueError("El título debe tener al menos 5 caracteres.")
        return v

    @field_validator("cuerpo_texto")
    @classmethod
    def cuerpo_texto_longitud_minima(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 20:
            raise ValueError("El cuerpo de texto debe tener al menos 20 caracteres.")
        return v


class ContenidoEducativoCreate(ContenidoEducativoBase):
    pass


class ContenidoEducativoUpdate(ContenidoEducativoBase):
    pass


class ContenidoEducativoResponse(ContenidoEducativoBase):
    id_contenido: UUID
    fecha_publicacion: date

    model_config = {"from_attributes": True}
