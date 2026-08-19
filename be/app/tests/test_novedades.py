"""
Módulo: tests/test_novedades.py
Descripción: Pruebas de novedades generales de la plataforma (RQF-015).
¿Para qué? Cubrir los 4 flujos del Admin Sistema (publicar, ver historial
           completo, editar, archivar) y el feed por rol de
           Residente/Reciclador/Admin Conjunto — incluyendo que el
           alcance filtra correctamente y que lo archivado no reaparece.
"""

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


class TestCrearNovedad:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.post("/api/v1/novedades", json={"alcance": "TODOS", "texto": "Aviso de prueba"})
        assert response.status_code == 401

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers):
        """auth_headers es de un Residente, no del Administrador del Sistema."""
        response = client.post(
            "/api/v1/novedades", headers=auth_headers, json={"alcance": "TODOS", "texto": "Aviso de prueba"}
        )
        assert response.status_code == 403

    def test_texto_vacio_devuelve_422(self, client: TestClient, admin_sistema_auth_headers):
        response = client.post(
            "/api/v1/novedades", headers=admin_sistema_auth_headers, json={"alcance": "TODOS", "texto": "   "}
        )
        assert response.status_code == 422

    def test_crea_con_expiracion_sugerida(self, client: TestClient, admin_sistema_auth_headers):
        response = client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "TODOS", "texto": "Se agregó soporte para modo oscuro."},
        )
        assert response.status_code == 201
        data = response.json()
        expiracion = datetime.fromisoformat(data["fecha_expiracion"])
        creado = datetime.fromisoformat(data["created_at"])
        diferencia = expiracion - creado
        assert timedelta(days=29) < diferencia < timedelta(days=31)
        assert data["editado"] is False
        assert data["archivada"] is False

    def test_notifica_solo_a_los_roles_del_alcance(
        self, client: TestClient, admin_sistema_auth_headers, auth_headers, reciclador_auth_headers
    ):
        """CA-032.4 + RN-003: una novedad solo para residentes no debe notificar a los recicladores."""
        response = client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "RESIDENTES", "texto": "Solo para residentes."},
        )
        assert response.status_code == 201

        notifs_residente = client.get("/api/v1/notificaciones/mis-notificaciones", headers=auth_headers)
        assert any(n["tipo"] == "NOVEDAD_NUEVA" for n in notifs_residente.json())

        notifs_reciclador = client.get("/api/v1/notificaciones/mis-notificaciones", headers=reciclador_auth_headers)
        assert not any(n["tipo"] == "NOVEDAD_NUEVA" for n in notifs_reciclador.json())

    def test_notificacion_no_tiene_conjunto(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        """Una novedad de plataforma no pertenece a ningún conjunto — nombre_conjunto debe venir vacío, no fallar."""
        client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "TODOS", "texto": "Aviso general."},
        )
        notifs = client.get("/api/v1/notificaciones/mis-notificaciones", headers=auth_headers)
        assert notifs.status_code == 200
        novedad_notif = next(n for n in notifs.json() if n["tipo"] == "NOVEDAD_NUEVA")
        assert novedad_notif["nombre_conjunto"] is None

    def test_alcance_todos_notifica_residentes_y_recicladores(
        self, client: TestClient, admin_sistema_auth_headers, auth_headers, reciclador_auth_headers
    ):
        client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "TODOS", "texto": "Aviso para todos."},
        )
        notifs_residente = client.get("/api/v1/notificaciones/mis-notificaciones", headers=auth_headers)
        notifs_reciclador = client.get("/api/v1/notificaciones/mis-notificaciones", headers=reciclador_auth_headers)
        assert any(n["tipo"] == "NOVEDAD_NUEVA" for n in notifs_residente.json())
        assert any(n["tipo"] == "NOVEDAD_NUEVA" for n in notifs_reciclador.json())


class TestListarTodas:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get("/api/v1/novedades/todas")
        assert response.status_code == 401

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers):
        response = client.get("/api/v1/novedades/todas", headers=auth_headers)
        assert response.status_code == 403

    def test_incluye_activas_y_archivadas(self, client: TestClient, admin_sistema_auth_headers):
        crear = client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "TODOS", "texto": "Novedad a archivar."},
        )
        id_novedad = crear.json()["id_novedad"]
        client.post(f"/api/v1/novedades/{id_novedad}/archivar", headers=admin_sistema_auth_headers)

        response = client.get("/api/v1/novedades/todas", headers=admin_sistema_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["archivada"] is True


class TestEditarNovedad:
    def _crear(self, client: TestClient, admin_sistema_auth_headers) -> int:
        response = client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "TODOS", "texto": "Texto original."},
        )
        return response.json()["id_novedad"]

    def test_edita_correctamente_y_marca_editado(self, client: TestClient, admin_sistema_auth_headers):
        id_novedad = self._crear(client, admin_sistema_auth_headers)

        response = client.patch(
            f"/api/v1/novedades/{id_novedad}",
            headers=admin_sistema_auth_headers,
            json={"texto": "Texto corregido."},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["texto"] == "Texto corregido."
        assert data["editado"] is True

    def test_sin_fecha_nueva_conserva_la_actual(self, client: TestClient, admin_sistema_auth_headers):
        id_novedad = self._crear(client, admin_sistema_auth_headers)
        original = client.get("/api/v1/novedades/todas", headers=admin_sistema_auth_headers).json()[0]

        response = client.patch(
            f"/api/v1/novedades/{id_novedad}",
            headers=admin_sistema_auth_headers,
            json={"texto": "Texto corregido."},
        )
        assert response.json()["fecha_expiracion"] == original["fecha_expiracion"]

    def test_reenvia_notificacion_a_los_mismos_destinatarios(
        self, client: TestClient, admin_sistema_auth_headers, auth_headers
    ):
        id_novedad = self._crear(client, admin_sistema_auth_headers)
        client.patch(
            f"/api/v1/novedades/{id_novedad}",
            headers=admin_sistema_auth_headers,
            json={"texto": "Texto corregido."},
        )
        notifs = client.get("/api/v1/notificaciones/mis-notificaciones", headers=auth_headers)
        tipos = [n["tipo"] for n in notifs.json()]
        assert "NOVEDAD_NUEVA" in tipos
        assert "NOVEDAD_ACTUALIZADA" in tipos

    def test_novedad_inexistente_devuelve_404(self, client: TestClient, admin_sistema_auth_headers):
        response = client.patch(
            "/api/v1/novedades/999999",
            headers=admin_sistema_auth_headers,
            json={"texto": "No debería aplicar."},
        )
        assert response.status_code == 404


class TestArchivarNovedad:
    def test_archiva_correctamente(self, client: TestClient, admin_sistema_auth_headers):
        crear = client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "TODOS", "texto": "Novedad a archivar."},
        )
        id_novedad = crear.json()["id_novedad"]

        response = client.post(f"/api/v1/novedades/{id_novedad}/archivar", headers=admin_sistema_auth_headers)
        assert response.status_code == 200

    def test_no_se_puede_archivar_dos_veces(self, client: TestClient, admin_sistema_auth_headers):
        crear = client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "TODOS", "texto": "Novedad a archivar."},
        )
        id_novedad = crear.json()["id_novedad"]
        client.post(f"/api/v1/novedades/{id_novedad}/archivar", headers=admin_sistema_auth_headers)

        segunda = client.post(f"/api/v1/novedades/{id_novedad}/archivar", headers=admin_sistema_auth_headers)
        assert segunda.status_code == 400


class TestFeed:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get("/api/v1/novedades/feed")
        assert response.status_code == 401

    def test_admin_sistema_no_tiene_feed(self, client: TestClient, admin_sistema_auth_headers):
        response = client.get("/api/v1/novedades/feed", headers=admin_sistema_auth_headers)
        assert response.status_code == 403

    def test_residente_ve_novedad_para_todos(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "TODOS", "texto": "Aviso para todos."},
        )
        response = client.get("/api/v1/novedades/feed", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_reciclador_no_ve_novedad_solo_para_residentes(
        self, client: TestClient, admin_sistema_auth_headers, reciclador_auth_headers
    ):
        client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "RESIDENTES", "texto": "Solo para residentes."},
        )
        response = client.get("/api/v1/novedades/feed", headers=reciclador_auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_admin_conjunto_ve_novedad_de_su_alcance(
        self, client: TestClient, admin_sistema_auth_headers, admin_conjunto_auth_headers
    ):
        client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "ADMIN_CONJUNTO", "texto": "Solo para administradores de conjunto."},
        )
        response = client.get("/api/v1/novedades/feed", headers=admin_conjunto_auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_novedad_archivada_no_aparece_en_feed(
        self, client: TestClient, admin_sistema_auth_headers, auth_headers
    ):
        crear = client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "TODOS", "texto": "Aviso que se va a archivar."},
        )
        id_novedad = crear.json()["id_novedad"]
        client.post(f"/api/v1/novedades/{id_novedad}/archivar", headers=admin_sistema_auth_headers)

        response = client.get("/api/v1/novedades/feed", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_novedad_vencida_no_aparece_en_feed(
        self, client: TestClient, db: Session, admin_sistema_auth_headers, auth_headers
    ):
        crear = client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "TODOS", "texto": "Este ya debería estar vencido."},
        )
        id_novedad = crear.json()["id_novedad"]

        from app.models.novedad import Novedad

        novedad = db.get(Novedad, id_novedad)
        novedad.fecha_expiracion = datetime.now(timezone.utc) - timedelta(hours=1)
        db.commit()

        response = client.get("/api/v1/novedades/feed", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []
