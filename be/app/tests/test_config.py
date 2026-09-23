"""
Módulo: tests/test_config.py
Descripción: Tests de las validaciones de arranque de app/config.py (issue #315).
¿Para qué? Comprobar que una configuración insegura detiene el backend en vez
           de dejarlo arrancar en silencio.
"""

import pytest
from pydantic import ValidationError

from app.config import Settings

CLAVE_REAL = "3f9a1c7e5b2d4f6a8c0e1b3d5f7a9c2e4b6d8f0a1c3e5b7d9f1a3c5e7b9d1f3a"


def _settings(**valores: str) -> Settings:
    """Construye Settings sin leer be/.env, solo con los valores dados."""
    base = {"DATABASE_URL": "postgresql://u:p@localhost/db", "SECRET_KEY": CLAVE_REAL}
    return Settings(_env_file=None, **{**base, **valores})


def test_acepta_una_clave_generada_al_azar() -> None:
    assert _settings().SECRET_KEY == CLAVE_REAL


def test_rechaza_la_clave_de_ejemplo_del_env_example() -> None:
    """Tiene 34 caracteres: antes pasaba la regla de longitud."""
    with pytest.raises(ValidationError, match="valor de ejemplo"):
        _settings(SECRET_KEY="reemplaza-esto-por-tu-propia-clave")


def test_rechaza_una_clave_corta() -> None:
    with pytest.raises(ValidationError, match="32 caracteres"):
        _settings(SECRET_KEY="corta")


@pytest.mark.parametrize("valor", ["prod", "Production", "testing"])
def test_rechaza_un_environment_desconocido(valor: str) -> None:
    with pytest.raises(ValidationError):
        _settings(ENVIRONMENT=valor)


def test_rechaza_un_algoritmo_distinto_de_hs256() -> None:
    with pytest.raises(ValidationError):
        _settings(ALGORITHM="none")
