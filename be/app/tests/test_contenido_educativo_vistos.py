"""
Módulo: tests/test_contenido_educativo_vistos.py
Descripción: Pruebas de las lecciones vistas por cada Residente (HU-005).
¿Para qué? "Visto" y el avance de "Aprende a reciclar" dependen de que se guarde
           una vez por Residente y módulo, y de que cada uno vea solo lo suyo.
"""

import uuid

from fastapi.testclient import TestClient

from app.models.contenido_educativo_visto import ContenidoEducativoVisto

URL = "/api/v1/contenido-educativo"


def _payload(**cambios):
    datos = {
        "modulo_categoria": "Separación en la fuente",
        "titulo_tema": "Código de colores de bolsas",
        "cuerpo_texto": "Blanco: aprovechables. Negro: no aprovechables. Verde: orgánicos.",
    }
    datos.update(cambios)
    return datos


def _crear(client: TestClient, headers: dict[str, str], **cambios) -> str:
    respuesta = client.post(URL, json=_payload(**cambios), headers=headers)
    assert respuesta.status_code == 201, respuesta.text
    return respuesta.json()["id_contenido"]


class TestVistos:
    def test_sin_login_devuelve_401(self, client: TestClient):
        assert client.get(f"{URL}/vistos").status_code == 401
        assert client.post(f"{URL}/vistos", json={"ids": []}).status_code == 401

    def test_solo_el_residente_marca_y_consulta(
        self, client: TestClient, reciclador_auth_headers, admin_sistema_auth_headers, admin_conjunto_auth_headers
    ):
        for headers in (reciclador_auth_headers, admin_sistema_auth_headers, admin_conjunto_auth_headers):
            assert client.get(f"{URL}/vistos", headers=headers).status_code == 403
            assert client.post(f"{URL}/vistos", json={"ids": []}, headers=headers).status_code == 403

    def test_empieza_sin_nada_visto(self, client: TestClient, auth_headers):
        respuesta = client.get(f"{URL}/vistos", headers=auth_headers)
        assert respuesta.status_code == 200
        assert respuesta.json() == {"ids": []}

    def test_marcar_guarda_y_devuelve_todo_lo_visto(
        self, client: TestClient, auth_headers, admin_sistema_auth_headers
    ):
        uno = _crear(client, admin_sistema_auth_headers)
        dos = _crear(client, admin_sistema_auth_headers, titulo_tema="Ecopuntos y puntos limpios")

        marcado = client.post(f"{URL}/vistos", json={"ids": [uno]}, headers=auth_headers)
        assert marcado.json() == {"ids": [uno]}

        marcado = client.post(f"{URL}/vistos", json={"ids": [dos]}, headers=auth_headers)
        assert set(marcado.json()["ids"]) == {uno, dos}
        assert set(client.get(f"{URL}/vistos", headers=auth_headers).json()["ids"]) == {uno, dos}

    def test_abrir_la_misma_leccion_dos_veces_no_duplica(
        self, client: TestClient, db, test_user, auth_headers, admin_sistema_auth_headers
    ):
        contenido = _crear(client, admin_sistema_auth_headers)

        client.post(f"{URL}/vistos", json={"ids": [contenido, contenido]}, headers=auth_headers)
        client.post(f"{URL}/vistos", json={"ids": [contenido]}, headers=auth_headers)

        filas = db.query(ContenidoEducativoVisto).filter_by(id_usuario=test_user.id_usuario).count()
        assert filas == 1

    def test_un_id_que_no_existe_se_ignora(self, client: TestClient, auth_headers):
        respuesta = client.post(f"{URL}/vistos", json={"ids": [str(uuid.uuid4())]}, headers=auth_headers)
        assert respuesta.status_code == 200
        assert respuesta.json() == {"ids": []}

    def test_el_tope_de_ids_rechaza_listas_enormes(self, client: TestClient, auth_headers):
        ids = [str(uuid.uuid4()) for _ in range(101)]
        assert client.post(f"{URL}/vistos", json={"ids": ids}, headers=auth_headers).status_code == 422

    def test_cada_residente_ve_solo_lo_suyo(
        self, client: TestClient, db, test_user, auth_headers, admin_sistema_auth_headers, unverified_user
    ):
        contenido = _crear(client, admin_sistema_auth_headers)
        otro = ContenidoEducativoVisto(id_usuario=unverified_user.id_usuario, id_contenido=uuid.UUID(contenido))
        db.add(otro)
        db.commit()

        assert client.get(f"{URL}/vistos", headers=auth_headers).json() == {"ids": []}

    def test_si_se_elimina_el_modulo_sus_vistos_desaparecen(
        self, client: TestClient, db, auth_headers, admin_sistema_auth_headers
    ):
        contenido = _crear(client, admin_sistema_auth_headers)
        client.post(f"{URL}/vistos", json={"ids": [contenido]}, headers=auth_headers)

        assert client.delete(f"{URL}/{contenido}", headers=admin_sistema_auth_headers).status_code == 204

        assert client.get(f"{URL}/vistos", headers=auth_headers).json() == {"ids": []}

    def test_la_ruta_vistos_no_se_confunde_con_un_id_de_modulo(self, client: TestClient, auth_headers):
        # ¿Qué? "/vistos" está declarada antes de "/{id_contenido}"; si no, daría 422 al leer "vistos" como UUID.
        assert client.get(f"{URL}/vistos", headers=auth_headers).status_code == 200
