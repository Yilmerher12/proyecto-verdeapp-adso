"""
Módulo: tests/test_auditoria_conjunto.py
Descripción: Pruebas de la auditoría del Reciclador al conjunto (RQF-009).
¿Para qué? Cubrir el único endpoint que hoy sube archivos en todo el
           backend: falta de autenticación/rol, autorización real en el
           conjunto, validación del nivel de desempeño y del tipo de
           archivo de evidencia, y el caso exitoso completo.
"""
import io
import uuid
from datetime import datetime, time, timedelta

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.administrador_conjunto_asignacion import AdministradorConjuntoAsignacion
from app.models.auditoria_conjunto import AuditoriaConjunto
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.localidad import Localidad
from app.models.reciclador import Reciclador
from app.models.residente import Residente
from app.models.rol import RolId
from app.models.reciclador_conjunto import RecicladorConjunto
from app.models.unidad import Unidad
from app.models.usuario import Usuario
from app.services.agenda_conjunto_service import HUSO_BOGOTA
from app.utils.security import create_access_token, hash_password


def _generar_imagen_real() -> bytes:
    """¿Qué? Una imagen PNG real y mínima (2x2 píxeles), no solo bytes con
    una etiqueta de imagen. ¿Para qué? Desde que auditoria_conjunto_service
    valida el contenido real del archivo con Pillow (no solo el Content-Type
    que manda el cliente), un archivo de prueba con bytes de texto plano ya
    no pasa como "evidencia válida" — hace falta una imagen real."""
    buffer = io.BytesIO()
    Image.new("RGB", (2, 2), color="green").save(buffer, format="PNG")
    return buffer.getvalue()


IMAGEN_VALIDA = _generar_imagen_real()


@pytest.fixture()
def reciclador_autorizado(db: Session, reciclador_test: Usuario, conjunto_verificado: ConjuntoResidencial) -> Reciclador:
    """Autoriza al reciclador de prueba en conjunto_verificado (RQF-016 ya aceptado)."""
    reciclador = db.query(Reciclador).filter(Reciclador.id_usuario == reciclador_test.id_usuario).one()
    db.add(RecicladorConjunto(
        id_reciclador=reciclador.id_reciclador,
        id_conjunto_residencial=conjunto_verificado.id_conjunto_residencial,
    ))
    db.commit()
    return reciclador


def _payload_valido(id_conjunto: int) -> dict:
    return {
        "id_conjunto_residencial": str(id_conjunto),
        "nivel_desempeno": "REGULAR",
        "tema_educativo": "Separación en la fuente y código de colores",
    }


def _archivo_valido() -> dict:
    return {"evidencias": ("foto.jpg", io.BytesIO(IMAGEN_VALIDA), "image/jpeg")}


def _archivos_multiples(cantidad: int) -> list[tuple[str, tuple[str, io.BytesIO, str]]]:
    """¿Qué? Varios archivos bajo el mismo campo "evidencias" — así es como
    se manda un `list[UploadFile]` de FastAPI desde un cliente HTTP real
    (varias partes multipart con el mismo nombre de campo)."""
    return [("evidencias", (f"foto{i}.jpg", io.BytesIO(IMAGEN_VALIDA), "image/jpeg")) for i in range(cantidad)]


def _avisar_llegada(client: TestClient, headers: dict, id_conjunto) -> None:
    """¿Qué? Marca a este reciclador como presente en el conjunto — ahora
    es un requisito para poder auditar (control de presencia: un
    reciclador debe avisar su llegada antes de usar SHUT lleno/libre,
    finalización o auditar). Sin esto, crear_auditoria rechaza con 400."""
    response = client.post(
        "/api/v1/notificaciones/enviar",
        headers=headers,
        json={"tipo": "LLEGADA_RECICLADOR", "id_conjunto_residencial": str(id_conjunto)},
    )
    assert response.status_code == 201, response.json()


class TestCrearAuditoria:
    def test_sin_login_devuelve_401(self, client: TestClient, conjunto_verificado):
        response = client.post(
            "/api/v1/auditorias-conjunto",
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        )
        assert response.status_code == 401

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers, conjunto_verificado):
        """auth_headers pertenece a un Residente, no a un Reciclador."""
        response = client.post(
            "/api/v1/auditorias-conjunto",
            headers=auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        )
        assert response.status_code == 403

    def test_sin_autorizacion_en_el_conjunto_devuelve_403(
        self, client: TestClient, reciclador_auth_headers, conjunto_verificado
    ):
        """El reciclador de prueba existe, pero NO está autorizado en este conjunto."""
        response = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        )
        assert response.status_code == 403

    def test_reciclador_revocado_no_puede_auditar(
        self, client: TestClient, db: Session, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        """¿Qué? Confirma que revocar el acceso (issue reciclador-revocar-acceso)
        de verdad le quita la autorización — no solo la oculta en el listado."""
        db.execute(
            text(
                "UPDATE recicladores_conjuntos SET fecha_revocacion = now() "
                "WHERE id_reciclador = :rid AND id_conjunto_residencial = :cid"
            ),
            {"rid": reciclador_autorizado.id_reciclador, "cid": conjunto_verificado.id_conjunto_residencial},
        )
        db.commit()

        response = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        )
        assert response.status_code == 403

    def test_nivel_de_desempeno_invalido_devuelve_422(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        payload = _payload_valido(conjunto_verificado.id_conjunto_residencial)
        payload["nivel_desempeno"] = "SUPER_BIEN"
        response = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=payload,
            files=_archivo_valido(),
        )
        assert response.status_code == 422

    def test_evidencia_con_tipo_no_permitido_devuelve_400(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        response = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files={"evidencias": ("nota.txt", io.BytesIO(b"no soy una imagen"), "text/plain")},
        )
        assert response.status_code == 400

    def test_evidencia_con_content_type_falso_devuelve_400(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        """¿Qué? El cliente declara Content-Type "image/jpeg" (pasa el primer
        filtro), pero el contenido real es texto plano, no una imagen — debe
        rechazarse igual, porque ahora también se valida el contenido real."""
        response = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files={"evidencias": ("foto.jpg", io.BytesIO(b"esto no es una imagen de verdad"), "image/jpeg")},
        )
        assert response.status_code == 400

    def test_envio_exitoso_crea_la_auditoria(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        _avisar_llegada(client, reciclador_auth_headers, conjunto_verificado.id_conjunto_residencial)
        response = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["nivel_desempeno"] == "REGULAR"
        assert data["nombre_conjunto"] == conjunto_verificado.nombre_conjunto
        assert data["nombre_reciclador"]
        assert data["ruta_evidencia"].startswith("/uploads/evidencias-auditoria/")
        assert data["descripcion"] is None

    def test_descripcion_es_opcional_pero_se_guarda_si_llega(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        _avisar_llegada(client, reciclador_auth_headers, conjunto_verificado.id_conjunto_residencial)
        payload = _payload_valido(conjunto_verificado.id_conjunto_residencial)
        payload["descripcion"] = "El material orgánico llegó mezclado."
        response = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=payload,
            files=_archivo_valido(),
        )
        assert response.status_code == 201
        assert response.json()["descripcion"] == "El material orgánico llegó mezclado."

    def test_admite_hasta_3_fotos_de_evidencia(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        _avisar_llegada(client, reciclador_auth_headers, conjunto_verificado.id_conjunto_residencial)
        response = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivos_multiples(3),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["ruta_evidencia"].startswith("/uploads/evidencias-auditoria/")
        assert data["ruta_evidencia_2"].startswith("/uploads/evidencias-auditoria/")
        assert data["ruta_evidencia_3"].startswith("/uploads/evidencias-auditoria/")

    def test_mas_de_3_fotos_devuelve_400(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        response = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivos_multiples(4),
        )
        assert response.status_code == 400

    def test_no_puede_auditar_sin_haber_avisado_llegada(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        """¿Qué? Control de presencia (issue de presencia del reciclador):
        auditar exige haber avisado la llegada primero, igual que
        SHUT lleno/libre y finalización."""
        response = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        )
        assert response.status_code == 400
        assert "llegada" in response.json()["detail"].lower()

    def test_auditar_el_mismo_conjunto_antes_de_24h_devuelve_400(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        """CA-010.3 / RN-002 de RQF-009 — cooldown de 24 horas."""
        _avisar_llegada(client, reciclador_auth_headers, conjunto_verificado.id_conjunto_residencial)
        primera = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        )
        assert primera.status_code == 201

        segunda = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        )
        assert segunda.status_code == 400


class TestListarMisAuditorias:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get("/api/v1/auditorias-conjunto/mias")
        assert response.status_code == 401

    def test_devuelve_las_auditorias_ya_enviadas(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        _avisar_llegada(client, reciclador_auth_headers, conjunto_verificado.id_conjunto_residencial)
        client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        )
        response = client.get("/api/v1/auditorias-conjunto/mias", headers=reciclador_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["id_conjunto_residencial"] == str(conjunto_verificado.id_conjunto_residencial)

    def test_reciclador_sin_auditorias_ve_lista_vacia(self, client: TestClient, reciclador_auth_headers):
        response = client.get("/api/v1/auditorias-conjunto/mias", headers=reciclador_auth_headers)
        assert response.status_code == 200
        assert response.json() == {"items": [], "total": 0}

    # ¿Qué? El panel del Reciclador muestra un conjunto a la vez, así que su historial se
    #       pide con `id_conjunto`. Sin el parámetro devuelve todas (como siempre).
    def test_id_conjunto_filtra_solo_las_de_ese_conjunto(
        self,
        client: TestClient,
        db: Session,
        reciclador_auth_headers,
        reciclador_autorizado,
        conjunto_verificado,
        conjunto_verificado_sin_admin,
    ):
        lunes = _lunes_actual()
        _sembrar_auditoria(db, reciclador_autorizado, conjunto_verificado.id_conjunto_residencial, "BUENA", "Reciclaje de vidrio", _momento_bogota(lunes, -2))
        _sembrar_auditoria(db, reciclador_autorizado, conjunto_verificado_sin_admin.id_conjunto_residencial, "REGULAR", "Residuos orgánicos", _momento_bogota(lunes, -1))

        todas = client.get("/api/v1/auditorias-conjunto/mias", headers=reciclador_auth_headers).json()
        assert todas["total"] == 2

        del_primero = client.get(
            "/api/v1/auditorias-conjunto/mias",
            headers=reciclador_auth_headers,
            params={"id_conjunto": str(conjunto_verificado.id_conjunto_residencial)},
        ).json()
        assert del_primero["total"] == 1
        assert [a["id_conjunto_residencial"] for a in del_primero["items"]] == [str(conjunto_verificado.id_conjunto_residencial)]

    def test_id_conjunto_sin_auditorias_devuelve_lista_vacia(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado_sin_admin
    ):
        response = client.get(
            "/api/v1/auditorias-conjunto/mias",
            headers=reciclador_auth_headers,
            params={"id_conjunto": str(conjunto_verificado_sin_admin.id_conjunto_residencial)},
        )
        assert response.status_code == 200
        assert response.json() == {"items": [], "total": 0}

    def test_id_conjunto_con_formato_invalido_devuelve_422(self, client: TestClient, reciclador_auth_headers):
        response = client.get(
            "/api/v1/auditorias-conjunto/mias", headers=reciclador_auth_headers, params={"id_conjunto": "no-es-un-uuid"}
        )
        assert response.status_code == 422


class TestNotificacionAlPublicar:
    """¿Por qué? Al crear una auditoría debe avisarse a residentes y Admin
    de Conjunto — reutilizando el sistema de notificaciones ya existente,
    con el tipo AUDITORIA_PUBLICADA y su id_referencia."""

    def test_residente_del_conjunto_recibe_la_notificacion(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado, auth_headers
    ):
        """auth_headers pertenece a un Residente de conjunto_verificado (ver conftest)."""
        _avisar_llegada(client, reciclador_auth_headers, conjunto_verificado.id_conjunto_residencial)
        creada = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        ).json()

        response = client.get("/api/v1/notificaciones/mis-notificaciones", headers=auth_headers)
        assert response.status_code == 200
        notifs = [n for n in response.json() if n["tipo"] == "AUDITORIA_PUBLICADA"]
        assert len(notifs) == 1
        assert notifs[0]["id_referencia"] == creada["id_auditoria"]

    def test_admin_de_conjunto_recibe_la_notificacion(
        self,
        client: TestClient,
        reciclador_auth_headers,
        reciclador_autorizado,
        conjunto_verificado,
        admin_conjunto_test,
        admin_conjunto_auth_headers,
    ):
        _avisar_llegada(client, reciclador_auth_headers, conjunto_verificado.id_conjunto_residencial)
        client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        )
        response = client.get("/api/v1/notificaciones/mis-notificaciones", headers=admin_conjunto_auth_headers)
        assert response.status_code == 200
        assert any(n["tipo"] == "AUDITORIA_PUBLICADA" for n in response.json())

    def test_el_reciclador_que_la_envio_no_se_autonotifica(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        _avisar_llegada(client, reciclador_auth_headers, conjunto_verificado.id_conjunto_residencial)
        creada = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        )
        assert creada.status_code == 201
        response = client.get("/api/v1/notificaciones/mis-notificaciones", headers=reciclador_auth_headers)
        assert response.status_code == 200
        assert not any(n["tipo"] == "AUDITORIA_PUBLICADA" for n in response.json())


class TestNotificacionDeContenidoRecomendado:
    """¿Por qué? Issue #4 (RQF-013) — un desempeño Regular o Malo debe
    avisarle a los Residentes del conjunto que hay contenido educativo
    recomendado sobre el tema calificado; un desempeño Bueno no, y el
    Admin de Conjunto tampoco recibe este tipo (no puede entrar a
    "Aprender", ver RoleGuard de /catalogo-educativo en App.tsx)."""

    def test_nivel_regular_notifica_a_los_residentes(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado, auth_headers
    ):
        _avisar_llegada(client, reciclador_auth_headers, conjunto_verificado.id_conjunto_residencial)
        payload = _payload_valido(conjunto_verificado.id_conjunto_residencial)
        payload["nivel_desempeno"] = "REGULAR"
        creada = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=payload,
            files=_archivo_valido(),
        ).json()

        response = client.get("/api/v1/notificaciones/mis-notificaciones", headers=auth_headers)
        assert response.status_code == 200
        notifs = [n for n in response.json() if n["tipo"] == "CONTENIDO_RECOMENDADO"]
        assert len(notifs) == 1
        assert notifs[0]["id_referencia"] == creada["id_auditoria"]
        # Decisión del 2026-09-14: mensaje corto, sin repetir tema ni nivel
        # (ya visibles al abrir la recomendación) — que se vea conciso en
        # la tarjeta de notificación del panel del Residente.
        assert notifs[0]["mensaje"] == "El reciclador recomienda contenido educativo para tu conjunto."

    def test_nivel_deficiente_notifica_a_los_residentes(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado, auth_headers
    ):
        _avisar_llegada(client, reciclador_auth_headers, conjunto_verificado.id_conjunto_residencial)
        payload = _payload_valido(conjunto_verificado.id_conjunto_residencial)
        payload["nivel_desempeno"] = "DEFICIENTE"
        client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=payload,
            files=_archivo_valido(),
        )

        response = client.get("/api/v1/notificaciones/mis-notificaciones", headers=auth_headers)
        assert response.status_code == 200
        assert any(n["tipo"] == "CONTENIDO_RECOMENDADO" for n in response.json())

    def test_nivel_bueno_no_notifica(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado, auth_headers
    ):
        _avisar_llegada(client, reciclador_auth_headers, conjunto_verificado.id_conjunto_residencial)
        payload = _payload_valido(conjunto_verificado.id_conjunto_residencial)
        payload["nivel_desempeno"] = "BUENA"
        client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=payload,
            files=_archivo_valido(),
        )

        response = client.get("/api/v1/notificaciones/mis-notificaciones", headers=auth_headers)
        assert response.status_code == 200
        assert not any(n["tipo"] == "CONTENIDO_RECOMENDADO" for n in response.json())

    def test_admin_de_conjunto_no_recibe_este_tipo(
        self,
        client: TestClient,
        reciclador_auth_headers,
        reciclador_autorizado,
        conjunto_verificado,
        admin_conjunto_test,
        admin_conjunto_auth_headers,
    ):
        _avisar_llegada(client, reciclador_auth_headers, conjunto_verificado.id_conjunto_residencial)
        payload = _payload_valido(conjunto_verificado.id_conjunto_residencial)
        payload["nivel_desempeno"] = "REGULAR"
        client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=payload,
            files=_archivo_valido(),
        )

        response = client.get("/api/v1/notificaciones/mis-notificaciones", headers=admin_conjunto_auth_headers)
        assert response.status_code == 200
        assert not any(n["tipo"] == "CONTENIDO_RECOMENDADO" for n in response.json())


class TestObtenerAuditoriaPorId:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get(f"/api/v1/auditorias-conjunto/{uuid.uuid4()}")
        assert response.status_code == 401

    def test_id_inexistente_devuelve_404(self, client: TestClient, auth_headers):
        response = client.get(f"/api/v1/auditorias-conjunto/{uuid.uuid4()}", headers=auth_headers)
        assert response.status_code == 404

    def test_residente_del_conjunto_puede_verla(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado, auth_headers
    ):
        _avisar_llegada(client, reciclador_auth_headers, conjunto_verificado.id_conjunto_residencial)
        creada = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        ).json()

        response = client.get(f"/api/v1/auditorias-conjunto/{creada['id_auditoria']}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["nivel_desempeno"] == "REGULAR"

    def test_admin_del_conjunto_puede_verla(
        self,
        client: TestClient,
        reciclador_auth_headers,
        reciclador_autorizado,
        conjunto_verificado,
        admin_conjunto_test,
        admin_conjunto_auth_headers,
    ):
        _avisar_llegada(client, reciclador_auth_headers, conjunto_verificado.id_conjunto_residencial)
        creada = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        ).json()

        response = client.get(
            f"/api/v1/auditorias-conjunto/{creada['id_auditoria']}", headers=admin_conjunto_auth_headers
        )
        assert response.status_code == 200

    def test_residente_de_otro_conjunto_no_puede_verla(
        self,
        client: TestClient,
        db: Session,
        reciclador_auth_headers,
        reciclador_autorizado,
        conjunto_verificado,
        localidad_test: Localidad,
    ):
        _avisar_llegada(client, reciclador_auth_headers, conjunto_verificado.id_conjunto_residencial)
        creada = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        ).json()

        # Un residente de OTRO conjunto, distinto al auditado.
        otro_conjunto = ConjuntoResidencial(
            id_localidad=localidad_test.id_localidad,
            nombre_conjunto="OTRO CONJUNTO",
            direccion="Calle falsa 123",
            verificado=True,
        )
        db.add(otro_conjunto)
        db.flush()
        otro_usuario = Usuario(
            correo_electronico="otro.residente@verdeapp.com",
            id_rol=RolId.RESIDENTE,
            password=hash_password("Password1"),
            is_active=True,
        )
        db.add(otro_usuario)
        db.flush()
        otra_unidad = Unidad(id_conjunto_residencial=otro_conjunto.id_conjunto_residencial, torre="B", apto="202")
        db.add(otra_unidad)
        db.flush()
        db.add(Residente(id_usuario=otro_usuario.id_usuario, id_unidad=otra_unidad.id_unidad, nombre="OTRO", apellidos="RESIDENTE"))
        db.commit()

        token = create_access_token(data={"sub": otro_usuario.correo_electronico, "role_id": otro_usuario.id_rol})
        headers = {"Authorization": f"Bearer {token}"}

        response = client.get(f"/api/v1/auditorias-conjunto/{creada['id_auditoria']}", headers=headers)
        assert response.status_code == 403

    def test_reciclador_que_la_envio_puede_verla(
        self, client: TestClient, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        _avisar_llegada(client, reciclador_auth_headers, conjunto_verificado.id_conjunto_residencial)
        creada = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        ).json()

        response = client.get(f"/api/v1/auditorias-conjunto/{creada['id_auditoria']}", headers=reciclador_auth_headers)
        assert response.status_code == 200

    def test_otro_reciclador_no_puede_verla(
        self, client: TestClient, db: Session, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        """¿Qué? Un Reciclador solo puede ver el detalle de las auditorías
        que ÉL mismo envió — ni siquiera las de otro reciclador autorizado
        en el mismo conjunto."""
        _avisar_llegada(client, reciclador_auth_headers, conjunto_verificado.id_conjunto_residencial)
        creada = client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        ).json()

        otro_usuario = Usuario(
            correo_electronico="otro.reciclador@verdeapp.com",
            id_rol=RolId.RECICLADOR,
            password=hash_password("Password1"),
            is_active=True,
        )
        db.add(otro_usuario)
        db.flush()
        db.add(Reciclador(id_usuario=otro_usuario.id_usuario, nombre="OTRO", apellidos="RECICLADOR", numero_telefonico="3000000099"))
        db.commit()

        token = create_access_token(data={"sub": otro_usuario.correo_electronico, "role_id": otro_usuario.id_rol})
        headers = {"Authorization": f"Bearer {token}"}

        response = client.get(f"/api/v1/auditorias-conjunto/{creada['id_auditoria']}", headers=headers)
        assert response.status_code == 403


class TestListarHistorial:
    """¿Por qué? A diferencia de la notificación (que se pierde al marcarla
    leída), el historial debe quedar siempre consultable — issue #5."""

    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get("/api/v1/auditorias-conjunto/historial")
        assert response.status_code == 401

    def test_reciclador_no_puede_verlo(self, client: TestClient, reciclador_auth_headers):
        response = client.get("/api/v1/auditorias-conjunto/historial", headers=reciclador_auth_headers)
        assert response.status_code == 403

    def test_residente_sin_auditorias_ve_lista_vacia(self, client: TestClient, auth_headers):
        response = client.get("/api/v1/auditorias-conjunto/historial", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == {"items": [], "total": 0}

    def test_residente_ve_las_auditorias_de_su_conjunto_mas_recientes_primero(
        self,
        client: TestClient,
        db: Session,
        reciclador_auth_headers,
        reciclador_autorizado,
        conjunto_verificado,
        auth_headers,
    ):
        """¿Qué? Dos auditorías del mismo conjunto, de dos recicladores
        distintos — no del mismo reciclador dos veces, porque desde que
        existe el cooldown de 24h (RN-002/RQF-009) el mismo reciclador no
        puede volver a auditar el mismo conjunto tan seguido."""
        _avisar_llegada(client, reciclador_auth_headers, conjunto_verificado.id_conjunto_residencial)
        client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data={**_payload_valido(conjunto_verificado.id_conjunto_residencial), "nivel_desempeno": "DEFICIENTE"},
            files=_archivo_valido(),
        )

        otro_usuario = Usuario(
            correo_electronico="segundo.reciclador@verdeapp.com",
            id_rol=RolId.RECICLADOR,
            password=hash_password("Password1"),
            is_active=True,
        )
        db.add(otro_usuario)
        db.flush()
        otro_reciclador = Reciclador(
            id_usuario=otro_usuario.id_usuario, nombre="SEGUNDO", apellidos="RECICLADOR", numero_telefonico="3000000098"
        )
        db.add(otro_reciclador)
        db.flush()
        db.add(RecicladorConjunto(
            id_reciclador=otro_reciclador.id_reciclador,
            id_conjunto_residencial=conjunto_verificado.id_conjunto_residencial,
        ))
        db.commit()
        token_otro = create_access_token(data={"sub": otro_usuario.correo_electronico, "role_id": otro_usuario.id_rol})
        headers_otro = {"Authorization": f"Bearer {token_otro}"}
        _avisar_llegada(client, headers_otro, conjunto_verificado.id_conjunto_residencial)

        client.post(
            "/api/v1/auditorias-conjunto",
            headers=headers_otro,
            data={**_payload_valido(conjunto_verificado.id_conjunto_residencial), "nivel_desempeno": "BUENA"},
            files=_archivo_valido(),
        )

        response = client.get("/api/v1/auditorias-conjunto/historial", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        # ¿Qué? La más reciente (BUENA, enviada segunda) debe ir primero.
        assert data["items"][0]["nivel_desempeno"] == "BUENA"
        assert data["items"][1]["nivel_desempeno"] == "DEFICIENTE"

    def test_admin_de_conjunto_ve_el_mismo_historial(
        self,
        client: TestClient,
        reciclador_auth_headers,
        reciclador_autorizado,
        conjunto_verificado,
        admin_conjunto_test,
        admin_conjunto_auth_headers,
    ):
        _avisar_llegada(client, reciclador_auth_headers, conjunto_verificado.id_conjunto_residencial)
        client.post(
            "/api/v1/auditorias-conjunto",
            headers=reciclador_auth_headers,
            data=_payload_valido(conjunto_verificado.id_conjunto_residencial),
            files=_archivo_valido(),
        )
        response = client.get("/api/v1/auditorias-conjunto/historial", headers=admin_conjunto_auth_headers)
        assert response.status_code == 200
        assert response.json()["total"] == 1


# ────────────────────────────
# 📊 Desempeño semanal (issue #486)
# ────────────────────────────


def _lunes_actual():
    """¿Qué? El lunes de la semana en curso, en hora de Bogotá — igual que
    lo calcula el servicio, para que las pruebas no dependan del día en que
    se corren."""
    hoy = datetime.now(HUSO_BOGOTA).date()
    return hoy - timedelta(days=hoy.weekday())


def _momento_bogota(lunes, dias: int, hora: int = 12) -> datetime:
    return datetime.combine(lunes + timedelta(days=dias), time(hora, 0), tzinfo=HUSO_BOGOTA)


def _sembrar_auditoria(db: Session, reciclador: Reciclador, id_conjunto, nivel: str, tema: str, momento: datetime):
    """¿Qué? Inserta una auditoría directo en la BD con la fecha elegida.
    ¿Para qué? Por la API no se puede: el cooldown de 24 h y el control de
    presencia impiden crear auditorías en fechas pasadas o muchas seguidas."""
    db.add(AuditoriaConjunto(
        id_reciclador=reciclador.id_reciclador,
        id_conjunto_residencial=id_conjunto,
        nivel_desempeno=nivel,
        tema_educativo=tema,
        ruta_evidencia="/uploads/evidencias-auditoria/prueba.jpg",
        created_at=momento,
    ))
    db.commit()


URL_DESEMPENO = "/api/v1/auditorias-conjunto/desempeno"
URL_SEMANA = "/api/v1/auditorias-conjunto/desempeno/semana"


class TestDesempenoSemanal:
    def test_sin_login_devuelve_401(self, client: TestClient):
        assert client.get(URL_DESEMPENO).status_code == 401

    def test_reciclador_recibe_403(self, client: TestClient, reciclador_auth_headers, conjunto_verificado):
        response = client.get(
            URL_DESEMPENO,
            headers=reciclador_auth_headers,
            params={"id_conjunto": str(conjunto_verificado.id_conjunto_residencial)},
        )
        assert response.status_code == 403

    def test_admin_del_sistema_recibe_403(self, client: TestClient, admin_sistema_auth_headers, conjunto_verificado):
        response = client.get(
            URL_DESEMPENO,
            headers=admin_sistema_auth_headers,
            params={"id_conjunto": str(conjunto_verificado.id_conjunto_residencial)},
        )
        assert response.status_code == 403

    def test_reciclador_sin_id_conjunto_recibe_403(self, client: TestClient, reciclador_auth_headers):
        assert client.get(URL_DESEMPENO, headers=reciclador_auth_headers).status_code == 403

    def test_semanas_invalido_devuelve_422(self, client: TestClient, auth_headers):
        assert client.get(URL_DESEMPENO, headers=auth_headers, params={"semanas": 5}).status_code == 422

    def test_residente_sin_auditorias_ve_ocho_semanas_en_cero_con_la_actual_al_final(
        self, client: TestClient, auth_headers, conjunto_verificado
    ):
        response = client.get(URL_DESEMPENO, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["id_conjunto_residencial"] == str(conjunto_verificado.id_conjunto_residencial)
        assert data["total"] == 0
        assert data["temas"] == []
        assert len(data["semanas"]) == 8
        assert data["semanas"][-1]["lunes"] == _lunes_actual().isoformat()
        assert data["semanas"][0]["lunes"] == (_lunes_actual() - timedelta(weeks=7)).isoformat()
        assert all(s["bueno"] == s["regular"] == s["malo"] == 0 for s in data["semanas"])

    @pytest.mark.parametrize("semanas", [4, 12])
    def test_semanas_4_y_12_devuelven_esa_cantidad(self, client: TestClient, auth_headers, semanas):
        response = client.get(URL_DESEMPENO, headers=auth_headers, params={"semanas": semanas})
        assert len(response.json()["semanas"]) == semanas

    def test_cuenta_por_semana_nivel_y_tema(
        self, client: TestClient, db: Session, auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        id_conjunto = conjunto_verificado.id_conjunto_residencial
        lunes = _lunes_actual()
        _sembrar_auditoria(db, reciclador_autorizado, id_conjunto, "BUENA", "Reciclaje de vidrio", _momento_bogota(lunes, -7))
        _sembrar_auditoria(db, reciclador_autorizado, id_conjunto, "REGULAR", "Reciclaje de vidrio", _momento_bogota(lunes, -6))
        _sembrar_auditoria(db, reciclador_autorizado, id_conjunto, "DEFICIENTE", "Residuos orgánicos", _momento_bogota(lunes, -6))
        _sembrar_auditoria(db, reciclador_autorizado, id_conjunto, "REGULAR", "Residuos orgánicos", _momento_bogota(lunes, 0, hora=0))

        data = client.get(URL_DESEMPENO, headers=auth_headers).json()

        assert data["total"] == 4
        anterior, actual = data["semanas"][-2], data["semanas"][-1]
        assert (anterior["bueno"], anterior["regular"], anterior["malo"]) == (1, 1, 1)
        assert (actual["bueno"], actual["regular"], actual["malo"]) == (0, 1, 0)
        temas = {t["tema"]: (t["bueno"], t["regular"], t["malo"]) for t in data["temas"]}
        assert temas == {"Reciclaje de vidrio": (1, 1, 0), "Residuos orgánicos": (0, 1, 1)}

    def test_domingo_9pm_en_bogota_cuenta_en_la_semana_de_ese_domingo(
        self, client: TestClient, db: Session, auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        """¿Qué? Domingo 21:00 en Bogotá ya es lunes 02:00 en UTC. Por semana
        UTC caería en la semana siguiente; por semana de Bogotá, no."""
        domingo_noche = _momento_bogota(_lunes_actual(), -1, hora=21)
        _sembrar_auditoria(
            db, reciclador_autorizado, conjunto_verificado.id_conjunto_residencial, "BUENA", "Tema", domingo_noche
        )

        semanas = client.get(URL_DESEMPENO, headers=auth_headers).json()["semanas"]

        assert semanas[-2]["bueno"] == 1
        assert semanas[-1]["bueno"] == 0

    def test_con_mas_de_50_auditorias_se_cuentan_todas(
        self, client: TestClient, db: Session, auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        momento = _momento_bogota(_lunes_actual(), 0, hora=0)
        for _ in range(55):
            _sembrar_auditoria(
                db, reciclador_autorizado, conjunto_verificado.id_conjunto_residencial, "BUENA", "Tema", momento
            )

        data = client.get(URL_DESEMPENO, headers=auth_headers).json()

        assert data["total"] == 55
        assert data["semanas"][-1]["bueno"] == 55

    def test_auditoria_fuera_de_la_ventana_no_cuenta(
        self, client: TestClient, db: Session, auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        vieja = _momento_bogota(_lunes_actual(), -50)
        _sembrar_auditoria(
            db, reciclador_autorizado, conjunto_verificado.id_conjunto_residencial, "BUENA", "Tema", vieja
        )

        assert client.get(URL_DESEMPENO, headers=auth_headers).json()["total"] == 0
        assert client.get(URL_DESEMPENO, headers=auth_headers, params={"semanas": 12}).json()["total"] == 1

    def test_no_mezcla_auditorias_de_otros_conjuntos(
        self,
        client: TestClient,
        db: Session,
        auth_headers,
        reciclador_autorizado,
        conjunto_verificado,
        conjunto_verificado_sin_admin,
    ):
        momento = _momento_bogota(_lunes_actual(), 0, hora=0)
        _sembrar_auditoria(
            db, reciclador_autorizado, conjunto_verificado_sin_admin.id_conjunto_residencial, "BUENA", "Tema", momento
        )

        assert client.get(URL_DESEMPENO, headers=auth_headers).json()["total"] == 0

    def test_residente_pidiendo_conjunto_ajeno_recibe_403(
        self, client: TestClient, auth_headers, conjunto_verificado_sin_admin
    ):
        response = client.get(
            URL_DESEMPENO,
            headers=auth_headers,
            params={"id_conjunto": str(conjunto_verificado_sin_admin.id_conjunto_residencial)},
        )
        assert response.status_code == 403

    def test_admin_de_conjunto_ve_su_conjunto(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado
    ):
        response = client.get(
            URL_DESEMPENO,
            headers=admin_conjunto_auth_headers,
            params={"id_conjunto": str(conjunto_verificado.id_conjunto_residencial)},
        )
        assert response.status_code == 200

    def test_admin_de_conjunto_pidiendo_conjunto_ajeno_recibe_403(
        self, client: TestClient, admin_conjunto_auth_headers, conjunto_verificado_sin_admin
    ):
        response = client.get(
            URL_DESEMPENO,
            headers=admin_conjunto_auth_headers,
            params={"id_conjunto": str(conjunto_verificado_sin_admin.id_conjunto_residencial)},
        )
        assert response.status_code == 403

    def test_admin_con_varios_conjuntos_sin_id_conjunto_recibe_422(
        self,
        client: TestClient,
        db: Session,
        admin_conjunto_test,
        admin_conjunto_auth_headers,
        conjunto_verificado_sin_admin,
    ):
        db.add(AdministradorConjuntoAsignacion(
            id_administrador=admin_conjunto_test.id_administrador,
            id_conjunto_residencial=conjunto_verificado_sin_admin.id_conjunto_residencial,
        ))
        db.commit()

        assert client.get(URL_DESEMPENO, headers=admin_conjunto_auth_headers).status_code == 422


class TestAuditoriasDeSemana:
    def test_sin_login_devuelve_401(self, client: TestClient):
        assert client.get(URL_SEMANA, params={"lunes": _lunes_actual().isoformat()}).status_code == 401

    def test_reciclador_recibe_403(self, client: TestClient, reciclador_auth_headers, conjunto_verificado):
        response = client.get(
            URL_SEMANA,
            headers=reciclador_auth_headers,
            params={
                "lunes": _lunes_actual().isoformat(),
                "id_conjunto": str(conjunto_verificado.id_conjunto_residencial),
            },
        )
        assert response.status_code == 403

    def test_fecha_que_no_es_lunes_devuelve_422(self, client: TestClient, auth_headers):
        martes = _lunes_actual() + timedelta(days=1)
        assert client.get(URL_SEMANA, headers=auth_headers, params={"lunes": martes.isoformat()}).status_code == 422

    def test_conjunto_ajeno_recibe_403(self, client: TestClient, auth_headers, conjunto_verificado_sin_admin):
        response = client.get(
            URL_SEMANA,
            headers=auth_headers,
            params={
                "lunes": _lunes_actual().isoformat(),
                "id_conjunto": str(conjunto_verificado_sin_admin.id_conjunto_residencial),
            },
        )
        assert response.status_code == 403

    def test_devuelve_solo_las_de_esa_semana_mas_recientes_primero(
        self, client: TestClient, db: Session, auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        id_conjunto = conjunto_verificado.id_conjunto_residencial
        lunes = _lunes_actual() - timedelta(weeks=1)
        _sembrar_auditoria(db, reciclador_autorizado, id_conjunto, "BUENA", "Primera", _momento_bogota(lunes, 1))
        _sembrar_auditoria(db, reciclador_autorizado, id_conjunto, "DEFICIENTE", "Segunda", _momento_bogota(lunes, 3))
        _sembrar_auditoria(db, reciclador_autorizado, id_conjunto, "BUENA", "Otra semana", _momento_bogota(lunes, -3))
        _sembrar_auditoria(db, reciclador_autorizado, id_conjunto, "BUENA", "Semana siguiente", _momento_bogota(lunes, 8))

        response = client.get(URL_SEMANA, headers=auth_headers, params={"lunes": lunes.isoformat()})

        assert response.status_code == 200
        assert [a["tema_educativo"] for a in response.json()] == ["Segunda", "Primera"]

    def test_domingo_9pm_de_bogota_queda_en_su_semana(
        self, client: TestClient, db: Session, auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        lunes = _lunes_actual() - timedelta(weeks=1)
        _sembrar_auditoria(
            db,
            reciclador_autorizado,
            conjunto_verificado.id_conjunto_residencial,
            "BUENA",
            "Domingo noche",
            _momento_bogota(lunes, 6, hora=21),
        )

        este = client.get(URL_SEMANA, headers=auth_headers, params={"lunes": lunes.isoformat()}).json()
        siguiente = client.get(
            URL_SEMANA, headers=auth_headers, params={"lunes": (lunes + timedelta(weeks=1)).isoformat()}
        ).json()

        assert [a["tema_educativo"] for a in este] == ["Domingo noche"]
        assert siguiente == []


# ────────────────────────────
# 📄 Paginación del historial (Residente) y de "mis auditorías" (Reciclador)
# ────────────────────────────

URL_HISTORIAL = "/api/v1/auditorias-conjunto/historial"
URL_MIAS = "/api/v1/auditorias-conjunto/mias"
URL_ULTIMAS = "/api/v1/auditorias-conjunto/mias/ultimas"


def _sembrar_consecutivas(db: Session, reciclador: Reciclador, id_conjunto, cantidad: int) -> list[str]:
    """¿Qué? `cantidad` auditorías con minutos distintos (la más vieja primero); devuelve sus temas
    de la más reciente a la más antigua, que es el orden en que las listas deben entregarlas."""
    base = _momento_bogota(_lunes_actual(), 0, hora=0)
    for i in range(cantidad):
        _sembrar_auditoria(db, reciclador, id_conjunto, "BUENA", f"Tema {i:03d}", base + timedelta(minutes=i))
    return [f"Tema {i:03d}" for i in reversed(range(cantidad))]


def _otro_reciclador(db: Session, correo: str, telefono: str) -> Reciclador:
    usuario = Usuario(
        correo_electronico=correo,
        id_rol=RolId.RECICLADOR,
        password=hash_password("Password1"),
        is_active=True,
    )
    db.add(usuario)
    db.flush()
    reciclador = Reciclador(id_usuario=usuario.id_usuario, nombre="OTRO", apellidos="RECICLADOR", numero_telefonico=telefono)
    db.add(reciclador)
    db.commit()
    return reciclador


class TestPaginacionDelHistorial:
    def test_con_mas_de_50_auditorias_las_entrega_todas_de_a_paginas(
        self, client: TestClient, db: Session, auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        esperados = _sembrar_consecutivas(db, reciclador_autorizado, conjunto_verificado.id_conjunto_residencial, 55)

        primera = client.get(URL_HISTORIAL, headers=auth_headers, params={"limit": 50}).json()
        segunda = client.get(URL_HISTORIAL, headers=auth_headers, params={"limit": 50, "offset": 50}).json()

        assert primera["total"] == segunda["total"] == 55
        assert [a["tema_educativo"] for a in primera["items"] + segunda["items"]] == esperados

    def test_las_paginas_no_repiten_ni_saltan_auditorias(
        self, client: TestClient, db: Session, auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        esperados = _sembrar_consecutivas(db, reciclador_autorizado, conjunto_verificado.id_conjunto_residencial, 7)

        temas = []
        for offset in (0, 3, 6):
            pagina = client.get(URL_HISTORIAL, headers=auth_headers, params={"limit": 3, "offset": offset}).json()
            temas += [a["tema_educativo"] for a in pagina["items"]]

        assert temas == esperados

    def test_offset_pasado_del_final_devuelve_pagina_vacia_con_el_total(
        self, client: TestClient, db: Session, auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        _sembrar_consecutivas(db, reciclador_autorizado, conjunto_verificado.id_conjunto_residencial, 2)

        data = client.get(URL_HISTORIAL, headers=auth_headers, params={"offset": 10}).json()

        assert data == {"items": [], "total": 2}

    def test_sin_limit_usa_20_por_pagina(
        self, client: TestClient, db: Session, auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        _sembrar_consecutivas(db, reciclador_autorizado, conjunto_verificado.id_conjunto_residencial, 25)

        data = client.get(URL_HISTORIAL, headers=auth_headers).json()

        assert len(data["items"]) == 20
        assert data["total"] == 25

    @pytest.mark.parametrize("params", [{"limit": 0}, {"limit": 101}, {"offset": -1}])
    def test_limit_u_offset_fuera_de_rango_devuelve_422(self, client: TestClient, auth_headers, params):
        assert client.get(URL_HISTORIAL, headers=auth_headers, params=params).status_code == 422

    def test_no_mezcla_auditorias_de_otro_conjunto_en_el_total(
        self,
        client: TestClient,
        db: Session,
        auth_headers,
        reciclador_autorizado,
        conjunto_verificado,
        conjunto_verificado_sin_admin,
    ):
        _sembrar_consecutivas(db, reciclador_autorizado, conjunto_verificado.id_conjunto_residencial, 2)
        _sembrar_consecutivas(db, reciclador_autorizado, conjunto_verificado_sin_admin.id_conjunto_residencial, 3)

        assert client.get(URL_HISTORIAL, headers=auth_headers).json()["total"] == 2


class TestPaginacionDeMisAuditorias:
    def test_entrega_todas_de_a_paginas_con_el_total(
        self, client: TestClient, db: Session, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        esperados = _sembrar_consecutivas(db, reciclador_autorizado, conjunto_verificado.id_conjunto_residencial, 5)

        temas = []
        for offset in (0, 2, 4):
            pagina = client.get(URL_MIAS, headers=reciclador_auth_headers, params={"limit": 2, "offset": offset}).json()
            assert pagina["total"] == 5
            temas += [a["tema_educativo"] for a in pagina["items"]]

        assert temas == esperados

    def test_solo_cuenta_las_propias(
        self, client: TestClient, db: Session, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        _sembrar_consecutivas(db, reciclador_autorizado, conjunto_verificado.id_conjunto_residencial, 2)
        otro = _otro_reciclador(db, "otro.reciclador.mias@verdeapp.com", "3000000097")
        _sembrar_consecutivas(db, otro, conjunto_verificado.id_conjunto_residencial, 4)

        assert client.get(URL_MIAS, headers=reciclador_auth_headers).json()["total"] == 2

    @pytest.mark.parametrize("params", [{"limit": 0}, {"limit": 101}, {"offset": -1}])
    def test_limit_u_offset_fuera_de_rango_devuelve_422(self, client: TestClient, reciclador_auth_headers, params):
        assert client.get(URL_MIAS, headers=reciclador_auth_headers, params=params).status_code == 422


class TestUltimasAuditoriasPorConjunto:
    def test_sin_login_devuelve_401(self, client: TestClient):
        assert client.get(URL_ULTIMAS).status_code == 401

    def test_residente_recibe_403(self, client: TestClient, auth_headers):
        assert client.get(URL_ULTIMAS, headers=auth_headers).status_code == 403

    def test_sin_auditorias_devuelve_lista_vacia(self, client: TestClient, reciclador_auth_headers):
        response = client.get(URL_ULTIMAS, headers=reciclador_auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_una_fila_por_conjunto_con_la_fecha_de_la_mas_reciente(
        self,
        client: TestClient,
        db: Session,
        reciclador_auth_headers,
        reciclador_autorizado,
        conjunto_verificado,
        conjunto_verificado_sin_admin,
    ):
        id_a = conjunto_verificado.id_conjunto_residencial
        id_b = conjunto_verificado_sin_admin.id_conjunto_residencial
        lunes = _lunes_actual()
        # ¿Qué? 3 auditorías en A (cuenta la más reciente) y 1 en B, mucho más vieja que las de A.
        _sembrar_auditoria(db, reciclador_autorizado, id_a, "BUENA", "Vieja", _momento_bogota(lunes, -20))
        reciente_a = _momento_bogota(lunes, -2)
        _sembrar_auditoria(db, reciclador_autorizado, id_a, "BUENA", "Reciente", reciente_a)
        _sembrar_auditoria(db, reciclador_autorizado, id_a, "REGULAR", "Media", _momento_bogota(lunes, -10))
        unica_b = _momento_bogota(lunes, -30)
        _sembrar_auditoria(db, reciclador_autorizado, id_b, "BUENA", "Unica", unica_b)

        filas = client.get(URL_ULTIMAS, headers=reciclador_auth_headers).json()

        por_conjunto = {f["id_conjunto_residencial"]: datetime.fromisoformat(f["ultima_auditoria"]) for f in filas}
        assert len(filas) == 2
        assert por_conjunto == {str(id_a): reciente_a, str(id_b): unica_b}

    def test_no_incluye_auditorias_de_otros_recicladores(
        self, client: TestClient, db: Session, reciclador_auth_headers, reciclador_autorizado, conjunto_verificado
    ):
        otro = _otro_reciclador(db, "otro.reciclador.ultimas@verdeapp.com", "3000000096")
        _sembrar_auditoria(
            db, otro, conjunto_verificado.id_conjunto_residencial, "BUENA", "Ajena", _momento_bogota(_lunes_actual(), -1)
        )

        assert client.get(URL_ULTIMAS, headers=reciclador_auth_headers).json() == []


URL_DESEMPENO_PDF = "/api/v1/auditorias-conjunto/desempeno/pdf"


class TestDesempenoPdf:
    """¿Qué? Issue #558 — el desempeño semanal del conjunto en PDF, solo para el Admin de Conjunto."""

    def test_sin_login_devuelve_401(self, client: TestClient):
        assert client.get(URL_DESEMPENO_PDF).status_code == 401

    def test_residente_recibe_403(self, client: TestClient, auth_headers, conjunto_verificado):
        response = client.get(URL_DESEMPENO_PDF, headers=auth_headers)
        assert response.status_code == 403

    def test_reciclador_recibe_403(self, client: TestClient, reciclador_auth_headers, conjunto_verificado):
        response = client.get(URL_DESEMPENO_PDF, headers=reciclador_auth_headers)
        assert response.status_code == 403

    def test_semanas_invalido_devuelve_422(self, client: TestClient, admin_conjunto_auth_headers):
        assert client.get(URL_DESEMPENO_PDF, headers=admin_conjunto_auth_headers, params={"semanas": 5}).status_code == 422

    def test_sin_auditorias_avisa_en_vez_de_entregar_un_pdf_vacio(self, client: TestClient, admin_conjunto_auth_headers):
        response = client.get(URL_DESEMPENO_PDF, headers=admin_conjunto_auth_headers)

        assert response.status_code == 422
        assert "No hay auditorías" in response.json()["detail"]

    def test_admin_de_conjunto_descarga_un_pdf_con_el_conjunto_y_los_temas(
        self,
        client: TestClient,
        db: Session,
        admin_conjunto_auth_headers,
        reciclador_autorizado,
        conjunto_verificado,
    ):
        from pypdf import PdfReader

        id_conjunto = conjunto_verificado.id_conjunto_residencial
        lunes = _lunes_actual()
        _sembrar_auditoria(db, reciclador_autorizado, id_conjunto, "BUENA", "Reciclaje de vidrio", _momento_bogota(lunes, -7))
        _sembrar_auditoria(db, reciclador_autorizado, id_conjunto, "DEFICIENTE", "Residuos orgánicos", _momento_bogota(lunes, 0))

        response = client.get(URL_DESEMPENO_PDF, headers=admin_conjunto_auth_headers)

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert response.headers["content-disposition"].startswith('attachment; filename="desempeno-')
        assert response.content.startswith(b"%PDF")
        texto = " ".join(p.extract_text() for p in PdfReader(io.BytesIO(response.content)).pages)
        assert conjunto_verificado.nombre_conjunto in texto
        assert "Auditorías en el período" in texto
        assert "Reciclaje de vidrio" in texto
        # ¿Qué? El tema con Malo va primero en el ranking, igual que en la pantalla.
        assert texto.index("Residuos orgánicos") < texto.index("Reciclaje de vidrio")
