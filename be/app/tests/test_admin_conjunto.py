"""
Módulo: tests/test_admin_conjunto.py
Descripción: Pruebas del flujo de invitación de Administradores de Conjunto.
¿Para qué? Solo el Administrador del Sistema puede invitar (nunca la persona
           invitada se autoasigna el rol). Estas pruebas cubren las tres rutas:
           invitar (protegida), consultar invitación (pública) y aceptarla (pública,
           protegida por el token en vez de una sesión).
"""

import uuid

from fastapi.testclient import TestClient


class TestInvitar:
    def test_sin_login_devuelve_401(self, client: TestClient, conjunto_verificado):
        response = client.post(
            "/api/v1/admin-conjunto/invitar",
            json={"correo_electronico": "nuevo@verdeapp.com", "ids_conjuntos": [str(conjunto_verificado.id_conjunto_residencial)]},
        )
        assert response.status_code == 401

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers, conjunto_verificado):
        """auth_headers es de un Residente, no del Administrador del Sistema."""
        response = client.post(
            "/api/v1/admin-conjunto/invitar",
            headers=auth_headers,
            json={"correo_electronico": "nuevo@verdeapp.com", "ids_conjuntos": [str(conjunto_verificado.id_conjunto_residencial)]},
        )
        assert response.status_code == 403

    def test_admin_sistema_invita_correctamente(
        self, client: TestClient, admin_sistema_auth_headers, conjunto_verificado
    ):
        response = client.post(
            "/api/v1/admin-conjunto/invitar",
            headers=admin_sistema_auth_headers,
            json={"correo_electronico": "nuevo@verdeapp.com", "ids_conjuntos": [str(conjunto_verificado.id_conjunto_residencial)]},
        )
        assert response.status_code == 201
        assert "nuevo@verdeapp.com" in response.json()["message"]

    def test_conjunto_inexistente_devuelve_400(self, client: TestClient, admin_sistema_auth_headers):
        response = client.post(
            "/api/v1/admin-conjunto/invitar",
            headers=admin_sistema_auth_headers,
            json={"correo_electronico": "nuevo@verdeapp.com", "ids_conjuntos": [str(uuid.uuid4())]},
        )
        assert response.status_code == 400

    def test_correo_ya_registrado_devuelve_400(
        self, client: TestClient, admin_sistema_auth_headers, conjunto_verificado, test_user
    ):
        response = client.post(
            "/api/v1/admin-conjunto/invitar",
            headers=admin_sistema_auth_headers,
            json={"correo_electronico": test_user.correo_electronico, "ids_conjuntos": [str(conjunto_verificado.id_conjunto_residencial)]},
        )
        assert response.status_code == 400


class TestConsultarYAceptar:
    def test_token_invalido_devuelve_no_valido(self, client: TestClient):
        response = client.get("/api/v1/admin-conjunto/invitacion", params={"token": "no-existe"})
        assert response.status_code == 200
        assert response.json()["valido"] is False

    def test_flujo_completo_invitar_consultar_y_aceptar(
        self, client: TestClient, admin_sistema_auth_headers, conjunto_verificado, db
    ):
        correo = "invitado.completo@verdeapp.com"
        client.post(
            "/api/v1/admin-conjunto/invitar",
            headers=admin_sistema_auth_headers,
            json={"correo_electronico": correo, "ids_conjuntos": [str(conjunto_verificado.id_conjunto_residencial)]},
        )

        from app.models.invitacion_admin_conjunto import InvitacionAdminConjunto
        from sqlalchemy import select

        invitacion = db.execute(
            select(InvitacionAdminConjunto).where(InvitacionAdminConjunto.correo_electronico == correo)
        ).scalar_one()
        token = invitacion.token

        consulta = client.get("/api/v1/admin-conjunto/invitacion", params={"token": token})
        assert consulta.status_code == 200
        assert consulta.json()["valido"] is True
        assert consulta.json()["correo_electronico"] == correo
        assert conjunto_verificado.nombre_conjunto in consulta.json()["nombres_conjuntos"]

        aceptar = client.post(
            "/api/v1/admin-conjunto/aceptar",
            json={
                "token": token,
                "password": "ClaveFuerte123",
                "nombre": "Nuevo",
                "apellidos": "Administrador",
            },
        )
        assert aceptar.status_code == 201
        assert "access_token" in aceptar.json()

        # El token ya usado no debe servir dos veces.
        reintento = client.post(
            "/api/v1/admin-conjunto/aceptar",
            json={
                "token": token,
                "password": "ClaveFuerte123",
                "nombre": "Otro",
                "apellidos": "Nombre",
            },
        )
        assert reintento.status_code == 400

    def test_aceptar_con_token_inexistente_devuelve_400(self, client: TestClient):
        response = client.post(
            "/api/v1/admin-conjunto/aceptar",
            json={
                "token": "no-existe",
                "password": "ClaveFuerte123",
                "nombre": "Nuevo",
                "apellidos": "Administrador",
            },
        )
        assert response.status_code == 400
