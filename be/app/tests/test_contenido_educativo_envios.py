"""
Módulo: tests/test_contenido_educativo_envios.py
Descripción: Pruebas de ver un módulo puntual y del envío manual de un
             módulo del catálogo a uno o varios conjuntos (RQF-018) — sin
             pasar por una auditoría del Reciclador.
¿Para qué? Archivo aparte de test_contenido_educativo.py (que ya cubre el
           catálogo en sí: listar/crear/editar/eliminar) para no mezclarlo
           con este flujo nuevo, que además crea notificaciones reales a
           los residentes del conjunto.
"""
import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.notificacion import Notificacion, NotificacionDestinatario

URL = f"{'/api/v1/contenido-educativo'}"


def _payload(**overrides):
    data = {
        "modulo_categoria": "Separación en la fuente",
        "titulo_tema": "Código de colores de bolsas",
        "cuerpo_texto": "Blanco: aprovechables. Negro: no aprovechables. Verde: orgánicos.",
        "url_video": None,
        "url_guia": None,
    }
    data.update(overrides)
    return data


def _crear_modulo(client: TestClient, admin_sistema_auth_headers) -> str:
    response = client.post(URL, json=_payload(), headers=admin_sistema_auth_headers)
    assert response.status_code == 201, response.json()
    return response.json()["id_contenido"]


class TestObtenerUno:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get(f"{URL}/{uuid.uuid4()}")
        assert response.status_code == 401

    def test_id_inexistente_devuelve_404(self, client: TestClient, auth_headers):
        response = client.get(f"{URL}/{uuid.uuid4()}", headers=auth_headers)
        assert response.status_code == 404

    def test_cualquier_rol_autenticado_puede_verlo(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        id_contenido = _crear_modulo(client, admin_sistema_auth_headers)
        response = client.get(f"{URL}/{id_contenido}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["modulo_categoria"] == "Separación en la fuente"


class TestEnviar:
    def test_sin_login_devuelve_401(self, client: TestClient, conjunto_verificado):
        response = client.post(
            f"{URL}/{uuid.uuid4()}/enviar", json={"conjuntos": [str(conjunto_verificado.id_conjunto_residencial)]}
        )
        assert response.status_code == 401

    def test_residente_no_puede_enviar(self, client: TestClient, admin_sistema_auth_headers, auth_headers, conjunto_verificado):
        id_contenido = _crear_modulo(client, admin_sistema_auth_headers)
        response = client.post(
            f"{URL}/{id_contenido}/enviar",
            json={"conjuntos": [str(conjunto_verificado.id_conjunto_residencial)]},
            headers=auth_headers,
        )
        assert response.status_code == 403

    def test_modulo_inexistente_devuelve_404(self, client: TestClient, admin_sistema_auth_headers, conjunto_verificado):
        response = client.post(
            f"{URL}/{uuid.uuid4()}/enviar",
            json={"conjuntos": [str(conjunto_verificado.id_conjunto_residencial)]},
            headers=admin_sistema_auth_headers,
        )
        assert response.status_code == 404

    def test_lista_de_conjuntos_vacia_devuelve_422(self, client: TestClient, admin_sistema_auth_headers):
        id_contenido = _crear_modulo(client, admin_sistema_auth_headers)
        response = client.post(f"{URL}/{id_contenido}/enviar", json={"conjuntos": []}, headers=admin_sistema_auth_headers)
        assert response.status_code == 422

    def test_conjunto_inexistente_devuelve_400(self, client: TestClient, admin_sistema_auth_headers):
        id_contenido = _crear_modulo(client, admin_sistema_auth_headers)
        response = client.post(
            f"{URL}/{id_contenido}/enviar", json={"conjuntos": [str(uuid.uuid4())]}, headers=admin_sistema_auth_headers
        )
        assert response.status_code == 400

    def test_envio_exitoso_queda_registrado_y_visible_en_envios(
        self, client: TestClient, admin_sistema_auth_headers, conjunto_verificado
    ):
        id_contenido = _crear_modulo(client, admin_sistema_auth_headers)
        response = client.post(
            f"{URL}/{id_contenido}/enviar",
            json={"conjuntos": [str(conjunto_verificado.id_conjunto_residencial)]},
            headers=admin_sistema_auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert len(data) == 1
        assert data[0]["nombre_conjunto"] == conjunto_verificado.nombre_conjunto

        listado = client.get(f"{URL}/{id_contenido}/envios", headers=admin_sistema_auth_headers)
        assert listado.status_code == 200
        assert len(listado.json()) == 1
        assert listado.json()[0]["id_conjunto_residencial"] == str(conjunto_verificado.id_conjunto_residencial)

    def test_envio_a_varios_conjuntos_a_la_vez(
        self, client: TestClient, admin_sistema_auth_headers, db: Session, conjunto_verificado, localidad_test
    ):
        otro_conjunto = ConjuntoResidencial(
            id_localidad=localidad_test.id_localidad,
            nombre_conjunto="RESERVA DOS",
            nit="900000001-1",
            direccion="Calle 200 # 20-20",
            verificado=True,
        )
        db.add(otro_conjunto)
        db.commit()
        db.refresh(otro_conjunto)

        id_contenido = _crear_modulo(client, admin_sistema_auth_headers)
        response = client.post(
            f"{URL}/{id_contenido}/enviar",
            json={"conjuntos": [str(conjunto_verificado.id_conjunto_residencial), str(otro_conjunto.id_conjunto_residencial)]},
            headers=admin_sistema_auth_headers,
        )
        assert response.status_code == 201
        assert len(response.json()) == 2

    def test_notifica_a_los_residentes_del_conjunto_con_el_tipo_manual(
        self, client: TestClient, admin_sistema_auth_headers, db: Session, conjunto_verificado, test_user
    ):
        id_contenido = _crear_modulo(client, admin_sistema_auth_headers)
        response = client.post(
            f"{URL}/{id_contenido}/enviar",
            json={"conjuntos": [str(conjunto_verificado.id_conjunto_residencial)]},
            headers=admin_sistema_auth_headers,
        )
        assert response.status_code == 201

        notif = (
            db.query(Notificacion)
            .filter(Notificacion.tipo == "CONTENIDO_RECOMENDADO_MANUAL", Notificacion.id_referencia == uuid.UUID(id_contenido))
            .one()
        )
        destinatarios = db.query(NotificacionDestinatario).filter_by(id_notificacion=notif.id).all()
        assert len(destinatarios) == 1
        assert destinatarios[0].id_usuario == test_user.id_usuario

    def test_conjunto_sin_residentes_no_genera_notificacion_pero_el_envio_queda(
        self, client: TestClient, admin_sistema_auth_headers, db: Session, conjunto_verificado_sin_admin
    ):
        """¿Qué? conjunto_verificado_sin_admin no tiene ningún residente
        creado — el envío debe quedar registrado igual, solo sin
        notificación (nadie a quién avisarle)."""
        id_contenido = _crear_modulo(client, admin_sistema_auth_headers)
        response = client.post(
            f"{URL}/{id_contenido}/enviar",
            json={"conjuntos": [str(conjunto_verificado_sin_admin.id_conjunto_residencial)]},
            headers=admin_sistema_auth_headers,
        )
        assert response.status_code == 201

        notif = db.query(Notificacion).filter(Notificacion.tipo == "CONTENIDO_RECOMENDADO_MANUAL").first()
        assert notif is None

        listado = client.get(f"{URL}/{id_contenido}/envios", headers=admin_sistema_auth_headers)
        assert len(listado.json()) == 1

    def test_el_residente_abre_el_modulo_desde_la_notificacion_manual(
        self, client: TestClient, admin_sistema_auth_headers, auth_headers, conjunto_verificado, test_user
    ):
        """¿Qué? Punta a punta: el flujo que sigue ResidenteDashboard.tsx
        (irAContenidoRecomendado) para una notificación
        CONTENIDO_RECOMENDADO_MANUAL — pide el módulo por id_referencia,
        no una auditoría."""
        id_contenido = _crear_modulo(client, admin_sistema_auth_headers)
        client.post(
            f"{URL}/{id_contenido}/enviar",
            json={"conjuntos": [str(conjunto_verificado.id_conjunto_residencial)]},
            headers=admin_sistema_auth_headers,
        )

        notificaciones = client.get("/api/v1/notificaciones/mis-notificaciones", headers=auth_headers)
        assert notificaciones.status_code == 200
        notif = next(n for n in notificaciones.json() if n["tipo"] == "CONTENIDO_RECOMENDADO_MANUAL")
        assert notif["id_referencia"] == id_contenido

        modulo = client.get(f"{URL}/{notif['id_referencia']}", headers=auth_headers)
        assert modulo.status_code == 200
        assert modulo.json()["modulo_categoria"] == "Separación en la fuente"


class TestListarEnvios:
    def test_sin_login_devuelve_401(self, client: TestClient):
        assert client.get(f"{URL}/{uuid.uuid4()}/envios").status_code == 401

    def test_residente_no_puede_verlo(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        id_contenido = _crear_modulo(client, admin_sistema_auth_headers)
        assert client.get(f"{URL}/{id_contenido}/envios", headers=auth_headers).status_code == 403

    def test_modulo_sin_envios_devuelve_lista_vacia(self, client: TestClient, admin_sistema_auth_headers):
        id_contenido = _crear_modulo(client, admin_sistema_auth_headers)
        response = client.get(f"{URL}/{id_contenido}/envios", headers=admin_sistema_auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_modulo_inexistente_devuelve_404(self, client: TestClient, admin_sistema_auth_headers):
        response = client.get(f"{URL}/{uuid.uuid4()}/envios", headers=admin_sistema_auth_headers)
        assert response.status_code == 404
