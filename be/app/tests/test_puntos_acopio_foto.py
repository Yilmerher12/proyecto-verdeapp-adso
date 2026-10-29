"""
Módulo: tests/test_puntos_acopio_foto.py
Descripción: Pruebas de la foto de un punto de acopio: se guarda al crear y editar,
             solo acepta imágenes subidas a la app, la ven Residentes y Recicladores
             en el Directorio, y la limpieza de adjuntos no la borra.
¿Para qué? Una foto que no sea de la propia app dejaría rastrear a quien abre la ficha;
           y una foto en uso que la limpieza borre se vería rota.
"""

import os
import time

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.limpiar_adjuntos import limpiar
from app.models.localidad import Localidad
from app.models.punto_acopio import PuntoAcopio

BASE = "/api/v1/admin/puntos-acopio"
DIRECTORIO = "/api/v1/directorio/puntos-acopio"
FOTO = "/uploads/adjuntos/0b9c1a0e-3f4d-4c52-9b57-6f1f2a3b4c5d.png"
OTRA_FOTO = "/uploads/adjuntos/7d1e2f3a-4b5c-4d6e-8f70-a1b2c3d4e5f6.jpg"
DOS_DIAS = 2 * 24 * 3600


def _payload(localidad: Localidad, **cambios) -> dict:
    datos = {"nombre": "ECA Con Foto", "direccion": "Calle 1 # 1-1", "id_localidad": localidad.id_localidad}
    datos.update(cambios)
    return datos


class TestFotoAlCrearYEditar:
    def test_crear_con_foto_la_devuelve(self, client: TestClient, admin_sistema_auth_headers, localidad_test: Localidad):
        respuesta = client.post(BASE, headers=admin_sistema_auth_headers, json=_payload(localidad_test, url_foto=FOTO))

        assert respuesta.status_code == 201
        assert respuesta.json()["url_foto"] == FOTO
        listado = client.get(BASE, headers=admin_sistema_auth_headers).json()
        assert [p["url_foto"] for p in listado] == [FOTO]

    def test_la_foto_es_opcional(self, client: TestClient, admin_sistema_auth_headers, localidad_test: Localidad):
        respuesta = client.post(BASE, headers=admin_sistema_auth_headers, json=_payload(localidad_test))

        assert respuesta.status_code == 201
        assert respuesta.json()["url_foto"] is None

    def test_una_foto_vacia_cuenta_como_sin_foto(
        self, client: TestClient, admin_sistema_auth_headers, localidad_test: Localidad
    ):
        respuesta = client.post(BASE, headers=admin_sistema_auth_headers, json=_payload(localidad_test, url_foto=""))

        assert respuesta.status_code == 201
        assert respuesta.json()["url_foto"] is None

    def test_editar_cambia_la_foto(
        self, client: TestClient, admin_sistema_auth_headers, punto_acopio_test: PuntoAcopio, localidad_test: Localidad
    ):
        url = f"{BASE}/{punto_acopio_test.id_punto_acopio}"
        client.put(url, headers=admin_sistema_auth_headers, json=_payload(localidad_test, url_foto=FOTO))

        editado = client.put(url, headers=admin_sistema_auth_headers, json=_payload(localidad_test, url_foto=OTRA_FOTO))

        assert editado.status_code == 200
        assert editado.json()["url_foto"] == OTRA_FOTO

    def test_editar_sin_foto_la_quita(
        self, client: TestClient, admin_sistema_auth_headers, punto_acopio_test: PuntoAcopio, localidad_test: Localidad
    ):
        url = f"{BASE}/{punto_acopio_test.id_punto_acopio}"
        client.put(url, headers=admin_sistema_auth_headers, json=_payload(localidad_test, url_foto=FOTO))

        editado = client.put(url, headers=admin_sistema_auth_headers, json=_payload(localidad_test, url_foto=None))

        assert editado.status_code == 200
        assert editado.json()["url_foto"] is None

    def test_la_foto_solo_acepta_imagenes_subidas_a_la_app(
        self, client: TestClient, admin_sistema_auth_headers, localidad_test: Localidad
    ):
        malas = (
            "https://sitio-externo.com/foto.png",
            "/uploads/adjuntos/guia.pdf",
            "/uploads/../secreto.png",
            "/uploads/evidencias/0b9c1a0e-3f4d-4c52-9b57-6f1f2a3b4c5d.png",
            "/uploads/adjuntos/0b9c1a0e-3f4d-4c52-9b57-6f1f2a3b4c5d.gif",
        )
        for mala in malas:
            respuesta = client.post(BASE, headers=admin_sistema_auth_headers, json=_payload(localidad_test, url_foto=mala))
            assert respuesta.status_code == 422, mala

    def test_solo_el_admin_sistema_puede_ponerle_foto(self, client: TestClient, auth_headers, localidad_test: Localidad):
        """auth_headers es de un Residente."""
        respuesta = client.post(BASE, headers=auth_headers, json=_payload(localidad_test, url_foto=FOTO))

        assert respuesta.status_code == 403


class TestFotoEnElDirectorio:
    def test_residentes_y_recicladores_ven_la_foto_del_punto(
        self, client: TestClient, db: Session, auth_headers, punto_acopio_test: PuntoAcopio
    ):
        punto_acopio_test.url_foto = FOTO
        db.commit()

        respuesta = client.get(DIRECTORIO, headers=auth_headers)

        assert respuesta.status_code == 200
        assert [p["url_foto"] for p in respuesta.json()] == [FOTO]

    def test_un_punto_sin_foto_devuelve_url_foto_nula(self, client: TestClient, auth_headers, punto_acopio_test: PuntoAcopio):
        respuesta = client.get(DIRECTORIO, headers=auth_headers)

        assert respuesta.status_code == 200
        assert [p["url_foto"] for p in respuesta.json()] == [None]


class TestLimpiezaDeAdjuntos:
    def _archivo(self, carpeta, nombre: str):
        ruta = carpeta / nombre
        ruta.write_bytes(b"x")
        antes = time.time() - DOS_DIAS
        os.utime(ruta, (antes, antes))
        return ruta

    def test_la_limpieza_conserva_la_foto_de_un_punto(self, db: Session, punto_acopio_test: PuntoAcopio, tmp_path):
        foto = self._archivo(tmp_path, FOTO.rsplit("/", 1)[-1])
        punto_acopio_test.url_foto = FOTO
        db.commit()

        assert limpiar(db, tmp_path, simular=False) == []
        assert foto.exists()

    def test_la_limpieza_borra_la_foto_que_ya_ningun_punto_usa(self, db: Session, punto_acopio_test: PuntoAcopio, tmp_path):
        """Reemplazar o quitar la foto de un punto deja el archivo viejo sin uso."""
        vieja = self._archivo(tmp_path, FOTO.rsplit("/", 1)[-1])
        punto_acopio_test.url_foto = OTRA_FOTO
        db.commit()

        assert limpiar(db, tmp_path, simular=False) == [vieja]
        assert not vieja.exists()
