"""
Módulo: tests/test_contact.py
Descripción: Issue #351 — POST /api/v1/contact (formulario de contacto de la landing).

¿Qué? El envío real del correo se reemplaza con monkeypatch: así las pruebas
      no dependen de que Mailpit esté corriendo y se puede simular un fallo.
"""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.routers import contact as contact_router
from app.utils import email as email_utils
from app.utils.limiter import limiter

URL = "/api/v1/contact"
VALIDO = {
    "name": "María José",
    "email": "maria@ejemplo.com",
    "subject": "Duda sobre mi cuenta",
    "message": "Hola, no puedo ver las auditorías de mi conjunto.",
}


@pytest.fixture()
def envios(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, str, str]]:
    """Captura lo que _enviar recibiría, en vez de mandar el correo de verdad."""
    capturados: list[tuple[str, str, str]] = []

    async def _falso(email: str, subject: str, html: str, tipo: str, enlace: str | None = None) -> bool:
        capturados.append((email, subject, html))
        return True

    monkeypatch.setattr(email_utils, "_enviar", _falso)
    return capturados


class TestEnviarContacto:
    def test_envio_valido_llega_al_buzon_del_equipo(self, client: TestClient, envios: list) -> None:
        respuesta = client.post(URL, json=VALIDO)

        assert respuesta.status_code == 200
        assert len(envios) == 1
        destinatario, asunto, html = envios[0]
        assert destinatario == settings.CONTACT_EMAIL
        assert "Duda sobre mi cuenta" in asunto
        assert "maria@ejemplo.com" in html

    def test_escapa_el_html_que_escribe_el_visitante(self, client: TestClient, envios: list) -> None:
        respuesta = client.post(URL, json={**VALIDO, "message": "<script>alert(1)</script> hola"})

        assert respuesta.status_code == 200
        html = envios[0][2]
        assert "<script>" not in html
        assert "&lt;script&gt;" in html

    def test_si_el_correo_no_sale_responde_503(self, client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
        async def _falla(*_args: object) -> bool:
            return False

        monkeypatch.setattr(contact_router, "send_contact_email", _falla)

        respuesta = client.post(URL, json=VALIDO)

        assert respuesta.status_code == 503

    @pytest.mark.parametrize(
        "campo, valor",
        [
            ("name", "Juan123"),
            ("name", "A"),
            ("name", "a" * 101),
            ("email", "no-es-correo"),
            ("subject", "ab"),
            ("subject", "   ab   "),
            ("subject", "a" * 151),
            ("subject", "Hola\nBcc: otro@ejemplo.com"),
            ("message", "corto"),
            ("message", "a" * 2001),
        ],
    )
    def test_datos_invalidos_devuelven_422(
        self, client: TestClient, envios: list, campo: str, valor: str
    ) -> None:
        respuesta = client.post(URL, json={**VALIDO, campo: valor})

        assert respuesta.status_code == 422
        assert envios == []


@pytest.fixture()
def limiter_encendido() -> Generator[None, None, None]:
    limiter.reset()
    limiter.enabled = True
    try:
        yield
    finally:
        limiter.enabled = False
        limiter.reset()


def test_mas_de_3_envios_por_minuto_devuelven_429(
    client: TestClient, envios: list, limiter_encendido: None
) -> None:
    for _ in range(3):
        assert client.post(URL, json=VALIDO).status_code == 200

    assert client.post(URL, json=VALIDO).status_code == 429
