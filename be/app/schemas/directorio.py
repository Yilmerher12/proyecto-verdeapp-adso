from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class RecicladorDirectorioResponse(BaseModel):
    id_reciclador: UUID
    nombre: str
    apellidos: str
    numero_telefonico: Optional[str] = None
    asociacion: Optional[str] = None
    nombre_localidad: Optional[str] = None

    model_config = {"from_attributes": True}


class PuntoAcopioDirectorioResponse(BaseModel):
    id_punto_acopio: UUID
    nombre: str
    direccion: str
    telefono_contacto: Optional[str] = None
    nombre_encargado: Optional[str] = None
    nombre_localidad: str
    url_foto: Optional[str] = None
    # ¿Qué? Datos del inventario de la UAESP (issue #664); None en los puntos creados a mano.
    organizacion: Optional[str] = None
    correo_contacto: Optional[str] = None

    model_config = {"from_attributes": True}


class PuntoAcopioDirectorioPagina(BaseModel):
    """¿Qué? Una página del directorio: los puntos pedidos y cuántos hay en total con ese filtro."""

    items: list[PuntoAcopioDirectorioResponse]
    total: int
