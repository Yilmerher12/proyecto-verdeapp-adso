"""
Módulo: tests/test_puntos_acopio.py
Descripción: Pruebas de la gestión de puntos de acopio por el Admin Sistema
             (RQF-011 / HU-015, HU-016, HU-017).
"""

from fastapi.testclient import TestClient

from app.models.localidad import Localidad
from app.models.punto_acopio import PuntoAcopio
from sqlalchemy.orm import Session

BASE = "/api/v1/admin/puntos-acopio"


class TestListar:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get(BASE)
        assert response.status_code == 401

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers):
        """auth_headers es de un Residente, no de un Admin Sistema."""
        response = client.get(BASE, headers=auth_headers)
        assert response.status_code == 403

    def test_incluye_puntos_dados_de_baja(
        self, client: TestClient, db: Session, admin_sistema_auth_headers, punto_acopio_test
    ):
        """A diferencia de /directorio/puntos-acopio, la vista de admin no filtra activo=False."""
        punto_acopio_test.activo = False
        db.commit()

        response = client.get(BASE, headers=admin_sistema_auth_headers)
        assert response.status_code == 200
        ids = [p["id_punto_acopio"] for p in response.json()]
        assert str(punto_acopio_test.id_punto_acopio) in ids


class TestCrear:
    def test_registra_un_punto_nuevo(
        self, client: TestClient, admin_sistema_auth_headers, localidad_test: Localidad
    ):
        response = client.post(
            BASE,
            headers=admin_sistema_auth_headers,
            json={
                "nombre": "ECA Nueva",
                "direccion": "Calle 1 # 1-1",
                "id_localidad": localidad_test.id_localidad,
                "nombre_encargado": "Encargado",
                "telefono_contacto": "3000000000",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["nombre"] == "ECA Nueva"
        assert data["activo"] is True
        assert data["nombre_localidad"] == localidad_test.nombre_localidad

    def test_localidad_inexistente_devuelve_400(self, client: TestClient, admin_sistema_auth_headers):
        response = client.post(
            BASE,
            headers=admin_sistema_auth_headers,
            json={"nombre": "ECA X", "direccion": "Calle 1 # 1-1", "id_localidad": 999999},
        )
        assert response.status_code == 400

    def test_con_rol_incorrecto_devuelve_403(
        self, client: TestClient, auth_headers, localidad_test: Localidad
    ):
        response = client.post(
            BASE,
            headers=auth_headers,
            json={"nombre": "ECA X", "direccion": "Calle 1 # 1-1", "id_localidad": localidad_test.id_localidad},
        )
        assert response.status_code == 403


class TestEditar:
    def test_edita_un_punto_existente(
        self, client: TestClient, admin_sistema_auth_headers, punto_acopio_test: PuntoAcopio, localidad_test: Localidad
    ):
        response = client.put(
            f"{BASE}/{punto_acopio_test.id_punto_acopio}",
            headers=admin_sistema_auth_headers,
            json={
                "nombre": "PUNTO RENOMBRADO",
                "direccion": "Nueva Dirección 1",
                "id_localidad": localidad_test.id_localidad,
            },
        )
        assert response.status_code == 200
        assert response.json()["nombre"] == "PUNTO RENOMBRADO"

    def test_punto_inexistente_devuelve_404(
        self, client: TestClient, admin_sistema_auth_headers, localidad_test: Localidad
    ):
        response = client.put(
            f"{BASE}/00000000-0000-0000-0000-000000000000",
            headers=admin_sistema_auth_headers,
            json={"nombre": "X", "direccion": "Y", "id_localidad": localidad_test.id_localidad},
        )
        assert response.status_code == 404

    def test_localidad_inexistente_devuelve_400(
        self, client: TestClient, admin_sistema_auth_headers, punto_acopio_test: PuntoAcopio
    ):
        response = client.put(
            f"{BASE}/{punto_acopio_test.id_punto_acopio}",
            headers=admin_sistema_auth_headers,
            json={"nombre": "X", "direccion": "Y", "id_localidad": 999999},
        )
        assert response.status_code == 400


class TestDarDeBaja:
    def test_da_de_baja_un_punto(
        self, client: TestClient, admin_sistema_auth_headers, punto_acopio_test: PuntoAcopio
    ):
        response = client.delete(
            f"{BASE}/{punto_acopio_test.id_punto_acopio}", headers=admin_sistema_auth_headers
        )
        assert response.status_code == 204

    def test_desaparece_del_directorio_publico(
        self, client: TestClient, admin_sistema_auth_headers, auth_headers, punto_acopio_test: PuntoAcopio
    ):
        """CA-017.2: un punto dado de baja ya no debe verlo un Residente en el directorio."""
        antes = client.get("/api/v1/directorio/puntos-acopio", headers=auth_headers)
        assert str(punto_acopio_test.id_punto_acopio) in [p["id_punto_acopio"] for p in antes.json()]

        client.delete(f"{BASE}/{punto_acopio_test.id_punto_acopio}", headers=admin_sistema_auth_headers)

        despues = client.get("/api/v1/directorio/puntos-acopio", headers=auth_headers)
        assert str(punto_acopio_test.id_punto_acopio) not in [p["id_punto_acopio"] for p in despues.json()]

    def test_punto_inexistente_devuelve_404(self, client: TestClient, admin_sistema_auth_headers):
        response = client.delete(
            f"{BASE}/00000000-0000-0000-0000-000000000000", headers=admin_sistema_auth_headers
        )
        assert response.status_code == 404

    def test_con_rol_incorrecto_devuelve_403(
        self, client: TestClient, auth_headers, punto_acopio_test: PuntoAcopio
    ):
        response = client.delete(f"{BASE}/{punto_acopio_test.id_punto_acopio}", headers=auth_headers)
        assert response.status_code == 403


class TestReactivar:
    def _url(self, punto) -> str:
        return f"{BASE}/{punto.id_punto_acopio}/reactivar"

    def test_reactiva_un_punto_dado_de_baja(
        self, client: TestClient, admin_sistema_auth_headers, auth_headers, punto_acopio_test: PuntoAcopio
    ):
        client.delete(f"{BASE}/{punto_acopio_test.id_punto_acopio}", headers=admin_sistema_auth_headers)

        response = client.post(self._url(punto_acopio_test), headers=admin_sistema_auth_headers)
        assert response.status_code == 200
        assert response.json()["activo"] is True

        # Vuelve a aparecer en el directorio público.
        directorio = client.get("/api/v1/directorio/puntos-acopio", headers=auth_headers)
        ids = [p["id_punto_acopio"] for p in directorio.json()]
        assert str(punto_acopio_test.id_punto_acopio) in ids

    def test_punto_inexistente_devuelve_404(self, client: TestClient, admin_sistema_auth_headers):
        response = client.post(
            f"{BASE}/00000000-0000-0000-0000-000000000000/reactivar", headers=admin_sistema_auth_headers
        )
        assert response.status_code == 404

    def test_con_rol_incorrecto_devuelve_403(
        self, client: TestClient, auth_headers, punto_acopio_test: PuntoAcopio
    ):
        response = client.post(self._url(punto_acopio_test), headers=auth_headers)
        assert response.status_code == 403


class TestEliminarDefinitivamente:
    """Distinto de dar de baja: borra el registro por completo."""

    def test_elimina_un_punto_ya_dado_de_baja(
        self, client: TestClient, admin_sistema_auth_headers, punto_acopio_test: PuntoAcopio
    ):
        client.delete(f"{BASE}/{punto_acopio_test.id_punto_acopio}", headers=admin_sistema_auth_headers)

        response = client.delete(
            f"{BASE}/{punto_acopio_test.id_punto_acopio}/definitivo", headers=admin_sistema_auth_headers
        )
        assert response.status_code == 204

        listado = client.get(BASE, headers=admin_sistema_auth_headers)
        ids = [p["id_punto_acopio"] for p in listado.json()]
        assert str(punto_acopio_test.id_punto_acopio) not in ids

    def test_rechaza_si_el_punto_sigue_activo(
        self, client: TestClient, admin_sistema_auth_headers, punto_acopio_test: PuntoAcopio
    ):
        response = client.delete(
            f"{BASE}/{punto_acopio_test.id_punto_acopio}/definitivo", headers=admin_sistema_auth_headers
        )
        assert response.status_code == 400

    def test_punto_inexistente_devuelve_404(self, client: TestClient, admin_sistema_auth_headers):
        response = client.delete(
            f"{BASE}/00000000-0000-0000-0000-000000000000/definitivo", headers=admin_sistema_auth_headers
        )
        assert response.status_code == 404

    def test_con_rol_incorrecto_devuelve_403(
        self, client: TestClient, auth_headers, punto_acopio_test: PuntoAcopio
    ):
        response = client.delete(f"{BASE}/{punto_acopio_test.id_punto_acopio}/definitivo", headers=auth_headers)
        assert response.status_code == 403


class TestComentarios:
    """RQF-011: notas internas del Admin Sistema sobre cada punto de acopio."""

    def test_agrega_y_lista_un_comentario_con_su_autor(
        self, client: TestClient, admin_sistema_auth_headers, admin_sistema_test, punto_acopio_test: PuntoAcopio
    ):
        url = f"{BASE}/{punto_acopio_test.id_punto_acopio}/comentarios"
        creado = client.post(url, headers=admin_sistema_auth_headers, json={"texto": "  Nuevo encargado confirmado  "})
        assert creado.status_code == 201
        assert creado.json()["texto"] == "Nuevo encargado confirmado"
        assert creado.json()["autor"] == admin_sistema_test.correo_electronico

        lista = client.get(url, headers=admin_sistema_auth_headers)
        assert lista.status_code == 200
        assert [c["texto"] for c in lista.json()] == ["Nuevo encargado confirmado"]

    def test_lista_del_mas_reciente_al_mas_antiguo(
        self, client: TestClient, admin_sistema_auth_headers, punto_acopio_test: PuntoAcopio
    ):
        url = f"{BASE}/{punto_acopio_test.id_punto_acopio}/comentarios"
        client.post(url, headers=admin_sistema_auth_headers, json={"texto": "primero"})
        client.post(url, headers=admin_sistema_auth_headers, json={"texto": "segundo"})
        textos = [c["texto"] for c in client.get(url, headers=admin_sistema_auth_headers).json()]
        assert textos == ["segundo", "primero"]

    def test_comentario_vacio_devuelve_422(
        self, client: TestClient, admin_sistema_auth_headers, punto_acopio_test: PuntoAcopio
    ):
        response = client.post(
            f"{BASE}/{punto_acopio_test.id_punto_acopio}/comentarios",
            headers=admin_sistema_auth_headers,
            json={"texto": "   "},
        )
        assert response.status_code == 422

    def test_comentario_demasiado_largo_devuelve_422(
        self, client: TestClient, admin_sistema_auth_headers, punto_acopio_test: PuntoAcopio
    ):
        response = client.post(
            f"{BASE}/{punto_acopio_test.id_punto_acopio}/comentarios",
            headers=admin_sistema_auth_headers,
            json={"texto": "x" * 1001},
        )
        assert response.status_code == 422

    def test_punto_inexistente_devuelve_404(self, client: TestClient, admin_sistema_auth_headers):
        url = f"{BASE}/00000000-0000-0000-0000-000000000000/comentarios"
        assert client.get(url, headers=admin_sistema_auth_headers).status_code == 404
        assert client.post(url, headers=admin_sistema_auth_headers, json={"texto": "hola"}).status_code == 404

    def test_con_rol_incorrecto_devuelve_403(
        self, client: TestClient, auth_headers, punto_acopio_test: PuntoAcopio
    ):
        url = f"{BASE}/{punto_acopio_test.id_punto_acopio}/comentarios"
        assert client.get(url, headers=auth_headers).status_code == 403
        assert client.post(url, headers=auth_headers, json={"texto": "hola"}).status_code == 403

    def test_sin_login_devuelve_401(self, client: TestClient, punto_acopio_test: PuntoAcopio):
        assert client.get(f"{BASE}/{punto_acopio_test.id_punto_acopio}/comentarios").status_code == 401

    def test_editar_con_motivo_guarda_un_comentario(
        self, client: TestClient, admin_sistema_auth_headers, punto_acopio_test: PuntoAcopio, localidad_test: Localidad
    ):
        response = client.put(
            f"{BASE}/{punto_acopio_test.id_punto_acopio}",
            headers=admin_sistema_auth_headers,
            json={
                "nombre": "PUNTO DE PRUEBA",
                "direccion": "Calle 50 # 5-50",
                "id_localidad": localidad_test.id_localidad,
                "nombre_encargado": "Luis Peña",
                "motivo_cambio": "Cambió el encargado",
            },
        )
        assert response.status_code == 200
        assert "motivo_cambio" not in response.json()
        comentarios = client.get(
            f"{BASE}/{punto_acopio_test.id_punto_acopio}/comentarios", headers=admin_sistema_auth_headers
        ).json()
        assert [c["texto"] for c in comentarios] == ["Cambió el encargado"]

    def test_editar_sin_motivo_no_guarda_comentario(
        self, client: TestClient, admin_sistema_auth_headers, punto_acopio_test: PuntoAcopio, localidad_test: Localidad
    ):
        client.put(
            f"{BASE}/{punto_acopio_test.id_punto_acopio}",
            headers=admin_sistema_auth_headers,
            json={
                "nombre": "PUNTO DE PRUEBA",
                "direccion": "Calle 50 # 5-50",
                "id_localidad": localidad_test.id_localidad,
                "motivo_cambio": "   ",
            },
        )
        comentarios = client.get(
            f"{BASE}/{punto_acopio_test.id_punto_acopio}/comentarios", headers=admin_sistema_auth_headers
        ).json()
        assert comentarios == []

    def test_eliminar_definitivamente_borra_tambien_sus_comentarios(
        self, client: TestClient, db: Session, admin_sistema_auth_headers, punto_acopio_test: PuntoAcopio
    ):
        from app.models.punto_acopio_comentario import PuntoAcopioComentario

        id_punto = punto_acopio_test.id_punto_acopio
        client.post(f"{BASE}/{id_punto}/comentarios", headers=admin_sistema_auth_headers, json={"texto": "nota"})
        client.delete(f"{BASE}/{id_punto}", headers=admin_sistema_auth_headers)
        assert client.delete(f"{BASE}/{id_punto}/definitivo", headers=admin_sistema_auth_headers).status_code == 204

        assert db.query(PuntoAcopioComentario).filter_by(id_punto_acopio=id_punto).count() == 0
