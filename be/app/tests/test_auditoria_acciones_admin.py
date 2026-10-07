"""
Módulo: tests/test_auditoria_acciones_admin.py
Descripción: Pruebas del issue #401 — las acciones de administración que
             quedaron sin registrar en #376 y los eventos de registro,
             verificación de correo y cierre de sesión.
¿Para qué? Comprobar que cada acción escribe su línea en el log de auditoría,
           con la IP de origen, y que ninguna línea trae datos sensibles
           (contraseñas, tokens, textos libres).
"""

import json
import logging
import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.tests.conftest import TEST_USER_EMAIL, TEST_USER_PASSWORD, UNVERIFIED_USER_EMAIL
from app.utils.audit_log import redactar_correo


def _lineas_de_auditoria(caplog) -> list[dict]:
    return [json.loads(r.getMessage()) for r in caplog.records if r.name == "verdeapp.audit"]


def _ultima_accion(acciones_admin) -> dict:
    return acciones_admin()[-1]


class TestPuntosAcopio:
    def test_crear_editar_baja_y_reactivar_quedan_anotados(
        self, client: TestClient, admin_sistema_auth_headers, localidad_test, acciones_admin
    ):
        base = "/api/v1/admin/puntos-acopio"
        creado = client.post(
            base,
            headers=admin_sistema_auth_headers,
            json={"nombre": "ECA Auditada", "direccion": "Calle 1 # 1-1", "id_localidad": localidad_test.id_localidad},
        )
        id_punto = creado.json()["id_punto_acopio"]
        assert _ultima_accion(acciones_admin)["action"] == "punto_acopio_creado"
        assert _ultima_accion(acciones_admin)["punto_acopio"] == id_punto

        client.put(
            f"{base}/{id_punto}",
            headers=admin_sistema_auth_headers,
            json={
                "nombre": "ECA Auditada 2",
                "direccion": "Calle 1 # 1-1",
                "id_localidad": localidad_test.id_localidad,
                "motivo_cambio": "MOTIVO-LIBRE-SECRETO",
            },
        )
        accion = _ultima_accion(acciones_admin)
        assert accion["action"] == "punto_acopio_editado"
        assert "MOTIVO-LIBRE-SECRETO" not in str(accion)

        client.delete(f"{base}/{id_punto}", headers=admin_sistema_auth_headers)
        assert _ultima_accion(acciones_admin)["action"] == "punto_acopio_dado_de_baja"

        client.post(f"{base}/{id_punto}/reactivar", headers=admin_sistema_auth_headers)
        assert _ultima_accion(acciones_admin)["action"] == "punto_acopio_reactivado"

    def test_una_accion_rechazada_no_queda_anotada(self, client: TestClient, admin_sistema_auth_headers, acciones_admin):
        response = client.delete(f"/api/v1/admin/puntos-acopio/{uuid.uuid4()}", headers=admin_sistema_auth_headers)
        assert response.status_code == 404
        assert acciones_admin() == []


class TestContenidoEducativo:
    URL = "/api/v1/contenido-educativo"

    def test_crear_editar_enviar_y_eliminar_quedan_anotados(
        self, client: TestClient, admin_sistema_auth_headers, conjunto_verificado, acciones_admin
    ):
        cuerpo = {
            "modulo_categoria": "Separación en la fuente",
            "titulo_tema": "Código de colores de bolsas",
            "cuerpo_texto": "Blanco: aprovechables. Negro: no aprovechables. Verde: orgánicos.",
        }
        id_contenido = client.post(self.URL, headers=admin_sistema_auth_headers, json=cuerpo).json()["id_contenido"]
        assert _ultima_accion(acciones_admin)["action"] == "contenido_educativo_creado"
        assert _ultima_accion(acciones_admin)["contenido"] == id_contenido

        client.put(f"{self.URL}/{id_contenido}", headers=admin_sistema_auth_headers, json=cuerpo)
        assert _ultima_accion(acciones_admin)["action"] == "contenido_educativo_editado"

        id_conjunto = str(conjunto_verificado.id_conjunto_residencial)
        client.post(f"{self.URL}/{id_contenido}/enviar", headers=admin_sistema_auth_headers, json={"conjuntos": [id_conjunto]})
        accion = _ultima_accion(acciones_admin)
        assert accion["action"] == "contenido_educativo_enviado"
        assert accion["conjuntos"] == [id_conjunto]

        client.delete(f"{self.URL}/{id_contenido}", headers=admin_sistema_auth_headers)
        assert _ultima_accion(acciones_admin)["action"] == "contenido_educativo_eliminado"


class TestNovedades:
    URL = "/api/v1/novedades"

    def test_crear_editar_y_archivar_quedan_anotados_sin_el_texto(
        self, client: TestClient, admin_sistema_auth_headers, acciones_admin
    ):
        texto = "TEXTO-DE-LA-NOVEDAD-123"
        id_novedad = client.post(
            self.URL, headers=admin_sistema_auth_headers, json={"alcance": "TODOS", "texto": texto}
        ).json()["id_novedad"]
        accion = _ultima_accion(acciones_admin)
        assert accion["action"] == "novedad_creada"
        assert accion["novedad"] == id_novedad
        assert texto not in str(accion)

        client.patch(f"{self.URL}/{id_novedad}", headers=admin_sistema_auth_headers, json={"texto": "Texto corregido."})
        assert _ultima_accion(acciones_admin)["action"] == "novedad_editada"

        client.post(f"{self.URL}/{id_novedad}/archivar", headers=admin_sistema_auth_headers)
        assert _ultima_accion(acciones_admin)["action"] == "novedad_archivada"


class TestComunicados:
    URL = "/api/v1/comunicados"

    def test_crear_editar_y_eliminar_quedan_anotados_sin_el_texto(
        self, client: TestClient, admin_conjunto_auth_headers, admin_conjunto_test, conjunto_verificado, acciones_admin
    ):
        texto = "TEXTO-DEL-COMUNICADO-123"
        id_conjunto = str(conjunto_verificado.id_conjunto_residencial)
        id_comunicado = client.post(
            self.URL,
            headers=admin_conjunto_auth_headers,
            json={"id_conjunto_residencial": id_conjunto, "destinatarios": "AMBOS", "tipo": "INFORMATIVO", "texto": texto},
        ).json()["id_comunicado"]
        accion = _ultima_accion(acciones_admin)
        assert accion["action"] == "comunicado_creado"
        assert accion["comunicado"] == id_comunicado
        assert accion["conjunto"] == id_conjunto
        assert texto not in str(accion)

        client.patch(
            f"{self.URL}/{id_comunicado}",
            headers=admin_conjunto_auth_headers,
            json={"tipo": "INFORMATIVO", "texto": "Texto corregido del comunicado."},
        )
        assert _ultima_accion(acciones_admin)["action"] == "comunicado_editado"

        client.delete(f"{self.URL}/{id_comunicado}", headers=admin_conjunto_auth_headers)
        assert _ultima_accion(acciones_admin)["action"] == "comunicado_eliminado"


class TestPanelDelConjunto:
    def test_editar_conjunto_y_solicitar_desvinculacion_quedan_anotados(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado, acciones_admin
    ):
        url = f"/api/v1/conjunto-panel/mis-conjuntos/{conjunto_verificado.id_conjunto_residencial}"
        response = client.patch(url, headers=admin_conjunto_auth_headers, json={"nit": "900123456-7", "total_apartamentos": 40})
        assert response.status_code == 200
        accion = _ultima_accion(acciones_admin)
        assert accion["action"] == "conjunto_editado"
        assert accion["conjunto"] == str(conjunto_verificado.id_conjunto_residencial)
        assert "900123456-7" not in str(accion)

        response = client.post(
            f"{url}/solicitar-desvinculacion", headers=admin_conjunto_auth_headers, json={"motivo": "MOTIVO-LIBRE-SECRETO"}
        )
        assert response.status_code == 201
        accion = _ultima_accion(acciones_admin)
        assert accion["action"] == "desvinculacion_solicitada"
        assert "MOTIVO-LIBRE-SECRETO" not in str(accion)


class TestAutenticacion:
    def test_registro_verificacion_y_logout_quedan_anotados(
        self, client: TestClient, db: Session, unverified_user, valid_verification_token, caplog
    ):
        caplog.set_level(logging.INFO, logger="verdeapp.audit")

        client.post("/api/v1/auth/verify-email", json={"token": valid_verification_token})
        verificado = [linea for linea in _lineas_de_auditoria(caplog) if linea["event"] == "email_verified"]
        assert [linea["email"] for linea in verificado] == [redactar_correo(UNVERIFIED_USER_EMAIL)]
        assert valid_verification_token not in caplog.text

        client.post("/api/v1/auth/login", json={"correo_electronico": UNVERIFIED_USER_EMAIL, "password": TEST_USER_PASSWORD})
        client.post("/api/v1/auth/logout")
        cierres = [linea for linea in _lineas_de_auditoria(caplog) if linea["event"] == "logout"]
        assert [linea["email"] for linea in cierres] == [redactar_correo(UNVERIFIED_USER_EMAIL)]

    def test_registro_solicitado_no_trae_la_contrasena(self, client: TestClient, conjunto_verificado, caplog):
        caplog.set_level(logging.INFO, logger="verdeapp.audit")
        client.post(
            "/api/v1/auth/register",
            json={
                "rol": "residente",
                "correo_electronico": TEST_USER_EMAIL,
                "password": "ClaveSecretaDePrueba1",
                "nombre": "Nuevo",
                "apellidos": "Residente Prueba",
                "numero_telefonico": "3001112222",
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                "torre": "TORRE 1",
                "apto": "303",
                "codigo_acceso": conjunto_verificado.codigo_acceso,
            },
        )
        [linea] = [linea for linea in _lineas_de_auditoria(caplog) if linea["event"] == "register_requested"]
        assert linea["email"] == redactar_correo(TEST_USER_EMAIL)
        assert "ClaveSecretaDePrueba1" not in caplog.text


class TestIpDeOrigen:
    def test_toda_linea_de_auditoria_lleva_la_ip_de_la_peticion(self, client: TestClient, test_user, caplog):
        caplog.set_level(logging.INFO, logger="verdeapp.audit")
        client.post("/api/v1/auth/login", json={"correo_electronico": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD})
        [linea] = [linea for linea in _lineas_de_auditoria(caplog) if linea["event"] == "login_success"]
        # TestClient se identifica como "testclient": lo importante es que no sea None.
        assert linea["ip"] == "testclient"
