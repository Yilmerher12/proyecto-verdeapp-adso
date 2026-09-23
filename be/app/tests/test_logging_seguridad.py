"""
Módulo: tests/test_logging_seguridad.py
Descripción: Tests del issue #309 — registro de auditoría y que los enlaces
             con token no terminen en los logs fuera de desarrollo.
"""

import asyncio
import logging

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.tests.conftest import TEST_USER_EMAIL, TEST_USER_PASSWORD
from app.utils import email as email_utils

TOKEN = "token-secreto-de-un-solo-uso-123"
CORREO = "yilmer.prueba@gmail.com"


@pytest.fixture()
def sin_backend_de_correo(monkeypatch: pytest.MonkeyPatch) -> None:
    """Ni SMTP ni Resend: el caso en que antes el enlace siempre iba al log."""
    monkeypatch.setattr(settings, "SMTP_HOST", "")
    monkeypatch.setattr(settings, "RESEND_API_KEY", "")


def _enviar_reset(caplog: pytest.LogCaptureFixture) -> str:
    caplog.set_level(logging.INFO)
    asyncio.run(email_utils.send_password_reset_email(CORREO, TOKEN))
    return caplog.text


def test_en_produccion_el_log_no_trae_token_ni_correo_completo(
    caplog: pytest.LogCaptureFixture, monkeypatch: pytest.MonkeyPatch, sin_backend_de_correo: None
) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    texto = _enviar_reset(caplog)
    assert TOKEN not in texto
    assert CORREO not in texto
    assert "yi***@gmail.com" in texto


def test_en_produccion_un_envio_fallido_tampoco_filtra_el_token(
    caplog: pytest.LogCaptureFixture, monkeypatch: pytest.MonkeyPatch
) -> None:
    def _smtp_caido(*_args: object) -> None:
        raise ConnectionRefusedError("SMTP caído")

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.ejemplo.com")
    monkeypatch.setattr(email_utils, "_send_email_smtp", _smtp_caido)
    texto = _enviar_reset(caplog)
    assert "Falló el envío" in texto
    assert TOKEN not in texto


def test_en_desarrollo_el_enlace_sigue_saliendo_en_consola(
    caplog: pytest.LogCaptureFixture, monkeypatch: pytest.MonkeyPatch, sin_backend_de_correo: None
) -> None:
    """El equipo usa este enlace para probar sin Mailpit — no debe perderse."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    assert TOKEN in _enviar_reset(caplog)


def test_login_exitoso_queda_en_el_registro_de_auditoria(
    client: TestClient, test_user: object, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.INFO, logger="verdeapp.audit")
    client.post(
        "/api/v1/auth/login",
        json={"correo_electronico": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
    )
    assert '"event": "login_success"' in caplog.text


def test_acceso_con_rol_incorrecto_queda_en_el_registro_de_auditoria(
    client: TestClient, auth_headers: dict[str, str], caplog: pytest.LogCaptureFixture
) -> None:
    """auth_headers pertenece a un Residente, no a un Administrador del Sistema."""
    caplog.set_level(logging.INFO, logger="verdeapp.audit")
    response = client.get("/api/v1/admin/vista-residentes", headers=auth_headers)
    assert response.status_code == 403
    assert '"event": "access_denied"' in caplog.text
    assert "/api/v1/admin/vista-residentes" in caplog.text
