"""
Módulo: tests/test_novedad_enviada.py
Descripción: Pruebas de las novedades que Residente, Reciclador y Admin de
             Conjunto le envían al Admin Sistema, y de la bandeja unificada
             "Solicitudes pendientes" donde las recibe.
"""
from fastapi.testclient import TestClient

BASE = "/api/v1/novedades-enviadas"
BASE_ADMIN = "/api/v1/admin-conjunto"


class TestEnviar:
    def test_residente_envia_con_imagen(self, client: TestClient, auth_headers):
        r = client.post(BASE, headers=auth_headers, json={"texto": "Contenedor desbordado.", "url_imagen": "/uploads/adjuntos/c.jpg"})
        assert r.status_code == 201

    def test_reciclador_envia(self, client: TestClient, reciclador_auth_headers):
        assert client.post(BASE, headers=reciclador_auth_headers, json={"texto": "Punto cerrado."}).status_code == 201

    def test_admin_conjunto_envia(self, client: TestClient, admin_conjunto_auth_headers):
        assert client.post(BASE, headers=admin_conjunto_auth_headers, json={"texto": "Pared rayada."}).status_code == 201

    def test_admin_sistema_no_envia(self, client: TestClient, admin_sistema_auth_headers):
        assert client.post(BASE, headers=admin_sistema_auth_headers, json={"texto": "x"}).status_code == 403

    def test_exige_texto(self, client: TestClient, auth_headers):
        assert client.post(BASE, headers=auth_headers, json={"texto": ""}).status_code == 422

    def test_sin_login_devuelve_401(self, client: TestClient):
        assert client.post(BASE, json={"texto": "x"}).status_code == 401

    def test_admin_conjunto_no_puede_hablar_de_un_conjunto_ajeno(self, client: TestClient, admin_conjunto_auth_headers):
        r = client.post(
            BASE,
            headers=admin_conjunto_auth_headers,
            json={"texto": "x", "id_conjunto_residencial": "00000000-0000-0000-0000-000000000000"},
        )
        assert r.status_code == 403


class TestMisEnvios:
    def test_lista_solo_las_mias(self, client: TestClient, auth_headers, reciclador_auth_headers):
        client.post(BASE, headers=auth_headers, json={"texto": "Mía"})
        client.post(BASE, headers=reciclador_auth_headers, json={"texto": "De otro"})
        lista = client.get(f"{BASE}/mias", headers=auth_headers).json()
        assert [n["texto"] for n in lista] == ["Mía"]
        assert lista[0]["estado"] == "NUEVA"
        assert lista[0]["nombre_conjunto"]


class TestBandejaDelAdminSistema:
    def test_las_novedades_de_los_3_roles_llegan_con_su_origen(
        self, client: TestClient, admin_sistema_auth_headers, auth_headers, reciclador_auth_headers, admin_conjunto_auth_headers
    ):
        client.post(BASE, headers=auth_headers, json={"texto": "Del residente"})
        client.post(BASE, headers=reciclador_auth_headers, json={"texto": "Del reciclador"})
        client.post(BASE, headers=admin_conjunto_auth_headers, json={"texto": "Del admin"})

        filas = client.get(f"{BASE_ADMIN}/solicitudes", headers=admin_sistema_auth_headers, params={"tipo": "NOVEDAD"}).json()
        assert {f["origen"] for f in filas} == {"Residente", "Reciclador", "Admin de Conjunto"}
        residente = next(f for f in filas if f["origen"] == "Residente")
        assert "Torre" in residente["titulo"]
        assert residente["nombre_conjunto"]

    def test_incluye_la_imagen(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        client.post(BASE, headers=auth_headers, json={"texto": "Con foto", "url_imagen": "/uploads/adjuntos/f.jpg"})
        filas = client.get(f"{BASE_ADMIN}/solicitudes", headers=admin_sistema_auth_headers).json()
        assert filas[0]["url_evidencia"] == "/uploads/adjuntos/f.jpg"

    def test_marcar_como_vista_la_saca_de_la_bandeja(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        client.post(BASE, headers=auth_headers, json={"texto": "Hola"})
        id_novedad = client.get(f"{BASE_ADMIN}/solicitudes", headers=admin_sistema_auth_headers).json()[0]["id"]

        r = client.post(f"{BASE_ADMIN}/solicitudes/NOVEDAD/{id_novedad}/resolver", headers=admin_sistema_auth_headers, json={"aprobar": True})
        assert r.status_code == 200
        assert client.get(f"{BASE_ADMIN}/solicitudes", headers=admin_sistema_auth_headers).json() == []
        assert client.get(f"{BASE}/mias", headers=auth_headers).json()[0]["estado"] == "VISTA"

    def test_una_novedad_no_se_rechaza(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        client.post(BASE, headers=auth_headers, json={"texto": "Hola"})
        id_novedad = client.get(f"{BASE_ADMIN}/solicitudes", headers=admin_sistema_auth_headers).json()[0]["id"]
        r = client.post(
            f"{BASE_ADMIN}/solicitudes/NOVEDAD/{id_novedad}/resolver",
            headers=admin_sistema_auth_headers,
            json={"aprobar": False, "motivo_rechazo": "No."},
        )
        assert r.status_code == 400

    def test_resolver_una_que_no_existe_devuelve_404(self, client: TestClient, admin_sistema_auth_headers):
        r = client.post(
            f"{BASE_ADMIN}/solicitudes/NOVEDAD/00000000-0000-0000-0000-000000000000/resolver",
            headers=admin_sistema_auth_headers,
            json={"aprobar": True},
        )
        assert r.status_code == 404

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers):
        assert client.get(f"{BASE_ADMIN}/solicitudes", headers=auth_headers).status_code == 403

    def test_la_bandeja_sigue_incluyendo_desvinculacion(
        self, client: TestClient, admin_sistema_auth_headers, admin_conjunto_auth_headers, conjunto_verificado
    ):
        client.post(
            f"/api/v1/conjunto-panel/mis-conjuntos/{conjunto_verificado.id_conjunto_residencial}/solicitar-desvinculacion",
            headers=admin_conjunto_auth_headers,
            json={"motivo": "Me mudé."},
        )
        filas = client.get(f"{BASE_ADMIN}/solicitudes", headers=admin_sistema_auth_headers).json()
        assert "DESVINCULACION" in [f["tipo"] for f in filas]
