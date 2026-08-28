"""
Módulo: tests/test_reciclador_conjunto.py
Descripción: Pruebas del flujo de invitación de un Administrador de Conjunto hacia
             un Reciclador ya registrado.
¿Para qué? Aquí lo crítico es la doble verificación de pertenencia: el Admin de
           Conjunto solo puede invitar a SU conjunto (no a cualquiera), y el
           Reciclador solo puede aceptar/rechazar SUS propias invitaciones.
"""

from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session


class TestInvitar:
    def test_admin_conjunto_invita_a_su_reciclador(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado, reciclador_test
    ):
        response = client.post(
            "/api/v1/reciclador-conjunto/invitar",
            headers=admin_conjunto_auth_headers,
            json={
                "correo_reciclador": reciclador_test.correo_electronico,
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
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
                "id_conjunto_residencial": str(conjunto_no_verificado.id_conjunto_residencial),
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
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
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
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
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
        assert str(conjunto_verificado.id_conjunto_residencial) in ids

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


class TestRecicladoresAutorizadosDelAdmin:
    """¿Por qué? El Admin de Conjunto no tenía NINGÚN endpoint para ver
    quién está realmente autorizado en su conjunto — solo veía el
    historial de invitaciones (`.../invitaciones`), que es una tabla
    distinta de la autorización real (`recicladores_conjuntos`). Un
    reciclador vinculado por fuera del flujo de invitar/aceptar (como
    hace `seed_data.sql` a propósito) quedaba invisible para el admin,
    aunque sí estuviera autorizado — este bug fue reportado en vivo."""

    def test_sin_autorizados_devuelve_lista_vacia(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        response = client.get(
            f"/api/v1/reciclador-conjunto/mi-conjunto/{conjunto_verificado.id_conjunto_residencial}/autorizados",
            headers=admin_conjunto_auth_headers,
        )
        assert response.status_code == 200
        assert response.json() == []

    def test_reciclador_vinculado_por_fuera_de_una_invitacion_si_aparece(
        self,
        client: TestClient,
        admin_conjunto_auth_headers,
        conjunto_verificado,
        reciclador_test,
        db: Session,
    ):
        """Reproduce exactamente el caso de seed_data.sql: un reciclador
        vinculado directo en recicladores_conjuntos, SIN pasar por
        /invitar ni /responder."""
        db.execute(
            text(
                "INSERT INTO recicladores_conjuntos (id_reciclador, id_conjunto_residencial) "
                "SELECT r.id_reciclador, :cid FROM recicladores r WHERE r.id_usuario = :uid"
            ),
            {"cid": conjunto_verificado.id_conjunto_residencial, "uid": reciclador_test.id_usuario},
        )
        db.commit()

        # La lista de invitaciones se queda vacía a propósito — nunca hubo una.
        invitaciones = client.get(
            f"/api/v1/reciclador-conjunto/mi-conjunto/{conjunto_verificado.id_conjunto_residencial}/invitaciones",
            headers=admin_conjunto_auth_headers,
        )
        assert invitaciones.json() == []

        # Pero sí debe aparecer como autorizado — ese es el fix.
        autorizados = client.get(
            f"/api/v1/reciclador-conjunto/mi-conjunto/{conjunto_verificado.id_conjunto_residencial}/autorizados",
            headers=admin_conjunto_auth_headers,
        )
        assert autorizados.status_code == 200
        correos = [r["correo_electronico"] for r in autorizados.json()]
        assert reciclador_test.correo_electronico in correos

    def test_no_puede_ver_autorizados_de_un_conjunto_ajeno(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_no_verificado
    ):
        response = client.get(
            f"/api/v1/reciclador-conjunto/mi-conjunto/{conjunto_no_verificado.id_conjunto_residencial}/autorizados",
            headers=admin_conjunto_auth_headers,
        )
        assert response.status_code == 403
