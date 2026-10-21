"""
Módulo: tests/test_agenda_conjunto.py
Descripción: Pruebas de la agenda interna del Admin de Conjunto — crear,
             listar, dejar en espera y borrar. Nunca llega al Admin Sistema.
"""
import csv
import io
from datetime import datetime, timezone
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfReader
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.config import settings
from app.models.agenda_conjunto import AgendaConjunto
from app.models.conjunto_residencial import ConjuntoResidencial
from app.tests.conftest import ADMIN_CONJUNTO_APELLIDOS, ADMIN_CONJUNTO_EMAIL, ADMIN_CONJUNTO_NOMBRE
from app.utils.pdf_agenda import texto_para_pdf

BASE = "/api/v1/conjunto-panel/mis-conjuntos"
BASE_ADMIN = "/api/v1/admin-conjunto"


def _url(conjunto: ConjuntoResidencial, extra: str = "") -> str:
    return f"{BASE}/{conjunto.id_conjunto_residencial}/agenda{extra}"


class TestCrearYListar:
    def test_crea_y_lista_un_tema(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        response = client.post(_url(conjunto_verificado), headers=admin_conjunto_auth_headers, json={"texto": "Arreglar la puerta del sótano."})
        assert response.status_code == 201
        assert response.json()["estado"] == "PENDIENTE"

        lista = client.get(_url(conjunto_verificado), headers=admin_conjunto_auth_headers).json()
        assert [t["texto"] for t in lista] == ["Arreglar la puerta del sótano."]

    def test_guarda_la_foto_de_soporte(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        client.post(
            _url(conjunto_verificado),
            headers=admin_conjunto_auth_headers,
            json={"texto": "Pintar el pasillo.", "url_evidencia": "/uploads/adjuntos/pasillo.jpg"},
        )
        lista = client.get(_url(conjunto_verificado), headers=admin_conjunto_auth_headers).json()
        assert lista[0]["url_evidencia"] == "/uploads/adjuntos/pasillo.jpg"

    @pytest.mark.parametrize("url", ["@sitio-malo.com/login", "http://sitio-malo.com/f.jpg", "javascript:alert(1)"])
    def test_rechaza_enlace_de_foto_no_permitido(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado, url):
        """Issue #369 (CN-041): solo /uploads/... o https://."""
        response = client.post(_url(conjunto_verificado), headers=admin_conjunto_auth_headers, json={"texto": "x", "url_evidencia": url})
        assert response.status_code == 422

    def test_exige_texto(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        assert client.post(_url(conjunto_verificado), headers=admin_conjunto_auth_headers, json={"texto": ""}).status_code == 422

    def test_lista_primero_el_tema_mas_reciente(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        client.post(_url(conjunto_verificado), headers=admin_conjunto_auth_headers, json={"texto": "Viejo"})
        client.post(_url(conjunto_verificado), headers=admin_conjunto_auth_headers, json={"texto": "Nuevo"})

        textos = [t["texto"] for t in client.get(_url(conjunto_verificado), headers=admin_conjunto_auth_headers).json()]
        assert textos == ["Nuevo", "Viejo"]

    def test_conjunto_ajeno_devuelve_403(self, client: TestClient, admin_conjunto_auth_headers):
        url = f"{BASE}/00000000-0000-0000-0000-000000000000/agenda"
        assert client.get(url, headers=admin_conjunto_auth_headers).status_code == 403
        assert client.get(f"{url}/archivadas", headers=admin_conjunto_auth_headers).status_code == 403
        assert client.post(url, headers=admin_conjunto_auth_headers, json={"texto": "x"}).status_code == 403

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers, conjunto_verificado):
        assert client.get(_url(conjunto_verificado), headers=auth_headers).status_code == 403

    def test_nunca_aparece_en_la_bandeja_del_admin_sistema(
        self, client: TestClient, admin_sistema_auth_headers, admin_conjunto_auth_headers, conjunto_verificado
    ):
        client.post(_url(conjunto_verificado), headers=admin_conjunto_auth_headers, json={"texto": "Privado"})
        assert client.get(f"{BASE_ADMIN}/solicitudes", headers=admin_sistema_auth_headers).json()["items"] == []


class TestEstadoYBorrar:
    def _crear(self, client, headers, conjunto) -> str:
        return client.post(_url(conjunto), headers=headers, json={"texto": "Tema"}).json()["id"]

    def test_archiva_un_tema_y_sale_de_por_tratar(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        id_item = self._crear(client, admin_conjunto_auth_headers, conjunto_verificado)
        r = client.patch(_url(conjunto_verificado, f"/{id_item}"), headers=admin_conjunto_auth_headers, json={"estado": "ARCHIVADA"})
        assert r.status_code == 200
        assert r.json()["estado"] == "ARCHIVADA"
        assert r.json()["archivado_en"] is not None

        assert client.get(_url(conjunto_verificado), headers=admin_conjunto_auth_headers).json() == []
        archivadas = client.get(_url(conjunto_verificado, "/archivadas"), headers=admin_conjunto_auth_headers).json()
        assert [t["id"] for t in archivadas["items"]] == [id_item]
        assert archivadas["total"] == 1

    def test_restaura_un_tema_archivado_y_pierde_la_fecha_de_archivado(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        id_item = self._crear(client, admin_conjunto_auth_headers, conjunto_verificado)
        client.patch(_url(conjunto_verificado, f"/{id_item}"), headers=admin_conjunto_auth_headers, json={"estado": "ARCHIVADA"})
        r = client.patch(_url(conjunto_verificado, f"/{id_item}"), headers=admin_conjunto_auth_headers, json={"estado": "PENDIENTE"})
        assert r.json()["estado"] == "PENDIENTE"
        assert r.json()["archivado_en"] is None

        assert [t["id"] for t in client.get(_url(conjunto_verificado), headers=admin_conjunto_auth_headers).json()] == [id_item]
        archivadas = client.get(_url(conjunto_verificado, "/archivadas"), headers=admin_conjunto_auth_headers).json()
        assert archivadas == {"items": [], "total": 0}

    @pytest.mark.parametrize("estado", ["HECHO", "EN_ESPERA"])
    def test_rechaza_un_estado_invalido(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado, estado):
        """EN_ESPERA ya no existe: la tarjeta #435 lo reemplazó por ARCHIVADA."""
        id_item = self._crear(client, admin_conjunto_auth_headers, conjunto_verificado)
        r = client.patch(_url(conjunto_verificado, f"/{id_item}"), headers=admin_conjunto_auth_headers, json={"estado": estado})
        assert r.status_code == 422

    def test_borra_un_tema(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        id_item = self._crear(client, admin_conjunto_auth_headers, conjunto_verificado)
        assert client.delete(_url(conjunto_verificado, f"/{id_item}"), headers=admin_conjunto_auth_headers).status_code == 200
        assert client.get(_url(conjunto_verificado), headers=admin_conjunto_auth_headers).json() == []

    def test_borra_un_tema_archivado(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        id_item = self._crear(client, admin_conjunto_auth_headers, conjunto_verificado)
        client.patch(_url(conjunto_verificado, f"/{id_item}"), headers=admin_conjunto_auth_headers, json={"estado": "ARCHIVADA"})
        assert client.delete(_url(conjunto_verificado, f"/{id_item}"), headers=admin_conjunto_auth_headers).status_code == 200
        assert client.get(_url(conjunto_verificado, "/archivadas"), headers=admin_conjunto_auth_headers).json()["total"] == 0

    def test_borrar_un_tema_que_no_existe_devuelve_404(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        r = client.delete(_url(conjunto_verificado, "/00000000-0000-0000-0000-000000000000"), headers=admin_conjunto_auth_headers)
        assert r.status_code == 404


class TestHistorialArchivado:
    def _archivar(self, client, headers, conjunto, texto: str) -> str:
        id_item = client.post(_url(conjunto), headers=headers, json={"texto": texto}).json()["id"]
        client.patch(_url(conjunto, f"/{id_item}"), headers=headers, json={"estado": "ARCHIVADA"})
        return id_item

    def test_lista_primero_el_ultimo_archivado(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        self._archivar(client, admin_conjunto_auth_headers, conjunto_verificado, "Primero")
        self._archivar(client, admin_conjunto_auth_headers, conjunto_verificado, "Segundo")

        items = client.get(_url(conjunto_verificado, "/archivadas"), headers=admin_conjunto_auth_headers).json()["items"]
        assert [t["texto"] for t in items] == ["Segundo", "Primero"]

    def test_pagina_el_historial_con_limit_y_offset(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        for n in range(3):
            self._archivar(client, admin_conjunto_auth_headers, conjunto_verificado, f"Tema {n}")

        pagina = client.get(_url(conjunto_verificado, "/archivadas?limit=2&offset=2"), headers=admin_conjunto_auth_headers).json()
        assert pagina["total"] == 3
        assert [t["texto"] for t in pagina["items"]] == ["Tema 0"]

    @pytest.mark.parametrize("consulta", ["?limit=0", "?limit=101", "?offset=-1"])
    def test_rechaza_una_paginacion_invalida(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado, consulta):
        r = client.get(_url(conjunto_verificado, f"/archivadas{consulta}"), headers=admin_conjunto_auth_headers)
        assert r.status_code == 422

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers, conjunto_verificado):
        assert client.get(_url(conjunto_verificado, "/archivadas"), headers=auth_headers).status_code == 403


class TestDescargaCsv:
    """HU-049 (issue #479): descarga del historial de la agenda en CSV."""

    def _csv(self, client, headers, conjunto, consulta: str = ""):
        return client.get(_url(conjunto, f"/historial/csv{consulta}"), headers=headers)

    def _filas(self, response) -> list[list[str]]:
        return list(csv.reader(io.StringIO(response.content.decode("utf-8-sig")), delimiter=";"))

    def _crear(self, client, headers, conjunto, texto: str, url_evidencia: str | None = None) -> str:
        return client.post(_url(conjunto), headers=headers, json={"texto": texto, "url_evidencia": url_evidencia}).json()["id"]

    def _archivar(self, client, headers, conjunto, id_item: str) -> None:
        client.patch(_url(conjunto, f"/{id_item}"), headers=headers, json={"estado": "ARCHIVADA"})

    def _fechar(self, db: Session, id_item: str, creado: datetime, archivado: datetime | None = None) -> None:
        db.execute(update(AgendaConjunto).where(AgendaConjunto.id == UUID(id_item)).values(created_at=creado, archivado_en=archivado))
        db.commit()

    def test_descarga_un_csv_listo_para_excel_en_espanol(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        id_item = self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Arreglar la puerta del sótano")
        self._archivar(client, admin_conjunto_auth_headers, conjunto_verificado, id_item)

        response = self._csv(client, admin_conjunto_auth_headers, conjunto_verificado)

        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/csv")
        assert response.headers["content-disposition"].startswith("attachment; filename=")
        # ¿Qué? El BOM y el ";" son lo que hace que Excel en español muestre columnas y tildes bien.
        assert response.content.startswith(b"\xef\xbb\xbf")
        filas = self._filas(response)
        assert filas[0] == ["Tema", "Estado", "Creado", "Archivado", "Autor", "Foto"]
        assert filas[1][0] == "Arreglar la puerta del sótano"
        assert filas[1][1] == "Archivado"
        assert filas[1][2] != "" and filas[1][3] != ""

    def test_el_autor_sale_con_nombre_y_no_con_el_correo(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Tema")

        response = self._csv(client, admin_conjunto_auth_headers, conjunto_verificado)

        assert self._filas(response)[1][4] == f"{ADMIN_CONJUNTO_NOMBRE} {ADMIN_CONJUNTO_APELLIDOS}"
        assert ADMIN_CONJUNTO_EMAIL not in response.content.decode("utf-8-sig")

    def test_sin_temas_devuelve_solo_los_encabezados(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        response = self._csv(client, admin_conjunto_auth_headers, conjunto_verificado)

        assert response.status_code == 200
        assert self._filas(response) == [["Tema", "Estado", "Creado", "Archivado", "Autor", "Foto"]]

    def test_filtra_por_estado(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Sigue pendiente")
        resuelto = self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Ya resuelto")
        self._archivar(client, admin_conjunto_auth_headers, conjunto_verificado, resuelto)

        def textos(consulta: str) -> list[str]:
            return [f[0] for f in self._filas(self._csv(client, admin_conjunto_auth_headers, conjunto_verificado, consulta))[1:]]

        assert textos("?estado=PENDIENTE") == ["Sigue pendiente"]
        assert textos("?estado=ARCHIVADA") == ["Ya resuelto"]
        assert sorted(textos("?estado=TODOS")) == ["Sigue pendiente", "Ya resuelto"]
        assert sorted(textos("")) == ["Sigue pendiente", "Ya resuelto"]

    def test_rechaza_un_estado_invalido(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        assert self._csv(client, admin_conjunto_auth_headers, conjunto_verificado, "?estado=HECHO").status_code == 422

    def test_un_archivado_entra_por_su_fecha_de_archivado_y_un_pendiente_por_su_fecha_de_creacion(
        self, client: TestClient, db: Session, admin_conjunto_auth_headers, conjunto_verificado
    ):
        resuelto = self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "A: creado el 3, archivado el 17")
        self._archivar(client, admin_conjunto_auth_headers, conjunto_verificado, resuelto)
        self._fechar(db, resuelto, datetime(2026, 9, 3, 15, tzinfo=timezone.utc), datetime(2026, 9, 17, 15, tzinfo=timezone.utc))
        pendiente = self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "B: pendiente creado el 20")
        self._fechar(db, pendiente, datetime(2026, 9, 20, 15, tzinfo=timezone.utc))
        viejo = self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "C: pendiente creado el 5")
        self._fechar(db, viejo, datetime(2026, 9, 5, 15, tzinfo=timezone.utc))

        response = self._csv(client, admin_conjunto_auth_headers, conjunto_verificado, "?desde=2026-09-15&hasta=2026-09-30")

        assert [f[0] for f in self._filas(response)[1:]] == ["A: creado el 3, archivado el 17", "B: pendiente creado el 20"]

    def test_los_limites_del_rango_se_leen_en_hora_de_bogota(
        self, client: TestClient, db: Session, admin_conjunto_auth_headers, conjunto_verificado
    ):
        """Creado el domingo 18 oct a las 9:00 p. m. en Bogotá = lunes 19 oct 02:00 en UTC."""
        id_item = self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Domingo en la noche")
        self._fechar(db, id_item, datetime(2026, 10, 19, 2, 0, tzinfo=timezone.utc))

        hasta_domingo = self._csv(client, admin_conjunto_auth_headers, conjunto_verificado, "?hasta=2026-10-18")
        desde_lunes = self._csv(client, admin_conjunto_auth_headers, conjunto_verificado, "?desde=2026-10-19")

        filas = self._filas(hasta_domingo)
        assert [f[0] for f in filas[1:]] == ["Domingo en la noche"]
        assert filas[1][2] == "18/10/2026"
        assert len(self._filas(desde_lunes)) == 1

    def test_rechaza_un_rango_al_reves(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        response = self._csv(client, admin_conjunto_auth_headers, conjunto_verificado, "?desde=2026-10-31&hasta=2026-10-01")

        assert response.status_code == 400

    def test_con_mas_de_500_temas_pide_acotar_el_rango(
        self, client: TestClient, db: Session, admin_conjunto_auth_headers, conjunto_verificado
    ):
        db.add_all(
            [AgendaConjunto(id_conjunto_residencial=conjunto_verificado.id_conjunto_residencial, texto=f"Tema {n}") for n in range(500)]
        )
        db.commit()
        assert self._csv(client, admin_conjunto_auth_headers, conjunto_verificado).status_code == 200

        db.add(AgendaConjunto(id_conjunto_residencial=conjunto_verificado.id_conjunto_residencial, texto="Uno de más"))
        db.commit()
        response = self._csv(client, admin_conjunto_auth_headers, conjunto_verificado)

        assert response.status_code == 400
        assert "500" in response.json()["detail"]

    def test_la_foto_sale_como_enlace_completo(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Con foto subida", "/uploads/adjuntos/pasillo.jpg")
        self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Con foto externa", "https://ejemplo.com/foto.jpg")
        self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Sin foto")

        fotos = {f[0]: f[5] for f in self._filas(self._csv(client, admin_conjunto_auth_headers, conjunto_verificado))[1:]}

        assert fotos["Con foto subida"] == "http://testserver/uploads/adjuntos/pasillo.jpg"
        assert fotos["Con foto externa"] == "https://ejemplo.com/foto.jpg"
        assert fotos["Sin foto"] == ""

    @pytest.mark.parametrize("publica", ["https://verdeapp.com", "https://verdeapp.com/"])
    def test_con_api_public_url_la_foto_usa_esa_direccion(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado, monkeypatch, publica
    ):
        # ¿Qué? Detrás de un proxy request.base_url es la dirección interna; la variable da la pública.
        #       Con barra final no debe salir "//" entre el dominio y "/uploads".
        monkeypatch.setattr(settings, "API_PUBLIC_URL", publica)
        self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Con foto subida", "/uploads/adjuntos/pasillo.jpg")
        self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Con foto externa", "https://ejemplo.com/foto.jpg")

        fotos = {f[0]: f[5] for f in self._filas(self._csv(client, admin_conjunto_auth_headers, conjunto_verificado))[1:]}

        assert fotos["Con foto subida"] == "https://verdeapp.com/uploads/adjuntos/pasillo.jpg"
        assert fotos["Con foto externa"] == "https://ejemplo.com/foto.jpg"

    def test_con_api_public_url_vacia_la_foto_usa_la_direccion_de_la_peticion(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado, monkeypatch
    ):
        monkeypatch.setattr(settings, "API_PUBLIC_URL", "")
        self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Con foto subida", "/uploads/adjuntos/pasillo.jpg")

        filas = self._filas(self._csv(client, admin_conjunto_auth_headers, conjunto_verificado))

        assert filas[1][5] == "http://testserver/uploads/adjuntos/pasillo.jpg"

    @pytest.mark.parametrize("texto", ["=1+1", "+57 300", "-2", "@SUMA(1)"])
    def test_un_texto_que_parece_formula_se_entrega_como_texto(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado, texto
    ):
        self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, texto)

        assert self._filas(self._csv(client, admin_conjunto_auth_headers, conjunto_verificado))[1][0] == "'" + texto

    def test_el_nombre_del_archivo_lleva_el_conjunto_y_el_rango_sin_datos_personales(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        response = self._csv(client, admin_conjunto_auth_headers, conjunto_verificado, "?desde=2026-10-01&hasta=2026-10-31")

        assert 'filename="historial-agenda-torres-de-prueba-2026-10-01_2026-10-31.csv"' in response.headers["content-disposition"]

    def test_no_incluye_los_temas_de_otro_conjunto(
        self, client: TestClient, db: Session, admin_conjunto_auth_headers, conjunto_verificado, conjunto_verificado_sin_admin
    ):
        db.add(AgendaConjunto(id_conjunto_residencial=conjunto_verificado_sin_admin.id_conjunto_residencial, texto="De otro conjunto"))
        db.commit()
        self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Mío")

        assert [f[0] for f in self._filas(self._csv(client, admin_conjunto_auth_headers, conjunto_verificado))[1:]] == ["Mío"]

    def test_conjunto_ajeno_devuelve_403_y_no_genera_archivo(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado_sin_admin):
        response = self._csv(client, admin_conjunto_auth_headers, conjunto_verificado_sin_admin)

        assert response.status_code == 403
        assert "text/csv" not in response.headers["content-type"]

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers, conjunto_verificado):
        assert self._csv(client, auth_headers, conjunto_verificado).status_code == 403


class TestConteoDescarga:
    """HU-049: cuántos temas traería la descarga, antes de descargar."""

    def _conteo(self, client, headers, conjunto, consulta: str = ""):
        return client.get(_url(conjunto, f"/historial/conteo{consulta}"), headers=headers)

    def _crear(self, client, headers, conjunto, texto: str) -> str:
        return client.post(_url(conjunto), headers=headers, json={"texto": texto}).json()["id"]

    def _archivar(self, client, headers, conjunto, id_item: str) -> None:
        client.patch(_url(conjunto, f"/{id_item}"), headers=headers, json={"estado": "ARCHIVADA"})

    def test_sin_temas_responde_cero_y_el_maximo(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        response = self._conteo(client, admin_conjunto_auth_headers, conjunto_verificado)

        assert response.status_code == 200
        assert response.json() == {"total": 0, "maximo": 500}

    def test_coincide_con_las_filas_del_csv_y_del_pdf_para_el_mismo_filtro(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        # ¿Qué? La garantía de la tarjeta: el número de la ventana nunca difiere de lo que se descarga.
        self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Pendiente uno")
        self._archivar(client, admin_conjunto_auth_headers, conjunto_verificado, self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Resuelto dos"))
        self._archivar(client, admin_conjunto_auth_headers, conjunto_verificado, self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Resuelto tres"))

        for consulta, esperado in [
            ("", 3),
            ("?estado=PENDIENTE", 1),
            ("?estado=ARCHIVADA", 2),
            ("?desde=2020-01-01&hasta=2099-12-31", 3),
            ("?desde=2099-01-01", 0),
        ]:
            total = self._conteo(client, admin_conjunto_auth_headers, conjunto_verificado, consulta).json()["total"]
            csv_ = client.get(_url(conjunto_verificado, f"/historial/csv{consulta}"), headers=admin_conjunto_auth_headers)
            filas_csv = list(csv.reader(io.StringIO(csv_.content.decode("utf-8-sig")), delimiter=";"))[1:]
            pdf = client.get(_url(conjunto_verificado, f"/historial/pdf{consulta}"), headers=admin_conjunto_auth_headers)
            texto_pdf = "\n".join(p.extract_text() for p in PdfReader(io.BytesIO(pdf.content)).pages)
            assert total == len(filas_csv) == esperado
            assert f"{total} tema" in texto_pdf

    def test_con_mas_de_500_temas_responde_200_con_el_total_real(
        self, client: TestClient, db: Session, admin_conjunto_auth_headers, conjunto_verificado
    ):
        db.add_all(
            [AgendaConjunto(id_conjunto_residencial=conjunto_verificado.id_conjunto_residencial, texto=f"Tema {n}") for n in range(501)]
        )
        db.commit()

        response = self._conteo(client, admin_conjunto_auth_headers, conjunto_verificado)

        assert response.status_code == 200
        assert response.json() == {"total": 501, "maximo": 500}

    def test_no_cuenta_los_temas_de_otro_conjunto(
        self, client: TestClient, db: Session, admin_conjunto_auth_headers, conjunto_verificado, conjunto_verificado_sin_admin
    ):
        db.add(AgendaConjunto(id_conjunto_residencial=conjunto_verificado_sin_admin.id_conjunto_residencial, texto="Ajeno"))
        db.commit()

        assert self._conteo(client, admin_conjunto_auth_headers, conjunto_verificado).json()["total"] == 0

    def test_rechaza_un_rango_al_reves_y_un_estado_invalido(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        assert self._conteo(client, admin_conjunto_auth_headers, conjunto_verificado, "?desde=2026-10-31&hasta=2026-10-01").status_code == 400
        assert self._conteo(client, admin_conjunto_auth_headers, conjunto_verificado, "?estado=OTRO").status_code == 422

    def test_conjunto_ajeno_devuelve_403(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado_sin_admin):
        assert self._conteo(client, admin_conjunto_auth_headers, conjunto_verificado_sin_admin).status_code == 403

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers, conjunto_verificado):
        assert self._conteo(client, auth_headers, conjunto_verificado).status_code == 403


class TestDescargaPdf:
    """HU-049 (issue #480): descarga del historial de la agenda en PDF."""

    def _pdf(self, client, headers, conjunto, consulta: str = ""):
        return client.get(_url(conjunto, f"/historial/pdf{consulta}"), headers=headers)

    def _csv(self, client, headers, conjunto, consulta: str = ""):
        return client.get(_url(conjunto, f"/historial/csv{consulta}"), headers=headers)

    def _lector(self, response) -> PdfReader:
        return PdfReader(io.BytesIO(response.content))

    def _texto(self, response) -> str:
        return "\n".join(pagina.extract_text() for pagina in self._lector(response).pages)

    def _crear(self, client, headers, conjunto, texto: str, url_evidencia: str | None = None) -> str:
        return client.post(_url(conjunto), headers=headers, json={"texto": texto, "url_evidencia": url_evidencia}).json()["id"]

    def _archivar(self, client, headers, conjunto, id_item: str) -> None:
        client.patch(_url(conjunto, f"/{id_item}"), headers=headers, json={"estado": "ARCHIVADA"})

    def test_descarga_un_pdf_horizontal_con_el_encabezado_y_la_tabla(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        id_item = self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Arreglar la puerta del sótano")
        self._archivar(client, admin_conjunto_auth_headers, conjunto_verificado, id_item)

        response = self._pdf(client, admin_conjunto_auth_headers, conjunto_verificado)

        assert response.status_code == 200
        assert response.content.startswith(b"%PDF-")
        assert response.headers["content-type"] == "application/pdf"
        assert response.headers["content-disposition"].startswith('attachment; filename="historial-agenda-torres-de-prueba-')
        assert response.headers["content-disposition"].endswith('.pdf"')
        lector = self._lector(response)
        assert len(lector.pages) == 1
        assert lector.pages[0].mediabox.width > lector.pages[0].mediabox.height  # hoja horizontal
        texto = self._texto(response)
        for esperado in ["Historial de la agenda - TORRES DE PRUEBA", "Todo el historial", "1 tema", "Página 1 de 1"]:
            assert esperado in texto
        for columna in ["Tema", "Estado", "Creado", "Archivado", "Autor", "Foto"]:
            assert columna in texto
        assert "Arreglar la puerta del sótano" in texto
        assert "Archivado" in texto
        assert f"{ADMIN_CONJUNTO_NOMBRE} {ADMIN_CONJUNTO_APELLIDOS}" in texto
        assert ADMIN_CONJUNTO_EMAIL not in texto

    def test_trae_los_mismos_temas_que_el_csv_para_el_mismo_filtro(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Pendiente uno")
        resuelto = self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Resuelto dos")
        self._archivar(client, admin_conjunto_auth_headers, conjunto_verificado, resuelto)
        self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Pendiente tres")

        for consulta in ["", "?estado=PENDIENTE", "?estado=ARCHIVADA", "?desde=2020-01-01&hasta=2099-12-31"]:
            filas_csv = list(
                csv.reader(
                    io.StringIO(self._csv(client, admin_conjunto_auth_headers, conjunto_verificado, consulta).content.decode("utf-8-sig")),
                    delimiter=";",
                )
            )[1:]
            texto_pdf = self._texto(self._pdf(client, admin_conjunto_auth_headers, conjunto_verificado, consulta))
            assert f"{len(filas_csv)} tema" in texto_pdf
            assert all(fila[0] in texto_pdf for fila in filas_csv)
            for fila in ["Pendiente uno", "Resuelto dos", "Pendiente tres"]:
                assert (fila in texto_pdf) == any(f[0] == fila for f in filas_csv)

    def test_el_rango_y_el_estado_se_describen_en_el_encabezado(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        response = self._pdf(client, admin_conjunto_auth_headers, conjunto_verificado, "?estado=ARCHIVADA&desde=2026-10-01&hasta=2026-10-31")

        texto = self._texto(response)
        assert "solo archivados" in texto
        assert "Del 01/10/2026 al 31/10/2026" in texto
        assert "historial-agenda-torres-de-prueba-2026-10-01_2026-10-31.pdf" in response.headers["content-disposition"]

    def test_la_foto_sale_como_enlace_y_no_incrustada(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Con foto", "/uploads/adjuntos/pasillo.jpg")
        self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Sin foto")

        response = self._pdf(client, admin_conjunto_auth_headers, conjunto_verificado)

        pagina = self._lector(response).pages[0]
        enlaces = [anotacion.get_object()["/A"]["/URI"] for anotacion in pagina.get("/Annots", [])]
        assert enlaces == ["http://testserver/uploads/adjuntos/pasillo.jpg"]
        assert "Ver foto" in self._texto(response)
        assert len(pagina.images) == 0

    def test_sin_temas_devuelve_un_pdf_valido_solo_con_los_encabezados(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        response = self._pdf(client, admin_conjunto_auth_headers, conjunto_verificado)

        assert response.status_code == 200
        texto = self._texto(response)
        assert "0 temas" in texto
        assert "No hay temas en este rango." in texto
        assert "Tema" in texto and "Foto" in texto

    def test_las_celdas_sin_dato_llevan_un_guion_en_el_pdf_y_quedan_vacias_en_el_csv(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        """Un tema por tratar no tiene fecha de archivado ni foto: en papel una celda vacía parece un error."""
        self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Tema por tratar")

        linea = next(
            texto for texto in self._texto(self._pdf(client, admin_conjunto_auth_headers, conjunto_verificado)).splitlines() if "Tema por tratar" in texto
        )
        fila_csv = list(
            csv.reader(io.StringIO(self._csv(client, admin_conjunto_auth_headers, conjunto_verificado).content.decode("utf-8-sig")), delimiter=";")
        )[1]

        assert linea.endswith(f"Pendiente {fila_csv[2]} - {ADMIN_CONJUNTO_NOMBRE} {ADMIN_CONJUNTO_APELLIDOS} -")
        assert fila_csv[3] == "" and fila_csv[5] == ""

    def test_con_muchos_temas_usa_varias_paginas_y_repite_el_encabezado(
        self, client: TestClient, db: Session, admin_conjunto_auth_headers, conjunto_verificado
    ):
        db.add_all(
            [AgendaConjunto(id_conjunto_residencial=conjunto_verificado.id_conjunto_residencial, texto=f"Tema numero {n}") for n in range(120)]
        )
        db.commit()

        lector = self._lector(self._pdf(client, admin_conjunto_auth_headers, conjunto_verificado))

        assert len(lector.pages) > 1
        assert all("Estado" in pagina.extract_text() for pagina in lector.pages)
        assert f"Página 2 de {len(lector.pages)}" in lector.pages[1].extract_text()

    def test_los_caracteres_que_la_fuente_no_soporta_no_rompen_la_descarga(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        """Pegar de WhatsApp o Word trae comillas curvas, rayas y emoji: antes habrían dado 500."""
        self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "Cobrar “cuota” de 5€ — urgente \U0001F600 ¿cuándo? Ñandú")

        response = self._pdf(client, admin_conjunto_auth_headers, conjunto_verificado)

        assert response.status_code == 200
        assert 'Cobrar "cuota" de 5EUR - urgente ? ¿cuándo? Ñandú' in self._texto(response).replace("\n", " ")

    def test_una_palabra_larguisima_no_rompe_la_descarga(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        self._crear(client, admin_conjunto_auth_headers, conjunto_verificado, "x" * 900)

        assert self._pdf(client, admin_conjunto_auth_headers, conjunto_verificado).status_code == 200

    def test_con_mas_de_500_temas_pide_acotar_el_rango(
        self, client: TestClient, db: Session, admin_conjunto_auth_headers, conjunto_verificado
    ):
        db.add_all(
            [AgendaConjunto(id_conjunto_residencial=conjunto_verificado.id_conjunto_residencial, texto=f"Tema {n}") for n in range(501)]
        )
        db.commit()

        response = self._pdf(client, admin_conjunto_auth_headers, conjunto_verificado)

        assert response.status_code == 400
        assert "500" in response.json()["detail"]

    def test_rechaza_un_rango_al_reves_y_un_estado_invalido(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        assert self._pdf(client, admin_conjunto_auth_headers, conjunto_verificado, "?desde=2026-10-31&hasta=2026-10-01").status_code == 400
        assert self._pdf(client, admin_conjunto_auth_headers, conjunto_verificado, "?estado=HECHO").status_code == 422

    def test_conjunto_ajeno_devuelve_403_y_no_genera_archivo(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado_sin_admin):
        response = self._pdf(client, admin_conjunto_auth_headers, conjunto_verificado_sin_admin)

        assert response.status_code == 403
        assert "pdf" not in response.headers["content-type"]

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers, conjunto_verificado):
        assert self._pdf(client, auth_headers, conjunto_verificado).status_code == 403


class TestTextoParaPdf:
    @pytest.mark.parametrize(
        "original, esperado",
        [
            ("Ñandú ¿cómo? ¡sí!", "Ñandú ¿cómo? ¡sí!"),
            ("“hola” ‘x’", "\"hola\" 'x'"),
            ("a–b—c", "a-b-c"),
            ("1€", "1EUR"),
            ("punto… • lista", "punto... - lista"),
            ("emoji \U0001F600", "emoji ?"),
            ("a\tb\r\nc", "a b\nc"),
            ("sin​espacio", "sinespacio"),
        ],
    )
    def test_cambia_lo_que_la_fuente_no_soporta_y_deja_lo_demas(self, original, esperado):
        assert texto_para_pdf(original) == esperado
