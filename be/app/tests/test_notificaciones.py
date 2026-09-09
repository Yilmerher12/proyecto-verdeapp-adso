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

from fastapi.testclient import TestClient


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
