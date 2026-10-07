"""
Módulo: tests/test_rate_limiting.py
Descripción: Tests del issue #310 — límite de intentos en los endpoints
             sensibles que no lo tenían.

¿Qué? slowapi solo cuenta una petición si llega a entrar al endpoint. Si
      FastAPI la rechaza antes (422 por un cuerpo inválido, 401 porque
      get_current_user no encontró sesión), no cuenta. Por eso cada caso
      manda un cuerpo válido que falla DENTRO del endpoint (token inexistente,
      contraseña actual incorrecta, rol no permitido).
"""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.utils.limiter import limiter

CONTRASENA_FUERTE = "NuevaSegura456*"

# (método de envío, url, límite, necesita sesión de Residente)
CASOS = {
    "change-password": (
        {"json": {"current_password": "NoEsLaActual123*", "new_password": CONTRASENA_FUERTE}},
        "/api/v1/auth/change-password", 5, True,
    ),
    "reset-password": (
        {"json": {"token": "no-existe", "new_password": CONTRASENA_FUERTE}},
        "/api/v1/auth/reset-password", 5, False,
    ),
    "verify-email": (
        {"json": {"token": "no-existe"}},
        "/api/v1/auth/verify-email", 5, False,
    ),
    "aceptar-invitacion": (
        {"json": {"token": "no-existe", "password": CONTRASENA_FUERTE, "nombre": "Ana", "apellidos": "Pérez"}},
        "/api/v1/admin-conjunto/aceptar", 5, False,
    ),
    "refresh": (
        {"json": {"refresh_token": "token.invalido.falso"}},
        "/api/v1/auth/refresh", 30, False,
    ),
    "uploads": (
        {"files": {"archivo": ("a.png", b"no-importa", "image/png")}},
        "/api/v1/uploads/adjunto", 30, True,
    ),
    # Issue #398 (CN-055): el Residente de prueba no tiene un SHUT al que avisar
    # de más, pero la petición entra al endpoint (cuenta para el límite).
    "notificaciones-enviar": (
        {"json": {"tipo": "SHUT_LLENO"}},
        "/api/v1/notificaciones/enviar", 10, True,
    ),
}


@pytest.fixture()
def limiter_encendido() -> Generator[None, None, None]:
    """conftest.py apaga el limiter para toda la suite; aquí se enciende
    solo dentro de cada prueba, con los contadores en cero."""
    limiter.reset()
    limiter.enabled = True
    try:
        yield
    finally:
        limiter.enabled = False
        limiter.reset()


@pytest.mark.parametrize("caso", CASOS.keys())
def test_supera_el_limite_devuelve_429(
    caso: str, client: TestClient, auth_headers: dict[str, str], limiter_encendido: None
) -> None:
    envio, url, limite, necesita_sesion = CASOS[caso]
    headers = auth_headers if necesita_sesion else {}

    for _ in range(limite):
        respuesta = client.post(url, headers=headers, **envio)
        assert respuesta.status_code != 429

    respuesta_extra = client.post(url, headers=headers, **envio)
    assert respuesta_extra.status_code == 429


def test_consultar_invitacion_supera_el_limite_devuelve_429(client: TestClient, limiter_encendido: None) -> None:
    """Issue #398 (CN-057): es un GET, así que no cabe en CASOS (que usa POST)."""
    for _ in range(10):
        respuesta = client.get("/api/v1/admin-conjunto/invitacion", params={"token": "no-existe"})
        assert respuesta.status_code != 429

    respuesta_extra = client.get("/api/v1/admin-conjunto/invitacion", params={"token": "no-existe"})
    assert respuesta_extra.status_code == 429


def test_invitar_reciclador_supera_el_limite_devuelve_429(
    client: TestClient, admin_conjunto_auth_headers: dict[str, str], conjunto_verificado, limiter_encendido: None
) -> None:
    """Issue #398 (CN-056): necesita la sesión de un Admin de Conjunto, no la del Residente de CASOS."""
    cuerpo = {
        "correo_reciclador": "no.existe@verdeapp.com",
        "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
    }
    url = "/api/v1/reciclador-conjunto/invitar"
    for _ in range(20):
        respuesta = client.post(url, headers=admin_conjunto_auth_headers, json=cuerpo)
        assert respuesta.status_code != 429

    respuesta_extra = client.post(url, headers=admin_conjunto_auth_headers, json=cuerpo)
    assert respuesta_extra.status_code == 429
