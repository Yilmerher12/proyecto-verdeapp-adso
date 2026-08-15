"""
Módulo: tests/test_admin.py
Descripción: Pruebas del router de admin (vista SQL de residentes y procedimiento
             almacenado de recicladores).
¿Para qué? Estos dos endpoints exponen datos personales de TODOS los residentes y
           recicladores (correo, teléfono, dirección) y hasta hace poco no exigían
           ningún login. Estas pruebas existen justamente para que, si alguien
           vuelve a quitar el chequeo de autenticación/rol por accidente, la
           prueba falle de inmediato en vez de que el hueco quede escondido meses.
"""

from fastapi.testclient import TestClient


class TestVistaResidentes:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get("/api/v1/admin/vista-residentes")
        assert response.status_code == 401

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers):
        """auth_headers pertenece a un Residente, no a un Administrador del Sistema."""
        response = client.get("/api/v1/admin/vista-residentes", headers=auth_headers)
        assert response.status_code == 403

    def test_admin_sistema_ve_el_listado(
        self, client: TestClient, admin_sistema_auth_headers, test_user
    ):
        response = client.get("/api/v1/admin/vista-residentes", headers=admin_sistema_auth_headers)
        assert response.status_code == 200
        correos = [fila["Correo"] for fila in response.json()]
        assert test_user.correo_electronico in correos


class TestSpRecicladores:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get("/api/v1/admin/sp-recicladores")
        assert response.status_code == 401

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, reciclador_auth_headers):
        response = client.get("/api/v1/admin/sp-recicladores", headers=reciclador_auth_headers)
        assert response.status_code == 403

    def test_admin_sistema_ve_el_listado(
        self, client: TestClient, admin_sistema_auth_headers, reciclador_test
    ):
        response = client.get("/api/v1/admin/sp-recicladores", headers=admin_sistema_auth_headers)
        assert response.status_code == 200
        correos = [fila["Correo"] for fila in response.json()]
        assert reciclador_test.correo_electronico in correos
