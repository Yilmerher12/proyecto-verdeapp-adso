"""
Módulo: tests/test_correo_invitacion_reciclador.py
Descripción: pruebas con dobles del correo que se envía al invitar a un Reciclador a un conjunto.

¿Qué? Se reemplaza el envío real del correo (send_reciclador_conjunto_invitation_email)
      con dobles, para comprobar que se llama cuando debe, que no se llama cuando no debe
      y que un fallo del envío no rompe la invitación.
¿Para qué? Semana 5 del bootcamp de testing (dobles de prueba, capa API). Es una dependencia
          que el proyecto no controla: el servicio de correo. Ninguna prueba cubría este correo.
¿Impacto? Si alguien quita el envío, lo manda dos veces o deja que un fallo del correo
          tumbe la invitación, una de estas pruebas falla.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.invitacion_reciclador_conjunto import InvitacionRecicladorConjunto
from app.services import reciclador_conjunto_service

URL = "/api/v1/reciclador-conjunto/invitar"


def _cuerpo(reciclador, conjunto) -> dict:
    return {
        "correo_reciclador": reciclador.correo_electronico,
        "id_conjunto_residencial": str(conjunto.id_conjunto_residencial),
    }


@pytest.fixture()
def correos_enviados(monkeypatch: pytest.MonkeyPatch) -> list[dict]:
    """Doble tipo SPY: no envía nada de verdad, solo anota con qué lo llamaron."""
    enviados: list[dict] = []

    async def espia(**kwargs) -> None:
        enviados.append(kwargs)

    monkeypatch.setattr(reciclador_conjunto_service, "send_reciclador_conjunto_invitation_email", espia)
    return enviados


def test_should_send_the_invitation_email_once_with_the_recycler_and_the_building(
    client: TestClient, admin_conjunto_auth_headers, conjunto_verificado, reciclador_test, correos_enviados
):
    # Arrange: el espía (SPY) viene de la fixture "correos_enviados".

    # Act
    respuesta = client.post(URL, headers=admin_conjunto_auth_headers, json=_cuerpo(reciclador_test, conjunto_verificado))

    # Assert: se verifica COMPORTAMIENTO (con qué se llamó), no solo la respuesta.
    assert respuesta.status_code == 201
    assert correos_enviados == [
        {"email": reciclador_test.correo_electronico, "nombre_conjunto": conjunto_verificado.nombre_conjunto}
    ]


def test_should_not_send_a_second_email_when_the_invitation_is_already_pending(
    client: TestClient, admin_conjunto_auth_headers, conjunto_verificado, reciclador_test, correos_enviados
):
    # Arrange: la primera invitación sale bien y manda su correo (doble tipo SPY).
    cuerpo = _cuerpo(reciclador_test, conjunto_verificado)
    primera = client.post(URL, headers=admin_conjunto_auth_headers, json=cuerpo)
    assert primera.status_code == 201
    assert len(correos_enviados) == 1

    # Act: se repite la misma invitación.
    segunda = client.post(URL, headers=admin_conjunto_auth_headers, json=cuerpo)

    # Assert: se verifica COMPORTAMIENTO — el correo NO se vuelve a llamar.
    assert segunda.status_code == 400
    assert "Ya existe una invitación pendiente" in segunda.json()["detail"]
    assert len(correos_enviados) == 1


def test_should_still_create_the_invitation_when_the_email_cannot_be_sent(
    client: TestClient,
    db: Session,
    admin_conjunto_auth_headers,
    conjunto_verificado,
    reciclador_test,
    monkeypatch: pytest.MonkeyPatch,
):
    # Arrange: doble tipo STUB que siempre falla, como un servicio de correo caído.
    async def correo_caido(**kwargs) -> None:
        raise RuntimeError("el servicio de correo no responde")

    monkeypatch.setattr(reciclador_conjunto_service, "send_reciclador_conjunto_invitation_email", correo_caido)

    # Act
    respuesta = client.post(URL, headers=admin_conjunto_auth_headers, json=_cuerpo(reciclador_test, conjunto_verificado))

    # Assert: se verifica ESTADO — la invitación quedó guardada aunque el correo falló.
    assert respuesta.status_code == 201
    invitaciones = db.query(InvitacionRecicladorConjunto).all()
    assert len(invitaciones) == 1
    assert invitaciones[0].estado == "PENDIENTE"
