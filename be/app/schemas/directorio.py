from pydantic import BaseModel
from typing import Optional


class RecicladorDirectorioResponse(BaseModel):
    id_reciclador: int
    nombre: str
    apellidos: str
    numero_telefonico: Optional[str] = None
    asociacion: Optional[str] = None
    nombre_localidad: Optional[str] = None

    model_config = {"from_attributes": True}


class PuntoAcopioDirectorioResponse(BaseModel):
    id_punto_acopio: int
    nombre: str
    direccion: str
    telefono_contacto: Optional[str] = None
    nombre_encargado: Optional[str] = None
    nombre_localidad: str

    model_config = {"from_attributes": True}
