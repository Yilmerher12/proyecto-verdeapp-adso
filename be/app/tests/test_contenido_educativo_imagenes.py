"""
Módulo: tests/test_contenido_educativo_imagenes.py
Descripción: Pruebas de la imagen de portada y de las imágenes dentro del texto
             de un módulo educativo, y de que la limpieza de adjuntos no las borre.
¿Para qué? Una imagen que no sea de la propia app dejaría rastrear a quien abre
           la lección; y una imagen en uso que la limpieza borre se vería rota.
"""

import os
import time
from datetime import date

from fastapi.testclient import TestClient

from app.limpiar_adjuntos import limpiar
from app.models.contenido_educativo import ContenidoEducativo

URL = "/api/v1/contenido-educativo"
IMAGEN = "/uploads/adjuntos/0b9c1a0e-3f4d-4c52-9b57-6f1f2a3b4c5d.png"
OTRA_IMAGEN = "/uploads/adjuntos/7d1e2f3a-4b5c-4d6e-8f70-a1b2c3d4e5f6.jpg"


def _payload(**cambios):
    datos = {
        "modulo_categoria": "Separación en la fuente",
        "titulo_tema": "Código de colores de bolsas",
        "cuerpo_texto": "Blanco: aprovechables. Negro: no aprovechables. Verde: orgánicos.",
    }
    datos.update(cambios)
    return datos


def _crear(client: TestClient, headers: dict[str, str], **cambios) -> str:
    respuesta = client.post(URL, json=_payload(**cambios), headers=headers)
    assert respuesta.status_code == 201, respuesta.text
    return respuesta.json()["id_contenido"]


class TestImagenes:
    def test_se_guarda_y_se_devuelve_la_imagen_de_portada(
        self, client: TestClient, auth_headers, admin_sistema_auth_headers
    ):
        _crear(client, admin_sistema_auth_headers, url_imagen=IMAGEN)

        modulos = client.get(URL, headers=auth_headers).json()
        assert modulos[0]["url_imagen"] == IMAGEN

    def test_la_portada_se_puede_cambiar_al_editar(self, client: TestClient, admin_sistema_auth_headers):
        contenido = _crear(client, admin_sistema_auth_headers, url_imagen=IMAGEN)

        editado = client.put(
            f"{URL}/{contenido}", json=_payload(url_imagen=OTRA_IMAGEN), headers=admin_sistema_auth_headers
        )

        assert editado.status_code == 200
        assert editado.json()["url_imagen"] == OTRA_IMAGEN

    def test_la_portada_es_opcional_y_se_puede_quitar(self, client: TestClient, admin_sistema_auth_headers):
        contenido = _crear(client, admin_sistema_auth_headers, url_imagen=IMAGEN)

        editado = client.put(f"{URL}/{contenido}", json=_payload(url_imagen=None), headers=admin_sistema_auth_headers)

        assert editado.status_code == 200
        assert editado.json()["url_imagen"] is None

    def test_un_modulo_sin_portada_sigue_funcionando(self, client: TestClient, admin_sistema_auth_headers):
        respuesta = client.post(URL, json=_payload(), headers=admin_sistema_auth_headers)

        assert respuesta.status_code == 201
        assert respuesta.json()["url_imagen"] is None

    def test_la_portada_solo_acepta_imagenes_subidas_a_la_app(self, client: TestClient, admin_sistema_auth_headers):
        malas = (
            "https://sitio-externo.com/foto.png",
            "/uploads/adjuntos/guia.pdf",
            "/uploads/../secreto.png",
            "/uploads/evidencias/0b9c1a0e-3f4d-4c52-9b57-6f1f2a3b4c5d.png",
            "/uploads/adjuntos/0b9c1a0e-3f4d-4c52-9b57-6f1f2a3b4c5d.gif",
        )
        for malo in malas:
            respuesta = client.post(URL, json=_payload(url_imagen=malo), headers=admin_sistema_auth_headers)
            assert respuesta.status_code == 422, malo

    def test_las_imagenes_dentro_del_texto_pueden_ser_propias(self, client: TestClient, admin_sistema_auth_headers):
        texto = (
            f"![bolsa blanca]({IMAGEN})\n\n**Bolsa blanca:** material limpio y seco.\n\n"
            f"![bolsa negra]({OTRA_IMAGEN})\n\n**Bolsa negra:** ordinarios."
        )
        respuesta = client.post(URL, json=_payload(cuerpo_texto=texto), headers=admin_sistema_auth_headers)
        assert respuesta.status_code == 201

    def test_una_imagen_externa_dentro_del_texto_se_rechaza(self, client: TestClient, admin_sistema_auth_headers):
        texto = "Texto normal.\n\n![rastreo](https://sitio-malo.com/pixel.png)\n\nMás texto del módulo."
        respuesta = client.post(URL, json=_payload(cuerpo_texto=texto), headers=admin_sistema_auth_headers)
        assert respuesta.status_code == 422

    def test_una_imagen_externa_mezclada_con_una_propia_tambien_se_rechaza(
        self, client: TestClient, admin_sistema_auth_headers
    ):
        texto = f"![ok]({IMAGEN})\n\nUn párrafo de por medio.\n\n![mala](https://sitio-malo.com/pixel.png)"
        respuesta = client.post(URL, json=_payload(cuerpo_texto=texto), headers=admin_sistema_auth_headers)
        assert respuesta.status_code == 422

    def test_una_imagen_externa_dentro_del_texto_se_rechaza_tambien_al_editar(
        self, client: TestClient, admin_sistema_auth_headers
    ):
        contenido = _crear(client, admin_sistema_auth_headers)
        texto = "Texto normal.\n\n![rastreo](//sitio-malo.com/pixel.png)\n\nMás texto del módulo."

        respuesta = client.put(f"{URL}/{contenido}", json=_payload(cuerpo_texto=texto), headers=admin_sistema_auth_headers)

        assert respuesta.status_code == 422


class TestLimpiezaDeAdjuntos:
    def _archivo_viejo(self, carpeta, nombre):
        archivo = carpeta / nombre
        archivo.write_bytes(b"x")
        antes = time.time() - 3 * 24 * 3600
        os.utime(archivo, (antes, antes))
        return archivo

    def test_la_imagen_escrita_dentro_del_texto_cuenta_como_en_uso(self, db, tmp_path):
        usada = self._archivo_viejo(tmp_path, OTRA_IMAGEN.rsplit("/", 1)[-1])
        huerfana = self._archivo_viejo(tmp_path, "11111111-2222-4333-8444-555555555555.png")
        db.add(
            ContenidoEducativo(
                modulo_categoria="Separación en la fuente",
                titulo_tema="Código de colores",
                cuerpo_texto=f"Texto largo del módulo.\n\n![bolsa]({OTRA_IMAGEN})\n\nMás texto.",
                fecha_publicacion=date.today(),
            )
        )
        db.commit()

        sobrantes = limpiar(db, tmp_path, simular=True)

        assert sobrantes == [huerfana]
        assert usada.exists()

    def test_la_portada_cuenta_como_en_uso(self, db, tmp_path):
        usada = self._archivo_viejo(tmp_path, IMAGEN.rsplit("/", 1)[-1])
        huerfana = self._archivo_viejo(tmp_path, "11111111-2222-4333-8444-555555555555.png")
        db.add(
            ContenidoEducativo(
                modulo_categoria="Separación en la fuente",
                titulo_tema="Código de colores",
                cuerpo_texto="Texto largo del módulo sin imágenes dentro.",
                url_imagen=IMAGEN,
                fecha_publicacion=date.today(),
            )
        )
        db.commit()

        sobrantes = limpiar(db, tmp_path, simular=True)

        assert sobrantes == [huerfana]
        assert usada.exists()
