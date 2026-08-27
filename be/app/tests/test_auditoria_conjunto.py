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
from app.models.reciclador import Reciclador
from app.models.tablas_asociacion import recicladores_conjuntos
from app.models.usuario import Usuario

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
