"""
Módulo: tests/test_directorio.py
Descripción: Pruebas del router de directorio (recicladores y puntos de acopio).
¿Para qué? Estos dos endpoints sí exigen login (cualquier rol autenticado), a
           diferencia de admin.py. Lo importante a probar es que efectivamente
           pidan un token válido, y que el filtro por localidad funcione.
"""

from fastapi.testclient import TestClient


class TestRecicladores:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get("/api/v1/directorio/recicladores")
        assert response.status_code == 401

    def test_con_login_devuelve_el_reciclador(self, client: TestClient, auth_headers, reciclador_test):
        response = client.get("/api/v1/directorio/recicladores", headers=auth_headers)
        assert response.status_code == 200
        correos = [r["numero_telefonico"] for r in response.json()]
        assert "3000000002" in correos

    def test_filtro_por_localidad_sin_resultados(self, client: TestClient, auth_headers, reciclador_test):
        response = client.get(
            "/api/v1/directorio/recicladores", headers=auth_headers, params={"localidad_id": 999999}
        )
        assert response.status_code == 200
        assert response.json() == []


class TestPuntosAcopio:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get("/api/v1/directorio/puntos-acopio")
        assert response.status_code == 401

    def test_con_login_devuelve_el_punto(self, client: TestClient, auth_headers, punto_acopio_test):
        response = client.get("/api/v1/directorio/puntos-acopio", headers=auth_headers)
        assert response.status_code == 200
        nombres = [p["nombre"] for p in response.json()]
        assert punto_acopio_test.nombre in nombres
