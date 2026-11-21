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
from app.models.reciclador_conjunto import RecicladorConjunto
from app.utils.fechas import DIAS_MAX_EXPIRACION


def _hoy_utc() -> date:
    return datetime.now(timezone.utc).date()


def _fecha_formulario(dias: int) -> str:
    """¿Qué? La expiración tal como la manda el formulario: el día elegido a las 23:59:59."""
    return f"{(_hoy_utc() + timedelta(days=dias)).isoformat()}T23:59:59"


@pytest.fixture()
def reciclador_autorizado(db: Session, reciclador_test, conjunto_verificado) -> None:
    """Autoriza al reciclador de prueba en conjunto_verificado (necesario para el feed)."""
    reciclador = db.query(Reciclador).filter(Reciclador.id_usuario == reciclador_test.id_usuario).one()
    db.add(RecicladorConjunto(
        id_reciclador=reciclador.id_reciclador,
        id_conjunto_residencial=conjunto_verificado.id_conjunto_residencial,
    ))
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

    @pytest.mark.parametrize("dias", [-1, DIAS_MAX_EXPIRACION + 1])
    def test_expiracion_vencida_o_mayor_a_un_anio_devuelve_422(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado, dias
    ):
        """¿Qué? Issue #367 — un comunicado vencido nace invisible en el feed aunque su notificación sí llegue."""
        response = client.post(
            "/api/v1/comunicados",
            headers=admin_conjunto_auth_headers,
            json={
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                "destinatarios": "RESIDENTES",
                "tipo": "URGENTE",
                "texto": "Se va el agua mañana.",
                "fecha_expiracion": _fecha_formulario(dias),
            },
        )
        assert response.status_code == 422

    @pytest.mark.parametrize("dias", [0, DIAS_MAX_EXPIRACION])
    def test_expiracion_hoy_o_en_el_tope_se_acepta(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado, dias
    ):
        response = client.post(
            "/api/v1/comunicados",
            headers=admin_conjunto_auth_headers,
            json={
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                "destinatarios": "RESIDENTES",
                "tipo": "INFORMATIVO",
                "texto": "Aviso con fecha límite válida.",
                "fecha_expiracion": _fecha_formulario(dias),
            },
        )
        assert response.status_code == 201

    def test_convocatoria_con_evento_pasado_devuelve_422(
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
                "fecha_evento": (_hoy_utc() - timedelta(days=1)).isoformat(),
            },
        )
        assert response.status_code == 422

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
        data = response.json()
        assert len(data["items"]) == 1
        assert data["total"] == 1

    def test_limit_acota_resultados_sin_afectar_el_total(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        """Issue #11: el historial completo no debe traerse sin tope."""
        for i in range(3):
            client.post(
                "/api/v1/comunicados",
                headers=admin_conjunto_auth_headers,
                json={
                    "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                    "destinatarios": "AMBOS",
                    "tipo": "INFORMATIVO",
                    "texto": f"Comunicado {i}.",
                },
            )

        response = client.get(
            "/api/v1/comunicados/mis-comunicados", params={"limit": 2}, headers=admin_conjunto_auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 3


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

    def test_editar_con_expiracion_vencida_devuelve_422(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        """¿Qué? Issue #367 — el caso real: se editó un comunicado y quedó con una fecha que ya había pasado."""
        id_comunicado = self._crear(client, admin_conjunto_auth_headers, conjunto_verificado)

        response = client.patch(
            f"/api/v1/comunicados/{id_comunicado}",
            headers=admin_conjunto_auth_headers,
            json={"tipo": "RECICLAJE", "texto": "El reciclador pasa los martes.", "fecha_expiracion": _fecha_formulario(-1)},
        )
        assert response.status_code == 422

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
        assert lista.json()["items"] == []


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


class TestListarMisComunicadosPorVigencia:
    """Issue #632: el Admin ve los comunicados vigentes y, aparte, los vencidos (su historial)."""

    URL = "/api/v1/comunicados/mis-comunicados"

    def _publicar(self, client: TestClient, headers, conjunto, texto: str) -> str:
        respuesta = client.post(
            "/api/v1/comunicados",
            headers=headers,
            json={
                "id_conjunto_residencial": str(conjunto.id_conjunto_residencial),
                "destinatarios": "AMBOS",
                "tipo": "INFORMATIVO",
                "texto": texto,
            },
        )
        assert respuesta.status_code == 201
        return respuesta.json()["id_comunicado"]

    def _vencer(self, db: Session, id_comunicado: str) -> None:
        from app.models.comunicado import Comunicado

        comunicado = db.get(Comunicado, id_comunicado)
        comunicado.fecha_expiracion = datetime.now(timezone.utc) - timedelta(hours=1)
        db.commit()

    def test_separa_vigentes_y_vencidos_con_su_total(
        self, client: TestClient, db: Session, admin_conjunto_auth_headers, conjunto_verificado
    ):
        vigente = self._publicar(client, admin_conjunto_auth_headers, conjunto_verificado, "Sigue vigente.")
        vencido_a = self._publicar(client, admin_conjunto_auth_headers, conjunto_verificado, "Ya venció A.")
        vencido_b = self._publicar(client, admin_conjunto_auth_headers, conjunto_verificado, "Ya venció B.")
        self._vencer(db, vencido_a)
        self._vencer(db, vencido_b)

        vigentes = client.get(self.URL, params={"vigencia": "VIGENTES"}, headers=admin_conjunto_auth_headers).json()
        vencidos = client.get(self.URL, params={"vigencia": "VENCIDOS"}, headers=admin_conjunto_auth_headers).json()

        assert [c["id_comunicado"] for c in vigentes["items"]] == [vigente]
        assert vigentes["total"] == 1
        assert {c["id_comunicado"] for c in vencidos["items"]} == {vencido_a, vencido_b}
        assert vencidos["total"] == 2

    def test_sin_vigencia_trae_todos_como_antes(
        self, client: TestClient, db: Session, admin_conjunto_auth_headers, conjunto_verificado
    ):
        self._publicar(client, admin_conjunto_auth_headers, conjunto_verificado, "Vigente.")
        self._vencer(db, self._publicar(client, admin_conjunto_auth_headers, conjunto_verificado, "Vencido."))

        respuesta = client.get(self.URL, headers=admin_conjunto_auth_headers).json()

        assert respuesta["total"] == 2

    def test_pagina_de_10_en_10_y_el_total_es_el_del_filtro(
        self, client: TestClient, db: Session, admin_conjunto_auth_headers, conjunto_verificado
    ):
        for n in range(12):
            self._publicar(client, admin_conjunto_auth_headers, conjunto_verificado, f"Vigente {n}.")
        self._vencer(db, self._publicar(client, admin_conjunto_auth_headers, conjunto_verificado, "Vencido."))

        primera = client.get(self.URL, params={"vigencia": "VIGENTES"}, headers=admin_conjunto_auth_headers).json()
        segunda = client.get(
            self.URL, params={"vigencia": "VIGENTES", "offset": 10}, headers=admin_conjunto_auth_headers
        ).json()

        assert primera["total"] == 12 and len(primera["items"]) == 10
        assert segunda["total"] == 12 and len(segunda["items"]) == 2
        ids = {c["id_comunicado"] for c in primera["items"]} | {c["id_comunicado"] for c in segunda["items"]}
        assert len(ids) == 12

    def test_un_comunicado_editado_con_fecha_nueva_pasa_de_vencidos_a_vigentes(
        self, client: TestClient, db: Session, admin_conjunto_auth_headers, conjunto_verificado
    ):
        id_comunicado = self._publicar(client, admin_conjunto_auth_headers, conjunto_verificado, "Se reutiliza.")
        self._vencer(db, id_comunicado)
        assert client.get(self.URL, params={"vigencia": "VENCIDOS"}, headers=admin_conjunto_auth_headers).json()["total"] == 1

        nueva = (datetime.now(timezone.utc) + timedelta(days=5)).date().isoformat()
        editado = client.patch(
            f"/api/v1/comunicados/{id_comunicado}",
            headers=admin_conjunto_auth_headers,
            json={"tipo": "INFORMATIVO", "texto": "Se reutiliza.", "fecha_expiracion": f"{nueva}T23:59:59"},
        )

        assert editado.status_code == 200
        assert client.get(self.URL, params={"vigencia": "VENCIDOS"}, headers=admin_conjunto_auth_headers).json()["total"] == 0
        assert client.get(self.URL, params={"vigencia": "VIGENTES"}, headers=admin_conjunto_auth_headers).json()["total"] == 1

    def test_no_incluye_comunicados_de_conjuntos_ajenos(
        self,
        client: TestClient,
        db: Session,
        admin_conjunto_test,
        admin_conjunto_auth_headers,
        conjunto_verificado,
        conjunto_verificado_sin_admin,
    ):
        from app.models.comunicado import Comunicado, DestinatariosComunicado, TipoComunicado

        db.add(
            Comunicado(
                id_conjunto_residencial=conjunto_verificado_sin_admin.id_conjunto_residencial,
                id_administrador=admin_conjunto_test.id_administrador,
                destinatarios=DestinatariosComunicado.AMBOS,
                tipo=TipoComunicado.INFORMATIVO,
                texto="De otro conjunto.",
                fecha_expiracion=datetime.now(timezone.utc) + timedelta(days=3),
            )
        )
        db.commit()

        respuesta = client.get(self.URL, params={"vigencia": "VIGENTES"}, headers=admin_conjunto_auth_headers).json()

        assert respuesta["total"] == 0

    def test_vigencia_invalida_o_limit_fuera_de_rango_devuelven_422(self, client: TestClient, admin_conjunto_auth_headers):
        assert client.get(self.URL, params={"vigencia": "OTRA"}, headers=admin_conjunto_auth_headers).status_code == 422
        assert client.get(self.URL, params={"limit": 0}, headers=admin_conjunto_auth_headers).status_code == 422
        assert client.get(self.URL, params={"limit": 101}, headers=admin_conjunto_auth_headers).status_code == 422
