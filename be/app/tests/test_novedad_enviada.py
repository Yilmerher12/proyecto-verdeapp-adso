"""
Módulo: tests/test_novedad_enviada.py
Descripción: Pruebas de las novedades que Residente, Reciclador y Admin de
             Conjunto le envían al Admin Sistema, y de la bandeja "Soporte
             técnico" donde las atiende.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event

from app.models.notificacion import Notificacion
from app.models.novedad_enviada import NovedadEnviada
from app.models.residente import Residente
from app.models.rol import RolId
from app.models.unidad import Unidad
from app.models.usuario import Usuario
from app.tests.conftest import test_engine
from app.utils.security import hash_password

BASE = "/api/v1/novedades-enviadas"
SOPORTE = f"{BASE}/soporte"

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

    def test_el_autor_ve_la_prioridad_calculada(self, client: TestClient, auth_headers):
        """Issue #520: la prioridad (por el motivo) llega al historial de quien envió."""
        client.post(BASE, headers=auth_headers, json={"texto": "x", "motivo": "login"})
        assert client.get(f"{BASE}/mias", headers=auth_headers).json()["items"][0]["prioridad"] == "ALTA"

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


class TestSoporteDelAdminSistema:
    def test_las_novedades_de_los_3_roles_llegan_con_su_origen(
        self, client: TestClient, admin_sistema_auth_headers, auth_headers, reciclador_auth_headers, admin_conjunto_auth_headers
    ):
        client.post(BASE, headers=auth_headers, json={"texto": "Del residente"})
        client.post(BASE, headers=reciclador_auth_headers, json={"texto": "Del reciclador"})
        client.post(BASE, headers=admin_conjunto_auth_headers, json={"texto": "Del admin"})

        filas = client.get(SOPORTE, headers=admin_sistema_auth_headers).json()["items"]
        assert {f["origen"] for f in filas} == {"Residente", "Reciclador", "Admin de Conjunto"}
        residente = next(f for f in filas if f["origen"] == "Residente")
        assert "Torre" in residente["nombre_autor"]
        assert residente["nombre_conjunto"]
        assert residente["estado"] == "NUEVA"

    def test_incluye_la_imagen(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        client.post(BASE, headers=auth_headers, json={"texto": "Con foto", "url_imagen": IMAGEN_PROPIA})
        filas = client.get(SOPORTE, headers=admin_sistema_auth_headers).json()["items"]
        assert filas[0]["url_imagen"] == IMAGEN_PROPIA

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers):
        assert client.get(SOPORTE, headers=auth_headers).status_code == 403

    def test_sin_login_devuelve_401(self, client: TestClient):
        assert client.get(SOPORTE).status_code == 401


class TestPrioridadPorMotivo:
    """Issue #512: la prioridad sale del motivo elegido, nunca del autor."""

    @pytest.mark.parametrize(
        "motivo, prioridad",
        [("login", "ALTA"), ("falla", "ALTA"), ("cuenta", "MEDIA"), ("otros", "MEDIA"), ("sugerencia", "BAJA"), (None, "MEDIA")],
    )
    def test_prioridad_calculada(self, client: TestClient, admin_sistema_auth_headers, auth_headers, motivo, prioridad):
        client.post(BASE, headers=auth_headers, json={"texto": "x", "motivo": motivo})
        fila = client.get(SOPORTE, headers=admin_sistema_auth_headers).json()["items"][0]
        assert fila["prioridad"] == prioridad

    def test_motivo_invalido_devuelve_422(self, client: TestClient, auth_headers):
        assert client.post(BASE, headers=auth_headers, json={"texto": "x", "motivo": "inventado"}).status_code == 422

    def test_el_autor_no_puede_elegir_la_prioridad(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        client.post(BASE, headers=auth_headers, json={"texto": "x", "motivo": "sugerencia", "prioridad": "ALTA"})
        assert client.get(SOPORTE, headers=admin_sistema_auth_headers).json()["items"][0]["prioridad"] == "BAJA"

    def test_la_prioridad_alta_sale_primero(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        client.post(BASE, headers=auth_headers, json={"texto": "baja", "motivo": "sugerencia"})
        client.post(BASE, headers=auth_headers, json={"texto": "media", "motivo": "cuenta"})
        client.post(BASE, headers=auth_headers, json={"texto": "alta", "motivo": "login"})
        filas = client.get(SOPORTE, headers=admin_sistema_auth_headers).json()["items"]
        assert [f["texto"] for f in filas] == ["alta", "media", "baja"]

    def test_filtra_por_prioridad(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        client.post(BASE, headers=auth_headers, json={"texto": "baja", "motivo": "sugerencia"})
        client.post(BASE, headers=auth_headers, json={"texto": "alta", "motivo": "login"})
        filas = client.get(SOPORTE, headers=admin_sistema_auth_headers, params={"prioridad": "BAJA"}).json()["items"]
        assert [f["texto"] for f in filas] == ["baja"]


class TestAtenderUnaConsulta:
    def _crear(self, client: TestClient, headers, admin_headers, **extra) -> str:
        client.post(BASE, headers=headers, json={"texto": "Hola", **extra})
        return client.get(SOPORTE, headers=admin_headers).json()["items"][0]["id"]

    def test_en_revision_sigue_en_la_bandeja(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        id_novedad = self._crear(client, auth_headers, admin_sistema_auth_headers)
        r = client.patch(f"{SOPORTE}/{id_novedad}", headers=admin_sistema_auth_headers, json={"estado": "EN_REVISION"})
        assert r.status_code == 200
        filas = client.get(SOPORTE, headers=admin_sistema_auth_headers).json()["items"]
        assert [f["estado"] for f in filas] == ["EN_REVISION"]
        assert client.get(f"{BASE}/mias", headers=auth_headers).json()["items"][0]["estado"] == "EN_REVISION"

    def test_responder_la_resuelve_y_el_autor_la_ve(
        self, client: TestClient, admin_sistema_auth_headers, auth_headers, acciones_admin
    ):
        id_novedad = self._crear(client, auth_headers, admin_sistema_auth_headers)
        r = client.patch(f"{SOPORTE}/{id_novedad}", headers=admin_sistema_auth_headers, json={"respuesta": "Ya lo corregimos."})
        assert r.status_code == 200

        assert client.get(SOPORTE, headers=admin_sistema_auth_headers).json()["items"] == []
        propia = client.get(f"{BASE}/mias", headers=auth_headers).json()["items"][0]
        assert propia["estado"] == "RESUELTA"
        assert propia["respuesta"] == "Ya lo corregimos."
        assert propia["respondida_at"]
        # Issue #376: la acción queda anotada, pero sin el texto de la respuesta.
        [accion] = acciones_admin()
        assert accion["action"] == "soporte_actualizado"
        assert accion["novedad"] == id_novedad
        assert accion["con_respuesta"] is True
        assert "Ya lo corregimos." not in str(accion)

    def test_responder_le_avisa_al_autor(self, client: TestClient, db, admin_sistema_auth_headers, auth_headers):
        id_novedad = self._crear(client, auth_headers, admin_sistema_auth_headers)
        client.patch(f"{SOPORTE}/{id_novedad}", headers=admin_sistema_auth_headers, json={"respuesta": "Listo."})
        [aviso] = db.query(Notificacion).filter(Notificacion.tipo == "RESPUESTA_SOPORTE").all()
        assert str(aviso.id_referencia) == id_novedad
        assert len(aviso.destinatarios) == 1

    def test_cambiar_el_estado_sin_respuesta_le_avisa_al_autor(
        self, client: TestClient, db, admin_sistema_auth_headers, auth_headers
    ):
        """Issue #520: antes solo avisaba cuando había respuesta."""
        id_novedad = self._crear(client, auth_headers, admin_sistema_auth_headers)
        client.patch(f"{SOPORTE}/{id_novedad}", headers=admin_sistema_auth_headers, json={"estado": "EN_REVISION"})
        [aviso] = db.query(Notificacion).filter(Notificacion.tipo == "ESTADO_SOPORTE").all()
        assert str(aviso.id_referencia) == id_novedad
        assert "En revisión" in aviso.mensaje
        assert len(aviso.destinatarios) == 1

    def test_responder_avisa_una_sola_vez(self, client: TestClient, db, admin_sistema_auth_headers, auth_headers):
        """Con respuesta el estado también cambia (RESUELTA), pero el autor recibe un solo aviso."""
        id_novedad = self._crear(client, auth_headers, admin_sistema_auth_headers)
        client.patch(f"{SOPORTE}/{id_novedad}", headers=admin_sistema_auth_headers, json={"respuesta": "Listo."})
        assert db.query(Notificacion).filter(Notificacion.tipo == "RESPUESTA_SOPORTE").count() == 1
        assert db.query(Notificacion).filter(Notificacion.tipo == "ESTADO_SOPORTE").count() == 0

    def test_no_avisa_si_el_estado_no_cambia_ni_con_solo_prioridad(
        self, client: TestClient, db, admin_sistema_auth_headers, auth_headers
    ):
        id_novedad = self._crear(client, auth_headers, admin_sistema_auth_headers)
        client.patch(f"{SOPORTE}/{id_novedad}", headers=admin_sistema_auth_headers, json={"estado": "NUEVA"})
        client.patch(f"{SOPORTE}/{id_novedad}", headers=admin_sistema_auth_headers, json={"prioridad": "ALTA"})
        assert db.query(Notificacion).filter(Notificacion.tipo == "ESTADO_SOPORTE").count() == 0

    def test_las_resueltas_se_ven_con_el_filtro(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        id_novedad = self._crear(client, auth_headers, admin_sistema_auth_headers)
        client.patch(f"{SOPORTE}/{id_novedad}", headers=admin_sistema_auth_headers, json={"estado": "RESUELTA"})
        resueltas = client.get(SOPORTE, headers=admin_sistema_auth_headers, params={"estado": "RESUELTA"}).json()
        assert resueltas["total"] == 1
        assert resueltas["items"][0]["id"] == id_novedad

    def test_se_puede_reabrir_una_resuelta(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        id_novedad = self._crear(client, auth_headers, admin_sistema_auth_headers)
        client.patch(f"{SOPORTE}/{id_novedad}", headers=admin_sistema_auth_headers, json={"estado": "RESUELTA"})
        client.patch(f"{SOPORTE}/{id_novedad}", headers=admin_sistema_auth_headers, json={"estado": "EN_REVISION"})
        assert client.get(SOPORTE, headers=admin_sistema_auth_headers).json()["total"] == 1

    def test_el_admin_corrige_la_prioridad(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        id_novedad = self._crear(client, auth_headers, admin_sistema_auth_headers, motivo="sugerencia")
        client.patch(f"{SOPORTE}/{id_novedad}", headers=admin_sistema_auth_headers, json={"prioridad": "ALTA"})
        assert client.get(SOPORTE, headers=admin_sistema_auth_headers).json()["items"][0]["prioridad"] == "ALTA"

    def test_sin_ningun_cambio_devuelve_422(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        id_novedad = self._crear(client, auth_headers, admin_sistema_auth_headers)
        assert client.patch(f"{SOPORTE}/{id_novedad}", headers=admin_sistema_auth_headers, json={}).status_code == 422

    @pytest.mark.parametrize("cuerpo", [{"respuesta": ""}, {"respuesta": "x" * 1001}, {"estado": "VISTA"}, {"prioridad": "URGENTE"}])
    def test_rechaza_valores_invalidos(self, client: TestClient, admin_sistema_auth_headers, auth_headers, cuerpo):
        id_novedad = self._crear(client, auth_headers, admin_sistema_auth_headers)
        assert client.patch(f"{SOPORTE}/{id_novedad}", headers=admin_sistema_auth_headers, json=cuerpo).status_code == 422

    def test_actualizar_una_que_no_existe_devuelve_404(self, client: TestClient, admin_sistema_auth_headers):
        r = client.patch(
            f"{SOPORTE}/00000000-0000-0000-0000-000000000000", headers=admin_sistema_auth_headers, json={"estado": "RESUELTA"}
        )
        assert r.status_code == 404

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers, admin_sistema_auth_headers):
        id_novedad = self._crear(client, auth_headers, admin_sistema_auth_headers)
        assert client.patch(f"{SOPORTE}/{id_novedad}", headers=auth_headers, json={"estado": "RESUELTA"}).status_code == 403


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
        url = SOPORTE
        primera = client.get(url, headers=admin_sistema_auth_headers, params={"limit": 2, "offset": 0}).json()
        segunda = client.get(url, headers=admin_sistema_auth_headers, params={"limit": 2, "offset": 2}).json()
        assert primera["total"] == segunda["total"] == 3
        assert len(primera["items"]) == 2
        assert len(segunda["items"]) == 1
        # Las 2 páginas no repiten ninguna fila.
        assert {f["id"] for f in primera["items"]}.isdisjoint({f["id"] for f in segunda["items"]})

    def test_bandeja_rechaza_limit_fuera_de_rango(self, client: TestClient, admin_sistema_auth_headers):
        r = client.get(SOPORTE, headers=admin_sistema_auth_headers, params={"limit": 101})
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

    @pytest.mark.parametrize("params", [{"estado": "VISTA"}, {"prioridad": "URGENTE"}])
    def test_listar_con_filtro_invalido_devuelve_422(self, client: TestClient, admin_sistema_auth_headers, params):
        assert client.get(SOPORTE, headers=admin_sistema_auth_headers, params=params).status_code == 422


class TestTopePorAutor:
    """Issue #399 (CN-054): máximo 10 novedades sin resolver (NUEVA o EN_REVISION) por cuenta."""

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

    def test_en_revision_sigue_contando(self, client: TestClient, auth_headers, admin_sistema_auth_headers):
        for _ in range(10):
            client.post(BASE, headers=auth_headers, json={"texto": "x"})
        id_novedad = client.get(SOPORTE, headers=admin_sistema_auth_headers).json()["items"][0]["id"]
        client.patch(f"{SOPORTE}/{id_novedad}", headers=admin_sistema_auth_headers, json={"estado": "EN_REVISION"})
        assert client.post(BASE, headers=auth_headers, json={"texto": "x"}).status_code == 409

    def test_al_resolver_una_puede_enviar_otra(self, client: TestClient, auth_headers, admin_sistema_auth_headers):
        for _ in range(10):
            client.post(BASE, headers=auth_headers, json={"texto": "x"})
        id_novedad = client.get(SOPORTE, headers=admin_sistema_auth_headers).json()["items"][0]["id"]
        client.patch(f"{SOPORTE}/{id_novedad}", headers=admin_sistema_auth_headers, json={"estado": "RESUELTA"})
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
            r = client.get(SOPORTE, headers=headers, params={"limit": 10})
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
