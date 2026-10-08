"""
Módulo: tests/test_novedad_enviada.py
Descripción: Pruebas de las novedades que Residente, Reciclador y Admin de
             Conjunto le envían al Admin Sistema, y de la bandeja unificada
             "Solicitudes pendientes" donde las recibe.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event

from app.models.novedad_enviada import NovedadEnviada
from app.models.residente import Residente
from app.models.rol import RolId
from app.models.unidad import Unidad
from app.models.usuario import Usuario
from app.tests.conftest import test_engine
from app.utils.security import hash_password

BASE = "/api/v1/novedades-enviadas"
BASE_ADMIN = "/api/v1/admin-conjunto"

# Nombre con el formato exacto que genera la subida de archivos (uuid4 + extensión).
IMAGEN_PROPIA = "/uploads/adjuntos/3f9a1c7e-5b2d-4e8a-9c1f-0a7b6d5e4f3c.jpg"


class TestEnviar:
    def test_residente_envia_con_imagen(self, client: TestClient, auth_headers):
        r = client.post(BASE, headers=auth_headers, json={"texto": "Contenedor desbordado.", "url_imagen": IMAGEN_PROPIA})
        assert r.status_code == 201

    @pytest.mark.parametrize("extension", ["png", "webp"])
    def test_acepta_png_y_webp(self, client: TestClient, auth_headers, extension):
        url = f"/uploads/adjuntos/3f9a1c7e-5b2d-4e8a-9c1f-0a7b6d5e4f3c.{extension}"
        assert client.post(BASE, headers=auth_headers, json={"texto": "x", "url_imagen": url}).status_code == 201

    @pytest.mark.parametrize(
        "url",
        [
            "@sitio-malo.com/login",
            "http://sitio-malo.com/f.jpg",
            "//sitio-malo.com/f.jpg",
            "javascript:alert(1)",
            "/uploads/../main.py",
            # Issue #399 (CN-049): ni https:// externo, ni una ruta propia que no sea una imagen subida.
            "https://ejemplo.com/f.jpg",
            "/uploads/adjuntos/c.jpg",
            "/uploads/adjuntos/3f9a1c7e-5b2d-4e8a-9c1f-0a7b6d5e4f3c.pdf",
            "/uploads/comunicados/3f9a1c7e-5b2d-4e8a-9c1f-0a7b6d5e4f3c.jpg",
        ],
    )
    def test_rechaza_enlace_de_imagen_no_permitido(self, client: TestClient, auth_headers, url):
        """Issues #369 (CN-041) y #399 (CN-049): el Admin Sistema abre este enlace desde su bandeja."""
        r = client.post(BASE, headers=auth_headers, json={"texto": "x", "url_imagen": url})
        assert r.status_code == 422

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
        respuesta = client.get(f"{BASE}/mias", headers=auth_headers).json()
        lista = respuesta["items"]
        assert [n["texto"] for n in lista] == ["Mía"]
        assert respuesta["total"] == 1
        assert lista[0]["estado"] == "NUEVA"
        assert lista[0]["nombre_conjunto"]

    def test_paginado_con_total(self, client: TestClient, auth_headers):
        """Issue #399: `limit` y `offset` parten la lista; el total sigue siendo el de todas."""
        for i in range(3):
            client.post(BASE, headers=auth_headers, json={"texto": f"N{i}"})
        primera = client.get(f"{BASE}/mias", headers=auth_headers, params={"limit": 2, "offset": 0}).json()
        segunda = client.get(f"{BASE}/mias", headers=auth_headers, params={"limit": 2, "offset": 2}).json()
        assert primera["total"] == segunda["total"] == 3
        assert len(primera["items"]) == 2
        assert len(segunda["items"]) == 1
        assert {n["id"] for n in primera["items"]}.isdisjoint({n["id"] for n in segunda["items"]})

    def test_rechaza_limit_fuera_de_rango(self, client: TestClient, auth_headers):
        assert client.get(f"{BASE}/mias", headers=auth_headers, params={"limit": 101}).status_code == 422


class TestBandejaDelAdminSistema:
    def test_las_novedades_de_los_3_roles_llegan_con_su_origen(
        self, client: TestClient, admin_sistema_auth_headers, auth_headers, reciclador_auth_headers, admin_conjunto_auth_headers
    ):
        client.post(BASE, headers=auth_headers, json={"texto": "Del residente"})
        client.post(BASE, headers=reciclador_auth_headers, json={"texto": "Del reciclador"})
        client.post(BASE, headers=admin_conjunto_auth_headers, json={"texto": "Del admin"})

        filas = client.get(f"{BASE_ADMIN}/solicitudes", headers=admin_sistema_auth_headers, params={"tipo": "NOVEDAD"}).json()["items"]
        assert {f["origen"] for f in filas} == {"Residente", "Reciclador", "Admin de Conjunto"}
        residente = next(f for f in filas if f["origen"] == "Residente")
        assert "Torre" in residente["titulo"]
        assert residente["nombre_conjunto"]

    def test_incluye_la_imagen(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        client.post(BASE, headers=auth_headers, json={"texto": "Con foto", "url_imagen": IMAGEN_PROPIA})
        filas = client.get(f"{BASE_ADMIN}/solicitudes", headers=admin_sistema_auth_headers).json()["items"]
        assert filas[0]["url_evidencia"] == IMAGEN_PROPIA

    def test_marcar_como_vista_la_saca_de_la_bandeja(
        self, client: TestClient, admin_sistema_auth_headers, auth_headers, acciones_admin
    ):
        client.post(BASE, headers=auth_headers, json={"texto": "Hola"})
        id_novedad = client.get(f"{BASE_ADMIN}/solicitudes", headers=admin_sistema_auth_headers).json()["items"][0]["id"]

        r = client.post(f"{BASE_ADMIN}/solicitudes/NOVEDAD/{id_novedad}/resolver", headers=admin_sistema_auth_headers, json={"aprobar": True})
        assert r.status_code == 200
        # Issue #376
        [accion] = acciones_admin()
        assert accion["action"] == "solicitud_aprobada"
        assert accion["tipo"] == "NOVEDAD"
        assert accion["solicitud"] == id_novedad
        assert client.get(f"{BASE_ADMIN}/solicitudes", headers=admin_sistema_auth_headers).json()["items"] == []
        assert client.get(f"{BASE}/mias", headers=auth_headers).json()["items"][0]["estado"] == "VISTA"

    def test_una_novedad_no_se_rechaza(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        client.post(BASE, headers=auth_headers, json={"texto": "Hola"})
        id_novedad = client.get(f"{BASE_ADMIN}/solicitudes", headers=admin_sistema_auth_headers).json()["items"][0]["id"]
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
        filas = client.get(f"{BASE_ADMIN}/solicitudes", headers=admin_sistema_auth_headers).json()["items"]
        assert "DESVINCULACION" in [f["tipo"] for f in filas]


class TestEndurecimiento:
    """Issue #372: límite de envíos (CN-042), bandeja paginada (CN-042), perfil faltante (CN-044) y tipo inválido (CN-045)."""

    def test_supera_10_envios_por_minuto_devuelve_429(self, client: TestClient, auth_headers):
        # La fixture `disable_rate_limiter_for_tests` apaga el limiter para toda la suite; aquí se prende solo para esta prueba.
        from app.utils.limiter import limiter as real_limiter

        real_limiter.enabled = True
        try:
            for _ in range(10):
                assert client.post(BASE, headers=auth_headers, json={"texto": "x"}).status_code == 201
            assert client.post(BASE, headers=auth_headers, json={"texto": "x"}).status_code == 429
        finally:
            real_limiter.enabled = False

    def test_bandeja_paginada_con_total(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        for i in range(3):
            client.post(BASE, headers=auth_headers, json={"texto": f"N{i}"})
        url = f"{BASE_ADMIN}/solicitudes"
        primera = client.get(url, headers=admin_sistema_auth_headers, params={"limit": 2, "offset": 0}).json()
        segunda = client.get(url, headers=admin_sistema_auth_headers, params={"limit": 2, "offset": 2}).json()
        assert primera["total"] == segunda["total"] == 3
        assert len(primera["items"]) == 2
        assert len(segunda["items"]) == 1
        # Las 2 páginas no repiten ninguna fila.
        assert {f["id"] for f in primera["items"]}.isdisjoint({f["id"] for f in segunda["items"]})

    def test_bandeja_rechaza_limit_fuera_de_rango(self, client: TestClient, admin_sistema_auth_headers):
        r = client.get(f"{BASE_ADMIN}/solicitudes", headers=admin_sistema_auth_headers, params={"limit": 101})
        assert r.status_code == 422

    def test_residente_sin_perfil_recibe_404_y_no_500(self, client: TestClient, db):
        """Cuenta con rol Residente pero sin fila en `residentes`."""
        from app.models.rol import RolId
        from app.models.usuario import Usuario
        from app.utils.security import create_access_token, hash_password

        usuario = Usuario(
            correo_electronico="sin-perfil@verdeapp.com",
            id_rol=RolId.RESIDENTE,
            password=hash_password("Clave123*"),
            is_active=True,
        )
        db.add(usuario)
        db.commit()
        token = create_access_token(data={"sub": usuario.correo_electronico, "role_id": usuario.id_rol})

        r = client.post(BASE, headers={"Authorization": f"Bearer {token}"}, json={"texto": "x"})
        assert r.status_code == 404
        assert "perfil" in r.json()["detail"].lower()

    def test_listar_con_tipo_invalido_devuelve_422(self, client: TestClient, admin_sistema_auth_headers):
        r = client.get(f"{BASE_ADMIN}/solicitudes", headers=admin_sistema_auth_headers, params={"tipo": "OTRO"})
        assert r.status_code == 422

    def test_resolver_con_tipo_invalido_devuelve_422(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        client.post(BASE, headers=auth_headers, json={"texto": "Hola"})
        id_novedad = client.get(f"{BASE_ADMIN}/solicitudes", headers=admin_sistema_auth_headers).json()["items"][0]["id"]
        r = client.post(f"{BASE_ADMIN}/solicitudes/OTRO/{id_novedad}/resolver", headers=admin_sistema_auth_headers, json={"aprobar": True})
        assert r.status_code == 422


class TestTopePorAutor:
    """Issue #399 (CN-054): máximo 10 novedades NUEVAS por cuenta."""

    def test_la_numero_11_devuelve_409(self, client: TestClient, auth_headers):
        for _ in range(10):
            assert client.post(BASE, headers=auth_headers, json={"texto": "x"}).status_code == 201
        r = client.post(BASE, headers=auth_headers, json={"texto": "x"})
        assert r.status_code == 409
        assert "10 novedades sin revisar" in r.json()["detail"]

    def test_el_tope_es_por_cuenta(self, client: TestClient, auth_headers, reciclador_auth_headers):
        for _ in range(10):
            client.post(BASE, headers=auth_headers, json={"texto": "x"})
        assert client.post(BASE, headers=reciclador_auth_headers, json={"texto": "x"}).status_code == 201

    def test_al_marcar_una_como_vista_puede_enviar_otra(self, client: TestClient, auth_headers, admin_sistema_auth_headers):
        for _ in range(10):
            client.post(BASE, headers=auth_headers, json={"texto": "x"})
        id_novedad = client.get(f"{BASE_ADMIN}/solicitudes", headers=admin_sistema_auth_headers).json()["items"][0]["id"]
        client.post(f"{BASE_ADMIN}/solicitudes/NOVEDAD/{id_novedad}/resolver", headers=admin_sistema_auth_headers, json={"aprobar": True})
        assert client.post(BASE, headers=auth_headers, json={"texto": "x"}).status_code == 201


class TestBandejaConPocasConsultas:
    """Issue #399 (CN-054): la bandeja hace las mismas consultas SQL con 3 novedades que con 30."""

    def _crear_novedades(self, db, conjunto, desde: int, hasta: int) -> None:
        # Un autor distinto por novedad: con el mismo autor la sesión reutiliza sus datos y no se vería el problema.
        for i in range(desde, hasta):
            usuario = Usuario(
                correo_electronico=f"autor{i}@verdeapp.com", id_rol=RolId.RESIDENTE, password=hash_password("Clave123*"), is_active=True
            )
            db.add(usuario)
            db.flush()
            unidad = Unidad(id_conjunto_residencial=conjunto.id_conjunto_residencial, torre="T", apto=str(i))
            db.add(unidad)
            db.flush()
            db.add(Residente(id_usuario=usuario.id_usuario, id_unidad=unidad.id_unidad, nombre="A", apellidos="B", numero_telefonico="3000000000"))
            db.add(NovedadEnviada(autor_id=usuario.id_usuario, id_conjunto_residencial=conjunto.id_conjunto_residencial, texto=f"N{i}"))
        db.commit()

    def _contar_consultas(self, client: TestClient, headers) -> int:
        consultas: list[str] = []

        def registrar(conn, cursor, statement, parameters, context, executemany):
            consultas.append(statement)

        event.listen(test_engine, "before_cursor_execute", registrar)
        try:
            r = client.get(f"{BASE_ADMIN}/solicitudes", headers=headers, params={"limit": 10})
        finally:
            event.remove(test_engine, "before_cursor_execute", registrar)
        assert r.status_code == 200
        return len(consultas)

    def test_mismas_consultas_con_pocas_y_con_muchas(self, client: TestClient, db, conjunto_verificado, admin_sistema_auth_headers):
        self._crear_novedades(db, conjunto_verificado, 0, 3)
        con_pocas = self._contar_consultas(client, admin_sistema_auth_headers)

        self._crear_novedades(db, conjunto_verificado, 3, 30)
        db.expire_all()
        con_muchas = self._contar_consultas(client, admin_sistema_auth_headers)

        assert con_pocas == con_muchas
