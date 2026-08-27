"""
Módulo: tests/test_auditoria_conjunto.py
Descripción: Pruebas de la auditoría del Reciclador al conjunto (RQF-009).
¿Para qué? Cubrir el único endpoint que hoy sube archivos en todo el
           backend: falta de autenticación/rol, autorización real en el
           conjunto, validación del nivel de desempeño y del tipo de
           archivo de evidencia, y el caso exitoso completo.
"""
import io

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.localidad import Localidad
from app.models.reciclador import Reciclador
from app.models.residente import Residente
from app.models.rol import RolId
from app.models.tablas_asociacion import recicladores_conjuntos
from app.models.unidad import Unidad
from app.models.usuario import Usuario
from app.utils.security import create_access_token, hash_password

IMAGEN_FALSA = b"contenido-de-prueba-no-es-una-imagen-real"


@pytest.fixture()
def reciclador_autorizado(db: Session, reciclador_test: Usuario, conjunto_verificado: ConjuntoResidencial) -> Reciclador:
    """Autoriza al reciclador de prueba en conjunto_verificado (RQF-016 ya aceptado)."""
    reciclador = db.query(Reciclador).filter(Reciclador.id_usuario == reciclador_test.id_usuario).one()
    db.execute(
        recicladores_conjuntos.insert().values(
            id_reciclador=reciclador.id_reciclador,
            id_conjunto_residencial=conjunto_verificado.id_conjunto_residencial,
        )
    )
    db.commit()
    return reciclador


def _payload_valido(id_conjunto: int) -> dict:
    return {
        "id_conjunto_residencial": str(id_conjunto),
        "nivel_desempeno": "REGULAR",
        "tema_educativo": "Separación en la fuente y código de colores",
    }


def _archivo_valido() -> dict:
    return {"evidencia": ("foto.jpg", io.BytesIO(IMAGEN_FALSA), "image/jpeg")}


class TestCrearAuditoria:
    def test_sin_login_devuelve_401(self, client: TestClient, conjunto_verificado):
        response = client.post(
            "/api/v1/auditorias-conjunto",
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        )
        assert response.status_code == 401

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers, conjunto_verificado):
        """auth_headers pertenece a un Residente, no a un Reciclador."""
        response = client.post(
            "/api/v1/auditorias-conjunto",
            headers=auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        )
        assert response.status_code == 403

    def test_sin_autorizacion_en_el_conjunto_devuelve_403(
        self, client: TestClient, reciclador_auth_headers, conjunto_verificado
    ):
        """El reciclador de prueba existe, pero NO está autorizado en este conjunto."""
        response = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        )
        assert response.status_code == 403

    def test_nivel_de_desempeno_invalido_devuelve_422(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        payload = _payload_valido(conjunto_verificado.id_conjunto_residencial)
        payload["nivel_desempeno"] = "SUPER_BIEN"
        response = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=payload,
            files=_archivo_valido(),
        )
        assert response.status_code == 422

    def test_evidencia_con_tipo_no_permitido_devuelve_400(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        response = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files={"evidencia": ("nota.txt", io.BytesIO(b"no soy una imagen"), "text/plain")},
        )
        assert response.status_code == 400

    def test_envio_exitoso_crea_la_auditoria(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        response = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["nivel_desempeno"] == "REGULAR"
        assert data["nombre_conjunto"] == conjunto_verificado.nombre_conjunto
        assert data["nombre_reciclador"]
        assert data["ruta_evidencia"].startswith("/uploads/evidencias-auditoria/")
        assert data["descripcion"] is None

    def test_descripcion_es_opcional_pero_se_guarda_si_llega(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        payload = _payload_valido(conjunto_verificado.id_conjunto_residencial)
        payload["descripcion"] = "El material orgánico llegó mezclado."
        response = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=payload,
            files=_archivo_valido(),
        )
        assert response.status_code == 201
        assert response.json()["descripcion"] == "El material orgánico llegó mezclado."


class TestListarMisAuditorias:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get("/api/v1/auditorias-conjunto/mias")
        assert response.status_code == 401

    def test_devuelve_las_auditorias_ya_enviadas(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        )
        response = client.get("/api/v1/auditorias-conjunto/mias", headers=reciclador_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id_conjunto_residencial"] == conjunto_verificado.id_conjunto_residencial

    def test_reciclador_sin_auditorias_ve_lista_vacia(self, client: TestClient, reciclador_auth_headers):
        response = client.get("/api/v1/auditorias-conjunto/mias", headers=reciclador_auth_headers)
        assert response.status_code == 200
        assert response.json() == []


class TestNotificacionAlPublicar:
    """¿Por qué? Al crear una auditoría debe avisarse a residentes y Admin
    de Conjunto — reutilizando el sistema de notificaciones ya existente,
    con el tipo AUDITORIA_PUBLICADA y su id_referencia."""

    def test_residente_del_conjunto_recibe_la_notificacion(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado, auth_headers
    ):
        """auth_headers pertenece a un Residente de conjunto_verificado (ver conftest)."""
        creada = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        ).json()

        response = client.get("/api/v1/notificaciones/mis-notificaciones", headers=auth_headers)
        assert response.status_code == 200
        notifs = [n for n in response.json() if n["tipo"] == "AUDITORIA_PUBLICADA"]
        assert len(notifs) == 1
        assert notifs[0]["id_referencia"] == creada["id_auditoria"]

    def test_admin_de_conjunto_recibe_la_notificacion(
        self,
        client: TestClient,
        reciclador_auth_headers,
        reciclador_autorizado,
        conjunto_verificado,
        admin_conjunto_test,
        admin_conjunto_auth_headers,
    ):
        client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        )
        response = client.get("/api/v1/notificaciones/mis-notificaciones", headers=admin_conjunto_auth_headers)
        assert response.status_code == 200
        assert any(n["tipo"] == "AUDITORIA_PUBLICADA" for n in response.json())

    def test_el_reciclador_que_la_envio_no_se_autonotifica(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        )
        response = client.get("/api/v1/notificaciones/mis-notificaciones", headers=reciclador_auth_headers)
        assert response.status_code == 200
        assert not any(n["tipo"] == "AUDITORIA_PUBLICADA" for n in response.json())


class TestObtenerAuditoriaPorId:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get("/api/v1/auditorias-conjunto/999999")
        assert response.status_code == 401

    def test_id_inexistente_devuelve_404(self, client: TestClient, auth_headers):
        response = client.get("/api/v1/auditorias-conjunto/999999", headers=auth_headers)
        assert response.status_code == 404

    def test_residente_del_conjunto_puede_verla(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado, auth_headers
    ):
        creada = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        ).json()

        response = client.get(f"/api/v1/auditorias-conjunto/{creada['id_auditoria']}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["nivel_desempeno"] == "REGULAR"

    def test_admin_del_conjunto_puede_verla(
        self,
        client: TestClient,
        reciclador_auth_headers,
        reciclador_autorizado,
        conjunto_verificado,
        admin_conjunto_test,
        admin_conjunto_auth_headers,
    ):
        creada = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        ).json()

        response = client.get(
            f"/api/v1/auditorias-conjunto/{creada['id_auditoria']}", headers=admin_conjunto_auth_headers
        )
        assert response.status_code == 200

    def test_residente_de_otro_conjunto_no_puede_verla(
        self,
        client: TestClient,
        db: Session,
        reciclador_auth_headers,
        reciclador_autorizado,
        conjunto_verificado,
        localidad_test: Localidad,
    ):
        creada = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        ).json()

        # Un residente de OTRO conjunto, distinto al auditado.
        otro_conjunto = ConjuntoResidencial(
            id_localidad=localidad_test.id_localidad,
            nombre_conjunto="OTRO CONJUNTO",
            direccion="Calle falsa 123",
            verificado=True,
        )
        db.add(otro_conjunto)
        db.flush()
        otro_usuario = Usuario(
            correo_electronico="otro.residente@verdeapp.com",
            id_rol=RolId.RESIDENTE,
            password=hash_password("Password1"),
            is_active=True,
        )
        db.add(otro_usuario)
        db.flush()
        otra_unidad = Unidad(id_conjunto_residencial=otro_conjunto.id_conjunto_residencial, torre="B", apto="202")
        db.add(otra_unidad)
        db.flush()
        db.add(Residente(id_usuario=otro_usuario.id_usuario, id_unidad=otra_unidad.id_unidad, nombre="OTRO", apellidos="RESIDENTE"))
        db.commit()

        token = create_access_token(data={"sub": otro_usuario.correo_electronico, "role_id": otro_usuario.id_rol})
        headers = {"Authorization": f"Bearer {token}"}

        response = client.get(f"/api/v1/auditorias-conjunto/{creada['id_auditoria']}", headers=headers)
        assert response.status_code == 403


class TestListarHistorial:
    """¿Por qué? A diferencia de la notificación (que se pierde al marcarla
    leída), el historial debe quedar siempre consultable — issue #5."""

    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get("/api/v1/auditorias-conjunto/historial")
        assert response.status_code == 401

    def test_reciclador_no_puede_verlo(self, client: TestClient, reciclador_auth_headers):
        response = client.get("/api/v1/auditorias-conjunto/historial", headers=reciclador_auth_headers)
        assert response.status_code == 403

    def test_residente_sin_auditorias_ve_lista_vacia(self, client: TestClient, auth_headers):
        response = client.get("/api/v1/auditorias-conjunto/historial", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_residente_ve_las_auditorias_de_su_conjunto_mas_recientes_primero(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado, auth_headers
    ):
        for nivel in ("DEFICIENTE", "EXCELENTE"):
            payload = _payload_valido(conjunto_verificado.id_conjunto_residencial)
            payload["nivel_desempeno"] = nivel
            client.post(
                "/api/v1/auditorias-conjunto",
                headers=reciclador_auth_headers,
                data=payload,
                files=_archivo_valido(),
            )

        response = client.get("/api/v1/auditorias-conjunto/historial", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        # ¿Qué? La más reciente (EXCELENTE, enviada segunda) debe ir primero.
        assert data[0]["nivel_desempeno"] == "EXCELENTE"
        assert data[1]["nivel_desempeno"] == "DEFICIENTE"

    def test_admin_de_conjunto_ve_el_mismo_historial(
        self,
        client: TestClient,
        reciclador_auth_headers,
        reciclador_autorizado,
        conjunto_verificado,
        admin_conjunto_test,
        admin_conjunto_auth_headers,
    ):
        client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        )
        response = client.get("/api/v1/auditorias-conjunto/historial", headers=admin_conjunto_auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1
