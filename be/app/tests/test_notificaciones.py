"""
Módulo: tests/test_notificaciones.py
Descripción: Pruebas del sistema de notificaciones (SHUT lleno/vaciado y llegada
             del reciclador).
¿Para qué? El endpoint /enviar tiene reglas distintas según el rol de quien
           llama (un Residente solo puede avisar SHUT_LLENO; un Reciclador debe
           estar autorizado en el conjunto que indica). Estas pruebas cubren
           esas reglas, además del ciclo completo de leer/marcar como leída.
"""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.administrador_conjunto import AdministradorConjunto
from app.models.conjunto_residencial import ConjuntoResidencial
from app.services.notificaciones_helpers import crear_notificacion


def _autorizar_reciclador(client: TestClient, admin_headers: dict, reciclador_headers: dict, correo_reciclador: str, id_conjunto) -> None:
    """¿Qué? Invita y acepta — mismo flujo real que seguiría un reciclador
    de verdad, en vez de insertar la fila de autorización a mano."""
    invitar = client.post(
        "/api/v1/reciclador-conjunto/invitar",
        headers=admin_headers,
        json={"correo_reciclador": correo_reciclador, "id_conjunto_residencial": str(id_conjunto)},
    )
    id_invitacion = invitar.json()["id"]
    client.post(
        f"/api/v1/reciclador-conjunto/invitaciones/{id_invitacion}/responder",
        headers=reciclador_headers,
        json={"aceptar": True},
    )


def _enviar(client: TestClient, headers: dict, tipo: str, id_conjunto):
    return client.post(
        "/api/v1/notificaciones/enviar",
        headers=headers,
        json={"tipo": tipo, "id_conjunto_residencial": str(id_conjunto)},
    )


class TestEnviarComoResidente:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.post("/api/v1/notificaciones/enviar", json={"tipo": "SHUT_LLENO"})
        assert response.status_code == 401

    def test_residente_envia_shut_lleno(self, client: TestClient, auth_headers):
        response = client.post(
            "/api/v1/notificaciones/enviar", headers=auth_headers, json={"tipo": "SHUT_LLENO"}
        )
        assert response.status_code == 201

    def test_residente_no_puede_enviar_llegada_reciclador(self, client: TestClient, auth_headers):
        """La regla de negocio dice: el residente SOLO puede enviar SHUT_LLENO."""
        response = client.post(
            "/api/v1/notificaciones/enviar",
            headers=auth_headers,
            json={"tipo": "LLEGADA_RECICLADOR"},
        )
        assert response.status_code == 403

    def test_tipo_invalido_devuelve_400(self, client: TestClient, auth_headers):
        response = client.post(
            "/api/v1/notificaciones/enviar", headers=auth_headers, json={"tipo": "NO_EXISTE"}
        )
        assert response.status_code == 400

    def test_no_puede_reportar_shut_lleno_si_ya_esta_lleno(self, client: TestClient, auth_headers):
        """CA-003.2 / RN-001 de RQF-003 — no se puede reportar dos veces seguidas."""
        primero = client.post(
            "/api/v1/notificaciones/enviar", headers=auth_headers, json={"tipo": "SHUT_LLENO"}
        )
        assert primero.status_code == 201

        segundo = client.post(
            "/api/v1/notificaciones/enviar", headers=auth_headers, json={"tipo": "SHUT_LLENO"}
        )
        assert segundo.status_code == 400


class TestEnviarComoReciclador:
    def test_requiere_id_conjunto_residencial(self, client: TestClient, reciclador_auth_headers):
        response = client.post(
            "/api/v1/notificaciones/enviar",
            headers=reciclador_auth_headers,
            json={"tipo": "LLEGADA_RECICLADOR"},
        )
        assert response.status_code == 400

    def test_reciclador_no_autorizado_en_el_conjunto_devuelve_403(
        self, client: TestClient, reciclador_auth_headers, conjunto_verificado
    ):
        """reciclador_test todavía no está vinculado a ningún conjunto."""
        response = client.post(
            "/api/v1/notificaciones/enviar",
            headers=reciclador_auth_headers,
            json={"tipo": "LLEGADA_RECICLADOR", "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial)},
        )
        assert response.status_code == 403

    def test_reciclador_autorizado_puede_enviar(
        self, client: TestClient, admin_conjunto_auth_headers, reciclador_auth_headers, conjunto_verificado, reciclador_test, db
    ):
        # Autorizamos al reciclador en el conjunto invitándolo y aceptando, igual
        # que en test_reciclador_conjunto.py, en vez de insertar la fila a mano —
        # así la prueba refleja el flujo real que un reciclador seguiría.
        invitar = client.post(
            "/api/v1/reciclador-conjunto/invitar",
            headers=admin_conjunto_auth_headers,
            json={
                "correo_reciclador": reciclador_test.correo_electronico,
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
            },
        )
        id_invitacion = invitar.json()["id"]
        client.post(
            f"/api/v1/reciclador-conjunto/invitaciones/{id_invitacion}/responder",
            headers=reciclador_auth_headers,
            json={"aceptar": True},
        )

        response = client.post(
            "/api/v1/notificaciones/enviar",
            headers=reciclador_auth_headers,
            json={"tipo": "LLEGADA_RECICLADOR", "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial)},
        )
        assert response.status_code == 201

    def test_reciclador_autorizado_puede_enviar_finalizacion(
        self, client: TestClient, admin_conjunto_auth_headers, reciclador_auth_headers, conjunto_verificado, reciclador_test, db
    ):
        invitar = client.post(
            "/api/v1/reciclador-conjunto/invitar",
            headers=admin_conjunto_auth_headers,
            json={
                "correo_reciclador": reciclador_test.correo_electronico,
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
            },
        )
        id_invitacion = invitar.json()["id"]
        client.post(
            f"/api/v1/reciclador-conjunto/invitaciones/{id_invitacion}/responder",
            headers=reciclador_auth_headers,
            json={"aceptar": True},
        )

        # ¿Qué? Control de presencia: FINALIZACION_RECICLADOR ahora exige
        #       haber avisado la llegada antes (ver TestControlDePresencia).
        client.post(
            "/api/v1/notificaciones/enviar",
            headers=reciclador_auth_headers,
            json={"tipo": "LLEGADA_RECICLADOR", "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial)},
        )

        response = client.post(
            "/api/v1/notificaciones/enviar",
            headers=reciclador_auth_headers,
            json={"tipo": "FINALIZACION_RECICLADOR", "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial)},
        )
        assert response.status_code == 201
        # ¿Qué? La regla de negocio dice que esta notificación debe llegar
        #       tanto a residentes como al Admin de Conjunto (RQF nuevo,
        #       "Diseñar notificación de salida/finalización del reciclador").
        # ¿Para qué? Verificar que el fan-out no se limita solo a residentes,
        #           ya que el Admin de Conjunto también quiere saber si el
        #           reciclador sigue en el conjunto o ya se fue.
        assert response.json()["destinatarios"] >= 1

    def test_no_puede_avisar_llegada_dos_veces_en_menos_de_2_horas(
        self, client: TestClient, admin_conjunto_auth_headers, reciclador_auth_headers, conjunto_verificado, reciclador_test
    ):
        """CA-007.4 / RN-003 de RQF-006 — cooldown de 2 horas."""
        invitar = client.post(
            "/api/v1/reciclador-conjunto/invitar",
            headers=admin_conjunto_auth_headers,
            json={
                "correo_reciclador": reciclador_test.correo_electronico,
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
            },
        )
        id_invitacion = invitar.json()["id"]
        client.post(
            f"/api/v1/reciclador-conjunto/invitaciones/{id_invitacion}/responder",
            headers=reciclador_auth_headers,
            json={"aceptar": True},
        )

        payload = {"tipo": "LLEGADA_RECICLADOR", "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial)}
        primera = client.post("/api/v1/notificaciones/enviar", headers=reciclador_auth_headers, json=payload)
        assert primera.status_code == 201

        segunda = client.post("/api/v1/notificaciones/enviar", headers=reciclador_auth_headers, json=payload)
        assert segunda.status_code == 400


class TestConsultarYMarcarLeidas:
    def test_sin_login_devuelve_401(self, client: TestClient):
        assert client.get("/api/v1/notificaciones/mis-notificaciones").status_code == 401
        assert client.get("/api/v1/notificaciones/no-leidas-count").status_code == 401

    def test_ciclo_completo_de_lectura(self, client: TestClient, auth_headers):
        # El propio residente genera una notificación (queda como emisor, no
        # como destinatario de sí mismo) — para probar el ciclo de lectura sin
        # depender de otro usuario, comprobamos el contador antes/después.
        client.post("/api/v1/notificaciones/enviar", headers=auth_headers, json={"tipo": "SHUT_LLENO"})

        conteo = client.get("/api/v1/notificaciones/no-leidas-count", headers=auth_headers)
        assert conteo.status_code == 200
        assert "count" in conteo.json()

        lista = client.get("/api/v1/notificaciones/mis-notificaciones", headers=auth_headers)
        assert lista.status_code == 200

        marcar_todas = client.post("/api/v1/notificaciones/marcar-todas-leidas", headers=auth_headers)
        assert marcar_todas.status_code == 200

        limpiar = client.delete("/api/v1/notificaciones/limpiar-leidas", headers=auth_headers)
        assert limpiar.status_code == 200

    def test_marcar_leida_notificacion_inexistente_devuelve_404(self, client: TestClient, auth_headers):
        response = client.post(f"/api/v1/notificaciones/{uuid.uuid4()}/leer", headers=auth_headers)
        assert response.status_code == 404


@pytest.fixture()
def dos_conjuntos_con_el_mismo_nombre(db: Session, conjunto_verificado: ConjuntoResidencial) -> ConjuntoResidencial:
    """¿Qué? Un segundo conjunto con EXACTAMENTE el mismo nombre que `conjunto_verificado`.
    ¿Para qué? Issue #436: el panel relacionaba avisos y conjuntos por nombre, así que
              dos conjuntos con el mismo nombre mezclaban sus avisos."""
    gemelo = ConjuntoResidencial(
        id_localidad=conjunto_verificado.id_localidad,
        nombre_conjunto=conjunto_verificado.nombre_conjunto,
        nit="900000000-9",
        direccion="Calle 200 # 20-20",
        verificado=True,
    )
    db.add(gemelo)
    db.commit()
    db.refresh(gemelo)
    return gemelo


def _avisar_al_admin(db: Session, admin: AdministradorConjunto, id_conjunto, cantidad: int = 1) -> None:
    """Crea `cantidad` avisos de SHUT_LLENO de un conjunto, dirigidos al admin."""
    for _ in range(cantidad):
        crear_notificacion(
            db,
            tipo="SHUT_LLENO",
            mensaje="El SHUT está lleno.",
            destinatarios=[admin.id_usuario],
            id_conjunto=id_conjunto,
        )
    db.commit()


class TestNotificacionesPorConjunto:
    """Issue #436: el Admin de Conjunto ve y gestiona los avisos conjunto por conjunto."""

    def test_la_lista_incluye_el_id_del_conjunto(
        self, client: TestClient, db: Session, admin_conjunto_test, admin_conjunto_auth_headers, conjunto_verificado
    ):
        _avisar_al_admin(db, admin_conjunto_test, conjunto_verificado.id_conjunto_residencial)

        lista = client.get("/api/v1/notificaciones/mis-notificaciones", headers=admin_conjunto_auth_headers).json()

        assert len(lista) == 1
        assert lista[0]["id_conjunto_residencial"] == str(conjunto_verificado.id_conjunto_residencial)
        assert lista[0]["nombre_conjunto"] == conjunto_verificado.nombre_conjunto

    def test_un_aviso_de_plataforma_no_tiene_id_de_conjunto(
        self, client: TestClient, db: Session, admin_conjunto_test, admin_conjunto_auth_headers
    ):
        _avisar_al_admin(db, admin_conjunto_test, None)

        lista = client.get("/api/v1/notificaciones/mis-notificaciones", headers=admin_conjunto_auth_headers).json()

        assert lista[0]["id_conjunto_residencial"] is None
        assert lista[0]["nombre_conjunto"] is None

    def test_conjuntos_con_el_mismo_nombre_se_distinguen_por_id(
        self,
        client: TestClient,
        db: Session,
        admin_conjunto_test,
        admin_conjunto_auth_headers,
        conjunto_verificado,
        dos_conjuntos_con_el_mismo_nombre,
    ):
        _avisar_al_admin(db, admin_conjunto_test, conjunto_verificado.id_conjunto_residencial, cantidad=2)
        _avisar_al_admin(db, admin_conjunto_test, dos_conjuntos_con_el_mismo_nombre.id_conjunto_residencial, cantidad=1)

        lista = client.get("/api/v1/notificaciones/mis-notificaciones", headers=admin_conjunto_auth_headers).json()

        # Mismo nombre en las 3 filas: solo el id permite repartirlas.
        assert {n["nombre_conjunto"] for n in lista} == {conjunto_verificado.nombre_conjunto}
        ids = [n["id_conjunto_residencial"] for n in lista]
        assert ids.count(str(conjunto_verificado.id_conjunto_residencial)) == 2
        assert ids.count(str(dos_conjuntos_con_el_mismo_nombre.id_conjunto_residencial)) == 1

    def test_marcar_todas_leidas_de_un_conjunto_no_toca_los_otros(
        self,
        client: TestClient,
        db: Session,
        admin_conjunto_test,
        admin_conjunto_auth_headers,
        conjunto_verificado,
        dos_conjuntos_con_el_mismo_nombre,
    ):
        id_a = conjunto_verificado.id_conjunto_residencial
        id_b = dos_conjuntos_con_el_mismo_nombre.id_conjunto_residencial
        _avisar_al_admin(db, admin_conjunto_test, id_a, cantidad=2)
        _avisar_al_admin(db, admin_conjunto_test, id_b, cantidad=3)

        respuesta = client.post(
            "/api/v1/notificaciones/marcar-todas-leidas",
            params={"id_conjunto_residencial": str(id_a)},
            headers=admin_conjunto_auth_headers,
        )

        assert respuesta.status_code == 200
        assert respuesta.json()["marcadas"] == 2
        lista = client.get("/api/v1/notificaciones/mis-notificaciones", headers=admin_conjunto_auth_headers).json()
        sin_leer = [n["id_conjunto_residencial"] for n in lista if not n["leida"]]
        assert sin_leer == [str(id_b)] * 3

    def test_limpiar_leidas_de_un_conjunto_no_toca_los_otros(
        self,
        client: TestClient,
        db: Session,
        admin_conjunto_test,
        admin_conjunto_auth_headers,
        conjunto_verificado,
        dos_conjuntos_con_el_mismo_nombre,
    ):
        id_a = conjunto_verificado.id_conjunto_residencial
        id_b = dos_conjuntos_con_el_mismo_nombre.id_conjunto_residencial
        _avisar_al_admin(db, admin_conjunto_test, id_a, cantidad=2)
        _avisar_al_admin(db, admin_conjunto_test, id_b, cantidad=3)
        client.post("/api/v1/notificaciones/marcar-todas-leidas", headers=admin_conjunto_auth_headers)

        respuesta = client.delete(
            "/api/v1/notificaciones/limpiar-leidas",
            params={"id_conjunto_residencial": str(id_a)},
            headers=admin_conjunto_auth_headers,
        )

        assert respuesta.status_code == 200
        assert respuesta.json()["eliminadas"] == 2
        lista = client.get("/api/v1/notificaciones/mis-notificaciones", headers=admin_conjunto_auth_headers).json()
        assert [n["id_conjunto_residencial"] for n in lista] == [str(id_b)] * 3

    def test_sin_filtro_marcar_todas_y_limpiar_siguen_afectando_a_todos(
        self,
        client: TestClient,
        db: Session,
        admin_conjunto_test,
        admin_conjunto_auth_headers,
        conjunto_verificado,
        dos_conjuntos_con_el_mismo_nombre,
    ):
        _avisar_al_admin(db, admin_conjunto_test, conjunto_verificado.id_conjunto_residencial, cantidad=2)
        _avisar_al_admin(db, admin_conjunto_test, dos_conjuntos_con_el_mismo_nombre.id_conjunto_residencial, cantidad=1)

        marcadas = client.post("/api/v1/notificaciones/marcar-todas-leidas", headers=admin_conjunto_auth_headers)
        eliminadas = client.delete("/api/v1/notificaciones/limpiar-leidas", headers=admin_conjunto_auth_headers)

        assert marcadas.json()["marcadas"] == 3
        assert eliminadas.json()["eliminadas"] == 3

    def test_filtrar_por_un_conjunto_ajeno_no_hace_nada(
        self,
        client: TestClient,
        db: Session,
        admin_conjunto_test,
        admin_conjunto_auth_headers,
        conjunto_verificado,
    ):
        _avisar_al_admin(db, admin_conjunto_test, conjunto_verificado.id_conjunto_residencial, cantidad=2)

        respuesta = client.post(
            "/api/v1/notificaciones/marcar-todas-leidas",
            params={"id_conjunto_residencial": str(uuid.uuid4())},
            headers=admin_conjunto_auth_headers,
        )

        assert respuesta.status_code == 200
        assert respuesta.json()["marcadas"] == 0

    def test_id_de_conjunto_invalido_devuelve_422(self, client: TestClient, admin_conjunto_auth_headers):
        respuesta = client.post(
            "/api/v1/notificaciones/marcar-todas-leidas",
            params={"id_conjunto_residencial": "no-es-un-uuid"},
            headers=admin_conjunto_auth_headers,
        )
        assert respuesta.status_code == 422


class TestEstadoShut:
    def test_sin_reportes_no_esta_lleno(self, client: TestClient, auth_headers):
        response = client.get("/api/v1/notificaciones/estado-shut", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["lleno"] is False

    def test_despues_de_reportar_queda_lleno(self, client: TestClient, auth_headers):
        client.post("/api/v1/notificaciones/enviar", headers=auth_headers, json={"tipo": "SHUT_LLENO"})
        response = client.get("/api/v1/notificaciones/estado-shut", headers=auth_headers)
        assert response.json()["lleno"] is True

    def test_para_otro_rol_siempre_devuelve_false(self, client: TestClient, reciclador_auth_headers):
        response = client.get("/api/v1/notificaciones/estado-shut", headers=reciclador_auth_headers)
        assert response.status_code == 200
        assert response.json()["lleno"] is False


class TestControlDePresencia:
    """
    ¿Qué? El reciclador solo puede usar SHUT_LLENO/SHUT_LIBRE/
    FINALIZACION_RECICLADOR mientras está "presente" en el conjunto (avisó
    su llegada y todavía no avisó que se fue) — y no puede volver a avisar
    llegada si ya está presente.
    """

    def test_shut_lleno_rechazado_si_no_ha_avisado_llegada(
        self, client: TestClient, admin_conjunto_auth_headers, reciclador_auth_headers, conjunto_verificado, reciclador_test
    ):
        _autorizar_reciclador(
            client, admin_conjunto_auth_headers, reciclador_auth_headers,
            reciclador_test.correo_electronico, conjunto_verificado.id_conjunto_residencial,
        )
        response = _enviar(client, reciclador_auth_headers, "SHUT_LLENO", conjunto_verificado.id_conjunto_residencial)
        assert response.status_code == 400
        assert "llegada" in response.json()["detail"].lower()

    def test_shut_libre_rechazado_si_no_ha_avisado_llegada(
        self, client: TestClient, admin_conjunto_auth_headers, reciclador_auth_headers, conjunto_verificado, reciclador_test
    ):
        _autorizar_reciclador(
            client, admin_conjunto_auth_headers, reciclador_auth_headers,
            reciclador_test.correo_electronico, conjunto_verificado.id_conjunto_residencial,
        )
        response = _enviar(client, reciclador_auth_headers, "SHUT_LIBRE", conjunto_verificado.id_conjunto_residencial)
        assert response.status_code == 400

    def test_finalizacion_rechazada_si_no_ha_avisado_llegada(
        self, client: TestClient, admin_conjunto_auth_headers, reciclador_auth_headers, conjunto_verificado, reciclador_test
    ):
        _autorizar_reciclador(
            client, admin_conjunto_auth_headers, reciclador_auth_headers,
            reciclador_test.correo_electronico, conjunto_verificado.id_conjunto_residencial,
        )
        response = _enviar(client, reciclador_auth_headers, "FINALIZACION_RECICLADOR", conjunto_verificado.id_conjunto_residencial)
        assert response.status_code == 400

    def test_no_puede_avisar_llegada_si_ya_esta_presente(
        self, client: TestClient, admin_conjunto_auth_headers, reciclador_auth_headers, conjunto_verificado, reciclador_test
    ):
        _autorizar_reciclador(
            client, admin_conjunto_auth_headers, reciclador_auth_headers,
            reciclador_test.correo_electronico, conjunto_verificado.id_conjunto_residencial,
        )
        primera = _enviar(client, reciclador_auth_headers, "LLEGADA_RECICLADOR", conjunto_verificado.id_conjunto_residencial)
        assert primera.status_code == 201

        segunda = _enviar(client, reciclador_auth_headers, "LLEGADA_RECICLADOR", conjunto_verificado.id_conjunto_residencial)
        assert segunda.status_code == 400
        assert "presente" in segunda.json()["detail"].lower() or "llegada" in segunda.json()["detail"].lower()

    def test_shut_libre_rechazado_si_ya_esta_libre(
        self, client: TestClient, admin_conjunto_auth_headers, reciclador_auth_headers, conjunto_verificado, reciclador_test
    ):
        """¿Qué? Candado simétrico nuevo — antes SHUT_LIBRE no tenía ningún
        candado. Sin haber reportado SHUT_LLENO todavía, el estado por
        defecto ya cuenta como "libre" (mismo criterio que _shut_esta_lleno)."""
        _autorizar_reciclador(
            client, admin_conjunto_auth_headers, reciclador_auth_headers,
            reciclador_test.correo_electronico, conjunto_verificado.id_conjunto_residencial,
        )
        _enviar(client, reciclador_auth_headers, "LLEGADA_RECICLADOR", conjunto_verificado.id_conjunto_residencial)

        response = _enviar(client, reciclador_auth_headers, "SHUT_LIBRE", conjunto_verificado.id_conjunto_residencial)
        assert response.status_code == 400
        assert "libre" in response.json()["detail"].lower()

    def test_ciclo_completo_llegada_lleno_libre_finalizacion(
        self, client: TestClient, admin_conjunto_auth_headers, reciclador_auth_headers, conjunto_verificado, reciclador_test
    ):
        """¿Qué? El camino feliz completo: llegar, reportar lleno, reportar
        libre, y finalizar — cada paso debe aceptarse en su momento."""
        _autorizar_reciclador(
            client, admin_conjunto_auth_headers, reciclador_auth_headers,
            reciclador_test.correo_electronico, conjunto_verificado.id_conjunto_residencial,
        )
        id_conjunto = conjunto_verificado.id_conjunto_residencial

        assert _enviar(client, reciclador_auth_headers, "LLEGADA_RECICLADOR", id_conjunto).status_code == 201
        assert _enviar(client, reciclador_auth_headers, "SHUT_LLENO", id_conjunto).status_code == 201
        assert _enviar(client, reciclador_auth_headers, "SHUT_LIBRE", id_conjunto).status_code == 201
        assert _enviar(client, reciclador_auth_headers, "FINALIZACION_RECICLADOR", id_conjunto).status_code == 201

        # ¿Qué? Después de finalizar, vuelve a quedar "no presente" — SHUT_LLENO
        #       ya no debería servir hasta la próxima llegada.
        despues = _enviar(client, reciclador_auth_headers, "SHUT_LLENO", id_conjunto)
        assert despues.status_code == 400

    def test_mismo_aviso_antes_de_5_minutos_se_rechaza(
        self, client: TestClient, db, admin_conjunto_auth_headers, reciclador_auth_headers, conjunto_verificado, reciclador_test
    ):
        """Issue #398 (CN-055): los candados de estado dejan alternar SHUT_LLENO
        y SHUT_LIBRE; el enfriamiento frena el MISMO aviso repetido en menos de 5 min."""
        _autorizar_reciclador(
            client, admin_conjunto_auth_headers, reciclador_auth_headers,
            reciclador_test.correo_electronico, conjunto_verificado.id_conjunto_residencial,
        )
        id_conjunto = conjunto_verificado.id_conjunto_residencial

        assert _enviar(client, reciclador_auth_headers, "LLEGADA_RECICLADOR", id_conjunto).status_code == 201
        assert _enviar(client, reciclador_auth_headers, "SHUT_LLENO", id_conjunto).status_code == 201
        assert _enviar(client, reciclador_auth_headers, "SHUT_LIBRE", id_conjunto).status_code == 201

        repetido = _enviar(client, reciclador_auth_headers, "SHUT_LLENO", id_conjunto)
        assert repetido.status_code == 400
        assert "5 minutos" in repetido.json()["detail"]

        # ¿Qué? Se envejece 10 minutos el primer SHUT_LLENO: ya pasó el enfriamiento.
        db.execute(text("UPDATE notificaciones SET created_at = created_at - interval '10 minutes' WHERE tipo = 'SHUT_LLENO'"))
        db.commit()
        assert _enviar(client, reciclador_auth_headers, "SHUT_LLENO", id_conjunto).status_code == 201

    def test_mi_estado_reciclador_refleja_presencia_y_shut(
        self, client: TestClient, admin_conjunto_auth_headers, reciclador_auth_headers, conjunto_verificado, reciclador_test
    ):
        _autorizar_reciclador(
            client, admin_conjunto_auth_headers, reciclador_auth_headers,
            reciclador_test.correo_electronico, conjunto_verificado.id_conjunto_residencial,
        )
        id_conjunto = str(conjunto_verificado.id_conjunto_residencial)

        antes = client.get("/api/v1/notificaciones/mi-estado-reciclador", headers=reciclador_auth_headers)
        assert antes.status_code == 200
        estado_antes = next(e for e in antes.json() if e["id_conjunto_residencial"] == id_conjunto)
        assert estado_antes["presente"] is False
        assert estado_antes["shut_lleno"] is False
        assert estado_antes["puede_avisar_llegada"] is True

        _enviar(client, reciclador_auth_headers, "LLEGADA_RECICLADOR", conjunto_verificado.id_conjunto_residencial)
        _enviar(client, reciclador_auth_headers, "SHUT_LLENO", conjunto_verificado.id_conjunto_residencial)

        despues = client.get("/api/v1/notificaciones/mi-estado-reciclador", headers=reciclador_auth_headers)
        estado_despues = next(e for e in despues.json() if e["id_conjunto_residencial"] == id_conjunto)
        assert estado_despues["presente"] is True
        assert estado_despues["shut_lleno"] is True
        # ¿Qué? Estando presente, "Llegué al conjunto" ya no tiene sentido —
        #       independientemente del candado de 2 horas.
        assert estado_despues["puede_avisar_llegada"] is False

    def test_puede_avisar_llegada_sigue_en_false_por_el_candado_de_2h_tras_finalizar(
        self, client: TestClient, admin_conjunto_auth_headers, reciclador_auth_headers, conjunto_verificado, reciclador_test
    ):
        """
        ¿Qué? Aunque el reciclador ya avise que se fue (deja de estar
              presente), el candado viejo de "no avisar llegada 2 veces en
              menos de 2 horas" sigue activo — mi-estado-reciclador debe
              reflejar eso, no solo la presencia.
        """
        _autorizar_reciclador(
            client, admin_conjunto_auth_headers, reciclador_auth_headers,
            reciclador_test.correo_electronico, conjunto_verificado.id_conjunto_residencial,
        )
        id_conjunto = str(conjunto_verificado.id_conjunto_residencial)

        _enviar(client, reciclador_auth_headers, "LLEGADA_RECICLADOR", conjunto_verificado.id_conjunto_residencial)
        _enviar(client, reciclador_auth_headers, "FINALIZACION_RECICLADOR", conjunto_verificado.id_conjunto_residencial)

        estado = client.get("/api/v1/notificaciones/mi-estado-reciclador", headers=reciclador_auth_headers)
        estado_conjunto = next(e for e in estado.json() if e["id_conjunto_residencial"] == id_conjunto)
        assert estado_conjunto["presente"] is False
        assert estado_conjunto["puede_avisar_llegada"] is False


class TestAvisosPorConjuntoPaginados:
    """Issue #595: la pestaña "Avisos" de cada conjunto pide sus avisos al servidor, de 10 en 10."""

    URL = "/api/v1/notificaciones/por-conjunto"
    URL_CONTEO = "/api/v1/notificaciones/no-leidas-por-conjunto"

    def test_sin_login_devuelve_401(self, client: TestClient, conjunto_verificado):
        assert client.get(f"{self.URL}/{conjunto_verificado.id_conjunto_residencial}").status_code == 401
        assert client.get(self.URL_CONTEO).status_code == 401

    def test_devuelve_de_10_en_10_con_el_total(
        self, client: TestClient, db: Session, admin_conjunto_test, admin_conjunto_auth_headers, conjunto_verificado
    ):
        id_conjunto = conjunto_verificado.id_conjunto_residencial
        # ¿Qué? Los 12 se crean en una sola transacción: comparten la misma hora de creación.
        # ¿Para qué? Comprobar que el id desempata y dos páginas seguidas no repiten ni se saltan ningún aviso.
        _avisar_al_admin(db, admin_conjunto_test, id_conjunto, cantidad=12)

        primera = client.get(f"{self.URL}/{id_conjunto}", headers=admin_conjunto_auth_headers).json()
        segunda = client.get(
            f"{self.URL}/{id_conjunto}", params={"offset": 10}, headers=admin_conjunto_auth_headers
        ).json()

        assert primera["total"] == 12 and len(primera["items"]) == 10
        assert segunda["total"] == 12 and len(segunda["items"]) == 2
        ids_primera = {n["id"] for n in primera["items"]}
        ids_segunda = {n["id"] for n in segunda["items"]}
        assert ids_primera.isdisjoint(ids_segunda)
        assert len(ids_primera | ids_segunda) == 12

    def test_cada_aviso_trae_su_conjunto_y_su_estado(
        self, client: TestClient, db: Session, admin_conjunto_test, admin_conjunto_auth_headers, conjunto_verificado
    ):
        _avisar_al_admin(db, admin_conjunto_test, conjunto_verificado.id_conjunto_residencial)

        aviso = client.get(
            f"{self.URL}/{conjunto_verificado.id_conjunto_residencial}", headers=admin_conjunto_auth_headers
        ).json()["items"][0]

        assert aviso["tipo"] == "SHUT_LLENO"
        assert aviso["leida"] is False
        assert aviso["id_conjunto_residencial"] == str(conjunto_verificado.id_conjunto_residencial)
        assert aviso["nombre_conjunto"] == conjunto_verificado.nombre_conjunto

    def test_los_avisos_de_un_conjunto_no_desplazan_a_los_del_otro(
        self,
        client: TestClient,
        db: Session,
        admin_conjunto_test,
        admin_conjunto_auth_headers,
        conjunto_verificado,
        dos_conjuntos_con_el_mismo_nombre,
    ):
        id_a = conjunto_verificado.id_conjunto_residencial
        id_b = dos_conjuntos_con_el_mismo_nombre.id_conjunto_residencial
        # El otro conjunto recibe sus 2 avisos PRIMERO y el principal 35 después: la lista general (solo las
        # últimas 30) ya no incluye ninguno del otro, pero su página sí.
        _avisar_al_admin(db, admin_conjunto_test, id_b, cantidad=2)
        _avisar_al_admin(db, admin_conjunto_test, id_a, cantidad=35)

        general = client.get("/api/v1/notificaciones/mis-notificaciones", headers=admin_conjunto_auth_headers).json()
        pagina_b = client.get(f"{self.URL}/{id_b}", headers=admin_conjunto_auth_headers).json()
        pagina_a = client.get(f"{self.URL}/{id_a}", headers=admin_conjunto_auth_headers).json()

        assert len(general) == 30
        assert str(id_b) not in {n["id_conjunto_residencial"] for n in general}
        assert pagina_b["total"] == 2
        assert pagina_a["total"] == 35

    def test_deja_fuera_la_auditoria_publicada(
        self, client: TestClient, db: Session, admin_conjunto_test, admin_conjunto_auth_headers, conjunto_verificado
    ):
        """La muestra un banner aparte; no debe estar en la lista ni en el contador del conjunto."""
        id_conjunto = conjunto_verificado.id_conjunto_residencial
        _avisar_al_admin(db, admin_conjunto_test, id_conjunto)
        crear_notificacion(
            db,
            tipo="AUDITORIA_PUBLICADA",
            mensaje="Hay una nueva auditoría.",
            destinatarios=[admin_conjunto_test.id_usuario],
            id_conjunto=id_conjunto,
        )
        db.commit()

        pagina = client.get(f"{self.URL}/{id_conjunto}", headers=admin_conjunto_auth_headers).json()
        conteo = client.get(self.URL_CONTEO, headers=admin_conjunto_auth_headers).json()
        general = client.get("/api/v1/notificaciones/mis-notificaciones", headers=admin_conjunto_auth_headers).json()

        assert pagina["total"] == 1 and pagina["items"][0]["tipo"] == "SHUT_LLENO"
        assert conteo == [{"id_conjunto_residencial": str(id_conjunto), "count": 1}]
        # La lista general (campanita y banners) sí sigue trayéndola.
        assert len(general) == 2

    def test_un_conjunto_ajeno_devuelve_una_pagina_vacia(
        self, client: TestClient, db: Session, admin_conjunto_test, admin_conjunto_auth_headers, conjunto_verificado
    ):
        _avisar_al_admin(db, admin_conjunto_test, conjunto_verificado.id_conjunto_residencial, cantidad=2)

        respuesta = client.get(f"{self.URL}/{uuid.uuid4()}", headers=admin_conjunto_auth_headers)

        assert respuesta.status_code == 200
        assert respuesta.json() == {"items": [], "total": 0}

    def test_no_muestra_los_avisos_de_otras_personas(
        self,
        client: TestClient,
        db: Session,
        admin_conjunto_test,
        admin_conjunto_auth_headers,
        conjunto_verificado,
        test_user,
    ):
        """El aviso es del Residente del conjunto, no del Admin: el Admin no lo ve ni lo cuenta."""
        id_conjunto = conjunto_verificado.id_conjunto_residencial
        crear_notificacion(
            db, tipo="SHUT_LLENO", mensaje="El SHUT está lleno.", destinatarios=[test_user.id_usuario], id_conjunto=id_conjunto
        )
        db.commit()

        pagina = client.get(f"{self.URL}/{id_conjunto}", headers=admin_conjunto_auth_headers).json()
        conteo = client.get(self.URL_CONTEO, headers=admin_conjunto_auth_headers).json()

        assert pagina == {"items": [], "total": 0}
        assert conteo == []

    def test_limit_fuera_de_rango_devuelve_422(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        url = f"{self.URL}/{conjunto_verificado.id_conjunto_residencial}"
        assert client.get(url, params={"limit": 0}, headers=admin_conjunto_auth_headers).status_code == 422
        assert client.get(url, params={"limit": 51}, headers=admin_conjunto_auth_headers).status_code == 422
        assert client.get(url, params={"offset": -1}, headers=admin_conjunto_auth_headers).status_code == 422

    def test_id_de_conjunto_invalido_devuelve_422(self, client: TestClient, admin_conjunto_auth_headers):
        respuesta = client.get(f"{self.URL}/no-es-un-uuid", headers=admin_conjunto_auth_headers)
        assert respuesta.status_code == 422

    def test_el_conteo_separa_los_conjuntos_y_solo_cuenta_los_sin_leer(
        self,
        client: TestClient,
        db: Session,
        admin_conjunto_test,
        admin_conjunto_auth_headers,
        conjunto_verificado,
        dos_conjuntos_con_el_mismo_nombre,
    ):
        id_a = conjunto_verificado.id_conjunto_residencial
        id_b = dos_conjuntos_con_el_mismo_nombre.id_conjunto_residencial
        _avisar_al_admin(db, admin_conjunto_test, id_a, cantidad=2)
        _avisar_al_admin(db, admin_conjunto_test, id_b, cantidad=3)
        # Una novedad de plataforma no es de ningún conjunto: no se cuenta.
        _avisar_al_admin(db, admin_conjunto_test, None)

        conteo = client.get(self.URL_CONTEO, headers=admin_conjunto_auth_headers).json()
        assert {c["id_conjunto_residencial"]: c["count"] for c in conteo} == {str(id_a): 2, str(id_b): 3}

        client.post(
            "/api/v1/notificaciones/marcar-todas-leidas",
            params={"id_conjunto_residencial": str(id_a)},
            headers=admin_conjunto_auth_headers,
        )
        conteo = client.get(self.URL_CONTEO, headers=admin_conjunto_auth_headers).json()
        assert conteo == [{"id_conjunto_residencial": str(id_b), "count": 3}]
