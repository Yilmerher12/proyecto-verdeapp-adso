"""
Módulo: tests/test_contenido_educativo.py
Descripción: Pruebas del catálogo de contenido educativo (RQF-004/RQF-010).
¿Para qué? HU-005 (cualquier usuario ve el catálogo) requiere login pero no
           un rol específico. HU-012/013/014 (crear/editar/eliminar) son
           exclusivas del Admin Sistema — hay que probar que otros roles
           reciban 403.
"""

import uuid

from fastapi.testclient import TestClient

URL = "/api/v1/contenido-educativo"


def _payload(**overrides):
    data = {
        "modulo_categoria": "Separación en la fuente",
        "titulo_tema": "Código de colores de bolsas",
        "cuerpo_texto": "Blanco: aprovechables. Negro: no aprovechables. Verde: orgánicos.",
        "url_video": "https://www.youtube.com/watch?v=abc123",
        "url_guia": "https://drive.google.com/guia.pdf",
    }
    data.update(overrides)
    return data


class TestListar:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get(URL)
        assert response.status_code == 401

    def test_con_login_devuelve_lista_vacia_si_no_hay_contenido(
        self, client: TestClient, auth_headers: dict[str, str]
    ):
        response = client.get(URL, headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_cualquier_rol_autenticado_puede_ver_el_catalogo(
        self, client: TestClient, reciclador_auth_headers: dict[str, str], admin_sistema_auth_headers: dict[str, str]
    ):
        client.post(URL, json=_payload(), headers=admin_sistema_auth_headers)
        response = client.get(URL, headers=reciclador_auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1


class TestCrear:
    def test_admin_sistema_puede_crear(
        self, client: TestClient, admin_sistema_auth_headers: dict[str, str]
    ):
        response = client.post(URL, json=_payload(), headers=admin_sistema_auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["titulo_tema"] == "Código de colores de bolsas"
        assert data["url_video"] == "https://www.youtube.com/watch?v=abc123"

    def test_residente_no_puede_crear(
        self, client: TestClient, auth_headers: dict[str, str]
    ):
        response = client.post(URL, json=_payload(), headers=auth_headers)
        assert response.status_code == 403

    def test_reciclador_no_puede_crear(
        self, client: TestClient, reciclador_auth_headers: dict[str, str]
    ):
        response = client.post(URL, json=_payload(), headers=reciclador_auth_headers)
        assert response.status_code == 403

    def test_titulo_vacio_devuelve_422(
        self, client: TestClient, admin_sistema_auth_headers: dict[str, str]
    ):
        response = client.post(
            URL, json=_payload(titulo_tema="   "), headers=admin_sistema_auth_headers
        )
        assert response.status_code == 422

    def test_titulo_muy_corto_devuelve_422(
        self, client: TestClient, admin_sistema_auth_headers: dict[str, str]
    ):
        """CA-012.1/CA-012.3 — el título necesita al menos 5 caracteres."""
        response = client.post(
            URL, json=_payload(titulo_tema="Hola"), headers=admin_sistema_auth_headers
        )
        assert response.status_code == 422

    def test_cuerpo_muy_corto_devuelve_422(
        self, client: TestClient, admin_sistema_auth_headers: dict[str, str]
    ):
        """CA-012.1/CA-012.3 — el cuerpo de texto necesita al menos 20 caracteres."""
        response = client.post(
            URL, json=_payload(cuerpo_texto="Muy corto"), headers=admin_sistema_auth_headers
        )
        assert response.status_code == 422

    def test_video_y_guia_son_opcionales(
        self, client: TestClient, admin_sistema_auth_headers: dict[str, str]
    ):
        response = client.post(
            URL,
            json=_payload(url_video=None, url_guia=None),
            headers=admin_sistema_auth_headers,
        )
        assert response.status_code == 201
        assert response.json()["url_video"] is None


class TestEditarYEliminar:
    def test_admin_sistema_puede_editar(
        self, client: TestClient, admin_sistema_auth_headers: dict[str, str]
    ):
        creado = client.post(URL, json=_payload(), headers=admin_sistema_auth_headers).json()

        response = client.put(
            f"{URL}/{creado['id_contenido']}",
            json=_payload(titulo_tema="Título editado"),
            headers=admin_sistema_auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["titulo_tema"] == "Título editado"

    def test_editar_uno_inexistente_devuelve_404(
        self, client: TestClient, admin_sistema_auth_headers: dict[str, str]
    ):
        response = client.put(
            f"{URL}/{uuid.uuid4()}", json=_payload(), headers=admin_sistema_auth_headers
        )
        assert response.status_code == 404

    def test_residente_no_puede_editar(
        self, client: TestClient, auth_headers: dict[str, str], admin_sistema_auth_headers: dict[str, str]
    ):
        creado = client.post(URL, json=_payload(), headers=admin_sistema_auth_headers).json()

        response = client.put(
            f"{URL}/{creado['id_contenido']}", json=_payload(), headers=auth_headers
        )
        assert response.status_code == 403

    def test_admin_sistema_puede_eliminar(
        self, client: TestClient, admin_sistema_auth_headers: dict[str, str]
    ):
        creado = client.post(URL, json=_payload(), headers=admin_sistema_auth_headers).json()

        response = client.delete(f"{URL}/{creado['id_contenido']}", headers=admin_sistema_auth_headers)
        assert response.status_code == 204

        listado = client.get(URL, headers=admin_sistema_auth_headers).json()
        assert listado == []

    def test_residente_no_puede_eliminar(
        self, client: TestClient, auth_headers: dict[str, str], admin_sistema_auth_headers: dict[str, str]
    ):
        creado = client.post(URL, json=_payload(), headers=admin_sistema_auth_headers).json()

        response = client.delete(f"{URL}/{creado['id_contenido']}", headers=auth_headers)
        assert response.status_code == 403

    def test_eliminar_uno_inexistente_devuelve_404(
        self, client: TestClient, admin_sistema_auth_headers: dict[str, str]
    ):
        response = client.delete(f"{URL}/{uuid.uuid4()}", headers=admin_sistema_auth_headers)
        assert response.status_code == 404


class TestOrden:
    """
    ¿Qué? Orden de lectura de los módulos dentro de su categoría (issue #705).
    ¿Para qué? "Anterior / Siguiente" y "la primera lección sin ver" dependen de este orden.
    ¿Impacto? Un módulo nuevo queda al final de su categoría; el catálogo sale agrupado por categoría.
    """

    def _crear(self, client, headers, **overrides):
        respuesta = client.post(URL, json=_payload(**overrides), headers=headers)
        assert respuesta.status_code == 201
        return respuesta.json()

    def test_los_modulos_nuevos_de_una_categoria_quedan_al_final(
        self, client: TestClient, admin_sistema_auth_headers: dict[str, str]
    ):
        primero = self._crear(client, admin_sistema_auth_headers, titulo_tema="Primer módulo de la categoría")
        segundo = self._crear(client, admin_sistema_auth_headers, titulo_tema="Segundo módulo de la categoría")

        assert primero["orden"] == 1
        assert segundo["orden"] == 2

    def test_cada_categoria_lleva_su_propia_cuenta(
        self, client: TestClient, admin_sistema_auth_headers: dict[str, str]
    ):
        self._crear(client, admin_sistema_auth_headers, titulo_tema="Módulo de la categoría uno")
        otra = self._crear(
            client, admin_sistema_auth_headers, modulo_categoria="Otra categoría", titulo_tema="Módulo de otra categoría"
        )

        assert otra["orden"] == 1

    def test_el_catalogo_sale_agrupado_por_categoria_y_en_orden(
        self, client: TestClient, auth_headers: dict[str, str], admin_sistema_auth_headers: dict[str, str]
    ):
        self._crear(client, admin_sistema_auth_headers, modulo_categoria="B categoría", titulo_tema="B primero")
        self._crear(client, admin_sistema_auth_headers, modulo_categoria="A categoría", titulo_tema="A primero")
        self._crear(client, admin_sistema_auth_headers, modulo_categoria="B categoría", titulo_tema="B segundo")

        lista = client.get(URL, headers=auth_headers).json()

        assert [m["titulo_tema"] for m in lista] == ["A primero", "B primero", "B segundo"]

    def test_un_modulo_que_cambia_de_categoria_pasa_al_final_de_la_nueva(
        self, client: TestClient, admin_sistema_auth_headers: dict[str, str]
    ):
        self._crear(client, admin_sistema_auth_headers, modulo_categoria="Destino", titulo_tema="Ya estaba en destino")
        movido = self._crear(client, admin_sistema_auth_headers, modulo_categoria="Origen", titulo_tema="Se va a mover")

        respuesta = client.put(
            f"{URL}/{movido['id_contenido']}",
            json=_payload(modulo_categoria="Destino", titulo_tema="Se va a mover"),
            headers=admin_sistema_auth_headers,
        )

        assert respuesta.status_code == 200
        assert respuesta.json()["orden"] == 2

    def test_editar_sin_cambiar_de_categoria_conserva_el_orden(
        self, client: TestClient, admin_sistema_auth_headers: dict[str, str]
    ):
        self._crear(client, admin_sistema_auth_headers, titulo_tema="Primer módulo de la categoría")
        segundo = self._crear(client, admin_sistema_auth_headers, titulo_tema="Segundo módulo de la categoría")

        respuesta = client.put(
            f"{URL}/{segundo['id_contenido']}",
            json=_payload(titulo_tema="Segundo módulo con otro título"),
            headers=admin_sistema_auth_headers,
        )

        assert respuesta.json()["orden"] == 2

    def test_crear_no_acepta_un_orden_enviado_a_mano(
        self, client: TestClient, admin_sistema_auth_headers: dict[str, str]
    ):
        creado = self._crear(client, admin_sistema_auth_headers, orden=99)

        assert creado["orden"] == 1
