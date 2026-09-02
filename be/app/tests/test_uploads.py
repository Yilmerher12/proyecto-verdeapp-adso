"""
Módulo: tests/test_uploads.py
Descripción: Pruebas del endpoint genérico de subida de imágenes adjuntas
             (comunicados/novedades) — POST /api/v1/uploads/adjunto.
¿Para qué? Reemplaza el link externo de imagen por un archivo real,
          reutilizando la misma validación (Pillow) que ya protege las
          fotos de evidencia de auditorías.
"""
import io

from fastapi.testclient import TestClient
from PIL import Image


def _generar_imagen_real() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (2, 2), color="blue").save(buffer, format="PNG")
    return buffer.getvalue()


IMAGEN_VALIDA = _generar_imagen_real()

URL = "/api/v1/uploads/adjunto"


class TestSubirAdjunto:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.post(
            URL, files={"archivo": ("foto.png", io.BytesIO(IMAGEN_VALIDA), "image/png")}
        )
        assert response.status_code == 401

    def test_residente_no_puede_subir_devuelve_403(self, client: TestClient, auth_headers):
        response = client.post(
            URL,
            headers=auth_headers,
            files={"archivo": ("foto.png", io.BytesIO(IMAGEN_VALIDA), "image/png")},
        )
        assert response.status_code == 403

    def test_reciclador_no_puede_subir_devuelve_403(self, client: TestClient, reciclador_auth_headers):
        response = client.post(
            URL,
            headers=reciclador_auth_headers,
            files={"archivo": ("foto.png", io.BytesIO(IMAGEN_VALIDA), "image/png")},
        )
        assert response.status_code == 403

    def test_admin_conjunto_sube_imagen_valida(self, client: TestClient, admin_conjunto_auth_headers):
        response = client.post(
            URL,
            headers=admin_conjunto_auth_headers,
            files={"archivo": ("foto.png", io.BytesIO(IMAGEN_VALIDA), "image/png")},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["url"].startswith("/uploads/adjuntos/")
        assert data["url"].endswith(".png")

    def test_admin_sistema_sube_imagen_valida(self, client: TestClient, admin_sistema_auth_headers):
        response = client.post(
            URL,
            headers=admin_sistema_auth_headers,
            files={"archivo": ("foto.jpg", io.BytesIO(IMAGEN_VALIDA), "image/jpeg")},
        )
        assert response.status_code == 201
        assert response.json()["url"].startswith("/uploads/adjuntos/")

    def test_archivo_que_no_es_imagen_devuelve_400(self, client: TestClient, admin_conjunto_auth_headers):
        """Mismo caso que ya cubre auditorías: Content-Type dice "imagen",
        pero el contenido real es texto plano — debe rechazarse igual."""
        response = client.post(
            URL,
            headers=admin_conjunto_auth_headers,
            files={"archivo": ("nota.jpg", io.BytesIO(b"esto no es una imagen"), "image/jpeg")},
        )
        assert response.status_code == 400

    def test_tipo_no_permitido_devuelve_400(self, client: TestClient, admin_conjunto_auth_headers):
        response = client.post(
            URL,
            headers=admin_conjunto_auth_headers,
            files={"archivo": ("documento.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
        )
        assert response.status_code == 400

    def test_png_con_chunk_corrupto_devuelve_400_no_500(self, client: TestClient, admin_conjunto_auth_headers):
        """¿Qué? Encontrado probando esto en vivo: un PNG con el checksum de
        un chunk corrupto hace que Pillow lance SyntaxError en vez de
        UnidentifiedImageError/OSError — sin capturarlo, esto tumbaba el
        endpoint entero con un 500 sin control."""
        png_con_crc_invalido = bytes([
            137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
            0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222,
            0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 250, 207, 0, 0,
            2, 0, 1, 79, 231, 68, 89, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
        ])
        response = client.post(
            URL,
            headers=admin_conjunto_auth_headers,
            files={"archivo": ("roto.png", io.BytesIO(png_con_crc_invalido), "image/png")},
        )
        assert response.status_code == 400
