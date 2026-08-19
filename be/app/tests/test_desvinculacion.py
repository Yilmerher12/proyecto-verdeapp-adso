"""
Módulo: tests/test_desvinculacion.py
Descripción: Pruebas de desvinculación y reasignación de conjuntos (RQF-016).
¿Para qué? Cubrir los 3 flujos: solicitar desvinculación (HU-022), que el
           Admin Sistema la resuelva (HU-023), y que asigne un conjunto
           adicional a un Admin de Conjunto existente (HU-024).
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


class TestSolicitarDesvinculacion:
    def test_sin_login_devuelve_401(self, client: TestClient, conjunto_verificado):
        response = client.post(
            f"/api/v1/conjunto-panel/mis-conjuntos/{conjunto_verificado.id_conjunto_residencial}/solicitar-desvinculacion",
            json={},
        )
        assert response.status_code == 401

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers, conjunto_verificado):
        """auth_headers es de un Residente, no de un Administrador de Conjunto."""
        response = client.post(
            f"/api/v1/conjunto-panel/mis-conjuntos/{conjunto_verificado.id_conjunto_residencial}/solicitar-desvinculacion",
            headers=auth_headers,
            json={},
        )
        assert response.status_code == 403

    def test_conjunto_que_no_administra_devuelve_403(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado_sin_admin
    ):
        response = client.post(
            f"/api/v1/conjunto-panel/mis-conjuntos/{conjunto_verificado_sin_admin.id_conjunto_residencial}/solicitar-desvinculacion",
            headers=admin_conjunto_auth_headers,
            json={"motivo": "No administro este conjunto"},
        )
        assert response.status_code == 403

    def test_solicitud_exitosa(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        response = client.post(
            f"/api/v1/conjunto-panel/mis-conjuntos/{conjunto_verificado.id_conjunto_residencial}/solicitar-desvinculacion",
            headers=admin_conjunto_auth_headers,
            json={"motivo": "Fin de contrato"},
        )
        assert response.status_code == 201

    def test_no_permite_solicitud_duplicada_pendiente(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        url = f"/api/v1/conjunto-panel/mis-conjuntos/{conjunto_verificado.id_conjunto_residencial}/solicitar-desvinculacion"
        primera = client.post(url, headers=admin_conjunto_auth_headers, json={})
        assert primera.status_code == 201

        segunda = client.post(url, headers=admin_conjunto_auth_headers, json={})
        assert segunda.status_code == 400


class TestListarSolicitudes:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get("/api/v1/admin-conjunto/solicitudes-desvinculacion")
        assert response.status_code == 401

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, admin_conjunto_auth_headers):
        response = client.get(
            "/api/v1/admin-conjunto/solicitudes-desvinculacion", headers=admin_conjunto_auth_headers
        )
        assert response.status_code == 403

    def test_admin_sistema_ve_la_solicitud_pendiente(
        self, client: TestClient, admin_sistema_auth_headers, admin_conjunto_auth_headers, conjunto_verificado
    ):
        client.post(
            f"/api/v1/conjunto-panel/mis-conjuntos/{conjunto_verificado.id_conjunto_residencial}/solicitar-desvinculacion",
            headers=admin_conjunto_auth_headers,
            json={"motivo": "Fin de contrato"},
        )

        response = client.get(
            "/api/v1/admin-conjunto/solicitudes-desvinculacion", headers=admin_sistema_auth_headers
        )
        assert response.status_code == 200
        solicitudes = response.json()
        assert len(solicitudes) == 1
        assert solicitudes[0]["nombre_conjunto"] == conjunto_verificado.nombre_conjunto
        assert solicitudes[0]["motivo"] == "Fin de contrato"
        assert solicitudes[0]["estado"] == "PENDIENTE"


class TestResolverSolicitud:
    def test_aprobar_desvincula_y_notifica(
        self,
        client: TestClient,
        db: Session,
        admin_sistema_auth_headers,
        admin_conjunto_auth_headers,
        conjunto_verificado,
    ):
        client.post(
            f"/api/v1/conjunto-panel/mis-conjuntos/{conjunto_verificado.id_conjunto_residencial}/solicitar-desvinculacion",
            headers=admin_conjunto_auth_headers,
            json={},
        )
        from app.models.solicitud_desvinculacion import SolicitudDesvinculacion
        from sqlalchemy import select

        solicitud = db.execute(select(SolicitudDesvinculacion)).scalar_one()

        response = client.post(
            f"/api/v1/admin-conjunto/solicitudes-desvinculacion/{solicitud.id}/resolver",
            headers=admin_sistema_auth_headers,
            json={"aprobar": True},
        )
        assert response.status_code == 200

        # El conjunto ya no debe aparecer en "mis conjuntos" del Admin de Conjunto.
        mis_conjuntos = client.get("/api/v1/conjunto-panel/mis-conjuntos", headers=admin_conjunto_auth_headers)
        assert mis_conjuntos.status_code == 200
        assert mis_conjuntos.json() == []

        # Debe haber recibido una notificación.
        notifs = client.get("/api/v1/notificaciones/mis-notificaciones", headers=admin_conjunto_auth_headers)
        assert any(n["tipo"] == "DESVINCULACION_APROBADA" for n in notifs.json())

    def test_rechazar_sin_motivo_devuelve_422(
        self, client: TestClient, db: Session, admin_sistema_auth_headers, admin_conjunto_auth_headers, conjunto_verificado
    ):
        client.post(
            f"/api/v1/conjunto-panel/mis-conjuntos/{conjunto_verificado.id_conjunto_residencial}/solicitar-desvinculacion",
            headers=admin_conjunto_auth_headers,
            json={},
        )
        from app.models.solicitud_desvinculacion import SolicitudDesvinculacion
        from sqlalchemy import select

        solicitud = db.execute(select(SolicitudDesvinculacion)).scalar_one()

        response = client.post(
            f"/api/v1/admin-conjunto/solicitudes-desvinculacion/{solicitud.id}/resolver",
            headers=admin_sistema_auth_headers,
            json={"aprobar": False},
        )
        assert response.status_code == 422

    def test_rechazar_con_motivo_mantiene_vinculo(
        self, client: TestClient, db: Session, admin_sistema_auth_headers, admin_conjunto_auth_headers, conjunto_verificado
    ):
        client.post(
            f"/api/v1/conjunto-panel/mis-conjuntos/{conjunto_verificado.id_conjunto_residencial}/solicitar-desvinculacion",
            headers=admin_conjunto_auth_headers,
            json={},
        )
        from app.models.solicitud_desvinculacion import SolicitudDesvinculacion
        from sqlalchemy import select

        solicitud = db.execute(select(SolicitudDesvinculacion)).scalar_one()

        response = client.post(
            f"/api/v1/admin-conjunto/solicitudes-desvinculacion/{solicitud.id}/resolver",
            headers=admin_sistema_auth_headers,
            json={"aprobar": False, "motivo_rechazo": "Aún hay contrato vigente"},
        )
        assert response.status_code == 200

        mis_conjuntos = client.get("/api/v1/conjunto-panel/mis-conjuntos", headers=admin_conjunto_auth_headers)
        assert len(mis_conjuntos.json()) == 1

    def test_resolver_solicitud_ya_resuelta_devuelve_400(
        self, client: TestClient, db: Session, admin_sistema_auth_headers, admin_conjunto_auth_headers, conjunto_verificado
    ):
        client.post(
            f"/api/v1/conjunto-panel/mis-conjuntos/{conjunto_verificado.id_conjunto_residencial}/solicitar-desvinculacion",
            headers=admin_conjunto_auth_headers,
            json={},
        )
        from app.models.solicitud_desvinculacion import SolicitudDesvinculacion
        from sqlalchemy import select

        solicitud = db.execute(select(SolicitudDesvinculacion)).scalar_one()
        url = f"/api/v1/admin-conjunto/solicitudes-desvinculacion/{solicitud.id}/resolver"

        client.post(url, headers=admin_sistema_auth_headers, json={"aprobar": True})
        segunda = client.post(url, headers=admin_sistema_auth_headers, json={"aprobar": True})
        assert segunda.status_code == 400

    def test_solicitud_inexistente_devuelve_404(self, client: TestClient, admin_sistema_auth_headers):
        response = client.post(
            "/api/v1/admin-conjunto/solicitudes-desvinculacion/999999/resolver",
            headers=admin_sistema_auth_headers,
            json={"aprobar": True},
        )
        assert response.status_code == 404


class TestConjuntosSinAdministrador:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get("/api/v1/geography/conjuntos/sin-administrador")
        assert response.status_code == 401

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, admin_conjunto_auth_headers):
        response = client.get(
            "/api/v1/geography/conjuntos/sin-administrador", headers=admin_conjunto_auth_headers
        )
        assert response.status_code == 403

    def test_solo_incluye_conjuntos_sin_administrador_activo(
        self, client: TestClient, admin_sistema_auth_headers, admin_conjunto_test, conjunto_verificado, conjunto_verificado_sin_admin
    ):
        response = client.get(
            "/api/v1/geography/conjuntos/sin-administrador", headers=admin_sistema_auth_headers
        )
        assert response.status_code == 200
        nombres = [c["nombre_conjunto"] for c in response.json()]
        assert conjunto_verificado_sin_admin.nombre_conjunto in nombres
        assert conjunto_verificado.nombre_conjunto not in nombres


class TestListarAdministradores:
    def test_admin_sistema_encuentra_administrador_existente(
        self, client: TestClient, admin_sistema_auth_headers, admin_conjunto_test, conjunto_verificado
    ):
        response = client.get("/api/v1/admin-conjunto/listar", headers=admin_sistema_auth_headers)
        assert response.status_code == 200
        correos = [a["correo_electronico"] for a in response.json()]
        assert admin_conjunto_test.usuario.correo_electronico in correos

    def test_filtra_por_query(
        self, client: TestClient, admin_sistema_auth_headers, admin_conjunto_test, conjunto_verificado
    ):
        response = client.get(
            "/api/v1/admin-conjunto/listar", headers=admin_sistema_auth_headers, params={"query": "no-existe-nadie"}
        )
        assert response.status_code == 200
        assert response.json() == []

    def test_encuentra_por_nombre_completo(
        self, client: TestClient, admin_sistema_auth_headers, admin_conjunto_test, conjunto_verificado
    ):
        """Buscar 'ADMIN DE PRUEBA' (nombre + apellidos juntos) debe encontrar al administrador, no solo cada campo por separado."""
        response = client.get(
            "/api/v1/admin-conjunto/listar",
            headers=admin_sistema_auth_headers,
            params={"query": f"{admin_conjunto_test.nombre} {admin_conjunto_test.apellidos}"},
        )
        assert response.status_code == 200
        correos = [a["correo_electronico"] for a in response.json()]
        assert admin_conjunto_test.usuario.correo_electronico in correos


class TestAsignarConjuntoAdicional:
    def test_asignacion_exitosa(
        self,
        client: TestClient,
        admin_sistema_auth_headers,
        admin_conjunto_auth_headers,
        admin_conjunto_test,
        conjunto_verificado_sin_admin,
    ):
        response = client.post(
            "/api/v1/admin-conjunto/asignar-conjunto-adicional",
            headers=admin_sistema_auth_headers,
            json={
                "id_administrador": admin_conjunto_test.id_administrador,
                "id_conjunto_residencial": conjunto_verificado_sin_admin.id_conjunto_residencial,
            },
        )
        assert response.status_code == 201

        mis_conjuntos = client.get("/api/v1/conjunto-panel/mis-conjuntos", headers=admin_conjunto_auth_headers)
        nombres = [c["nombre_conjunto"] for c in mis_conjuntos.json()]
        assert conjunto_verificado_sin_admin.nombre_conjunto in nombres

        notifs = client.get("/api/v1/notificaciones/mis-notificaciones", headers=admin_conjunto_auth_headers)
        assert any(n["tipo"] == "CONJUNTO_ASIGNADO" for n in notifs.json())

    def test_conjunto_ya_tiene_administrador_devuelve_400(
        self, client: TestClient, admin_sistema_auth_headers, admin_conjunto_test, conjunto_verificado
    ):
        response = client.post(
            "/api/v1/admin-conjunto/asignar-conjunto-adicional",
            headers=admin_sistema_auth_headers,
            json={
                "id_administrador": admin_conjunto_test.id_administrador,
                "id_conjunto_residencial": conjunto_verificado.id_conjunto_residencial,
            },
        )
        assert response.status_code == 400

    def test_administrador_inexistente_devuelve_404(
        self, client: TestClient, admin_sistema_auth_headers, conjunto_verificado_sin_admin
    ):
        response = client.post(
            "/api/v1/admin-conjunto/asignar-conjunto-adicional",
            headers=admin_sistema_auth_headers,
            json={
                "id_administrador": 999999,
                "id_conjunto_residencial": conjunto_verificado_sin_admin.id_conjunto_residencial,
            },
        )
        assert response.status_code == 404

    def test_conjunto_inexistente_devuelve_404(
        self, client: TestClient, admin_sistema_auth_headers, admin_conjunto_test
    ):
        response = client.post(
            "/api/v1/admin-conjunto/asignar-conjunto-adicional",
            headers=admin_sistema_auth_headers,
            json={
                "id_administrador": admin_conjunto_test.id_administrador,
                "id_conjunto_residencial": 999999,
            },
        )
        assert response.status_code == 404
