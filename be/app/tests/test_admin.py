"""
Módulo: tests/test_admin.py
Descripción: Pruebas del router de admin (vista SQL de residentes, procedimiento
             almacenado de recicladores, y listado de administradores de conjunto).
¿Para qué? Estos endpoints exponen datos personales de TODOS los usuarios
           (correo, teléfono, dirección) y hasta hace poco no exigían ningún
           login. Estas pruebas existen justamente para que, si alguien
           vuelve a quitar el chequeo de autenticación/rol por accidente, la
           prueba falle de inmediato en vez de que el hueco quede escondido
           meses. También cubren la búsqueda/filtro/paginación agregada
           para que el panel del Admin del Sistema escale con miles de
           usuarios en vez de traerlos todos de un golpe.
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
        data = response.json()
        correos = [fila["Correo"] for fila in data["items"]]
        assert test_user.correo_electronico in correos
        assert data["total"] >= 1

    def test_busqueda_por_correo_filtra_resultados(
        self, client: TestClient, admin_sistema_auth_headers, test_user
    ):
        response = client.get(
            "/api/v1/admin/vista-residentes",
            headers=admin_sistema_auth_headers,
            params={"search": "no-existe-nadie-con-esto"},
        )
        assert response.status_code == 200
        assert response.json()["items"] == []
        assert response.json()["total"] == 0

    def test_filtro_por_localidad(
        self, client: TestClient, admin_sistema_auth_headers, test_user, localidad_test
    ):
        response = client.get(
            "/api/v1/admin/vista-residentes",
            headers=admin_sistema_auth_headers,
            params={"localidad_id": localidad_test.id_localidad},
        )
        assert response.status_code == 200
        correos = [fila["Correo"] for fila in response.json()["items"]]
        assert test_user.correo_electronico in correos

    def test_filtro_por_localidad_ajena_no_devuelve_nada(
        self, client: TestClient, admin_sistema_auth_headers, test_user
    ):
        response = client.get(
            "/api/v1/admin/vista-residentes",
            headers=admin_sistema_auth_headers,
            params={"localidad_id": 999999},
        )
        assert response.status_code == 200
        assert response.json()["items"] == []


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
        data = response.json()
        correos = [fila["Correo"] for fila in data["items"]]
        assert reciclador_test.correo_electronico in correos
        assert data["total"] >= 1

    def test_busqueda_sin_coincidencias(
        self, client: TestClient, admin_sistema_auth_headers, reciclador_test
    ):
        response = client.get(
            "/api/v1/admin/sp-recicladores",
            headers=admin_sistema_auth_headers,
            params={"search": "no-existe-nadie-con-esto"},
        )
        assert response.status_code == 200
        assert response.json()["items"] == []
        assert response.json()["total"] == 0

    def test_filtro_por_localidad(
        self, client: TestClient, admin_sistema_auth_headers, reciclador_test, localidad_test
    ):
        response = client.get(
            "/api/v1/admin/sp-recicladores",
            headers=admin_sistema_auth_headers,
            params={"localidad_id": localidad_test.id_localidad},
        )
        assert response.status_code == 200
        correos = [fila["Correo"] for fila in response.json()["items"]]
        assert reciclador_test.correo_electronico in correos


class TestAdministradoresConjunto:
    """¿Por qué? Antes no existía ningún endpoint para ver los
    Administradores de Conjunto ya creados — el panel del Admin del
    Sistema solo mostraba Residentes y Recicladores."""

    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get("/api/v1/admin/administradores-conjunto")
        assert response.status_code == 401

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, admin_conjunto_auth_headers):
        response = client.get(
            "/api/v1/admin/administradores-conjunto", headers=admin_conjunto_auth_headers
        )
        assert response.status_code == 403

    def test_admin_sistema_ve_el_listado(
        self, client: TestClient, admin_sistema_auth_headers, admin_conjunto_test, conjunto_verificado
    ):
        response = client.get(
            "/api/v1/admin/administradores-conjunto", headers=admin_sistema_auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        correos = [fila["Correo"] for fila in data["items"]]
        assert admin_conjunto_test.usuario.correo_electronico in correos
        fila = next(f for f in data["items"] if f["Correo"] == admin_conjunto_test.usuario.correo_electronico)
        assert conjunto_verificado.nombre_conjunto in fila["Conjuntos"]

    def test_filtro_por_localidad_de_sus_conjuntos(
        self,
        client: TestClient,
        admin_sistema_auth_headers,
        admin_conjunto_test,
        localidad_test,
    ):
        """El filtro busca "administra AL MENOS un conjunto en esa
        localidad" — no es una columna directa del administrador."""
        response = client.get(
            "/api/v1/admin/administradores-conjunto",
            headers=admin_sistema_auth_headers,
            params={"localidad_id": localidad_test.id_localidad},
        )
        assert response.status_code == 200
        correos = [fila["Correo"] for fila in response.json()["items"]]
        assert admin_conjunto_test.usuario.correo_electronico in correos

    def test_filtro_por_localidad_ajena_no_devuelve_nada(
        self, client: TestClient, admin_sistema_auth_headers, admin_conjunto_test
    ):
        response = client.get(
            "/api/v1/admin/administradores-conjunto",
            headers=admin_sistema_auth_headers,
            params={"localidad_id": 999999},
        )
        assert response.status_code == 200
        assert response.json()["items"] == []
