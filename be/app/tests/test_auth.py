"""
Módulo: tests/test_auth.py
Descripción: Tests de integración para los endpoints de autenticación y usuario de VerdeApp.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app as fastapi_app
from app.models.conjunto_residencial import ConjuntoResidencial
from app.tests.conftest import (
    TEST_USER_EMAIL,
    TEST_USER_NOMBRE,
    TEST_USER_APELLIDOS,
    TEST_USER_PASSWORD,
    UNVERIFIED_USER_EMAIL,
)


def _payload_residente(
    conjunto: ConjuntoResidencial,
    email: str = "nuevo.residente@verdeapp.com",
    password: str = "NewPass123",
) -> dict:
    """Construye un payload válido de registro de Residente."""
    return {
        "rol": "residente",
        "correo_electronico": email,
        "password": password,
        "nombre": "Nuevo",
        "apellidos": "Residente Prueba",
        "numero_telefonico": "3001112222",
        "id_conjunto_residencial": conjunto.id_conjunto_residencial,
        "torre": "TORRE 1",
        "apto": "303",
    }


class TestRegister:
    """Tests para el endpoint de registro de usuarios (Residente y Reciclador)."""

    URL = "/api/v1/auth/register"

    def test_register_residente_success(
        self, client: TestClient, conjunto_verificado: ConjuntoResidencial
    ) -> None:
        response = client.post(self.URL, json=_payload_residente(conjunto_verificado))
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "nuevo.residente@verdeapp.com"
        assert data["is_active"] is False

    def test_register_residente_conjunto_no_verificado(
        self, client: TestClient, conjunto_no_verificado: ConjuntoResidencial
    ) -> None:
        response = client.post(
            self.URL,
            json=_payload_residente(conjunto_no_verificado, email="otro@verdeapp.com"),
        )
        assert response.status_code == 400
        assert "afiliado" in response.json()["detail"].lower()

    def test_register_duplicate_email(
        self, client: TestClient, test_user: object, conjunto_verificado: ConjuntoResidencial
    ) -> None:
        response = client.post(
            self.URL,
            json=_payload_residente(conjunto_verificado, email=TEST_USER_EMAIL),
        )
        assert response.status_code == 400
        assert "ya está registrado" in response.json()["detail"]

    def test_register_reciclador_success(self, client: TestClient, localidad_test) -> None:
        response = client.post(
            self.URL,
            json={
                "rol": "reciclador",
                "correo_electronico": "reciclador.nuevo@verdeapp.com",
                "password": "RecyPass123",
                "nombre": "Carlos",
                "apellidos": "Ramírez",
                "numero_telefonico": "3009998888",
                "localidad_id": localidad_test.id_localidad,
                "asociacion": "ARB",
            },
        )
        assert response.status_code == 201

    def test_register_missing_required_field(self, client: TestClient) -> None:
        response = client.post(
            self.URL,
            json={
                "rol": "residente",
                "correo_electronico": "incompleto@verdeapp.com",
                "nombre": "Incompleto",
                "apellidos": "Prueba",
            },
        )
        assert response.status_code == 422

    def test_register_residente_sin_conjunto(self, client: TestClient) -> None:
        response = client.post(
            self.URL,
            json={
                "rol": "residente",
                "correo_electronico": "sinconjunto@verdeapp.com",
                "password": "TestPass123",
                "nombre": "Sin",
                "apellidos": "Conjunto",
            },
        )
        assert response.status_code == 400
        assert "conjunto" in response.json()["detail"].lower()

    def test_register_apellidos_vacio(
        self, client: TestClient, conjunto_verificado: ConjuntoResidencial
    ) -> None:
        payload = _payload_residente(conjunto_verificado, email="sinapellido@verdeapp.com")
        payload["apellidos"] = "   "
        response = client.post(self.URL, json=payload)
        assert response.status_code == 422


class TestLogin:
    """Tests para el endpoint de inicio de sesión."""

    URL = "/api/v1/auth/login"

    def test_login_success(self, client: TestClient, test_user: object) -> None:
        response = client.post(
            self.URL,
            json={"correo_electronico": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 0

    def test_login_wrong_password(self, client: TestClient, test_user: object) -> None:
        response = client.post(
            self.URL,
            json={"correo_electronico": TEST_USER_EMAIL, "password": "WrongPassword123"},
        )
        assert response.status_code == 401
        assert "incorrectas" in response.json()["detail"].lower()

    def test_login_nonexistent_email(self, client: TestClient) -> None:
        response = client.post(
            self.URL,
            json={"correo_electronico": "fantasma@verdeapp.com", "password": "TestPass123"},
        )
        assert response.status_code == 401
        assert "incorrectas" in response.json()["detail"].lower()

    def test_login_unverified_user(self, client: TestClient, unverified_user: object) -> None:
        response = client.post(
            self.URL,
            json={"correo_electronico": UNVERIFIED_USER_EMAIL, "password": TEST_USER_PASSWORD},
        )
        assert response.status_code == 403
        assert "verificada" in response.json()["detail"].lower()

    def test_login_missing_correo(self, client: TestClient) -> None:
        response = client.post(self.URL, json={"password": "TestPass123"})
        assert response.status_code == 422


class TestRefresh:
    """Tests para el endpoint de renovación de tokens."""

    URL = "/api/v1/auth/refresh"

    def test_refresh_success(self, client: TestClient, test_user: object) -> None:
        """Refresh con token válido → 200 + nuevos tokens.

        ¿Qué? No se compara que el nuevo refresh_token sea distinto al
              anterior. create_refresh_token() genera el JWT a partir de
              {sub, role_id, exp} — si login y refresh ocurren en el mismo
              segundo (como pasa siempre en un test), "exp" calculado es
              idéntico, y el JWT firmado también sale idéntico. No es un
              fallo de seguridad: en un escenario real, login y refresh
              nunca ocurren en el mismo segundo exacto.
        """
        login_response = client.post(
            "/api/v1/auth/login",
            json={"correo_electronico": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
        )
        refresh_token = login_response.json()["refresh_token"]

        response = client.post(self.URL, json={"refresh_token": refresh_token})

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_refresh_invalid_token(self, client: TestClient) -> None:
        response = client.post(self.URL, json={"refresh_token": "token.invalido.falso"})
        assert response.status_code == 401

    def test_refresh_with_access_token_rejected(
        self, client: TestClient, test_user: object
    ) -> None:
        login_response = client.post(
            "/api/v1/auth/login",
            json={"correo_electronico": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
        )
        access_token = login_response.json()["access_token"]
        response = client.post(self.URL, json={"refresh_token": access_token})
        assert response.status_code == 401

    def test_refresh_for_inactive_user(self, client: TestClient, test_user, db) -> None:
        login_response = client.post(
            "/api/v1/auth/login",
            json={"correo_electronico": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
        )
        refresh_token = login_response.json()["refresh_token"]
        test_user.is_active = False
        db.commit()
        response = client.post(self.URL, json={"refresh_token": refresh_token})
        assert response.status_code == 403


class TestChangePassword:
    """Tests para el endpoint de cambio de contraseña (usuario autenticado)."""

    URL = "/api/v1/auth/change-password"

    def test_change_password_success(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        new_password = "NewSecure456"
        response = client.post(
            self.URL,
            json={"current_password": TEST_USER_PASSWORD, "new_password": new_password},
            headers=auth_headers,
        )
        assert response.status_code == 200
        login_response = client.post(
            "/api/v1/auth/login",
            json={"correo_electronico": TEST_USER_EMAIL, "password": new_password},
        )
        assert login_response.status_code == 200

    def test_change_password_wrong_current(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        response = client.post(
            self.URL,
            json={"current_password": "WrongCurrent123", "new_password": "NewPass456"},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert "incorrecta" in response.json()["detail"].lower()

    def test_change_password_no_auth(self, client: TestClient) -> None:
        response = client.post(
            self.URL,
            json={"current_password": TEST_USER_PASSWORD, "new_password": "NewPass456"},
        )
        assert response.status_code == 401

    def test_change_password_weak_new_password(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        response = client.post(
            self.URL,
            json={"current_password": TEST_USER_PASSWORD, "new_password": "weak"},
            headers=auth_headers,
        )
        assert response.status_code == 422


class TestForgotPassword:
    """Tests para el endpoint de solicitud de recuperación de contraseña."""

    URL = "/api/v1/auth/forgot-password"

    def test_forgot_password_existing_email(
        self, client: TestClient, test_user: object
    ) -> None:
        response = client.post(self.URL, json={"email": TEST_USER_EMAIL})
        assert response.status_code == 200
        assert "registrado" in response.json()["message"].lower()

    def test_forgot_password_nonexistent_email(self, client: TestClient) -> None:
        response = client.post(self.URL, json={"email": "fantasma@verdeapp.com"})
        assert response.status_code == 200
        assert "registrado" in response.json()["message"].lower()

    def test_forgot_password_invalid_email_format(self, client: TestClient) -> None:
        response = client.post(self.URL, json={"email": "no-es-un-correo"})
        assert response.status_code == 422


class TestResetPassword:
    """Tests para el endpoint de restablecimiento de contraseña."""

    URL = "/api/v1/auth/reset-password"

    def test_reset_password_success(self, client: TestClient, valid_reset_token: str) -> None:
        new_password = "ResetPass789"
        response = client.post(
            self.URL, json={"token": valid_reset_token, "new_password": new_password}
        )
        assert response.status_code == 200
        login_response = client.post(
            "/api/v1/auth/login",
            json={"correo_electronico": TEST_USER_EMAIL, "password": new_password},
        )
        assert login_response.status_code == 200

    def test_reset_password_invalid_token(self, client: TestClient) -> None:
        response = client.post(
            self.URL,
            json={
                "token": "00000000-0000-0000-0000-000000000000",
                "new_password": "NewPass456",
            },
        )
        assert response.status_code == 400
        assert "inválido" in response.json()["detail"].lower()

    def test_reset_password_expired_token(
        self, client: TestClient, expired_reset_token: str
    ) -> None:
        response = client.post(
            self.URL, json={"token": expired_reset_token, "new_password": "NewPass456"}
        )
        assert response.status_code == 400
        assert "expirado" in response.json()["detail"].lower()

    def test_reset_password_used_token(self, client: TestClient, used_reset_token: str) -> None:
        response = client.post(
            self.URL, json={"token": used_reset_token, "new_password": "NewPass456"}
        )
        assert response.status_code == 400
        assert "utilizado" in response.json()["detail"].lower()

    def test_reset_password_weak_new_password(
        self, client: TestClient, valid_reset_token: str
    ) -> None:
        response = client.post(
            self.URL, json={"token": valid_reset_token, "new_password": "123"}
        )
        assert response.status_code == 422


class TestGetMe:
    """Tests para el endpoint de perfil de usuario."""

    URL = "/api/v1/users/me"

    def test_get_me_success(
        self, client: TestClient, auth_headers: dict[str, str], test_user: object
    ) -> None:
        response = client.get(self.URL, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_USER_EMAIL
        assert data["first_name"] == TEST_USER_NOMBRE
        assert data["last_name"] == TEST_USER_APELLIDOS
        assert data["role_id"] == 2
        assert "password" not in data

    def test_get_me_no_auth(self, client: TestClient) -> None:
        response = client.get(self.URL)
        assert response.status_code == 401

    def test_get_me_invalid_token(self, client: TestClient) -> None:
        response = client.get(
            self.URL, headers={"Authorization": "Bearer token.invalido.falso"}
        )
        assert response.status_code == 401


class TestHealthCheck:
    """Tests para el endpoint de verificación de salud del servidor."""

    URL = "/api/v1/health"

    def test_health_check(self, client: TestClient) -> None:
        response = client.get(self.URL)
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestEmailVerification:
    """Tests para el endpoint de verificación de email."""

    URL = "/api/v1/auth/verify-email"

    def test_verify_email_success(
        self, client: TestClient, valid_verification_token: str
    ) -> None:
        response = client.post(self.URL, json={"token": valid_verification_token})
        assert response.status_code == 200
        assert "verificado" in response.json()["message"].lower()

    def test_verify_email_then_login_works(
        self, client: TestClient, valid_verification_token: str
    ) -> None:
        """Tras verificar el email, el login que antes daba 403 ahora funciona.

        ¿Qué? Se resetea el rate limiter de login antes de probar, porque
              muchos otros tests de login/refresh ya corrieron antes en la
              misma sesión de pytest — el límite real de seguridad (10
              intentos de login por minuto) puede agotarse antes de llegar
              aquí, dando 429 en vez de 200 sin que el código esté roto.
        """
        try:
            fastapi_app.state.limiter._storage.reset()
        except AttributeError:
            pass

        client.post(self.URL, json={"token": valid_verification_token})

        login_response = client.post(
            "/api/v1/auth/login",
            json={"correo_electronico": UNVERIFIED_USER_EMAIL, "password": TEST_USER_PASSWORD},
        )

        assert login_response.status_code == 200
        assert "access_token" in login_response.json()

    def test_verify_email_invalid_token(self, client: TestClient) -> None:
        response = client.post(self.URL, json={"token": "token-falso-inexistente"})
        assert response.status_code == 400

    def test_verify_email_expired_token(
        self, client: TestClient, expired_verification_token: str
    ) -> None:
        response = client.post(self.URL, json={"token": expired_verification_token})
        assert response.status_code == 400
        assert "expirado" in response.json()["detail"].lower()

    def test_verify_email_used_token(
        self, client: TestClient, used_verification_token: str
    ) -> None:
        response = client.post(self.URL, json={"token": used_verification_token})
        assert response.status_code == 400
        assert "utilizado" in response.json()["detail"].lower()


@pytest.mark.skip(
    reason="update_user_locale() es un no-op: no persiste el locale en la BD. "
    "Pendiente implementar la columna real antes de habilitar este test."
)
class TestUpdateLocale:
    """Tests para el endpoint de actualización de preferencia de idioma."""

    URL = "/api/v1/users/me/locale"

    def test_update_locale_to_en(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        response = client.patch(self.URL, json={"locale": "en"}, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["locale"] == "en"

    def test_update_locale_persists(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        client.patch(self.URL, json={"locale": "en"}, headers=auth_headers)
        get_response = client.get("/api/v1/users/me", headers=auth_headers)
        assert get_response.json()["locale"] == "en"

    def test_update_locale_invalid_value(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        response = client.patch(self.URL, json={"locale": "fr"}, headers=auth_headers)
        assert response.status_code == 422

    def test_update_locale_no_auth(self, client: TestClient) -> None:
        response = client.patch(self.URL, json={"locale": "en"})
        assert response.status_code == 401