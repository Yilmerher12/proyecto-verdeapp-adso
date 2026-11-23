"""
Módulo: limpiar_evidencias.py
Descripción: Borra las fotos de evidencia de las auditorías que ya pasaron el plazo de
             retención (6 meses) y deja en NULL sus rutas; la auditoría se conserva.
¿Para qué? Issue #587: las fotos son de los cuartos de basuras de los residentes. Guardarlas
          para siempre llena el disco y no hace falta: el historial y las gráficas salen del
          resultado, la fecha y el tema, no de la foto. Política completa en
          docs/gestion-proyecto/politica-retencion-fotos-evidencia.md.
¿Impacto? Es un comando manual (nada lo corre solo). Trabaja sobre la carpeta de la máquina
          donde se ejecuta (be/app/uploads/evidencias-auditoria): en Docker hay que correrlo
          dentro del contenedor del backend. Si algún día las fotos se guardan en otro
          servidor o servicio de archivos, solo hay que cambiar `borrar_archivo` (abajo);
          el plazo, la consulta y la pantalla no cambian. Borrar no se puede deshacer:
          primero corre con --simular para ver qué borraría.

Uso, desde be/:
    uv run python -m app.limpiar_evidencias --simular
    uv run python -m app.limpiar_evidencias
"""

import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.auditoria_conjunto import AuditoriaConjunto
from app.services.auditoria_conjunto_service import CARPETA_EVIDENCIAS

# ¿Qué? Cuánto tiempo se guardan las fotos de evidencia: 180 días (6 meses).
# ¿Para qué? Propuesta del issue #587, pendiente de aprobación del grupo y del profesor
#           (ver la política). Si ellos eligen otro plazo, este es el único número que cambia.
# ¿Impacto? Se cuenta desde la fecha de la auditoría (`created_at`), no desde la última vez que
#           alguien abrió la foto.
PLAZO_RETENCION = timedelta(days=180)


def _rutas(auditoria: AuditoriaConjunto) -> list[str]:
    return [r for r in (auditoria.ruta_evidencia, auditoria.ruta_evidencia_2, auditoria.ruta_evidencia_3) if r]


def borrar_archivo(carpeta: Path, nombre: str) -> None:
    """
    ¿Qué? Borra un archivo de la carpeta de evidencias; si ya no existe, no pasa nada.
    ¿Para qué? Es la ÚNICA función que toca el almacenamiento de archivos: si las fotos pasan a
              otro servidor, se reescribe esta y nada más.
    """
    (carpeta / nombre).unlink(missing_ok=True)


def limpiar(
    db: Session,
    carpeta: Path,
    simular: bool,
    ahora: datetime | None = None,
    plazo: timedelta = PLAZO_RETENCION,
) -> tuple[list[AuditoriaConjunto], list[str]]:
    """
    ¿Qué? Devuelve (auditorías vencidas con foto, nombres de archivo que se borran);
          con simular=False además borra los archivos y deja las rutas en NULL.
    ¿Para qué? Una misma foto puede estar en más de una auditoría (el seed de demostración
              reutiliza archivos). Un archivo solo se borra si NINGUNA auditoría que se
              conserva lo sigue usando.
    ¿Impacto? Solo se tocan las auditorías con más de `plazo` de antigüedad que todavía
              tienen alguna ruta; el resto queda igual.
    """
    ahora = ahora or datetime.now(timezone.utc)
    limite = ahora - plazo
    con_foto = or_(
        AuditoriaConjunto.ruta_evidencia.is_not(None),
        AuditoriaConjunto.ruta_evidencia_2.is_not(None),
        AuditoriaConjunto.ruta_evidencia_3.is_not(None),
    )
    vencidas = list(db.scalars(select(AuditoriaConjunto).where(AuditoriaConjunto.created_at < limite, con_foto)))
    vigentes = db.scalars(select(AuditoriaConjunto).where(AuditoriaConjunto.created_at >= limite, con_foto))
    en_uso = {ruta.rsplit("/", 1)[-1] for auditoria in vigentes for ruta in _rutas(auditoria)}
    a_borrar = sorted(
        {ruta.rsplit("/", 1)[-1] for auditoria in vencidas for ruta in _rutas(auditoria)} - en_uso
    )
    if not simular:
        for nombre in a_borrar:
            borrar_archivo(carpeta, nombre)
        for auditoria in vencidas:
            auditoria.ruta_evidencia = None
            auditoria.ruta_evidencia_2 = None
            auditoria.ruta_evidencia_3 = None
        db.commit()
    return vencidas, a_borrar


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Borra las fotos de evidencia de auditorías con más de 6 meses y conserva la auditoría."
    )
    parser.add_argument("--simular", action="store_true", help="solo lista lo que borraría, sin borrar nada")
    args = parser.parse_args()
    with SessionLocal() as db:
        vencidas, archivos = limpiar(db, CARPETA_EVIDENCIAS, simular=args.simular)
    verbo = "Se borrarían" if args.simular else "Se borraron"
    for nombre in archivos:
        print(nombre)
    print(
        f"{verbo} {len(archivos)} foto(s) de {len(vencidas)} auditoría(s) con más de "
        f"{PLAZO_RETENCION.days} días, de {CARPETA_EVIDENCIAS}."
    )


if __name__ == "__main__":
    main()
