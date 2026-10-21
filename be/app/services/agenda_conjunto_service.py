"""
Módulo: services/agenda_conjunto_service.py
Descripción: Lógica de la agenda interna del Admin de Conjunto — crear,
             listar, archivar / restaurar y borrar.
¿Para qué? Privada del Admin de Conjunto: sin aprobación ni notificaciones.
"""

import csv
import io
import re
import unicodedata
from datetime import date, datetime, time, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.models.administrador_conjunto import AdministradorConjunto
from app.models.agenda_conjunto import AgendaConjunto, EstadoAgenda
from app.schemas.agenda_conjunto import CambiarEstadoAgendaRequest, CrearAgendaItemRequest
from app.utils.pdf_agenda import construir_pdf_historial

# ¿Qué? Tope de temas por descarga (issue #479).
# ¿Para qué? Que un rango enorme no arme un archivo arbitrariamente grande en memoria.
# ¿Impacto? Si el rango pide más, el endpoint responde 400 pidiendo acotarlo.
MAX_FILAS_DESCARGA = 500

# ¿Qué? Bogotá (UTC-5). Colombia no usa horario de verano, así que el desfase es fijo.
# ¿Para qué? Los límites "desde"/"hasta" y las fechas del archivo se leen en hora de Bogotá,
#           como las ve el usuario. La BD guarda todo en UTC: un tema creado el domingo a las
#           9:00 p. m. ya es lunes en UTC y caería en otro día del rango.
# ¿Impacto? No hace falta la librería tzdata (en Windows zoneinfo no trae las zonas).
HUSO_BOGOTA = timezone(timedelta(hours=-5))

ENCABEZADOS_CSV = ["Tema", "Estado", "Creado", "Archivado", "Autor", "Foto"]


def _verificar_conjunto_propio(administrador: AdministradorConjunto, id_conjunto: UUID) -> None:
    """Mismo chequeo de propiedad que conjunto_panel.py — un Admin de Conjunto
    solo puede operar sobre SUS conjuntos, nunca los de otro."""
    ids_propios = {c.id_conjunto_residencial for c in administrador.conjuntos}
    if id_conjunto not in ids_propios:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso sobre este conjunto.")


def _obtener_item(db: Session, id_conjunto: UUID, id_item: UUID) -> AgendaConjunto:
    item = db.get(AgendaConjunto, id_item)
    if not item or item.id_conjunto_residencial != id_conjunto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El tema no existe.")
    return item


def listar(db: Session, administrador: AdministradorConjunto, id_conjunto: UUID) -> list[AgendaConjunto]:
    """¿Qué? Los temas PENDIENTES ("Por tratar"), el más reciente primero. Los archivados salen aparte, paginados."""
    _verificar_conjunto_propio(administrador, id_conjunto)
    stmt = (
        select(AgendaConjunto)
        .where(
            AgendaConjunto.id_conjunto_residencial == id_conjunto,
            AgendaConjunto.estado == EstadoAgenda.PENDIENTE.value,
        )
        .order_by(AgendaConjunto.created_at.desc(), AgendaConjunto.id)
    )
    return list(db.scalars(stmt).all())


def listar_archivadas(
    db: Session, administrador: AdministradorConjunto, id_conjunto: UUID, limit: int, offset: int
) -> tuple[list[AgendaConjunto], int]:
    """¿Qué? Una página del historial (temas ARCHIVADOS, el último archivado primero) + cuántos hay en total."""
    _verificar_conjunto_propio(administrador, id_conjunto)
    donde = (
        AgendaConjunto.id_conjunto_residencial == id_conjunto,
        AgendaConjunto.estado == EstadoAgenda.ARCHIVADA.value,
    )
    total = db.scalar(select(func.count()).select_from(AgendaConjunto).where(*donde))
    stmt = (
        select(AgendaConjunto)
        .where(*donde)
        .order_by(AgendaConjunto.archivado_en.desc(), AgendaConjunto.id)
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(stmt).all()), total


def crear(
    db: Session, administrador: AdministradorConjunto, id_conjunto: UUID, data: CrearAgendaItemRequest
) -> AgendaConjunto:
    _verificar_conjunto_propio(administrador, id_conjunto)
    item = AgendaConjunto(
        id_conjunto_residencial=id_conjunto,
        autor_id=administrador.id_usuario,
        texto=data.texto,
        url_evidencia=data.url_evidencia,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def cambiar_estado(
    db: Session, administrador: AdministradorConjunto, id_conjunto: UUID, id_item: UUID, data: CambiarEstadoAgendaRequest
) -> AgendaConjunto:
    _verificar_conjunto_propio(administrador, id_conjunto)
    item = _obtener_item(db, id_conjunto, id_item)
    item.estado = data.estado
    # ¿Qué? La fecha de archivado se pone al archivar y se borra al restaurar el tema.
    item.archivado_en = datetime.now(timezone.utc) if data.estado == EstadoAgenda.ARCHIVADA.value else None
    db.commit()
    db.refresh(item)
    return item


def eliminar(db: Session, administrador: AdministradorConjunto, id_conjunto: UUID, id_item: UUID) -> None:
    """¿Qué? Borra el tema para siempre (pendiente o archivado). Lo normal al resolverlo es archivarlo."""
    _verificar_conjunto_propio(administrador, id_conjunto)
    db.delete(_obtener_item(db, id_conjunto, id_item))
    db.commit()


def _limites_utc(desde: date | None, hasta: date | None) -> tuple[datetime | None, datetime | None]:
    """¿Qué? Las fechas elegidas (hora de Bogotá) como instantes: el día "hasta" entra completo,
    por eso el límite superior es el comienzo del día siguiente (se compara con "<")."""
    inicio = datetime.combine(desde, time.min, tzinfo=HUSO_BOGOTA) if desde else None
    fin = datetime.combine(hasta + timedelta(days=1), time.min, tzinfo=HUSO_BOGOTA) if hasta else None
    return inicio, fin


def _en_rango(columna, inicio: datetime | None, fin: datetime | None) -> list:
    condiciones = []
    if inicio is not None:
        condiciones.append(columna >= inicio)
    if fin is not None:
        condiciones.append(columna < fin)
    return condiciones


def _condicion_descarga(id_conjunto: UUID, estado: str, desde: date | None, hasta: date | None):
    """¿Qué? Qué temas entran a la descarga. Un archivado entra si su fecha de ARCHIVADO cae en
    el rango; un pendiente, si su fecha de CREACIÓN cae en el rango.
    ¿Para qué? Así el archivo trae lo que se resolvió en ese período y lo que se abrió y sigue
              pendiente (filtrar solo por creación dejaría fuera lo resuelto en el período
              pero creado antes)."""
    inicio, fin = _limites_utc(desde, hasta)
    pendientes = and_(AgendaConjunto.estado == EstadoAgenda.PENDIENTE.value, *_en_rango(AgendaConjunto.created_at, inicio, fin))
    archivadas = and_(AgendaConjunto.estado == EstadoAgenda.ARCHIVADA.value, *_en_rango(AgendaConjunto.archivado_en, inicio, fin))
    if estado == EstadoAgenda.PENDIENTE.value:
        por_estado = pendientes
    elif estado == EstadoAgenda.ARCHIVADA.value:
        por_estado = archivadas
    else:
        por_estado = or_(pendientes, archivadas)
    return and_(AgendaConjunto.id_conjunto_residencial == id_conjunto, por_estado)


def _celda_segura(valor: str) -> str:
    """¿Qué? Si el texto empieza con =, +, - o @, Excel lo toma como una fórmula y la calcula al abrir el archivo.
    ¿Para qué? El texto lo escribe una persona: se le antepone una comilla simple para que Excel lo lea como texto.
    ¿Impacto? Se aplica a toda celda con texto libre (tema, autor, enlace)."""
    return "'" + valor if valor[:1] in ("=", "+", "-", "@", "\t", "\r") else valor


def _fecha(valor: datetime | None) -> str:
    return valor.astimezone(HUSO_BOGOTA).strftime("%d/%m/%Y") if valor else ""


def _enlace_completo(url: str | None, base_url: str) -> str:
    """¿Qué? La foto se guarda como "/uploads/..." (relativa a la API); fuera de la app no abre,
    así que en el archivo va con la dirección completa."""
    if not url:
        return ""
    return base_url.rstrip("/") + url if url.startswith("/") else url


def _nombre_conjunto(administrador: AdministradorConjunto, id_conjunto: UUID) -> str:
    return next(c.nombre_conjunto for c in administrador.conjuntos if c.id_conjunto_residencial == id_conjunto)


def _nombre_archivo(nombre_conjunto: str, desde: date | None, hasta: date | None, extension: str) -> str:
    """¿Qué? historial-agenda-<conjunto>-<desde>_<hasta>.<extensión>: sin datos personales, solo ASCII."""
    ascii_ = unicodedata.normalize("NFKD", nombre_conjunto).encode("ascii", "ignore").decode().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_).strip("-")
    return f"historial-agenda-{slug}-{desde or 'inicio'}_{hasta or 'hoy'}.{extension}"


def contar_descarga(
    db: Session,
    administrador: AdministradorConjunto,
    id_conjunto: UUID,
    estado: str,
    desde: date | None,
    hasta: date | None,
) -> int:
    """¿Qué? Cuántos temas entrarían a la descarga con estos filtros, sin armar el archivo.
    ¿Para qué? La ventana "Descargar agenda" muestra el número antes de descargar. Usa la misma
              validación y la misma condición (_condicion_descarga) que el CSV y el PDF, así el
              número nunca difiere de las filas del archivo.
    ¿Impacto? No aplica el tope de 500: devuelve el total real y la pantalla decide qué hacer con él.
              Solo _filas_de_la_descarga lanza el 400 por pasar del tope."""
    _verificar_conjunto_propio(administrador, id_conjunto)
    if desde and hasta and desde > hasta:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail='La fecha "desde" no puede ser posterior a la fecha "hasta".'
        )
    donde = _condicion_descarga(id_conjunto, estado, desde, hasta)
    return db.scalar(select(func.count()).select_from(AgendaConjunto).where(donde))


def _filas_de_la_descarga(
    db: Session,
    administrador: AdministradorConjunto,
    id_conjunto: UUID,
    estado: str,
    desde: date | None,
    hasta: date | None,
    base_url: str,
) -> list[tuple[str, str, str, str, str, str]]:
    """¿Qué? Los temas de la descarga, más antiguo primero (como un acta), ya como texto:
          (tema, estado, creado, archivado, autor, enlace de la foto).
    ¿Para qué? El CSV y el PDF salen de aquí, así SIEMPRE traen los mismos temas: mismo filtro de
              fechas en hora de Bogotá, mismo tope de 500 y misma validación de conjunto propio.
    ¿Impacto? Sin temas devuelve una lista vacía (el archivo trae solo los encabezados)."""
    total = contar_descarga(db, administrador, id_conjunto, estado, desde, hasta)
    if total > MAX_FILAS_DESCARGA:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El rango tiene {total} temas y el máximo por descarga es {MAX_FILAS_DESCARGA}. Acota las fechas.",
        )

    donde = _condicion_descarga(id_conjunto, estado, desde, hasta)
    # ¿Qué? El autor sale como nombre y apellidos (no el correo) del administrador; vacío si su cuenta ya se borró.
    stmt = (
        select(AgendaConjunto, AdministradorConjunto.nombre, AdministradorConjunto.apellidos)
        .outerjoin(AdministradorConjunto, AdministradorConjunto.id_usuario == AgendaConjunto.autor_id)
        .where(donde)
        .order_by(AgendaConjunto.created_at.asc(), AgendaConjunto.id)
    )
    return [
        (
            tema.texto,
            "Archivado" if tema.estado == EstadoAgenda.ARCHIVADA.value else "Pendiente",
            _fecha(tema.created_at),
            _fecha(tema.archivado_en),
            f"{nombre} {apellidos}".strip() if nombre else "",
            _enlace_completo(tema.url_evidencia, base_url),
        )
        for tema, nombre, apellidos in db.execute(stmt).all()
    ]


def exportar_csv(
    db: Session,
    administrador: AdministradorConjunto,
    id_conjunto: UUID,
    estado: str,
    desde: date | None,
    hasta: date | None,
    base_url: str,
) -> tuple[bytes, str]:
    """¿Qué? El historial de la agenda como CSV listo para Excel en español: separador ";" y
          UTF-8 con BOM (sin el BOM Excel muestra mal las tildes).
    ¿Para qué? Que el Admin de Conjunto anexe el historial al acta del comité sin copiar a mano.
    ¿Impacto? Devuelve (contenido, nombre del archivo). Sin temas en el rango, el archivo trae solo los encabezados."""
    filas = _filas_de_la_descarga(db, administrador, id_conjunto, estado, desde, hasta, base_url)
    buffer = io.StringIO()
    escritor = csv.writer(buffer, delimiter=";", lineterminator="\r\n")
    escritor.writerow(ENCABEZADOS_CSV)
    for fila in filas:
        escritor.writerow([_celda_segura(celda) for celda in fila])
    nombre = _nombre_archivo(_nombre_conjunto(administrador, id_conjunto), desde, hasta, "csv")
    return buffer.getvalue().encode("utf-8-sig"), nombre


_TEXTO_ESTADO = {
    EstadoAgenda.PENDIENTE.value: "solo por tratar",
    EstadoAgenda.ARCHIVADA.value: "solo archivados",
}


def _texto_del_rango(desde: date | None, hasta: date | None) -> str:
    if desde and hasta:
        return f"Del {desde:%d/%m/%Y} al {hasta:%d/%m/%Y}"
    if desde:
        return f"Desde el {desde:%d/%m/%Y}"
    if hasta:
        return f"Hasta el {hasta:%d/%m/%Y}"
    return "Todo el historial"


def exportar_pdf(
    db: Session,
    administrador: AdministradorConjunto,
    id_conjunto: UUID,
    estado: str,
    desde: date | None,
    hasta: date | None,
    base_url: str,
) -> tuple[bytes, str]:
    """¿Qué? El historial de la agenda como PDF presentable (HU-049, issue #480): los mismos temas
          que el CSV (ver _filas_de_la_descarga), en una hoja A4 horizontal.
    ¿Para qué? Para anexarlo al acta del comité o mandarlo por WhatsApp o correo: se abre igual en
              cualquier celular o computador, sin Excel.
    ¿Impacto? Devuelve (contenido, nombre del archivo). No se guarda en ningún lado: se arma en
              cada descarga."""
    filas = _filas_de_la_descarga(db, administrador, id_conjunto, estado, desde, hasta, base_url)
    nombre_conjunto = _nombre_conjunto(administrador, id_conjunto)
    contenido = construir_pdf_historial(
        nombre_conjunto=nombre_conjunto,
        estado_texto=_TEXTO_ESTADO.get(estado, "por tratar y archivados"),
        rango_texto=_texto_del_rango(desde, hasta),
        generado_el=datetime.now(HUSO_BOGOTA).strftime("%d/%m/%Y"),
        filas=filas,
    )
    return contenido, _nombre_archivo(nombre_conjunto, desde, hasta, "pdf")
