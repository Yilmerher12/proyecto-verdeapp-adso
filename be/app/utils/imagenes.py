"""
Módulo: utils/imagenes.py
Descripción: Validación y guardado de imágenes subidas por el usuario,
             compartido entre cualquier feature que reciba una foto
             (evidencia de auditorías, adjuntos de comunicados/novedades).
¿Para qué? Antes esta lógica vivía duplicada solo en
          auditoria_conjunto_service.py — al agregar la subida de imagen
          para comunicados/novedades, se extrajo aquí para que ambas
          features validen exactamente igual (mismo formato, mismo tamaño
          máximo, misma verificación real del contenido) sin repetir código.
"""
import asyncio
import io
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

TIPOS_IMAGEN_PERMITIDOS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
# ¿Qué? PDF queda aparte de TIPOS_IMAGEN_PERMITIDOS, no mezclado ahí.
# ¿Para qué? Solo lo acepta quien lo pida explícitamente (permitir_pdf=True
#           en guardar_imagen_subida) — evidencias de auditoría, por
#           ejemplo, deben seguir siendo solo imágenes reales, nunca PDF.
TIPO_PDF = "application/pdf"
EXTENSION_PDF = ".pdf"
FIRMA_PDF = b"%PDF-"
TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024  # 5 MB


def _validar_contenido_imagen(contenido: bytes) -> None:
    """Parte bloqueante — corre en un hilo aparte (ver guardar_imagen_subida).

    ¿Qué? Pillow no siempre avisa un archivo inválido con
          UnidentifiedImageError/OSError — un PNG con el checksum de un
          chunk corrupto (encontrado probando esto en vivo, no solo en
          teoría) lanza SyntaxError en su lugar.
    ¿Impacto? Sin capturar también SyntaxError, un archivo así tumbaba
             todo el endpoint con un error 500 sin control, en vez de
             responder con el 400 claro de siempre."""
    try:
        Image.open(io.BytesIO(contenido)).verify()
    except (UnidentifiedImageError, OSError, SyntaxError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo no es una imagen válida.",
        )


def _validar_contenido_pdf(contenido: bytes) -> None:
    """
    ¿Qué? El "Content-Type" lo declara el navegador — no es garantía. Un
          PDF de verdad siempre empieza con la firma "%PDF-" en sus
          primeros bytes; Pillow no sirve aquí porque un PDF no es una
          imagen.
    """
    if not contenido.startswith(FIRMA_PDF):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo no es un PDF válido.",
        )


def _escribir_imagen(carpeta: Path, ruta: Path, contenido: bytes) -> None:
    """La otra parte bloqueante — crear la carpeta si hace falta y escribir el archivo."""
    carpeta.mkdir(parents=True, exist_ok=True)
    ruta.write_bytes(contenido)


async def guardar_imagen_subida(
    archivo: UploadFile,
    carpeta_destino: Path,
    ruta_publica_base: str,
    permitir_pdf: bool = False,
) -> str:
    """
    ¿Qué? Valida tipo/tamaño/contenido real del archivo y lo guarda en
          disco con un nombre aleatorio (evita que dos personas pisen el
          archivo de la otra si ambas suben algo llamado "foto.jpg").
    ¿Para qué? "carpeta_destino" y "ruta_publica_base" los define quien
              llama, para que auditorías y adjuntos de comunicados/
              novedades/contenido educativo guarden cada uno en su propia
              carpeta, sin mezclarse, reutilizando la misma validación.
              "permitir_pdf" es False por defecto a propósito — evidencias
              de auditoría, por ejemplo, deben seguir aceptando solo
              imágenes reales; solo quien de verdad lo necesita (la guía
              de apoyo del contenido educativo) lo pide en True.
    ¿Impacto? Devuelve la ruta PÚBLICA (para guardar en la BD y servir al
             frontend vía /uploads, ver main.py), no la ruta absoluta del
             servidor.
    """
    tipos_permitidos = dict(TIPOS_IMAGEN_PERMITIDOS)
    if permitir_pdf:
        tipos_permitidos[TIPO_PDF] = EXTENSION_PDF

    extension = tipos_permitidos.get(archivo.content_type or "")
    if extension is None:
        formatos = "JPG, PNG, WEBP o PDF" if permitir_pdf else "JPG, PNG o WEBP"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El archivo debe ser {formatos}.",
        )

    contenido = await archivo.read()
    if len(contenido) > TAMANO_MAXIMO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo no puede superar 5 MB.",
        )
    if len(contenido) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo está vacío.")

    # ¿Qué? El "Content-Type" de arriba lo escribe el navegador del
    #       cliente — es solo una etiqueta, no una garantía de que el
    #       archivo sea de verdad lo que dice ser. Pillow (imágenes) o la
    #       firma "%PDF-" (PDF) revisan el contenido real.
    # ¿Para qué? Sin este chequeo, alguien podía renombrar cualquier
    #           archivo a ".jpg" y declarar Content-Type "image/jpeg" a
    #           mano, y el backend lo aceptaba igual.
    # ¿Impacto? Se corre con asyncio.to_thread (igual que la escritura a
    #           disco de abajo) porque FastAPI corre en un solo hilo por
    #           worker — código síncrono que tarda (Pillow, disco) bloquea
    #           ese hilo completo y congela el servidor para TODOS los
    #           usuarios mientras corre, no solo para quien sube el archivo.
    if archivo.content_type == TIPO_PDF:
        await asyncio.to_thread(_validar_contenido_pdf, contenido)
    else:
        await asyncio.to_thread(_validar_contenido_imagen, contenido)

    nombre_archivo = f"{uuid.uuid4()}{extension}"
    ruta = carpeta_destino / nombre_archivo
    await asyncio.to_thread(_escribir_imagen, carpeta_destino, ruta, contenido)

    return f"{ruta_publica_base}/{nombre_archivo}"
