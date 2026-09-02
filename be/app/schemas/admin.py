"""
Módulo: schemas/admin.py
Descripción: Schemas Pydantic para los endpoints exclusivos del panel del
             Administrador del Sistema.
"""

from pydantic import BaseModel


class CambiarHabilitadoRequest(BaseModel):
    """
    ¿Qué? Cuerpo del PATCH que activa o desactiva la cuenta de un usuario.
    ¿Para qué? Un solo campo booleano — el correo del usuario objetivo va
              en la URL, no aquí.
    """
    habilitado: bool
