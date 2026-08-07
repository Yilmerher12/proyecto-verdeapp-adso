"""
Módulo: tests/test_reciclador_conjunto.py
Descripción: Pruebas del flujo de invitación de un Administrador de Conjunto hacia
             un Reciclador ya registrado.
¿Para qué? Aquí lo crítico es la doble verificación de pertenencia: el Admin de
           Conjunto solo puede invitar a SU conjunto (no a cualquiera), y el
           Reciclador solo puede aceptar/rechazar SUS propias invitaciones.
"""

from fastapi.testclient import TestClient


class TestInvitar:
    def test_admin_conjunto_invita_a_su_reciclador(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado, reciclador_test
    ):
        response = client.post(
            "/api/v1/reciclador-conjunto/invitar",
            headers=admin_conjunto_auth_headers,
            json={
                "correo_reciclador": reciclador_test.correo_electronico,
                "id_conjunto_residencial": conjunto_verificado.id_conjunto_residencial,
            },
        )
        assert response.status_code == 201
        assert response.json()["estado"] == "PENDIENTE"

    def test_no_puede_invitar_a_un_conjunto_ajeno(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_no_verificado, reciclador_test
    ):
        """conjunto_no_verificado no está asignado a admin_conjunto_test."""
        response = client.post(
            "/api/v1/reciclador-conjunto/invitar",
            headers=admin_conjunto_auth_headers,
            json={
                "correo_reciclador": reciclador_test.correo_electronico,
                "id_conjunto_residencial": conjunto_no_verificado.id_conjunto_residencial,
            },
        )
        assert response.status_code == 403

    def test_correo_que_no_es_reciclador_devuelve_404(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado, test_user
    ):
        """test_user es un Residente, no un Reciclador."""
        response = client.post(
            "/api/v1/reciclador-conjunto/invitar",
            headers=admin_conjunto_auth_headers,
            json={
                "correo_reciclador": test_user.correo_electronico,
                "id_conjunto_residencial": conjunto_verificado.id_conjunto_residencial,
            },
        )
        assert response.status_code == 404


class TestFlujoDelReciclador:
    def _invitar(self, client, admin_conjunto_auth_headers, conjunto_verificado, reciclador_test):
        response = client.post(
            "/api/v1/reciclador-conjunto/invitar",
            headers=admin_conjunto_auth_headers,
            json={
                "correo_reciclador": reciclador_test.correo_electronico,
                "id_conjunto_residencial": conjunto_verificado.id_conjunto_residencial,
            },
        )
        return response.json()["id"]

    def test_reciclador_ve_su_invitacion_pendiente(
        self, client: TestClient, admin_conjunto_auth_headers, reciclador_auth_headers, conjunto_verificado, reciclador_test
    ):
        self._invitar(client, admin_conjunto_auth_headers, conjunto_verificado, reciclador_test)

        response = client.get("/api/v1/reciclador-conjunto/mis-invitaciones", headers=reciclador_auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["nombre_conjunto"] == conjunto_verificado.nombre_conjunto

    def test_reciclador_acepta_y_queda_autorizado(
        self, client: TestClient, admin_conjunto_auth_headers, reciclador_auth_headers, conjunto_verificado, reciclador_test
    ):
        id_invitacion = self._invitar(client, admin_conjunto_auth_headers, conjunto_verificado, reciclador_test)

        respuesta = client.post(
            f"/api/v1/reciclador-conjunto/invitaciones/{id_invitacion}/responder",
            headers=reciclador_auth_headers,
            json={"aceptar": True},
        )
        assert respuesta.status_code == 200

        autorizados = client.get(
            "/api/v1/reciclador-conjunto/mis-conjuntos-autorizados", headers=reciclador_auth_headers
        )
        assert autorizados.status_code == 200
        ids = [c["id_conjunto_residencial"] for c in autorizados.json()]
        assert conjunto_verificado.id_conjunto_residencial in ids

    def test_reciclador_rechaza_y_no_queda_autorizado(
        self, client: TestClient, admin_conjunto_auth_headers, reciclador_auth_headers, conjunto_verificado, reciclador_test
    ):
        id_invitacion = self._invitar(client, admin_conjunto_auth_headers, conjunto_verificado, reciclador_test)

        respuesta = client.post(
            f"/api/v1/reciclador-conjunto/invitaciones/{id_invitacion}/responder",
            headers=reciclador_auth_headers,
            json={"aceptar": False},
        )
        assert respuesta.status_code == 200

        autorizados = client.get(
            "/api/v1/reciclador-conjunto/mis-conjuntos-autorizados", headers=reciclador_auth_headers
        )
        assert autorizados.json() == []

    def test_admin_conjunto_ve_las_invitaciones_de_su_conjunto(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado, reciclador_test
    ):
        self._invitar(client, admin_conjunto_auth_headers, conjunto_verificado, reciclador_test)

        response = client.get(
            f"/api/v1/reciclador-conjunto/mi-conjunto/{conjunto_verificado.id_conjunto_residencial}/invitaciones",
            headers=admin_conjunto_auth_headers,
        )
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["correo_reciclador"] == reciclador_test.correo_electronico
