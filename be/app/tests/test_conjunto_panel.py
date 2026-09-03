"""
Módulo: tests/test_conjunto_panel.py
Descripción: Pruebas del panel propio del Administrador de Conjunto.
¿Para qué? Lo más importante de este router es que un Administrador de Conjunto
           SOLO pueda ver y editar los conjuntos que tiene asignados — nunca los
           de otro administrador ni los de todo el sistema. Estas pruebas
           confirman esa restricción, además del login y el rol correctos.
"""

from fastapi.testclient import TestClient


class TestMisConjuntos:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get("/api/v1/conjunto-panel/mis-conjuntos")
        assert response.status_code == 401

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers):
        """auth_headers es de un Residente, no de un Administrador de Conjunto."""
        response = client.get("/api/v1/conjunto-panel/mis-conjuntos", headers=auth_headers)
        assert response.status_code == 403

    def test_devuelve_solo_los_conjuntos_asignados(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        response = client.get("/api/v1/conjunto-panel/mis-conjuntos", headers=admin_conjunto_auth_headers)
        assert response.status_code == 200
        ids = [c["id_conjunto_residencial"] for c in response.json()]
        assert ids == [str(conjunto_verificado.id_conjunto_residencial)]

    def test_incluye_el_codigo_acceso(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        """Issue #168: el admin debe poder ver el código para repartirlo."""
        response = client.get("/api/v1/conjunto-panel/mis-conjuntos", headers=admin_conjunto_auth_headers)
        assert response.json()[0]["codigo_acceso"] == conjunto_verificado.codigo_acceso

    def test_marca_tiene_solicitud_pendiente(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        """RQF-016: el flag debe reflejar si ya hay una solicitud de desvinculación pendiente para ese conjunto."""
        antes = client.get("/api/v1/conjunto-panel/mis-conjuntos", headers=admin_conjunto_auth_headers)
        assert antes.json()[0]["tiene_solicitud_pendiente"] is False

        client.post(
            f"/api/v1/conjunto-panel/mis-conjuntos/{conjunto_verificado.id_conjunto_residencial}/solicitar-desvinculacion",
            headers=admin_conjunto_auth_headers,
            json={},
        )

        despues = client.get("/api/v1/conjunto-panel/mis-conjuntos", headers=admin_conjunto_auth_headers)
        assert despues.json()[0]["tiene_solicitud_pendiente"] is True


class TestEditarConjunto:
    def test_puede_editar_un_conjunto_propio(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        response = client.patch(
            f"/api/v1/conjunto-panel/mis-conjuntos/{conjunto_verificado.id_conjunto_residencial}",
            headers=admin_conjunto_auth_headers,
            json={"nombre_conjunto": "TORRES RENOMBRADAS", "nit": "900111222-1", "direccion": "Nueva Dirección 1"},
        )
        assert response.status_code == 200

    def test_no_puede_editar_un_conjunto_ajeno(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_no_verificado
    ):
        """conjunto_no_verificado no está asignado a admin_conjunto_test — debe rechazarse."""
        response = client.patch(
            f"/api/v1/conjunto-panel/mis-conjuntos/{conjunto_no_verificado.id_conjunto_residencial}",
            headers=admin_conjunto_auth_headers,
            json={"nombre_conjunto": "INTENTO AJENO", "direccion": "No debería aplicar"},
        )
        assert response.status_code == 403

    def test_sin_login_devuelve_401(self, client: TestClient, conjunto_verificado):
        response = client.patch(
            f"/api/v1/conjunto-panel/mis-conjuntos/{conjunto_verificado.id_conjunto_residencial}",
            json={"nombre_conjunto": "X", "direccion": "Y"},
        )
        assert response.status_code == 401


class TestRegenerarCodigoAcceso:
    """Issue #168 — el Admin de Conjunto puede rotar el código de su propio conjunto."""

    def _url(self, conjunto) -> str:
        return f"/api/v1/conjunto-panel/mis-conjuntos/{conjunto.id_conjunto_residencial}/regenerar-codigo-acceso"

    def test_sin_login_devuelve_401(self, client: TestClient, conjunto_verificado):
        response = client.post(self._url(conjunto_verificado))
        assert response.status_code == 401

    def test_no_puede_regenerar_un_conjunto_ajeno(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_no_verificado
    ):
        response = client.post(self._url(conjunto_no_verificado), headers=admin_conjunto_auth_headers)
        assert response.status_code == 403

    def test_genera_un_codigo_distinto_al_anterior(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        codigo_original = conjunto_verificado.codigo_acceso
        response = client.post(self._url(conjunto_verificado), headers=admin_conjunto_auth_headers)
        assert response.status_code == 200
        codigo_nuevo = response.json()["codigo_acceso"]
        assert codigo_nuevo != codigo_original
        assert len(codigo_nuevo) == 6

        # ¿Qué? El código viejo debe dejar de servir para registrarse.
        listado = client.get("/api/v1/conjunto-panel/mis-conjuntos", headers=admin_conjunto_auth_headers)
        assert listado.json()[0]["codigo_acceso"] == codigo_nuevo
