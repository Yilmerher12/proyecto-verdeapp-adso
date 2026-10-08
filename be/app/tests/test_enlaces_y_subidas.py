"""
Módulo: tests/test_enlaces_y_subidas.py
Descripción: Tests del issue #314 — enlaces permitidos en comunicados,
             novedades y contenido educativo, y tope de 5 MB al subir.
"""

import io

import pytest
from fastapi.testclient import TestClient

from app.utils.enlaces import validar_enlace_adjunto, validar_enlace_video, validar_imagen_propia
from app.utils.imagenes import TAMANO_MAXIMO_BYTES


@pytest.mark.parametrize("valor", [
    "https://bogota.gov.co/mi-ciudad/ambiente/guia",
    "/uploads/adjuntos/3f9a1c7e.pdf",
])
def test_adjunto_valido(valor: str) -> None:
    assert validar_enlace_adjunto(valor) == valor


@pytest.mark.parametrize("valor", [
    "http://sitio-sin-cifrar.com",
    "//sitio-malo.com/phishing",
    "javascript:alert(1)",
    "/uploads/../main.py",
    "ftp://archivos.com/x",
    # Issue #400 (CN-052): ".." y "/" escritos en forma codificada.
    "/uploads/%2e%2e/api/v1/users/me",
    "/uploads/%2E%2E/api/v1/users/me",
    "/uploads/adjuntos%2f..%2fmain.py",
])
def test_adjunto_invalido(valor: str) -> None:
    with pytest.raises(ValueError):
        validar_enlace_adjunto(valor)


def test_adjunto_https_externo_con_barra_codificada_es_valido() -> None:
    """El %2f solo se rechaza en /uploads/: en un enlace externo es normal."""
    valor = "https://ejemplo.com/ruta%2fcodificada"
    assert validar_enlace_adjunto(valor) == valor


@pytest.mark.parametrize("valor", [
    "https://www.youtube.com/watch?v=Jxzw1xyxE2s",
    "https://youtu.be/gYOwmj3-XqQ",
])
def test_video_valido(valor: str) -> None:
    assert validar_enlace_video(valor) == valor


@pytest.mark.parametrize("valor", [
    "https://sitio-malo.com/watch?v=Jxzw1xyxE2s",
    "http://www.youtube.com/watch?v=Jxzw1xyxE2s",
    "https://youtube.com.sitio-malo.com/watch",
])
def test_video_invalido(valor: str) -> None:
    with pytest.raises(ValueError):
        validar_enlace_video(valor)


@pytest.mark.parametrize("valor", [None, "", "   "])
def test_campo_vacio_es_sin_enlace(valor: str | None) -> None:
    """El formulario manda "" cuando se borra el campo."""
    assert validar_enlace_adjunto(valor) is None
    assert validar_enlace_video(valor) is None
    assert validar_imagen_propia(valor) is None


@pytest.mark.parametrize("extension", ["jpg", "png", "webp"])
def test_imagen_propia_valida(extension: str) -> None:
    """Issue #399 (CN-049): el formato exacto que genera la subida de archivos."""
    valor = f"/uploads/adjuntos/3f9a1c7e-5b2d-4e8a-9c1f-0a7b6d5e4f3c.{extension}"
    assert validar_imagen_propia(valor) == valor


@pytest.mark.parametrize("valor", [
    "https://ejemplo.com/f.jpg",
    "/uploads/adjuntos/c.jpg",
    "/uploads/adjuntos/3f9a1c7e-5b2d-4e8a-9c1f-0a7b6d5e4f3c.pdf",
    "/uploads/adjuntos/3F9A1C7E-5B2D-4E8A-9C1F-0A7B6D5E4F3C.jpg",
    "/uploads/otra/3f9a1c7e-5b2d-4e8a-9c1f-0a7b6d5e4f3c.jpg",
    "/uploads/adjuntos/../3f9a1c7e-5b2d-4e8a-9c1f-0a7b6d5e4f3c.jpg",
])
def test_imagen_propia_invalida(valor: str) -> None:
    with pytest.raises(ValueError):
        validar_imagen_propia(valor)


def test_crear_comunicado_con_enlace_externo_http_devuelve_422(
    client: TestClient, admin_conjunto_auth_headers: dict[str, str], conjunto_verificado
) -> None:
    response = client.post(
        "/api/v1/comunicados",
        headers=admin_conjunto_auth_headers,
        json={
            "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
            "destinatarios": "AMBOS",
            "tipo": "INFORMATIVO",
            "texto": "Aviso de prueba",
            "url_adjunto": "http://sitio-malo.com/premio",
        },
    )
    assert response.status_code == 422


def test_crear_contenido_con_video_que_no_es_youtube_devuelve_422(
    client: TestClient, admin_sistema_auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/contenido-educativo",
        headers=admin_sistema_auth_headers,
        json={
            "modulo_categoria": "Separación en la fuente",
            "titulo_tema": "Tema de prueba",
            "cuerpo_texto": "Cuerpo de prueba con suficiente longitud.",
            "url_video": "https://sitio-malo.com/video",
        },
    )
    assert response.status_code == 422


def test_subida_de_mas_de_5_mb_devuelve_400(
    client: TestClient, admin_conjunto_auth_headers: dict[str, str]
) -> None:
    grande = io.BytesIO(b"\0" * (TAMANO_MAXIMO_BYTES + 10))
    response = client.post(
        "/api/v1/uploads/adjunto",
        headers=admin_conjunto_auth_headers,
        files={"archivo": ("grande.png", grande, "image/png")},
    )
    assert response.status_code == 400
    assert "5 MB" in response.json()["detail"]
