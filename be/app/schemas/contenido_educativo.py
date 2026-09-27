from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.utils.enlaces import EnlaceAdjunto, EnlaceVideo

# ¿Qué? Issue #352 — módulo y título = tamaño de su columna (String(255));
#       el cuerpo es Text, con un máximo propio de la app.
# ¿Impacto? Deben coincidir con CONTENIDO_* de fe/src/lib/validacion.ts.
MODULO_MAX_LENGTH = 255
TITULO_MAX_LENGTH = 255
CUERPO_MAX_LENGTH = 10000


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


class _ContenidoEducativoEntrada(ContenidoEducativoBase):
    """
    ¿Qué? Issue #314 (CN-015): los enlaces se validan solo en lo que ENTRA
          (crear/editar) — video solo de YouTube, guía solo https:// o un
          archivo subido.
    ¿Para qué? No se ponen en ContenidoEducativoBase porque de ahí también
              hereda ContenidoEducativoResponse: un dato viejo que no
              cumpla rompería el catálogo completo con un 500. Los máximos
              de #352 van aquí por la misma razón.
    """
    modulo_categoria: str = Field(max_length=MODULO_MAX_LENGTH)
    titulo_tema: str = Field(max_length=TITULO_MAX_LENGTH)
    cuerpo_texto: str = Field(max_length=CUERPO_MAX_LENGTH)
    url_video: EnlaceVideo = None
    url_guia: EnlaceAdjunto = None


class ContenidoEducativoCreate(_ContenidoEducativoEntrada):
    pass


class ContenidoEducativoUpdate(_ContenidoEducativoEntrada):
    pass


class ContenidoEducativoResponse(ContenidoEducativoBase):
    id_contenido: UUID
    fecha_publicacion: date

    model_config = {"from_attributes": True}


# ¿Qué? Envío manual de un módulo a uno o varios conjuntos (RQF-018) — sin
#       pasar por una auditoría del Reciclador.
class EnviarContenidoRequest(BaseModel):
    conjuntos: list[UUID]

    @field_validator("conjuntos")
    @classmethod
    def al_menos_un_conjunto(cls, v: list[UUID]) -> list[UUID]:
        if not v:
            raise ValueError("Elige al menos un conjunto.")
        return v


class EnvioContenidoResponse(BaseModel):
    id_conjunto_residencial: UUID
    nombre_conjunto: str
    created_at: datetime

    model_config = {"from_attributes": True}
