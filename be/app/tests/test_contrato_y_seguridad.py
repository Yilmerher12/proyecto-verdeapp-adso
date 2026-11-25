"""
Módulo: tests/test_contrato_y_seguridad.py
Descripción: pruebas transversales del API — quién puede entrar y cómo responden los errores.

¿Qué? Mira todo el API a la vez (no un endpoint) y comprueba tres cosas: que cada ruta
      pida credenciales salvo las públicas, que un token falso o un rol equivocado se
      rechacen, y que los errores no filtren información interna.
¿Para qué? Semana 4 del bootcamp de testing (ángulo transversal: seguridad y contrato de
          errores). Los tests por endpoint ya existen; lo que no existía era una red que
          avise si alguien agrega una ruta sin protección.
¿Impacto? Si un endpoint nuevo queda abierto por olvido, o un error empieza a mostrar
          el stack trace o el SQL, uno de estos tests falla.
"""

import re
from datetime import timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import app
from app.utils.security import create_access_token

# ¿Qué? Las únicas operaciones que NO piden credenciales, a propósito.
# ¿Para qué? Son las del flujo de entrada (registro, login, recuperar contraseña, aceptar una
#           invitación) y datos públicos que el registro necesita (localidades, conjuntos).
# ¿Impacto? Si se agrega una ruta pública nueva, hay que sumarla aquí a conciencia: el test
#           obliga a decidir que es pública y no a olvidarse de protegerla.
RUTAS_PUBLICAS = {
    ("POST", "/api/v1/auth/register"),
    ("POST", "/api/v1/auth/login"),
    ("POST", "/api/v1/auth/forgot-password"),
    ("POST", "/api/v1/auth/reset-password"),
    ("POST", "/api/v1/auth/verify-email"),
    ("GET", "/api/v1/geography/localidades"),
    ("GET", "/api/v1/geography/conjuntos/{id_localidad}"),
    ("GET", "/api/v1/admin-conjunto/invitacion"),
    ("POST", "/api/v1/admin-conjunto/aceptar"),
    ("POST", "/api/v1/contact"),
    ("GET", "/api/v1/health"),
}

ID_FICTICIO = "00000000-0000-4000-8000-000000000000"
METODOS = {"GET", "POST", "PUT", "PATCH", "DELETE"}


def _operaciones_del_api(aplicacion: FastAPI) -> list[tuple[str, str]]:
    """Lista (método, ruta) de todo el API leyendo su esquema OpenAPI."""
    operaciones = []
    for ruta, metodos in aplicacion.openapi()["paths"].items():
        for metodo in metodos:
            if metodo.upper() in METODOS:
                operaciones.append((metodo.upper(), ruta))
    return operaciones


def test_should_require_credentials_on_every_route_except_the_public_ones(client: TestClient):
    # Arrange
    sin_credenciales_requeridas = set()

    # Act: se llama a cada operación del API sin token.
    for metodo, ruta in _operaciones_del_api(app):
        ruta_concreta = re.sub(r"\{[^}]+\}", ID_FICTICIO, ruta)
        respuesta = client.request(metodo, ruta_concreta)
        if respuesta.status_code != 401:
            sin_credenciales_requeridas.add((metodo, ruta))

    # Assert: las que no responden 401 son exactamente las públicas declaradas.
    assert sin_credenciales_requeridas == RUTAS_PUBLICAS


@pytest.mark.parametrize(
    "authorization",
    [
        "Bearer esto-no-es-un-token",
        "Bearer aaaaa.bbbbb.ccccc",
    ],
)
def test_should_respond_401_when_the_token_is_not_valid(client: TestClient, authorization: str):
    # Arrange: un valor inventado y otro con forma de JWT pero sin firma válida.

    # Act
    respuesta = client.get("/api/v1/users/me", headers={"Authorization": authorization})

    # Assert
    assert respuesta.status_code == 401
    assert respuesta.headers["content-type"].startswith("application/json")
    assert "detail" in respuesta.json()


def test_should_respond_401_when_the_token_has_expired(client: TestClient, test_user):
    # Arrange: un token bien firmado, pero que venció hace un minuto.
    vencido = create_access_token({"sub": test_user.correo_electronico}, expires_delta=timedelta(minutes=-1))

    # Act
    respuesta = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {vencido}"})

    # Assert
    assert respuesta.status_code == 401


@pytest.mark.parametrize("fixture_de_headers", ["auth_headers", "reciclador_auth_headers"])
def test_should_respond_403_when_the_role_is_not_allowed(client: TestClient, request, fixture_de_headers: str):
    # Arrange: un Residente y un Reciclador intentan entrar a una ruta solo del Administrador del Sistema.
    headers = request.getfixturevalue(fixture_de_headers)

    # Act
    respuesta = client.get("/api/v1/admin/vista-residentes", headers=headers)

    # Assert
    assert respuesta.status_code == 403
    assert respuesta.headers["content-type"].startswith("application/json")
    assert "detail" in respuesta.json()


def test_should_respond_200_with_json_when_the_role_is_allowed(client: TestClient, admin_sistema_auth_headers):
    # Arrange: el Administrador del Sistema, el único rol que puede entrar a esta ruta.
    # ¿Qué? Es el caso "autorizado" que completa el trío 401, 403 y 200: las pruebas de arriba
    #       solo comprueban que se rechace a quien no debe entrar; esta comprueba que quien sí
    #       debe entrar, entra.
    # ¿Impacto? Si la verificación de rol se rompe y bloquea a todos, las de 403 seguirían en
    #           verde y solo esta avisaría.

    # Act: la misma ruta a la que la prueba anterior le niega el paso a un Residente.
    respuesta = client.get("/api/v1/admin/vista-residentes", headers=admin_sistema_auth_headers)

    # Assert: 200, en JSON, con la forma que lee el frontend: la lista y el total.
    assert respuesta.status_code == 200
    assert respuesta.headers["content-type"].startswith("application/json")
    cuerpo = respuesta.json()
    assert isinstance(cuerpo["items"], list)
    assert isinstance(cuerpo["total"], int)


def test_should_respond_422_with_json_and_no_internal_details_when_the_body_is_malformed(client: TestClient):
    # Arrange: un JSON cortado a la mitad.
    cuerpo_malformado = '{"email": "a@a.com", "password": '

    # Act
    respuesta = client.post(
        "/api/v1/auth/login",
        content=cuerpo_malformado,
        headers={"Content-Type": "application/json"},
    )

    # Assert
    assert respuesta.status_code == 422
    assert respuesta.headers["content-type"].startswith("application/json")
    assert isinstance(respuesta.json()["detail"], list)
    assert "Traceback" not in respuesta.text


def test_should_respond_500_with_json_and_not_leak_stack_trace_or_sql_when_an_unexpected_error_happens():
    # Arrange: se agrega una ruta que siempre falla y se quita al terminar.
    # ¿Qué? Hallazgo de la semana 4: este caso respondía 500 con el texto plano
    #       "Internal Server Error", y todo el resto del API responde JSON con "detail".
    #       Se corrigió con un manejador en app/main.py, y esta prueba lo fija.
    # ¿Para qué? Que un error inesperado llegue en el mismo formato que los demás, y que
    #           además no se filtre el stack trace, ni SQL, ni nombres de archivos.
    # ¿Impacto? Si alguien quita el manejador, vuelve el texto plano y esta prueba falla.
    def ruta_que_falla():
        raise RuntimeError('SELECT * FROM usuarios WHERE password = "secreto"')

    app.add_api_route("/__ruta_que_falla", ruta_que_falla, methods=["GET"])
    try:
        cliente_sin_excepciones = TestClient(app, raise_server_exceptions=False)

        # Act
        respuesta = cliente_sin_excepciones.get("/__ruta_que_falla")
    finally:
        app.router.routes = [r for r in app.router.routes if getattr(r, "path", "") != "/__ruta_que_falla"]

    # Assert: 500, en JSON y con el mensaje fijo, sin nada del error original.
    assert respuesta.status_code == 500
    assert respuesta.headers["content-type"].startswith("application/json")
    assert respuesta.json() == {"detail": "Error interno del servidor."}
    for texto_prohibido in ("Traceback", "SELECT", "secreto", "RuntimeError", ".py"):
        assert texto_prohibido not in respuesta.text
