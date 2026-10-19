"""
Módulo: tests/test_agenda_conjunto.py
Descripción: Pruebas de la agenda interna del Admin de Conjunto — crear,
             listar, dejar en espera y borrar. Nunca llega al Admin Sistema.
"""
import pytest
from fastapi.testclient import TestClient

from app.models.conjunto_residencial import ConjuntoResidencial

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
