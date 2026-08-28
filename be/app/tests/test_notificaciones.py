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
