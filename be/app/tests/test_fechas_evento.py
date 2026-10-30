"""
Módulo: tests/test_fechas_evento.py
Descripción: Pruebas de la funcionalidad de comunicados que exige una fecha valida
¿Para qué?
    para no aceptar una fecha invalida en un evento
"""

import pytest
from app.utils.fechas import validar_fecha_evento
from datetime import datetime, timezone, timedelta


def test_should_return_none_when_date_is_none() -> None:
    # Act
    result = validar_fecha_evento(None)
    # Assert
    assert result is None


@pytest.mark.parametrize("dias", [-1, 0])
def test_should_accept_date_when_it_is_within_the_one_year_limit(dias: int) -> None:
    # Arrange
    DIAS_MAX_EXPIRACION = 365
    hoy = datetime.now(timezone.utc).date()
    fecha = hoy + timedelta(days=DIAS_MAX_EXPIRACION + dias)

    # Act
    result = validar_fecha_evento(fecha)

    # Assert
    assert result == fecha


def test_should_show_an_error_when_date_is_more_than_one_year() -> None:
    # Arrange
    DIAS_MAX_EXPIRACION = 365
    hoy = datetime.now(timezone.utc).date()
    fecha = hoy + timedelta(days=DIAS_MAX_EXPIRACION + 1)

    # Act + Assert
    with pytest.raises(ValueError):
        validar_fecha_evento(fecha)


@pytest.mark.parametrize("dias", [0, 1])
def test_should_accept_date_when_it_is_today_or_tomorrow(dias: int) -> None:
    # Arrange
    hoy = datetime.now(timezone.utc).date()
    fecha = hoy + timedelta(days=dias)

    # Act
    result = validar_fecha_evento(fecha)

    # Assert
    assert result == fecha


def test_should_show_an_error_when_date_is_yesterday() -> None:
    # Arrange
    hoy = datetime.now(timezone.utc).date()
    fecha = hoy + timedelta(days=-1)

    # Act + Assert
    with pytest.raises(ValueError):
        validar_fecha_evento(fecha)
