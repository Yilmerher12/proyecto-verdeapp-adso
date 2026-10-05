"""
Módulo: utils/fechas.py
Descripción: Validación de las fechas que eligen a mano los administradores
             en comunicados y novedades (issue #367).
¿Para qué? Antes se podía guardar una fecha de expiración ya pasada: el
           comunicado nacía vencido, el feed lo ocultaba (RN-004) y los
           destinatarios recibían la notificación de un aviso que no podían
           leer. Tampoco había tope: con una fecha en 2099 el aviso quedaba
           en el feed para siempre.
¿Impacto? Se usan solo en los esquemas de crear/editar, no en los de
          respuesta: un dato viejo ya vencido no rompe los listados.
          Las fechas llegan del formulario como "AAAA-MM-DDT23:59:59" sin
          zona horaria; se tratan como UTC, igual que las guarda la BD y
          las muestra formatearFechaUTC en el frontend.
"""

from datetime import date, datetime, timedelta, timezone
from typing import Annotated, Optional

from pydantic import AfterValidator

# ¿Qué? Tope de anticipación para expiración y fecha de evento.
# ¿Para qué? La expiración sugerida más larga es 30 días (Informativo);
#           un año cubre avisos de temporada sin permitir avisos eternos.
# ¿Impacto? Debe coincidir con DIAS_MAX_EXPIRACION de fe/src/lib/validacion.ts.
DIAS_MAX_EXPIRACION = 365


def _hoy_utc() -> date:
    return datetime.now(timezone.utc).date()


def validar_fecha_expiracion(valor: datetime | None) -> datetime | None:
    """Acepta una expiración que todavía no pasó y que no supere un año desde hoy."""
    if valor is None:
        return None
    if valor.tzinfo is None:
        valor = valor.replace(tzinfo=timezone.utc)
    if valor < datetime.now(timezone.utc):
        raise ValueError("La fecha de expiración debe ser hoy o una fecha futura.")
    if valor.date() > _hoy_utc() + timedelta(days=DIAS_MAX_EXPIRACION):
        raise ValueError(f"La fecha de expiración no puede superar {DIAS_MAX_EXPIRACION} días desde hoy.")
    return valor


def validar_fecha_evento(valor: date | None) -> date | None:
    """
    ¿Qué? La Convocatoria expira al día siguiente del evento: un evento
          pasado daría una expiración pasada, con el mismo problema.
    """
    if valor is None:
        return None
    if valor < _hoy_utc():
        raise ValueError("La fecha del evento debe ser hoy o una fecha futura.")
    if valor > _hoy_utc() + timedelta(days=DIAS_MAX_EXPIRACION):
        raise ValueError(f"La fecha del evento no puede superar {DIAS_MAX_EXPIRACION} días desde hoy.")
    return valor


FechaExpiracion = Annotated[Optional[datetime], AfterValidator(validar_fecha_expiracion)]
FechaEvento = Annotated[Optional[date], AfterValidator(validar_fecha_evento)]
