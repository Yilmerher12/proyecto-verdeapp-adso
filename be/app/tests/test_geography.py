"""
Módulo: tests/test_geography.py
Descripción: Pruebas del router de geografía (localidades y conjuntos para formularios).
¿Para qué? /localidades y /conjuntos/{id_localidad} son públicos (sin login) porque los usa el
           formulario de registro antes de que la persona tenga cuenta. Lo importante a probar es que
           solo muestren conjuntos ya verificados por un Administrador del Sistema — si un conjunto
           sin verificar apareciera aquí, cualquiera podría registrarse en un conjunto que todavía no
           es real. /conjuntos/todos, en cambio, es solo del Admin Sistema (issue #403).
"""

from fastapi.testclient import TestClient

from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.localidad import Localidad


class TestLocalidades:
    def test_listar_localidades_no_requiere_login(self, client: TestClient, localidad_test):
        response = client.get("/api/v1/geography/localidades")
        assert response.status_code == 200
        nombres = [loc["nombre_localidad"] for loc in response.json()]
        assert "Usaquén" in nombres


class TestConjuntosTodos:
    def test_solo_muestra_conjuntos_verificados(
        self, client: TestClient, admin_sistema_auth_headers, conjunto_verificado, conjunto_no_verificado
    ):
        response = client.get("/api/v1/geography/conjuntos/todos", headers=admin_sistema_auth_headers)
        assert response.status_code == 200
        nombres = [c["nombre_conjunto"] for c in response.json()]
        assert conjunto_verificado.nombre_conjunto in nombres
        assert conjunto_no_verificado.nombre_conjunto not in nombres

    def test_busqueda_filtra_por_nombre(
        self, client: TestClient, admin_sistema_auth_headers, conjunto_verificado, conjunto_verificado_sin_admin
    ):
        """conjunto_verificado = 'TORRES DE PRUEBA', conjunto_verificado_sin_admin = 'RESERVA DE PRUEBA'."""
        response = client.get(
            "/api/v1/geography/conjuntos/todos", headers=admin_sistema_auth_headers, params={"search": "TORRES"}
        )
        assert response.status_code == 200
        nombres = [c["nombre_conjunto"] for c in response.json()]
        assert conjunto_verificado.nombre_conjunto in nombres
        assert conjunto_verificado_sin_admin.nombre_conjunto not in nombres

    def test_limit_acota_resultados(
        self, client: TestClient, admin_sistema_auth_headers, conjunto_verificado, conjunto_verificado_sin_admin
    ):
        response = client.get(
            "/api/v1/geography/conjuntos/todos", headers=admin_sistema_auth_headers, params={"limit": 1}
        )
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_filtra_por_localidad_antes_de_buscar_por_nombre(
        self, client: TestClient, db, admin_sistema_auth_headers, conjunto_verificado, localidad_test
    ):
        """conjunto_verificado vive en localidad_test (Usaquén). Se crea un
        segundo conjunto verificado en OTRA localidad para probar que el
        filtro de verdad distingue entre las dos, no solo que existe."""
        otra_localidad = Localidad(nombre_localidad="Chapinero")
        db.add(otra_localidad)
        db.commit()
        db.refresh(otra_localidad)

        conjunto_en_otra_localidad = ConjuntoResidencial(
            id_localidad=otra_localidad.id_localidad,
            nombre_conjunto="CONJUNTO EN CHAPINERO",
            nit="900000000-2",
            direccion="Calle 63 # 5-5",
            verificado=True,
        )
        db.add(conjunto_en_otra_localidad)
        db.commit()

        response = client.get(
            "/api/v1/geography/conjuntos/todos",
            headers=admin_sistema_auth_headers,
            params={"id_localidad": localidad_test.id_localidad},
        )
        assert response.status_code == 200
        nombres = [c["nombre_conjunto"] for c in response.json()]
        assert conjunto_verificado.nombre_conjunto in nombres
        assert conjunto_en_otra_localidad.nombre_conjunto not in nombres


    def test_sin_login_devuelve_401(self, client: TestClient):
        """Issue #403 (CN-063): ya no es público; lo usan solo pantallas del Admin Sistema."""
        assert client.get("/api/v1/geography/conjuntos/todos").status_code == 401

    def test_con_otro_rol_devuelve_403(self, client: TestClient, auth_headers, admin_conjunto_auth_headers):
        url = "/api/v1/geography/conjuntos/todos"
        assert client.get(url, headers=auth_headers).status_code == 403
        assert client.get(url, headers=admin_conjunto_auth_headers).status_code == 403


class TestLargoMaximoDeBusqueda:
    """Issue #403 (CN-063): `search` mide como máximo 255 (el largo de nombre_conjunto)."""

    def _urls(self, localidad_test) -> dict[str, str]:
        return {
            "todos": "/api/v1/geography/conjuntos/todos",
            "sin-administrador": "/api/v1/geography/conjuntos/sin-administrador",
            "por-localidad": f"/api/v1/geography/conjuntos/{localidad_test.id_localidad}",
        }

    def test_un_texto_de_mas_de_255_devuelve_422_en_los_tres(
        self, client: TestClient, admin_sistema_auth_headers, localidad_test
    ):
        for nombre, url in self._urls(localidad_test).items():
            response = client.get(url, headers=admin_sistema_auth_headers, params={"search": "A" * 256})
            assert response.status_code == 422, nombre

    def test_un_texto_de_exactamente_255_se_acepta(
        self, client: TestClient, admin_sistema_auth_headers, localidad_test
    ):
        for nombre, url in self._urls(localidad_test).items():
            response = client.get(url, headers=admin_sistema_auth_headers, params={"search": "A" * 255})
            assert response.status_code == 200, nombre


class TestConjuntosPorLocalidad:
    def test_filtra_por_localidad_y_solo_verificados(
        self, client: TestClient, localidad_test, conjunto_verificado, conjunto_no_verificado
    ):
        response = client.get(f"/api/v1/geography/conjuntos/{localidad_test.id_localidad}")
        assert response.status_code == 200
        ids = [c["id_conjunto_residencial"] for c in response.json()]
        assert str(conjunto_verificado.id_conjunto_residencial) in ids
        assert str(conjunto_no_verificado.id_conjunto_residencial) not in ids

    def test_localidad_sin_conjuntos_devuelve_lista_vacia(self, client: TestClient):
        response = client.get("/api/v1/geography/conjuntos/999999")
        assert response.status_code == 200
        assert response.json() == []

    def test_busqueda_filtra_por_nombre(
        self, client: TestClient, localidad_test, conjunto_verificado, conjunto_verificado_sin_admin
    ):
        response = client.get(
            f"/api/v1/geography/conjuntos/{localidad_test.id_localidad}", params={"search": "RESERVA"}
        )
        assert response.status_code == 200
        nombres = [c["nombre_conjunto"] for c in response.json()]
        assert conjunto_verificado_sin_admin.nombre_conjunto in nombres
        assert conjunto_verificado.nombre_conjunto not in nombres

    def test_limit_acota_resultados(
        self, client: TestClient, localidad_test, conjunto_verificado, conjunto_verificado_sin_admin
    ):
        response = client.get(
            f"/api/v1/geography/conjuntos/{localidad_test.id_localidad}", params={"limit": 1}
        )
        assert response.status_code == 200
        assert len(response.json()) == 1

