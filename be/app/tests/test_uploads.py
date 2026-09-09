"""
Módulo: tests/test_uploads.py
Descripción: Pruebas del endpoint genérico de subida de adjuntos
             (comunicados/novedades/contenido educativo) —
             POST /api/v1/uploads/adjunto.
¿Para qué? Reemplaza el link externo por un archivo real, reutilizando la
          misma validación (Pillow para imagen, firmas de bytes para
          PDF/Word/Excel) que ya protege las fotos de evidencia de
          auditorías.
"""
import io
import zipfile

from fastapi.testclient import TestClient
from PIL import Image


def _generar_imagen_real() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (2, 2), color="blue").save(buffer, format="PNG")
    return buffer.getvalue()


def _generar_zip_real() -> bytes:
    """
    ¿Qué? Word (.docx) y Excel (.xlsx) modernos son un ZIP por dentro —
          esto genera un ZIP real y chiquito, suficiente para pasar la
          validación de firma (ver app/utils/imagenes.py).
    """
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as zf:
        zf.writestr("contenido.txt", "simulacion de docx/xlsx")
    return buffer.getvalue()


IMAGEN_VALIDA = _generar_imagen_real()
ZIP_VALIDO = _generar_zip_real()

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

    def test_pdf_con_permitir_pdf_se_acepta(self, client: TestClient, admin_sistema_auth_headers):
        """¿Qué? Solo quien pide explícitamente permitir_pdf=true (la guía
        de apoyo del contenido educativo) puede subir un PDF."""
        response = client.post(
            f"{URL}?permitir_documentos=true",
            headers=admin_sistema_auth_headers,
            files={"archivo": ("guia.pdf", io.BytesIO(b"%PDF-1.4\n%mock pdf content"), "application/pdf")},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["url"].startswith("/uploads/adjuntos/")
        assert data["url"].endswith(".pdf")

    def test_pdf_falso_con_permitir_pdf_devuelve_400(self, client: TestClient, admin_sistema_auth_headers):
        """Content-Type dice PDF, pero el contenido real no empieza con la firma "%PDF-"."""
        response = client.post(
            f"{URL}?permitir_documentos=true",
            headers=admin_sistema_auth_headers,
            files={"archivo": ("falso.pdf", io.BytesIO(b"esto no es un pdf"), "application/pdf")},
        )
        assert response.status_code == 400

    def test_docx_con_permitir_documentos_se_acepta(self, client: TestClient, admin_conjunto_auth_headers):
        response = client.post(
            f"{URL}?permitir_documentos=true",
            headers=admin_conjunto_auth_headers,
            files={
                "archivo": (
                    "circular.docx",
                    io.BytesIO(ZIP_VALIDO),
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                )
            },
        )
        assert response.status_code == 201
        assert response.json()["url"].endswith(".docx")

    def test_xlsx_con_permitir_documentos_se_acepta(self, client: TestClient, admin_conjunto_auth_headers):
        response = client.post(
            f"{URL}?permitir_documentos=true",
            headers=admin_conjunto_auth_headers,
            files={
                "archivo": (
                    "cuotas.xlsx",
                    io.BytesIO(ZIP_VALIDO),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )
        assert response.status_code == 201
        assert response.json()["url"].endswith(".xlsx")

    def test_docx_falso_devuelve_400(self, client: TestClient, admin_conjunto_auth_headers):
        """Content-Type dice Word, pero el contenido real no es un ZIP."""
        response = client.post(
            f"{URL}?permitir_documentos=true",
            headers=admin_conjunto_auth_headers,
            files={
                "archivo": (
                    "falso.docx",
                    io.BytesIO(b"esto no es un zip"),
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                )
            },
        )
        assert response.status_code == 400

    def test_docx_sin_permitir_documentos_devuelve_400(self, client: TestClient, admin_conjunto_auth_headers):
        """Sin el flag, Word/Excel se rechazan igual que un PDF sin permiso."""
        response = client.post(
            URL,
            headers=admin_conjunto_auth_headers,
            files={
                "archivo": (
                    "circular.docx",
                    io.BytesIO(ZIP_VALIDO),
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                )
            },
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
