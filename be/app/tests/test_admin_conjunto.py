"""
Módulo: tests/test_admin_conjunto.py
Descripción: Pruebas del flujo de invitación de Administradores de Conjunto.
¿Para qué? Solo el Administrador del Sistema puede invitar (nunca la persona
           invitada se autoasigna el rol). Estas pruebas cubren las tres rutas:
           invitar (protegida), consultar invitación (pública) y aceptarla (pública,
           protegida por el token en vez de una sesión).
"""

import uuid

import pytest
from fastapi.testclient import TestClient


class TestInvitar:
    def test_sin_login_devuelve_401(self, client: TestClient, conjunto_verificado):
        response = client.post(
            "/api/v1/admin-conjunto/invitar",
            json={"correo_electronico": "nuevo@verdeapp.com", "ids_conjuntos": [str(conjunto_verificado.id_conjunto_residencial)]},
        )
        assert response.status_code == 401

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers, conjunto_verificado):
        """auth_headers es de un Residente, no del Administrador del Sistema."""
        response = client.post(
            "/api/v1/admin-conjunto/invitar",
            headers=auth_headers,
            json={"correo_electronico": "nuevo@verdeapp.com", "ids_conjuntos": [str(conjunto_verificado.id_conjunto_residencial)]},
        )
        assert response.status_code == 403

    def test_admin_sistema_invita_correctamente(
        self, client: TestClient, admin_sistema_auth_headers, conjunto_verificado
    ):
        response = client.post(
            "/api/v1/admin-conjunto/invitar",
            headers=admin_sistema_auth_headers,
            json={"correo_electronico": "nuevo@verdeapp.com", "ids_conjuntos": [str(conjunto_verificado.id_conjunto_residencial)]},
        )
        assert response.status_code == 201
        assert "nuevo@verdeapp.com" in response.json()["message"]

    def test_conjunto_inexistente_devuelve_400(self, client: TestClient, admin_sistema_auth_headers):
        response = client.post(
            "/api/v1/admin-conjunto/invitar",
            headers=admin_sistema_auth_headers,
            json={"correo_electronico": "nuevo@verdeapp.com", "ids_conjuntos": [str(uuid.uuid4())]},
        )
        assert response.status_code == 400

    def test_correo_ya_registrado_devuelve_400(
        self, client: TestClient, admin_sistema_auth_headers, conjunto_verificado, test_user
    ):
        response = client.post(
            "/api/v1/admin-conjunto/invitar",
            headers=admin_sistema_auth_headers,
            json={"correo_electronico": test_user.correo_electronico, "ids_conjuntos": [str(conjunto_verificado.id_conjunto_residencial)]},
        )
        assert response.status_code == 400

    def test_mas_de_100_conjuntos_devuelve_422(self, client: TestClient, admin_sistema_auth_headers):
        """Issue #402 (CN-060): tope de 100 conjuntos por invitación."""
        response = client.post(
            "/api/v1/admin-conjunto/invitar",
            headers=admin_sistema_auth_headers,
            json={"correo_electronico": "nuevo@verdeapp.com", "ids_conjuntos": [str(uuid.uuid4()) for _ in range(101)]},
        )
        assert response.status_code == 422

    def test_conjunto_con_administrador_activo_devuelve_409(
        self, client: TestClient, admin_sistema_auth_headers, admin_conjunto_test, conjunto_verificado
    ):
        """Issue #402 (CN-060): el aviso llega al invitar, con el nombre del conjunto, no al aceptar."""
        response = client.post(
            "/api/v1/admin-conjunto/invitar",
            headers=admin_sistema_auth_headers,
            json={"correo_electronico": "nuevo@verdeapp.com", "ids_conjuntos": [str(conjunto_verificado.id_conjunto_residencial)]},
        )
        assert response.status_code == 409
        assert conjunto_verificado.nombre_conjunto in response.json()["detail"]

    def test_conjunto_ya_desvinculado_se_puede_invitar(
        self, client: TestClient, db, admin_sistema_auth_headers, admin_conjunto_test, conjunto_verificado
    ):
        """Un vínculo terminado (fecha_desvinculacion) no cuenta como administrador activo."""
        from datetime import datetime

        from sqlalchemy import select

        from app.models.administrador_conjunto_asignacion import AdministradorConjuntoAsignacion

        asignacion = db.execute(
            select(AdministradorConjuntoAsignacion).where(
                AdministradorConjuntoAsignacion.id_conjunto_residencial == conjunto_verificado.id_conjunto_residencial
            )
        ).scalar_one()
        asignacion.fecha_desvinculacion = datetime.now()
        db.commit()

        response = client.post(
            "/api/v1/admin-conjunto/invitar",
            headers=admin_sistema_auth_headers,
            json={"correo_electronico": "nuevo@verdeapp.com", "ids_conjuntos": [str(conjunto_verificado.id_conjunto_residencial)]},
        )
        assert response.status_code == 201

    def test_conjunto_con_invitacion_pendiente_de_otra_persona_devuelve_409(
        self, client: TestClient, admin_sistema_auth_headers, conjunto_verificado
    ):
        """Issue #402 (CN-060): dos invitaciones pendientes al mismo conjunto harían fallar la segunda al aceptarse."""
        cuerpo = {"ids_conjuntos": [str(conjunto_verificado.id_conjunto_residencial)]}
        primera = client.post(
            "/api/v1/admin-conjunto/invitar",
            headers=admin_sistema_auth_headers,
            json={"correo_electronico": "ana@verdeapp.com", **cuerpo},
        )
        assert primera.status_code == 201

        segunda = client.post(
            "/api/v1/admin-conjunto/invitar",
            headers=admin_sistema_auth_headers,
            json={"correo_electronico": "luis@verdeapp.com", **cuerpo},
        )
        assert segunda.status_code == 409
        assert conjunto_verificado.nombre_conjunto in segunda.json()["detail"]

    def test_reinvitar_al_mismo_correo_sigue_permitido(
        self, client: TestClient, admin_sistema_auth_headers, conjunto_verificado
    ):
        """Si a la persona se le perdió el correo, se le puede reenviar la invitación."""
        cuerpo = {
            "correo_electronico": "ana@verdeapp.com",
            "ids_conjuntos": [str(conjunto_verificado.id_conjunto_residencial)],
        }
        for _ in range(2):
            response = client.post("/api/v1/admin-conjunto/invitar", headers=admin_sistema_auth_headers, json=cuerpo)
            assert response.status_code == 201

    def test_conjuntos_repetidos_se_guardan_una_sola_vez_y_la_invitacion_se_acepta(
        self, client: TestClient, admin_sistema_auth_headers, conjunto_verificado, db, monkeypatch
    ):
        """Issue #402 (CN-060): antes, un conjunto repetido hacía fallar el aceptar con 500."""
        from sqlalchemy import select

        from app.models.invitacion_admin_conjunto import InvitacionAdminConjunto
        from app.services import admin_conjunto_service

        tokens_enviados: list[str] = []

        async def enviar_falso(email: str, token: str) -> None:
            tokens_enviados.append(token)

        monkeypatch.setattr(admin_conjunto_service, "send_admin_conjunto_invitation_email", enviar_falso)

        id_conjunto = str(conjunto_verificado.id_conjunto_residencial)
        correo = "repetido@verdeapp.com"
        invitar = client.post(
            "/api/v1/admin-conjunto/invitar",
            headers=admin_sistema_auth_headers,
            json={"correo_electronico": correo, "ids_conjuntos": [id_conjunto, id_conjunto]},
        )
        assert invitar.status_code == 201

        invitacion = db.execute(
            select(InvitacionAdminConjunto).where(InvitacionAdminConjunto.correo_electronico == correo)
        ).scalar_one()
        assert invitacion.conjuntos_asignados == id_conjunto

        aceptar = client.post(
            "/api/v1/admin-conjunto/aceptar",
            json={"token": tokens_enviados[0], "password": "ClaveFuerte123", "nombre": "Nuevo", "apellidos": "Administrador"},
        )
        assert aceptar.status_code == 201


class TestConsultarYAceptar:
    def test_token_invalido_devuelve_no_valido(self, client: TestClient):
        response = client.get("/api/v1/admin-conjunto/invitacion", params={"token": "no-existe"})
        assert response.status_code == 200
        assert response.json()["valido"] is False

    @pytest.mark.parametrize(
        "cambio",
        [{"nombre": "Juan123"}, {"apellidos": "A" * 151}, {"numero_telefonico": "abc"}],
    )
    def test_aceptar_con_datos_invalidos_devuelve_422(self, client: TestClient, cambio):
        """Mismas reglas que el registro: se rechaza antes de mirar el token."""
        body = {"token": "no-existe", "password": "ClaveFuerte123", "nombre": "Ana", "apellidos": "Pérez"}
        body.update(cambio)
        response = client.post("/api/v1/admin-conjunto/aceptar", json=body)
        assert response.status_code == 422

    def test_flujo_completo_invitar_consultar_y_aceptar(
        self, client: TestClient, admin_sistema_auth_headers, conjunto_verificado, db, monkeypatch, acciones_admin
    ):
        from app.models.invitacion_admin_conjunto import InvitacionAdminConjunto
        from app.services import admin_conjunto_service
        from app.utils.security import hash_token
        from sqlalchemy import select

        # ¿Qué? Issue #373 (CN-031): en la BD solo queda el hash del token,
        #       así que el original se toma del correo, como lo recibe la persona.
        tokens_enviados: list[str] = []

        async def enviar_falso(email: str, token: str) -> None:
            tokens_enviados.append(token)

        monkeypatch.setattr(admin_conjunto_service, "send_admin_conjunto_invitation_email", enviar_falso)

        correo = "invitado.completo@verdeapp.com"
        client.post(
            "/api/v1/admin-conjunto/invitar",
            headers=admin_sistema_auth_headers,
            json={"correo_electronico": correo, "ids_conjuntos": [str(conjunto_verificado.id_conjunto_residencial)]},
        )

        # Issue #376: la invitación queda en el log, sin el token.
        [accion] = acciones_admin()
        assert accion["action"] == "admin_conjunto_invitado"
        assert accion["invitado"] == "in***@verdeapp.com"
        assert accion["conjuntos"] == [str(conjunto_verificado.id_conjunto_residencial)]
        assert tokens_enviados[0] not in str(accion)

        invitacion = db.execute(
            select(InvitacionAdminConjunto).where(InvitacionAdminConjunto.correo_electronico == correo)
        ).scalar_one()
        token = tokens_enviados[0]
        assert invitacion.token == hash_token(token)

        consulta = client.get("/api/v1/admin-conjunto/invitacion", params={"token": token})
        assert consulta.status_code == 200
        assert consulta.json()["valido"] is True
        assert consulta.json()["correo_electronico"] == correo
        assert conjunto_verificado.nombre_conjunto in consulta.json()["nombres_conjuntos"]

        aceptar = client.post(
            "/api/v1/admin-conjunto/aceptar",
            json={
                "token": token,
                "password": "ClaveFuerte123",
                "nombre": "Nuevo",
                "apellidos": "Administrador",
            },
        )
        assert aceptar.status_code == 201
        # ¿Qué? Issue #311 (CN-028): la respuesta ya no trae tokens en el
        #       cuerpo (RNF-001.9) — la persona inicia sesión normal después.
        assert "access_token" not in aceptar.json()
        assert "refresh_token" not in aceptar.json()
        assert not aceptar.cookies.get("access_token")
        # Issue #401: aceptar la invitación crea una cuenta de administrador y queda anotado, sin el token.
        accion = acciones_admin()[-1]
        assert accion["action"] == "admin_conjunto_invitacion_aceptada"
        assert accion["admin"] == "in***@verdeapp.com"
        assert token not in str(accion)

        login = client.post(
            "/api/v1/auth/login",
            json={"correo_electronico": correo, "password": "ClaveFuerte123"},
        )
        assert login.status_code == 200

        # El token ya usado no debe servir dos veces.
        reintento = client.post(
            "/api/v1/admin-conjunto/aceptar",
            json={
                "token": token,
                "password": "ClaveFuerte123",
                "nombre": "Otro",
                "apellidos": "Nombre",
            },
        )
        assert reintento.status_code == 400

    def test_aceptar_con_conjunto_que_ya_tiene_administrador_devuelve_409(
        self,
        client: TestClient,
        admin_sistema_auth_headers,
        admin_conjunto_test,
        conjunto_verificado_sin_admin,
        db,
        monkeypatch,
    ):
        """Issue #409: si el conjunto consiguió administrador mientras la invitación esperaba, se avisa con 409 y no se crea nada."""
        from sqlalchemy import select

        from app.models.administrador_conjunto_asignacion import AdministradorConjuntoAsignacion
        from app.models.invitacion_admin_conjunto import InvitacionAdminConjunto
        from app.models.usuario import Usuario
        from app.services import admin_conjunto_service

        tokens_enviados: list[str] = []

        async def enviar_falso(email: str, token: str) -> None:
            tokens_enviados.append(token)

        monkeypatch.setattr(admin_conjunto_service, "send_admin_conjunto_invitation_email", enviar_falso)

        correo = "tarde@verdeapp.com"
        invitar = client.post(
            "/api/v1/admin-conjunto/invitar",
            headers=admin_sistema_auth_headers,
            json={
                "correo_electronico": correo,
                "ids_conjuntos": [str(conjunto_verificado_sin_admin.id_conjunto_residencial)],
            },
        )
        assert invitar.status_code == 201

        # ¿Qué? Se inserta el vínculo directo en la BD: por la API ya no se puede
        #       (asignar-conjunto-adicional rechaza conjuntos con invitación pendiente).
        db.add(
            AdministradorConjuntoAsignacion(
                id_administrador=admin_conjunto_test.id_administrador,
                id_conjunto_residencial=conjunto_verificado_sin_admin.id_conjunto_residencial,
            )
        )
        db.commit()

        aceptar = client.post(
            "/api/v1/admin-conjunto/aceptar",
            json={"token": tokens_enviados[0], "password": "ClaveFuerte123", "nombre": "Nuevo", "apellidos": "Administrador"},
        )
        assert aceptar.status_code == 409
        assert conjunto_verificado_sin_admin.nombre_conjunto in aceptar.json()["detail"]

        assert db.execute(select(Usuario).where(Usuario.correo_electronico == correo)).scalar_one_or_none() is None
        invitacion = db.execute(
            select(InvitacionAdminConjunto).where(InvitacionAdminConjunto.correo_electronico == correo)
        ).scalar_one()
        assert invitacion.used is False

    def test_aceptar_con_token_inexistente_devuelve_400(self, client: TestClient):
        response = client.post(
            "/api/v1/admin-conjunto/aceptar",
            json={
                "token": "no-existe",
                "password": "ClaveFuerte123",
                "nombre": "Nuevo",
                "apellidos": "Administrador",
            },
        )
        assert response.status_code == 400
