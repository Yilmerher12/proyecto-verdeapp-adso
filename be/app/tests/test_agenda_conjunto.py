"""
Módulo: tests/test_agenda_conjunto.py
Descripción: Pruebas de la agenda interna del Admin de Conjunto — crear,
             listar, dejar en espera y borrar. Nunca llega al Admin Sistema.
"""
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

    def test_exige_texto(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        assert client.post(_url(conjunto_verificado), headers=admin_conjunto_auth_headers, json={"texto": ""}).status_code == 422

    def test_los_pendientes_salen_antes_que_los_en_espera(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        id_viejo = client.post(_url(conjunto_verificado), headers=admin_conjunto_auth_headers, json={"texto": "Viejo"}).json()["id"]
        client.post(_url(conjunto_verificado), headers=admin_conjunto_auth_headers, json={"texto": "Nuevo"})
        client.patch(_url(conjunto_verificado, f"/{id_viejo}"), headers=admin_conjunto_auth_headers, json={"estado": "EN_ESPERA"})

        textos = [t["texto"] for t in client.get(_url(conjunto_verificado), headers=admin_conjunto_auth_headers).json()]
        assert textos == ["Nuevo", "Viejo"]

    def test_conjunto_ajeno_devuelve_403(self, client: TestClient, admin_conjunto_auth_headers):
        url = f"{BASE}/00000000-0000-0000-0000-000000000000/agenda"
        assert client.get(url, headers=admin_conjunto_auth_headers).status_code == 403
        assert client.post(url, headers=admin_conjunto_auth_headers, json={"texto": "x"}).status_code == 403

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers, conjunto_verificado):
        assert client.get(_url(conjunto_verificado), headers=auth_headers).status_code == 403

    def test_nunca_aparece_en_la_bandeja_del_admin_sistema(
        self, client: TestClient, admin_sistema_auth_headers, admin_conjunto_auth_headers, conjunto_verificado
    ):
        client.post(_url(conjunto_verificado), headers=admin_conjunto_auth_headers, json={"texto": "Privado"})
        assert client.get(f"{BASE_ADMIN}/solicitudes", headers=admin_sistema_auth_headers).json() == []


class TestEstadoYBorrar:
    def _crear(self, client, headers, conjunto) -> str:
        return client.post(_url(conjunto), headers=headers, json={"texto": "Tema"}).json()["id"]

    def test_deja_en_espera_y_vuelve_a_pendiente(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        id_item = self._crear(client, admin_conjunto_auth_headers, conjunto_verificado)
        r = client.patch(_url(conjunto_verificado, f"/{id_item}"), headers=admin_conjunto_auth_headers, json={"estado": "EN_ESPERA"})
        assert r.json()["estado"] == "EN_ESPERA"
        r = client.patch(_url(conjunto_verificado, f"/{id_item}"), headers=admin_conjunto_auth_headers, json={"estado": "PENDIENTE"})
        assert r.json()["estado"] == "PENDIENTE"

    def test_rechaza_un_estado_invalido(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        id_item = self._crear(client, admin_conjunto_auth_headers, conjunto_verificado)
        r = client.patch(_url(conjunto_verificado, f"/{id_item}"), headers=admin_conjunto_auth_headers, json={"estado": "HECHO"})
        assert r.status_code == 422

    def test_borra_un_tema(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        id_item = self._crear(client, admin_conjunto_auth_headers, conjunto_verificado)
        assert client.delete(_url(conjunto_verificado, f"/{id_item}"), headers=admin_conjunto_auth_headers).status_code == 200
        assert client.get(_url(conjunto_verificado), headers=admin_conjunto_auth_headers).json() == []

    def test_borrar_un_tema_que_no_existe_devuelve_404(self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado):
        r = client.delete(_url(conjunto_verificado, "/00000000-0000-0000-0000-000000000000"), headers=admin_conjunto_auth_headers)
        assert r.status_code == 404
