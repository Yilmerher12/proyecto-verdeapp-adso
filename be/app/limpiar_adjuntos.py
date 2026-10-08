"""
Módulo: limpiar_adjuntos.py
Descripción: Borra de be/app/uploads/adjuntos/ los archivos que ninguna fila de
             la base de datos usa y que tienen más de 24 horas.
¿Para qué? Issue #395 (CN-046): quien sube una foto y nunca envía el
          formulario deja el archivo ahí para siempre, y con el tiempo se
          llena el disco.
¿Impacto? Es un comando manual (nada lo corre solo; programarlo en
          producción es de la tarjeta #317). Trabaja sobre la carpeta de la
          máquina donde se ejecuta: en Docker hay que correrlo dentro del
          contenedor del backend. Borrar no se puede deshacer: primero
          corre con --simular para ver qué borraría.

Uso, desde be/:
    uv run python -m app.limpiar_adjuntos --simular
    uv run python -m app.limpiar_adjuntos
"""

import argparse
import time
from datetime import timedelta
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.agenda_conjunto import AgendaConjunto
from app.models.archivo_subido import ArchivoSubido
from app.models.auditoria_conjunto import AuditoriaConjunto
from app.models.comunicado import Comunicado
from app.models.contenido_educativo import ContenidoEducativo
from app.models.novedad import Novedad
from app.models.novedad_enviada import NovedadEnviada
from app.models.usuario import Usuario
from app.routers.uploads import CARPETA_ADJUNTOS

# ¿Qué? Antigüedad mínima de un archivo sin referencia para borrarlo.
# ¿Para qué? Quien acaba de subir una foto todavía está llenando el formulario:
#           su archivo no está referenciado aún, pero sí se va a usar.
ANTIGUEDAD_MINIMA = timedelta(hours=24)

# ¿Qué? Columnas donde se guarda la ruta de un archivo de /uploads/adjuntos/.
# ¿Impacto? Si falta una aquí, esta limpieza BORRA archivos que sí se usan. Por eso
#           test_limpiar_adjuntos.py falla si aparece en los modelos una columna
#           que parezca un enlace y no esté en esta lista ni en la de abajo.
COLUMNAS_CON_ADJUNTOS = [
    Comunicado.url_adjunto,
    Novedad.url_adjunto,
    ContenidoEducativo.url_guia,
    NovedadEnviada.url_imagen,
    AgendaConjunto.url_evidencia,
]

# ¿Qué? Columnas que parecen un enlace pero NO apuntan a /uploads/adjuntos/.
# ¿Para qué? Los videos son de YouTube; la foto de perfil y las evidencias de
#           auditoría viven en otras carpetas; archivos_subidos.ruta es el
#           registro de quién subió qué, no un uso del archivo.
COLUMNAS_SIN_ADJUNTOS = [
    ContenidoEducativo.url_video,
    Novedad.url_video,
    Usuario.foto_perfil_url,
    AuditoriaConjunto.ruta_evidencia,
    AuditoriaConjunto.ruta_evidencia_2,
    AuditoriaConjunto.ruta_evidencia_3,
    ArchivoSubido.ruta,
]


def nombres_en_uso(db: Session) -> set[str]:
    """Nombres de archivo (sin carpeta) que alguna fila referencia."""
    nombres: set[str] = set()
    for columna in COLUMNAS_CON_ADJUNTOS:
        for ruta in db.scalars(select(columna).where(columna.is_not(None))):
            nombres.add(ruta.rsplit("/", 1)[-1])
    return nombres


def limpiar(db: Session, carpeta: Path, simular: bool, ahora: float | None = None) -> list[Path]:
    """Devuelve los archivos sin uso y viejos; con simular=False además los borra."""
    if not carpeta.is_dir():
        return []
    ahora = time.time() if ahora is None else ahora
    en_uso = nombres_en_uso(db)
    sobrantes = [
        archivo
        for archivo in sorted(carpeta.iterdir())
        if archivo.is_file()
        and archivo.name not in en_uso
        and ahora - archivo.stat().st_mtime > ANTIGUEDAD_MINIMA.total_seconds()
    ]
    if not simular:
        for archivo in sobrantes:
            archivo.unlink()
    return sobrantes


def main() -> None:
    parser = argparse.ArgumentParser(description="Borra los adjuntos que ninguna fila usa y tienen más de 24 horas.")
    parser.add_argument("--simular", action="store_true", help="solo lista lo que borraría, sin borrar nada")
    args = parser.parse_args()
    with SessionLocal() as db:
        sobrantes = limpiar(db, CARPETA_ADJUNTOS, simular=args.simular)
    verbo = "Se borrarían" if args.simular else "Se borraron"
    for archivo in sobrantes:
        print(archivo.name)
    print(f"{verbo} {len(sobrantes)} archivo(s) de {CARPETA_ADJUNTOS}.")


if __name__ == "__main__":
    main()
