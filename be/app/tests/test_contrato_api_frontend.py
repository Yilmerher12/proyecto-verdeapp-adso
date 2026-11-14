"""
Módulo: tests/test_contrato_api_frontend.py
Descripción: Pruebas del contrato entre el backend y el frontend (semana 4 del
             bootcamp de testing, issue #656).
¿Qué? Comprueban que las respuestas que el frontend consume traen EXACTAMENTE
      los campos que la interfaz lee, y que los errores tienen el formato que
      la interfaz muestra.
¿Para qué? Los tests de test_auth.py revisan unos pocos campos sueltos de
           GET /api/v1/users/me; si alguien quita o renombra un campo, el
           backend sigue "pasando" y la pantalla se rompe en silencio
           (ProfilePage, DirectorioPage y ResidenteDashboard leen estos campos).
¿Impacto? Cambiar la forma de la respuesta ahora obliga a actualizar esta
          lista y, con ella, el frontend (fe/src/pages/ProfilePage.tsx,
          interfaz PerfilData).
"""
import pytest
from fastapi.testclient import TestClient

from app.tests.conftest import (
    ADMIN_CONJUNTO_APELLIDOS,
    ADMIN_CONJUNTO_EMAIL,
    ADMIN_CONJUNTO_NOMBRE,
    ADMIN_SISTEMA_EMAIL,
    RECICLADOR_APELLIDOS,
    RECICLADOR_EMAIL,
    RECICLADOR_NOMBRE,
    TEST_USER_APELLIDOS,
    TEST_USER_EMAIL,
    TEST_USER_NOMBRE,
)

URL_ME = "/api/v1/users/me"

# ¿Qué? Las 15 claves que devuelve GET /users/me, tal como las lee la interfaz
#       PerfilData de fe/src/pages/ProfilePage.tsx (más `locale`, que usa AuthContext).
# ¿Impacto? Es un conjunto cerrado a propósito: una clave de más o de menos
#           debe hacer fallar la prueba y obligar a revisar el frontend.
CLAVES_PERFIL = {
    "id",
    "email",
    "role_id",
    "locale",
    "first_name",
    "last_name",
    "numero_telefonico",
    "nombre_conjunto",
    "torre",
    "apto",
    "asociacion",
    "nombre_localidad",
    "conjuntos_administrados",
    "mostrar_contacto_directorio",
    "foto_perfil_url",
}

# ¿Qué? Las 7 claves de UserResponse (schemas/user.py), que es lo que devuelve
#       PATCH /users/me/locale — el único endpoint de /users que sí usa ese esquema.
CLAVES_USER_RESPONSE = {
    "id",
    "email",
    "role_id",
    "is_active",
    "first_name",
    "last_name",
    "locale",
}


class TestContratoPerfilPorRol:
    """GET /api/v1/users/me: forma exacta de la respuesta para cada rol."""

    def test_residente_trae_las_claves_exactas_y_los_datos_de_su_unidad(
        self, client: TestClient, auth_headers: dict[str, str], test_user: object
    ) -> None:
        response = client.get(URL_ME, headers=auth_headers)

        assert response.status_code == 200
        # ¿Qué? Además del código, el tipo de contenido: axios solo convierte a
        #       objeto la respuesta si el servidor dice que es JSON.
        assert response.headers["content-type"].startswith("application/json")
        data = response.json()
        assert set(data.keys()) == CLAVES_PERFIL

        # Lo que ProfilePage muestra para un Residente.
        assert isinstance(data["id"], str)
        assert data["email"] == TEST_USER_EMAIL
        assert data["role_id"] == 2
        assert data["first_name"] == TEST_USER_NOMBRE
        assert data["last_name"] == TEST_USER_APELLIDOS
        assert data["numero_telefonico"] == "3000000000"
        assert data["torre"] == "TORRE 1"
        assert data["apto"] == "101"
        assert isinstance(data["nombre_conjunto"], str)
        # Lo que DirectorioPage usa para preseleccionar la localidad.
        assert data["nombre_localidad"] == "Usaquén"
        # Campos que no aplican al Residente.
        assert data["asociacion"] is None
        assert data["conjuntos_administrados"] is None
        assert data["mostrar_contacto_directorio"] is False
        assert data["foto_perfil_url"] is None

    def test_reciclador_trae_asociacion_localidad_y_permiso_del_directorio(
        self,
        client: TestClient,
        reciclador_auth_headers: dict[str, str],
        reciclador_test: object,
    ) -> None:
        response = client.get(URL_ME, headers=reciclador_auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert set(data.keys()) == CLAVES_PERFIL

        assert data["email"] == RECICLADOR_EMAIL
        assert data["role_id"] == 3
        assert data["first_name"] == RECICLADOR_NOMBRE
        assert data["last_name"] == RECICLADOR_APELLIDOS
        assert data["asociacion"] == "INDEPENDIENTE"
        assert data["nombre_localidad"] == "Usaquén"
        # ¿Qué? Tiene que ser un booleano de verdad: ProfilePage lo usa para
        #       marcar la casilla, y un texto "false" quedaría marcado.
        assert isinstance(data["mostrar_contacto_directorio"], bool)
        # Un Reciclador no pertenece a un conjunto ni a una unidad.
        assert data["nombre_conjunto"] is None
        assert data["torre"] is None
        assert data["apto"] is None
        assert data["conjuntos_administrados"] is None

    def test_admin_conjunto_trae_la_lista_de_conjuntos_que_administra(
        self,
        client: TestClient,
        admin_conjunto_auth_headers: dict[str, str],
        admin_conjunto_test: object,
    ) -> None:
        response = client.get(URL_ME, headers=admin_conjunto_auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert set(data.keys()) == CLAVES_PERFIL

        assert data["email"] == ADMIN_CONJUNTO_EMAIL
        assert data["role_id"] == 4
        assert data["first_name"] == ADMIN_CONJUNTO_NOMBRE
        assert data["last_name"] == ADMIN_CONJUNTO_APELLIDOS
        conjuntos = data["conjuntos_administrados"]
        assert isinstance(conjuntos, list)
        assert len(conjuntos) == 1
        assert all(isinstance(nombre, str) for nombre in conjuntos)

    def test_admin_sistema_trae_el_nombre_por_defecto_y_las_mismas_claves(
        self,
        client: TestClient,
        admin_sistema_auth_headers: dict[str, str],
        admin_sistema_test: object,
    ) -> None:
        response = client.get(URL_ME, headers=admin_sistema_auth_headers)

        assert response.status_code == 200
        data = response.json()
        # ¿Qué? Este rol no tiene tabla de perfil propia, pero la respuesta debe
        #       tener la misma forma: ProfilePage no distingue roles al leerla.
        assert set(data.keys()) == CLAVES_PERFIL
        assert data["email"] == ADMIN_SISTEMA_EMAIL
        assert data["role_id"] == 1
        assert data["first_name"] == "Administrador"
        assert data["last_name"] == "del Sistema"
        assert data["numero_telefonico"] == "No registrado"


class TestContratoErrores:
    """Formato de los errores que la interfaz lee y muestra."""

    def test_sin_token_responde_401_con_detail_de_texto(self, client: TestClient) -> None:
        response = client.get(URL_ME)

        assert response.status_code == 401
        assert response.headers["content-type"].startswith("application/json")
        # ¿Qué? El frontend lee `detail` como texto para mostrar el aviso, y
        #       `WWW-Authenticate` es lo que identifica el 401 de sesión vencida.
        assert response.json() == {"detail": "No se pudieron validar las credenciales"}
        assert response.headers["www-authenticate"] == "Bearer"

    def test_token_invalido_responde_401_con_el_mensaje_de_credenciales(
        self, client: TestClient
    ) -> None:
        response = client.get(
            URL_ME, headers={"Authorization": "Bearer token.invalido.falso"}
        )

        assert response.status_code == 401
        assert response.json() == {"detail": "No se pudieron validar las credenciales"}
        assert response.headers["www-authenticate"] == "Bearer"

    @pytest.mark.parametrize(
        "campo_invalido",
        [
            {"nombre": "Nombre", "apellidos": "Apellido", "numero_telefonico": "abc123"},
            {"nombre": "Juan123", "apellidos": "Apellido"},
        ],
    )
    def test_dato_invalido_en_put_responde_422_con_detail_como_lista(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
        campo_invalido: dict,
    ) -> None:
        response = client.put(URL_ME, json=campo_invalido, headers=auth_headers)

        assert response.status_code == 422
        detail = response.json()["detail"]
        # ¿Qué? A diferencia del 401, aquí `detail` es una LISTA de errores
        #       (formato de Pydantic), no un texto: cada uno dice en `loc` qué
        #       campo falló y en `msg` por qué.
        assert isinstance(detail, list)
        assert len(detail) >= 1
        for error in detail:
            assert {"loc", "msg", "type"} <= set(error.keys())
            assert isinstance(error["msg"], str)


class TestContratoLocale:
    """PATCH /api/v1/users/me/locale: único endpoint de /users con UserResponse."""

    def test_devuelve_las_claves_exactas_de_user_response(
        self, client: TestClient, auth_headers: dict[str, str], test_user: object
    ) -> None:
        response = client.patch(
            f"{URL_ME}/locale", json={"locale": "en"}, headers=auth_headers
        )

        assert response.status_code == 200
        assert response.headers["content-type"].startswith("application/json")
        data = response.json()
        assert set(data.keys()) == CLAVES_USER_RESPONSE
        assert data["email"] == TEST_USER_EMAIL
        assert data["role_id"] == 2
        assert data["is_active"] is True
        assert data["locale"] == "en"
        assert data["first_name"] == TEST_USER_NOMBRE
        assert data["last_name"] == TEST_USER_APELLIDOS
        # Nunca debe filtrarse el hash de la contraseña.
        assert "password" not in data
