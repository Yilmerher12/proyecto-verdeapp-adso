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

import re
from typing import Annotated, Optional
from urllib.parse import urlparse

from pydantic import AfterValidator, Field

# ¿Qué? Issue #352 — tamaño de las columnas url_adjunto, url_video y url_guia
#       (String(500) en los modelos): más largo, la base de datos falla con 500.
ENLACE_MAX_LENGTH = 500

# ¿Qué? Los mismos formatos que reconoce fe/src/components/ui/YoutubeEmbed.tsx.
DOMINIOS_YOUTUBE = {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"}


_RUTA_CODIFICADA = re.compile(r"%2[ef]", re.IGNORECASE)


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
    # ¿Qué? "%2e" es un "." y "%2f" es una "/" escritos en forma codificada
    #       (issue #400, CN-052). Solo se revisa en la rama /uploads/: en un
    #       enlace https:// externo "%2f" es normal.
    # ¿Para qué? "/uploads/%2e%2e/api/v1/..." no contiene ".." escrito, pero el
    #            navegador lo decodifica y lo resuelve a otra ruta del mismo sitio.
    # ¿Impacto? Mismas reglas que enlaceAdjuntoSeguro del frontend.
    if valor.startswith("/uploads/") and ".." not in valor and not _RUTA_CODIFICADA.search(valor):
        return valor
    partes = urlparse(valor)
    if partes.scheme == "https" and partes.netloc:
        return valor
    raise ValueError("El enlace debe empezar por https:// o ser un archivo subido a VerdeApp.")


# ¿Qué? Issue #399 (CN-049): el formato exacto que genera la subida de archivos
#       (utils/imagenes.py): carpeta adjuntos + uuid4 + extensión de imagen.
# ¿Impacto? `fullmatch` y no `match` con "$": "$" también acepta un salto de
#           línea al final, y ese texto ya no sería el nombre que guardamos.
_IMAGEN_PROPIA = re.compile(
    r"/uploads/adjuntos/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)"
)


def validar_imagen_propia(valor: str | None) -> str | None:
    """Acepta solo una imagen que subió esta misma app; ningún https:// externo."""
    valor = _vacio_a_none(valor)
    if valor is None:
        return None
    if _IMAGEN_PROPIA.fullmatch(valor):
        return valor
    raise ValueError("La imagen debe ser un archivo JPG, PNG o WEBP subido a VerdeApp.")


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
EnlaceAdjunto = Annotated[Optional[str], Field(max_length=ENLACE_MAX_LENGTH), AfterValidator(validar_enlace_adjunto)]
ImagenPropia = Annotated[Optional[str], Field(max_length=ENLACE_MAX_LENGTH), AfterValidator(validar_imagen_propia)]
EnlaceVideo = Annotated[Optional[str], Field(max_length=ENLACE_MAX_LENGTH), AfterValidator(validar_enlace_video)]
