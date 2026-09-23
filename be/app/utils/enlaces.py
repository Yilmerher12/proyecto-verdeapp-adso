"""
Módulo: utils/enlaces.py
Descripción: Validación de los enlaces que guardan comunicados, novedades y
             contenido educativo (issue #314, hallazgo CN-015).
¿Para qué? Antes, url_adjunto, url_guia y url_video aceptaban cualquier
           texto: un administrador podía publicar un enlace a un sitio de
           suplantación, o un "//sitio-malo.com" que el navegador trata como
           enlace externo.
¿Impacto? Se usan como field_validator solo en los esquemas de crear/editar,
          no en los de respuesta: un dato viejo que no cumpla no rompe los
          listados.
"""

from typing import Annotated, Optional
from urllib.parse import urlparse

from pydantic import AfterValidator

# ¿Qué? Los mismos formatos que reconoce fe/src/components/ui/YoutubeEmbed.tsx.
DOMINIOS_YOUTUBE = {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"}


def _vacio_a_none(valor: str | None) -> str | None:
    """El formulario manda "" cuando se borra el campo; eso es "sin enlace"."""
    if valor is None or not valor.strip():
        return None
    return valor.strip()


def validar_enlace_adjunto(valor: str | None) -> str | None:
    """Acepta un archivo subido a VerdeApp (/uploads/...) o un enlace https://."""
    valor = _vacio_a_none(valor)
    if valor is None:
        return None
    if valor.startswith("/uploads/") and ".." not in valor:
        return valor
    partes = urlparse(valor)
    if partes.scheme == "https" and partes.netloc:
        return valor
    raise ValueError("El enlace debe empezar por https:// o ser un archivo subido a VerdeApp.")


def validar_enlace_video(valor: str | None) -> str | None:
    """Acepta solo videos de YouTube por https://."""
    valor = _vacio_a_none(valor)
    if valor is None:
        return None
    partes = urlparse(valor)
    if partes.scheme == "https" and partes.netloc.lower() in DOMINIOS_YOUTUBE:
        return valor
    raise ValueError("El video debe ser un enlace de YouTube (https://www.youtube.com/... o https://youtu.be/...).")


# ¿Qué? Tipos listos para usar en los esquemas de crear/editar: el campo
#       queda "url_adjunto: EnlaceAdjunto = None" en vez de repetir el mismo
#       field_validator en cada clase.
EnlaceAdjunto = Annotated[Optional[str], AfterValidator(validar_enlace_adjunto)]
EnlaceVideo = Annotated[Optional[str], AfterValidator(validar_enlace_video)]
