"""
Módulo: tests/test_comunicados.py
Descripción: Pruebas de comunicados del conjunto (RQF-014).
¿Para qué? Cubrir los 3 flujos del Admin Conjunto (crear, editar, eliminar)
           y el feed que ven Residente/Reciclador — incluyendo la regla de
           destinatarios (CA-031.2) y el orden urgente-primero (CA-028.2).
"""

import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.reciclador import Reciclador
from app.models.tablas_asociacion import recicladores_conjuntos


@pytest.fixture()
def reciclador_autorizado(db: Session, reciclador_test, conjunto_verificado) -> None:
    """Autoriza al reciclador de prueba en conjunto_verificado (necesario para el feed)."""
    reciclador = db.query(Reciclador).filter(Reciclador.id_usuario == reciclador_test.id_usuario).one()
    db.execute(
        recicladores_conjuntos.insert().values(
            id_reciclador=reciclador.id_reciclador,
            id_conjunto_residencial=conjunto_verificado.id_conjunto_residencial,
        )
    )
    db.commit()


class TestCrearComunicado:
    def test_sin_login_devuelve_401(self, client: TestClient, conjunto_verificado):
        response = client.post(
            "/api/v1/comunicados",
            json={
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                "destinatarios": "AMBOS",
                "tipo": "INFORMATIVO",
                "texto": "Aviso de prueba",
            },
        )
        assert response.status_code == 401

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers, conjunto_verificado):
        """auth_headers es de un Residente, no de un Administrador de Conjunto."""
        response = client.post(
            "/api/v1/comunicados",
            headers=auth_headers,
            json={
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                "destinatarios": "AMBOS",
                "tipo": "INFORMATIVO",
                "texto": "Aviso de prueba",
            },
        )
        assert response.status_code == 403

    def test_conjunto_que_no_administra_devuelve_403(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado_sin_admin
    ):
        response = client.post(
            "/api/v1/comunicados",
            headers=admin_conjunto_auth_headers,
            json={
                "id_conjunto_residencial": str(conjunto_verificado_sin_admin.id_conjunto_residencial),
                "destinatarios": "AMBOS",
                "tipo": "INFORMATIVO",
                "texto": "Aviso de prueba",
            },
        )
        assert response.status_code == 403

    def test_texto_vacio_devuelve_422(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        response = client.post(
            "/api/v1/comunicados",
            headers=admin_conjunto_auth_headers,
            json={
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                "destinatarios": "AMBOS",
                "tipo": "INFORMATIVO",
                "texto": "   ",
            },
        )
        assert response.status_code == 422

    def test_crea_informativo_con_expiracion_sugerida(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        response = client.post(
            "/api/v1/comunicados",
            headers=admin_conjunto_auth_headers,
            json={
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                "destinatarios": "RESIDENTES",
                "tipo": "INFORMATIVO",
                "texto": "Se ajustó el horario del portón peatonal.",
            },
        )
        assert response.status_code == 201
        data = response.json()
        expiracion = datetime.fromisoformat(data["fecha_expiracion"])
        creado = datetime.fromisoformat(data["created_at"])
        diferencia = expiracion - creado
        assert timedelta(days=29) < diferencia < timedelta(days=31)
        assert data["editado"] is False

    def test_urgente_expira_en_48_horas(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        response = client.post(
            "/api/v1/comunicados",
            headers=admin_conjunto_auth_headers,
            json={
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                "destinatarios": "AMBOS",
                "tipo": "URGENTE",
                "texto": "Fuga de agua en el sótano — evitar el parqueadero.",
            },
        )
        assert response.status_code == 201
        data = response.json()
        expiracion = datetime.fromisoformat(data["fecha_expiracion"])
        creado = datetime.fromisoformat(data["created_at"])
        diferencia = expiracion - creado
        assert timedelta(hours=47) < diferencia < timedelta(hours=49)

    def test_convocatoria_sin_fecha_evento_devuelve_400(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        response = client.post(
            "/api/v1/comunicados",
            headers=admin_conjunto_auth_headers,
            json={
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                "destinatarios": "RESIDENTES",
                "tipo": "CONVOCATORIA",
                "texto": "Asamblea general de propietarios.",
            },
        )
        assert response.status_code == 400

    def test_convocatoria_expira_un_dia_despues_del_evento(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        fecha_evento = (date.today() + timedelta(days=10)).isoformat()
        response = client.post(
            "/api/v1/comunicados",
            headers=admin_conjunto_auth_headers,
            json={
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                "destinatarios": "RESIDENTES",
                "tipo": "CONVOCATORIA",
                "texto": "Asamblea general de propietarios.",
                "fecha_evento": fecha_evento,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["fecha_evento"] == fecha_evento
        expiracion = datetime.fromisoformat(data["fecha_expiracion"]).date()
        assert expiracion == date.today() + timedelta(days=11)

    def test_notifica_solo_a_los_destinatarios_elegidos(
        self,
        client: TestClient,
        admin_conjunto_auth_headers,
        auth_headers,
        reciclador_autorizado,
        reciclador_auth_headers,
        conjunto_verificado,
    ):
        """CA-031.2: un comunicado solo para residentes no debe notificar a los recicladores."""
        response = client.post(
            "/api/v1/comunicados",
            headers=admin_conjunto_auth_headers,
            json={
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                "destinatarios": "RESIDENTES",
                "tipo": "INFORMATIVO",
                "texto": "Solo para residentes.",
            },
        )
        assert response.status_code == 201

        notifs_residente = client.get("/api/v1/notificaciones/mis-notificaciones", headers=auth_headers)
        assert any(n["tipo"] == "COMUNICADO_NUEVO" for n in notifs_residente.json())

        notifs_reciclador = client.get("/api/v1/notificaciones/mis-notificaciones", headers=reciclador_auth_headers)
        assert not any(n["tipo"] == "COMUNICADO_NUEVO" for n in notifs_reciclador.json())


class TestListarMisComunicados:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get("/api/v1/comunicados/mis-comunicados")
        assert response.status_code == 401

    def test_lista_solo_lo_publicado_por_mi(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        client.post(
            "/api/v1/comunicados",
            headers=admin_conjunto_auth_headers,
            json={
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                "destinatarios": "AMBOS",
                "tipo": "MANTENIMIENTO",
                "texto": "Corte de agua programado el sábado.",
            },
        )
        response = client.get("/api/v1/comunicados/mis-comunicados", headers=admin_conjunto_auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1


class TestEditarComunicado:
    def _crear(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado) -> int:
        response = client.post(
            "/api/v1/comunicados",
            headers=admin_conjunto_auth_headers,
            json={
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                "destinatarios": "RESIDENTES",
                "tipo": "RECICLAJE",
                "texto": "El reciclador pasa los martes.",
            },
        )
        return response.json()["id_comunicado"]

    def test_edita_correctamente_y_marca_editado(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        id_comunicado = self._crear(client, admin_conjunto_auth_headers, conjunto_verificado)

        response = client.patch(
            f"/api/v1/comunicados/{id_comunicado}",
            headers=admin_conjunto_auth_headers,
            json={
                "tipo": "RECICLAJE",
                "texto": "El reciclador pasa los martes y jueves.",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["texto"] == "El reciclador pasa los martes y jueves."
        assert data["editado"] is True

    def test_comunicado_inexistente_devuelve_404(self, client: TestClient, admin_conjunto_auth_headers):
        response = client.patch(
            f"/api/v1/comunicados/{uuid.uuid4()}",
            headers=admin_conjunto_auth_headers,
            json={"tipo": "INFORMATIVO", "texto": "No debería aplicar."},
        )
        assert response.status_code == 404

    def test_editar_reenvia_notificacion_a_los_mismos_destinatarios(
        self, client: TestClient, admin_conjunto_auth_headers, auth_headers, conjunto_verificado
    ):
        id_comunicado = self._crear(client, admin_conjunto_auth_headers, conjunto_verificado)

        client.patch(
            f"/api/v1/comunicados/{id_comunicado}",
            headers=admin_conjunto_auth_headers,
            json={"tipo": "RECICLAJE", "texto": "El reciclador pasa los martes y jueves."},
        )

        notifs = client.get("/api/v1/notificaciones/mis-notificaciones", headers=auth_headers)
        tipos = [n["tipo"] for n in notifs.json()]
        assert "COMUNICADO_NUEVO" in tipos
        assert "COMUNICADO_ACTUALIZADO" in tipos


class TestEliminarComunicado:
    def test_elimina_correctamente(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        crear = client.post(
            "/api/v1/comunicados",
            headers=admin_conjunto_auth_headers,
            json={
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                "destinatarios": "AMBOS",
                "tipo": "INFORMATIVO",
                "texto": "Comunicado a eliminar.",
            },
        )
        id_comunicado = crear.json()["id_comunicado"]

        eliminar = client.delete(f"/api/v1/comunicados/{id_comunicado}", headers=admin_conjunto_auth_headers)
        assert eliminar.status_code == 200

        lista = client.get("/api/v1/comunicados/mis-comunicados", headers=admin_conjunto_auth_headers)
        assert lista.json() == []


class TestFeed:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get("/api/v1/comunicados/feed")
        assert response.status_code == 401

    def test_admin_conjunto_no_tiene_feed(self, client: TestClient, admin_conjunto_auth_headers):
        response = client.get("/api/v1/comunicados/feed", headers=admin_conjunto_auth_headers)
        assert response.status_code == 403

    def test_residente_ve_comunicados_de_su_conjunto(
        self, client: TestClient, admin_conjunto_auth_headers, auth_headers, conjunto_verificado
    ):
        client.post(
            "/api/v1/comunicados",
            headers=admin_conjunto_auth_headers,
            json={
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                "destinatarios": "RESIDENTES",
                "tipo": "INFORMATIVO",
                "texto": "Aviso para residentes.",
            },
        )
        response = client.get("/api/v1/comunicados/feed", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_residente_no_ve_comunicados_solo_para_recicladores(
        self, client: TestClient, admin_conjunto_auth_headers, auth_headers, conjunto_verificado
    ):
        client.post(
            "/api/v1/comunicados",
            headers=admin_conjunto_auth_headers,
            json={
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                "destinatarios": "RECICLADORES",
                "tipo": "INFORMATIVO",
                "texto": "Aviso solo para recicladores.",
            },
        )
        response = client.get("/api/v1/comunicados/feed", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_reciclador_ve_comunicados_de_conjuntos_autorizados(
        self,
        client: TestClient,
        admin_conjunto_auth_headers,
        reciclador_autorizado,
        reciclador_auth_headers,
        conjunto_verificado,
    ):
        client.post(
            "/api/v1/comunicados",
            headers=admin_conjunto_auth_headers,
            json={
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                "destinatarios": "RECICLADORES",
                "tipo": "INFORMATIVO",
                "texto": "Aviso para recicladores.",
            },
        )
        response = client.get("/api/v1/comunicados/feed", headers=reciclador_auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_comunicado_vencido_no_aparece(
        self, client: TestClient, db: Session, admin_conjunto_auth_headers, auth_headers, conjunto_verificado
    ):
        crear = client.post(
            "/api/v1/comunicados",
            headers=admin_conjunto_auth_headers,
            json={
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                "destinatarios": "RESIDENTES",
                "tipo": "URGENTE",
                "texto": "Este ya debería estar vencido.",
            },
        )
        id_comunicado = crear.json()["id_comunicado"]

        from app.models.comunicado import Comunicado

        comunicado = db.get(Comunicado, id_comunicado)
        comunicado.fecha_expiracion = datetime.now(timezone.utc) - timedelta(hours=1)
        db.commit()

        response = client.get("/api/v1/comunicados/feed", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_urgente_aparece_primero(
        self, client: TestClient, admin_conjunto_auth_headers, auth_headers, conjunto_verificado
    ):
        client.post(
            "/api/v1/comunicados",
            headers=admin_conjunto_auth_headers,
            json={
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                "destinatarios": "RESIDENTES",
                "tipo": "INFORMATIVO",
                "texto": "Aviso informativo normal.",
            },
        )
        client.post(
            "/api/v1/comunicados",
            headers=admin_conjunto_auth_headers,
            json={
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                "destinatarios": "RESIDENTES",
                "tipo": "URGENTE",
                "texto": "Aviso urgente publicado después.",
            },
        )
        response = client.get("/api/v1/comunicados/feed", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data[0]["tipo"] == "URGENTE"
