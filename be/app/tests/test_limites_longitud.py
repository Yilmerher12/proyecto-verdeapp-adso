"""
Módulo: tests/test_limites_longitud.py
Descripción: Issue #352 — límites de longitud de los formularios de administración.

¿Qué? Cada caso manda un texto con UN carácter más que el máximo y espera
      rechazo; y el texto justo en el máximo, que pase.
¿Para qué? Antes un texto que no cabía en la columna llegaba a la base de
          datos y fallaba con un 500 poco claro. FastAPI convierte todo error
          de estos esquemas en un 422, así que basta probar el esquema; las
          pruebas de API de abajo lo confirman de punta a punta.
"""

import pytest
from fastapi.testclient import TestClient
from pydantic import BaseModel, ValidationError

from app.schemas.auditoria_conjunto import DESCRIPCION_MAX_LENGTH, TEMA_MAX_LENGTH
from app.schemas.comunicado import CrearComunicadoRequest, EditarComunicadoRequest
from app.schemas.conjunto_panel import EditarConjuntoRequest
from app.schemas.contenido_educativo import ContenidoEducativoCreate, ContenidoEducativoUpdate
from app.schemas.desvinculacion import ResolverSolicitudDesvinculacionRequest, SolicitarDesvinculacionRequest
from app.schemas.novedad import CrearNovedadRequest, EditarNovedadRequest
from app.schemas.puntos_acopio import PuntoAcopioCreate, PuntoAcopioUpdate

ID = "00000000-0000-4000-8000-000000000000"
COMUNICADO = {"id_conjunto_residencial": ID, "destinatarios": "AMBOS", "tipo": "INFORMATIVO", "texto": "Aviso"}
NOVEDAD = {"alcance": "TODOS", "texto": "Aviso"}
CONTENIDO = {"modulo_categoria": "Plásticos", "titulo_tema": "Cómo separar", "cuerpo_texto": "x" * 20}
PUNTO = {"nombre": "Punto", "direccion": "Calle 1", "id_localidad": 1}

# (esquema, datos válidos, campo, máximo, texto base: "a" o un enlace válido)
CASOS = [
    (CrearComunicadoRequest, COMUNICADO, "texto", 2000, "a"),
    (EditarComunicadoRequest, COMUNICADO, "texto", 2000, "a"),
    (CrearComunicadoRequest, COMUNICADO, "url_adjunto", 500, "https://x.co/"),
    (CrearNovedadRequest, NOVEDAD, "texto", 2000, "a"),
    (EditarNovedadRequest, NOVEDAD, "texto", 2000, "a"),
    (CrearNovedadRequest, NOVEDAD, "url_video", 500, "https://youtu.be/"),
    (EditarNovedadRequest, NOVEDAD, "url_adjunto", 500, "https://x.co/"),
    (ContenidoEducativoCreate, CONTENIDO, "modulo_categoria", 255, "a"),
    (ContenidoEducativoCreate, CONTENIDO, "titulo_tema", 255, "a"),
    (ContenidoEducativoUpdate, CONTENIDO, "cuerpo_texto", 10000, "a"),
    (ContenidoEducativoCreate, CONTENIDO, "url_video", 500, "https://youtu.be/"),
    (ContenidoEducativoUpdate, CONTENIDO, "url_guia", 500, "https://x.co/"),
    (PuntoAcopioCreate, PUNTO, "nombre", 200, "a"),
    (PuntoAcopioCreate, PUNTO, "direccion", 255, "a"),
    (PuntoAcopioUpdate, PUNTO, "nombre_encargado", 100, "a"),
    (PuntoAcopioUpdate, PUNTO, "telefono_contacto", 15, "1"),
    (EditarConjuntoRequest, {}, "nit", 50, "1"),
    (SolicitarDesvinculacionRequest, {}, "motivo", 1000, "a"),
    (ResolverSolicitudDesvinculacionRequest, {"aprobar": False}, "motivo_rechazo", 1000, "a"),
]


def _texto(base: str, largo: int) -> str:
    return base + "a" * (largo - len(base))


@pytest.mark.parametrize("esquema, datos, campo, maximo, base", CASOS)
def test_texto_en_el_maximo_pasa_y_uno_mas_se_rechaza(
    esquema: type[BaseModel], datos: dict, campo: str, maximo: int, base: str
) -> None:
    esquema(**{**datos, campo: _texto(base, maximo)})

    with pytest.raises(ValidationError):
        esquema(**{**datos, campo: _texto(base, maximo + 1)})


def test_api_comunicado_demasiado_largo_devuelve_422(
    client: TestClient, admin_conjunto_auth_headers: dict[str, str], conjunto_verificado
) -> None:
    respuesta = client.post(
        "/api/v1/comunicados",
        headers=admin_conjunto_auth_headers,
        json={
            **COMUNICADO,
            "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
            "texto": "a" * 2001,
        },
    )

    assert respuesta.status_code == 422


@pytest.mark.parametrize("campo, maximo", [("tema_educativo", TEMA_MAX_LENGTH), ("descripcion", DESCRIPCION_MAX_LENGTH)])
def test_api_auditoria_demasiado_larga_devuelve_422(
    client: TestClient, reciclador_auth_headers: dict[str, str], conjunto_verificado, campo: str, maximo: int
) -> None:
    """La auditoría llega como Form, no como JSON: el límite vive en el router."""
    datos = {
        "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
        "nivel_desempeno": "BUENA",
        "tema_educativo": "Plásticos",
        campo: "a" * (maximo + 1),
    }

    respuesta = client.post(
        "/api/v1/auditorias-conjunto",
        headers=reciclador_auth_headers,
        data=datos,
        files={"evidencias": ("a.png", b"no-importa", "image/png")},
    )

    assert respuesta.status_code == 422
