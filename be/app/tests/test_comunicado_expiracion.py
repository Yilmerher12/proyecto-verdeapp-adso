"""
Módulo: tests/test_comunicado_expiracion.py
Descripción: pruebas unitarias de _calcular_expiracion_sugerida (CA-027.3).

¿Qué? Verifica cuándo vence un comunicado según su tipo: plazo fijo para
      Informativo, Urgente, Mantenimiento y Reciclaje; y "el día siguiente al
      evento" para Convocatoria.
¿Para qué? Es una regla de negocio con cálculo de fechas y un caso de error;
          ninguna prueba la cubría de forma directa. Se llama la función sola,
          sin base de datos ni HTTP.
¿Impacto? Si alguien cambia un plazo (por ejemplo Urgente de 48 a 24 horas) o
          rompe el cálculo de Convocatoria, estas pruebas fallan.
"""

from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app.models.comunicado import TipoComunicado
from app.services.comunicado_service import _calcular_expiracion_sugerida


@pytest.mark.parametrize(
    ("tipo", "plazo"),
    [
        (TipoComunicado.INFORMATIVO, timedelta(days=30)),
        (TipoComunicado.URGENTE, timedelta(hours=48)),
        (TipoComunicado.MANTENIMIENTO, timedelta(days=7)),
        (TipoComunicado.RECICLAJE, timedelta(days=14)),
    ],
)
def test_should_expire_after_fixed_period_when_type_has_fixed_duration(tipo, plazo):
    # Arrange
    # ¿Qué? Se toma la hora antes y después de llamar a la función.
    # ¿Para qué? La función usa la hora actual por dentro; así no hace falta
    #           congelar el reloj ni cambiar el código de la app.
    antes = datetime.now(timezone.utc)

    # Act
    expiracion = _calcular_expiracion_sugerida(tipo, None)

    # Assert
    despues = datetime.now(timezone.utc)
    assert antes + plazo <= expiracion <= despues + plazo


@pytest.mark.parametrize(
    ("fecha_evento", "expiracion_esperada"),
    [
        # Día normal: expira a las 00:00 UTC del día siguiente.
        (date(2026, 3, 10), datetime(2026, 3, 11, tzinfo=timezone.utc)),
        # Valores límite: fin de mes y fin de año.
        (date(2026, 2, 28), datetime(2026, 3, 1, tzinfo=timezone.utc)),
        (date(2026, 12, 31), datetime(2027, 1, 1, tzinfo=timezone.utc)),
    ],
)
def test_should_expire_at_start_of_next_day_when_type_is_convocatoria(fecha_evento, expiracion_esperada):
    # Arrange: los parámetros traen la fecha del evento y el resultado esperado.

    # Act
    expiracion = _calcular_expiracion_sugerida(TipoComunicado.CONVOCATORIA, fecha_evento)

    # Assert
    assert expiracion == expiracion_esperada


def test_should_reject_convocatoria_without_event_date():
    # Arrange: Convocatoria sin fecha de evento.

    # Act
    with pytest.raises(HTTPException) as error:
        _calcular_expiracion_sugerida(TipoComunicado.CONVOCATORIA, None)

    # Assert
    assert error.value.status_code == 400
    assert "fecha del evento" in error.value.detail
