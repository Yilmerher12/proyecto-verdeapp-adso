"""
Módulo: tests/test_puntos_acopio_paginacion.py
Descripción: Pruebas del listado paginado de puntos de acopio (directorio y panel del Admin
             Sistema), de su búsqueda sin tildes, del resumen y de la importación del
             inventario de ECA de la UAESP (issue #664).
"""

import csv

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import seed
from app.models.localidad import Localidad
from app.models.punto_acopio import PuntoAcopio

DIRECTORIO = "/api/v1/directorio/puntos-acopio"
ADMIN = "/api/v1/admin/puntos-acopio"


def _punto(db: Session, localidad: Localidad, nombre: str = "ECA", direccion: str = "Calle 1 # 1-1", **extra) -> PuntoAcopio:
    punto = PuntoAcopio(id_localidad=localidad.id_localidad, nombre=nombre, direccion=direccion, **extra)
    db.add(punto)
    db.commit()
    return punto


class TestDirectorioPaginado:
    def test_devuelve_la_pagina_pedida_y_el_total(self, client: TestClient, db: Session, auth_headers, localidad_test):
        for i in range(5):
            _punto(db, localidad_test, nombre=f"ECA {i}")

        respuesta = client.get(DIRECTORIO, params={"limit": 2, "offset": 2}, headers=auth_headers)

        assert respuesta.status_code == 200
        assert respuesta.json()["total"] == 5
        assert [p["nombre"] for p in respuesta.json()["items"]] == ["ECA 2", "ECA 3"]

    def test_con_nombres_repetidos_las_paginas_no_repiten_ni_saltan_filas(
        self, client: TestClient, db: Session, auth_headers, localidad_test
    ):
        """El nombre "ECA" se repite 80 veces en el inventario: el orden no puede quedar con empates."""
        for _ in range(7):
            _punto(db, localidad_test, nombre="ECA")

        ids = []
        for offset in (0, 3, 6):
            pagina = client.get(DIRECTORIO, params={"limit": 3, "offset": offset}, headers=auth_headers).json()
            ids += [p["id_punto_acopio"] for p in pagina["items"]]

        assert len(ids) == 7
        assert len(set(ids)) == 7

    @pytest.mark.parametrize("busqueda", ["engativa", "ENGATIVÁ", "  eca engativá "])
    def test_la_busqueda_ignora_tildes_y_mayusculas(
        self, client: TestClient, db: Session, auth_headers, localidad_test, busqueda
    ):
        _punto(db, localidad_test, nombre="ECA ENGATIVÁ")
        _punto(db, localidad_test, nombre="ECA KENNEDY")

        respuesta = client.get(DIRECTORIO, params={"q": busqueda}, headers=auth_headers).json()

        assert [p["nombre"] for p in respuesta["items"]] == ["ECA ENGATIVÁ"]
        assert respuesta["total"] == 1

    def test_busca_tambien_en_la_direccion_y_en_la_organizacion(
        self, client: TestClient, db: Session, auth_headers, localidad_test
    ):
        _punto(db, localidad_test, nombre="A", direccion="CARRERA 69 K # 79 - 49")
        _punto(db, localidad_test, nombre="B", organizacion="ASOCIACIÓN DE RECICLADORES ECOALIANZA")

        por_direccion = client.get(DIRECTORIO, params={"q": "69 k"}, headers=auth_headers).json()
        por_organizacion = client.get(DIRECTORIO, params={"q": "asociacion ecoalianza"}, headers=auth_headers).json()

        assert [p["nombre"] for p in por_direccion["items"]] == ["A"]
        assert por_organizacion["items"] == []  # las palabras tienen que estar juntas, no sueltas
        assert [p["nombre"] for p in client.get(DIRECTORIO, params={"q": "ecoalianza"}, headers=auth_headers).json()["items"]] == ["B"]

    def test_un_porcentaje_en_la_busqueda_no_es_un_comodin(
        self, client: TestClient, db: Session, auth_headers, localidad_test
    ):
        _punto(db, localidad_test, nombre="ECA UNO")

        respuesta = client.get(DIRECTORIO, params={"q": "%"}, headers=auth_headers).json()

        assert respuesta == {"items": [], "total": 0}

    def test_filtra_por_localidad(self, client: TestClient, db: Session, auth_headers, localidad_test):
        otra = Localidad(nombre_localidad="Kennedy")
        db.add(otra)
        db.commit()
        _punto(db, localidad_test, nombre="EN USAQUÉN")
        _punto(db, otra, nombre="EN KENNEDY")

        respuesta = client.get(DIRECTORIO, params={"localidad_id": otra.id_localidad}, headers=auth_headers).json()

        assert [p["nombre"] for p in respuesta["items"]] == ["EN KENNEDY"]

    def test_no_cuenta_los_puntos_dados_de_baja(self, client: TestClient, db: Session, auth_headers, localidad_test):
        _punto(db, localidad_test, nombre="ACTIVO")
        _punto(db, localidad_test, nombre="DE BAJA", activo=False)

        respuesta = client.get(DIRECTORIO, headers=auth_headers).json()

        assert [p["nombre"] for p in respuesta["items"]] == ["ACTIVO"]
        assert respuesta["total"] == 1

    def test_devuelve_organizacion_y_correo(self, client: TestClient, db: Session, auth_headers, localidad_test):
        _punto(db, localidad_test, organizacion="ASORECICLADORES", correo_contacto="eca@example.com")

        punto = client.get(DIRECTORIO, headers=auth_headers).json()["items"][0]

        assert punto["organizacion"] == "ASORECICLADORES"
        assert punto["correo_contacto"] == "eca@example.com"

    @pytest.mark.parametrize("params", [{"limit": 0}, {"limit": 101}, {"offset": -1}])
    def test_rechaza_limit_y_offset_fuera_de_rango(self, client: TestClient, auth_headers, params):
        assert client.get(DIRECTORIO, params=params, headers=auth_headers).status_code == 422


class TestAdminPaginado:
    def test_filtra_por_estado(self, client: TestClient, db: Session, admin_sistema_auth_headers, localidad_test):
        _punto(db, localidad_test, nombre="ACTIVO")
        _punto(db, localidad_test, nombre="DE BAJA", activo=False)

        def nombres(estado: str) -> list[str]:
            r = client.get(ADMIN, params={"estado": estado}, headers=admin_sistema_auth_headers).json()
            return [p["nombre"] for p in r["items"]]

        assert nombres("todos") == ["ACTIVO", "DE BAJA"]
        assert nombres("activos") == ["ACTIVO"]
        assert nombres("baja") == ["DE BAJA"]

    def test_un_estado_desconocido_devuelve_422(self, client: TestClient, admin_sistema_auth_headers):
        assert client.get(ADMIN, params={"estado": "otro"}, headers=admin_sistema_auth_headers).status_code == 422

    def test_filtra_por_localidad_y_por_texto_a_la_vez(
        self, client: TestClient, db: Session, admin_sistema_auth_headers, localidad_test
    ):
        otra = Localidad(nombre_localidad="Kennedy")
        db.add(otra)
        db.commit()
        _punto(db, localidad_test, nombre="ECA ENGATIVÁ")
        _punto(db, otra, nombre="ECA ENGATIVÁ")

        respuesta = client.get(
            ADMIN, params={"id_localidad": otra.id_localidad, "q": "engativa"}, headers=admin_sistema_auth_headers
        ).json()

        assert respuesta["total"] == 1
        assert respuesta["items"][0]["nombre_localidad"] == "Kennedy"

    def test_pagina_con_limit_y_offset(self, client: TestClient, db: Session, admin_sistema_auth_headers, localidad_test):
        for i in range(5):
            _punto(db, localidad_test, nombre=f"ECA {i}")

        respuesta = client.get(ADMIN, params={"limit": 2, "offset": 4}, headers=admin_sistema_auth_headers).json()

        assert respuesta["total"] == 5
        assert [p["nombre"] for p in respuesta["items"]] == ["ECA 4"]

    def test_resumen_cuenta_todo_sin_filtros(
        self, client: TestClient, db: Session, admin_sistema_auth_headers, localidad_test
    ):
        otra = Localidad(nombre_localidad="Kennedy")
        sin_puntos = Localidad(nombre_localidad="Sumapaz")
        db.add_all([otra, sin_puntos])
        db.commit()
        _punto(db, localidad_test)
        _punto(db, otra)
        _punto(db, otra, activo=False)

        resumen = client.get(f"{ADMIN}/resumen", headers=admin_sistema_auth_headers).json()

        assert (resumen["total"], resumen["activos"], resumen["de_baja"]) == (3, 2, 1)
        assert [loc["nombre_localidad"] for loc in resumen["localidades"]] == ["Kennedy", "Usaquén"]

    def test_resumen_exige_ser_admin_del_sistema(self, client: TestClient, auth_headers):
        assert client.get(f"{ADMIN}/resumen").status_code == 401
        assert client.get(f"{ADMIN}/resumen", headers=auth_headers).status_code == 403

    def test_editar_no_borra_los_datos_del_inventario(
        self, client: TestClient, db: Session, admin_sistema_auth_headers, localidad_test
    ):
        punto = _punto(
            db, localidad_test, numero_resolucion="12", organizacion="ASORECICLADORES",
            correo_contacto="eca@example.com", latitud=4.6, longitud=-74.1,
        )

        respuesta = client.put(
            f"{ADMIN}/{punto.id_punto_acopio}",
            headers=admin_sistema_auth_headers,
            json={"nombre": "RENOMBRADA", "direccion": "Calle 2", "id_localidad": localidad_test.id_localidad},
        )

        assert respuesta.status_code == 200
        db.refresh(punto)
        assert (punto.numero_resolucion, punto.organizacion, punto.correo_contacto) == ("12", "ASORECICLADORES", "eca@example.com")
        assert float(punto.latitud) == 4.6
        assert respuesta.json()["organizacion"] == "ASORECICLADORES"


def _crear_localidades(db: Session) -> None:
    db.add_all(Localidad(id_localidad=i, nombre_localidad=f"Localidad {i}") for i in range(1, 21))
    db.commit()


class TestCsvDelInventario:
    """El CSV que se sube al repositorio: si alguien lo edita mal, la siembra falla aquí y no en la base."""

    def _filas(self) -> list[dict]:
        with seed.ECA_CSV.open(encoding="utf-8", newline="") as archivo:
            return list(csv.DictReader(archivo, delimiter=";"))

    def test_trae_las_799_eca_con_codigo_unico(self):
        filas = self._filas()

        assert len(filas) == 799
        assert len({f["numero_resolucion"] for f in filas}) == 799

    def test_cada_fila_tiene_lo_que_el_modelo_exige(self):
        for f in self._filas():
            assert f["nombre"] and f["direccion"], f
            assert 1 <= int(f["id_localidad"]) <= 20, f
            assert 4.0 < float(f["latitud"]) < 5.0 and -75.0 < float(f["longitud"]) < -73.0, f
            assert len(f["nombre"]) <= 200 and len(f["direccion"]) <= 255 and len(f["organizacion"]) <= 300, f

    def test_no_lleva_correos(self):
        """Los correos van en otro archivo que no se sube al repositorio (repositorio público)."""
        assert "correo" not in self._filas()[0]


class TestImportarInventario:
    def _contar(self, db: Session) -> int:
        return db.scalar(select(func.count()).select_from(PuntoAcopio))

    def test_carga_las_799_eca(self, db: Session):
        _crear_localidades(db)

        seed.importar_eca_inventario(db.connection())

        assert self._contar(db) == 799
        eca = db.scalar(select(PuntoAcopio).where(PuntoAcopio.numero_resolucion == "1"))
        assert eca.activo is True
        assert eca.organizacion
        assert eca.correo_contacto is None or "@" in eca.correo_contacto

    def test_correrla_dos_veces_no_duplica_ni_pisa_lo_editado(self, db: Session):
        _crear_localidades(db)
        seed.importar_eca_inventario(db.connection())
        eca = db.scalar(select(PuntoAcopio).where(PuntoAcopio.numero_resolucion == "1"))
        eca.nombre = "EDITADO POR EL ADMIN"
        db.commit()

        seed.importar_eca_inventario(db.connection())

        assert self._contar(db) == 799
        db.refresh(eca)
        assert eca.nombre == "EDITADO POR EL ADMIN"

    def test_los_correos_rellenan_solo_los_vacios(self, db: Session, tmp_path, monkeypatch):
        _crear_localidades(db)
        archivo = tmp_path / "correos.csv"
        archivo.write_text("numero_resolucion;correo\n1;nuevo@example.com\n2;otro@example.com\n", encoding="utf-8")
        monkeypatch.setattr(seed, "ECA_CORREOS_CSV", archivo)
        seed.importar_eca_inventario(db.connection())
        ya_con_correo = db.scalar(select(PuntoAcopio).where(PuntoAcopio.numero_resolucion == "2"))
        ya_con_correo.correo_contacto = "del-admin@example.com"
        db.commit()

        seed.importar_eca_inventario(db.connection())

        uno = db.scalar(select(PuntoAcopio).where(PuntoAcopio.numero_resolucion == "1"))
        db.refresh(ya_con_correo)
        assert uno.correo_contacto == "nuevo@example.com"
        assert ya_con_correo.correo_contacto == "del-admin@example.com"

    def test_sin_archivo_de_correos_importa_igual(self, db: Session, tmp_path, monkeypatch):
        _crear_localidades(db)
        monkeypatch.setattr(seed, "ECA_CORREOS_CSV", tmp_path / "no-existe.csv")

        seed.importar_eca_inventario(db.connection())

        assert self._contar(db) == 799
        assert db.scalar(select(func.count()).select_from(PuntoAcopio).where(PuntoAcopio.correo_contacto.is_not(None))) == 0
