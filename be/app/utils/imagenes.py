"""
Módulo: utils/imagenes.py
Descripción: Validación y guardado de imágenes/documentos subidos por el
             usuario, compartido entre cualquier feature que reciba un
             archivo (evidencia de auditorías, adjuntos de comunicados/
             novedades, guía de apoyo del contenido educativo).
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

# ¿Qué? PDF/Word/Excel quedan aparte de TIPOS_IMAGEN_PERMITIDOS, no
#       mezclados ahí.
# ¿Para qué? Solo los acepta quien lo pida explícitamente
#           (permitir_documentos=True en guardar_imagen_subida) —
#           evidencias de auditoría, por ejemplo, deben seguir siendo
#           solo imágenes reales, nunca un documento.
# ¿Impacto? Word (.docx) y Excel (.xlsx) modernos son, por dentro, un ZIP
#           — mismo formato de compresión que cualquier carpeta
#           comprimida, con archivos XML adentro. Por eso comparten la
#           misma firma de bytes (FIRMA_ZIP) y por eso NO se distinguen
#           entre sí ni de un ZIP cualquiera con solo mirar el inicio del
#           archivo — abrir el ZIP y revisar su contenido interno sí lo
#           permitiría, pero es mucho más código para un beneficio chico
#           en un proyecto de este tamaño. Lo que sí se logra: que sea un
#           ZIP real, no un .txt renombrado (la misma amenaza que ya
#           cubren las imágenes). No se soportan los formatos viejos
#           (.doc, .xls) — usan otra firma binaria distinta (OLE), y hoy
#           nadie los pidió.
TIPOS_DOCUMENTO_PERMITIDOS = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
}
TIPO_PDF = "application/pdf"
FIRMA_PDF = b"%PDF-"
FIRMA_ZIP = b"PK\x03\x04"
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


def _validar_contenido_zip(contenido: bytes) -> None:
    """
    ¿Qué? Word (.docx) y Excel (.xlsx) modernos son un ZIP por dentro —
          ver el comentario de TIPOS_DOCUMENTO_PERMITIDOS arriba. Esto
          solo confirma que el archivo es un ZIP real, no que sea
          específicamente un Word o un Excel.
    """
    if not contenido.startswith(FIRMA_ZIP):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo no es un documento de Word/Excel válido.",
        )


def _escribir_imagen(carpeta: Path, ruta: Path, contenido: bytes) -> None:
    """La otra parte bloqueante — crear la carpeta si hace falta y escribir el archivo."""
    carpeta.mkdir(parents=True, exist_ok=True)
    ruta.write_bytes(contenido)


async def guardar_imagen_subida(
    archivo: UploadFile,
    carpeta_destino: Path,
    ruta_publica_base: str,
    permitir_documentos: bool = False,
) -> str:
    """
    ¿Qué? Valida tipo/tamaño/contenido real del archivo y lo guarda en
          disco con un nombre aleatorio (evita que dos personas pisen el
          archivo de la otra si ambas suben algo llamado "foto.jpg").
    ¿Para qué? "carpeta_destino" y "ruta_publica_base" los define quien
              llama, para que auditorías, comunicados/novedades y
              contenido educativo guarden cada uno en su propia carpeta,
              sin mezclarse, reutilizando la misma validación.
              "permitir_documentos" es False por defecto a propósito —
              evidencias de auditoría, por ejemplo, deben seguir
              aceptando solo imágenes reales; solo quien de verdad lo
              necesita (comunicados, guía de apoyo) lo pide en True.
    ¿Impacto? Devuelve la ruta PÚBLICA (para guardar en la BD y servir al
             frontend vía /uploads, ver main.py), no la ruta absoluta del
             servidor.
    """
    tipos_permitidos = dict(TIPOS_IMAGEN_PERMITIDOS)
    if permitir_documentos:
        tipos_permitidos.update(TIPOS_DOCUMENTO_PERMITIDOS)

    extension = tipos_permitidos.get(archivo.content_type or "")
    if extension is None:
        formatos = "JPG, PNG, WEBP, PDF, Word (.docx) o Excel (.xlsx)" if permitir_documentos else "JPG, PNG o WEBP"
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
    #       archivo sea de verdad lo que dice ser. Pillow (imágenes), la
    #       firma "%PDF-" (PDF), o la firma de ZIP (Word/Excel) revisan
    #       el contenido real.
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
    elif archivo.content_type in TIPOS_DOCUMENTO_PERMITIDOS:
        await asyncio.to_thread(_validar_contenido_zip, contenido)
    else:
        await asyncio.to_thread(_validar_contenido_imagen, contenido)

    nombre_archivo = f"{uuid.uuid4()}{extension}"
    ruta = carpeta_destino / nombre_archivo
    await asyncio.to_thread(_escribir_imagen, carpeta_destino, ruta, contenido)

    return f"{ruta_publica_base}/{nombre_archivo}"
