"""
Módulo: tests/test_novedades.py
Descripción: Pruebas de novedades generales de la plataforma (RQF-015).
¿Para qué? Cubrir los 4 flujos del Admin Sistema (publicar, ver historial
           completo, editar, archivar) y el feed por rol de
           Residente/Reciclador/Admin Conjunto — incluyendo que el
           alcance filtra correctamente y que lo archivado no reaparece.
"""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.reciclador_conjunto import RecicladorConjunto
from app.models.residente import Residente
from app.models.rol import RolId
from app.models.unidad import Unidad
from app.models.usuario import Usuario
from app.utils.security import create_access_token, hash_password


class TestCrearNovedad:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.post("/api/v1/novedades", json={"alcance": "TODOS", "texto": "Aviso de prueba"})
        assert response.status_code == 401

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers):
        """auth_headers es de un Residente, no del Administrador del Sistema."""
        response = client.post(
            "/api/v1/novedades", headers=auth_headers, json={"alcance": "TODOS", "texto": "Aviso de prueba"}
        )
        assert response.status_code == 403

    def test_texto_vacio_devuelve_422(self, client: TestClient, admin_sistema_auth_headers):
        response = client.post(
            "/api/v1/novedades", headers=admin_sistema_auth_headers, json={"alcance": "TODOS", "texto": "   "}
        )
        assert response.status_code == 422

    def test_crea_con_expiracion_sugerida(self, client: TestClient, admin_sistema_auth_headers):
        response = client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "TODOS", "texto": "Se agregó soporte para modo oscuro."},
        )
        assert response.status_code == 201
        data = response.json()
        expiracion = datetime.fromisoformat(data["fecha_expiracion"])
        creado = datetime.fromisoformat(data["created_at"])
        diferencia = expiracion - creado
        assert timedelta(days=29) < diferencia < timedelta(days=31)
        assert data["editado"] is False
        assert data["archivada"] is False

    def test_notifica_solo_a_los_roles_del_alcance(
        self, client: TestClient, admin_sistema_auth_headers, auth_headers, reciclador_auth_headers
    ):
        """CA-032.4 + RN-003: una novedad solo para residentes no debe notificar a los recicladores."""
        response = client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "RESIDENTES", "texto": "Solo para residentes."},
        )
        assert response.status_code == 201

        notifs_residente = client.get("/api/v1/notificaciones/mis-notificaciones", headers=auth_headers)
        assert any(n["tipo"] == "NOVEDAD_NUEVA" for n in notifs_residente.json())

        notifs_reciclador = client.get("/api/v1/notificaciones/mis-notificaciones", headers=reciclador_auth_headers)
        assert not any(n["tipo"] == "NOVEDAD_NUEVA" for n in notifs_reciclador.json())

    def test_notificacion_no_tiene_conjunto(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        """Una novedad de plataforma no pertenece a ningún conjunto — nombre_conjunto debe venir vacío, no fallar."""
        client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "TODOS", "texto": "Aviso general."},
        )
        notifs = client.get("/api/v1/notificaciones/mis-notificaciones", headers=auth_headers)
        assert notifs.status_code == 200
        novedad_notif = next(n for n in notifs.json() if n["tipo"] == "NOVEDAD_NUEVA")
        assert novedad_notif["nombre_conjunto"] is None

    def test_alcance_todos_notifica_residentes_y_recicladores(
        self, client: TestClient, admin_sistema_auth_headers, auth_headers, reciclador_auth_headers
    ):
        client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "TODOS", "texto": "Aviso para todos."},
        )
        notifs_residente = client.get("/api/v1/notificaciones/mis-notificaciones", headers=auth_headers)
        notifs_reciclador = client.get("/api/v1/notificaciones/mis-notificaciones", headers=reciclador_auth_headers)
        assert any(n["tipo"] == "NOVEDAD_NUEVA" for n in notifs_residente.json())
        assert any(n["tipo"] == "NOVEDAD_NUEVA" for n in notifs_reciclador.json())


class TestListarTodas:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get("/api/v1/novedades/todas")
        assert response.status_code == 401

    def test_con_rol_incorrecto_devuelve_403(self, client: TestClient, auth_headers):
        response = client.get("/api/v1/novedades/todas", headers=auth_headers)
        assert response.status_code == 403

    def test_incluye_activas_y_archivadas(self, client: TestClient, admin_sistema_auth_headers):
        crear = client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "TODOS", "texto": "Novedad a archivar."},
        )
        id_novedad = crear.json()["id_novedad"]
        client.post(f"/api/v1/novedades/{id_novedad}/archivar", headers=admin_sistema_auth_headers)

        response = client.get("/api/v1/novedades/todas", headers=admin_sistema_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["archivada"] is True

    def test_limit_acota_resultados_sin_afectar_el_total(
        self, client: TestClient, admin_sistema_auth_headers
    ):
        """Issue #227: el historial completo no debe traerse sin tope."""
        for i in range(3):
            client.post(
                "/api/v1/novedades",
                headers=admin_sistema_auth_headers,
                json={"alcance": "TODOS", "texto": f"Novedad {i}."},
            )

        response = client.get(
            "/api/v1/novedades/todas", params={"limit": 2}, headers=admin_sistema_auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 3


class TestListarTodasFiltros:
    """El filtro se aplica en la consulta (no en el navegador) — el total refleja el filtro, no el historial entero."""

    def _crear(self, client: TestClient, headers, alcance: str, texto: str) -> str:
        r = client.post("/api/v1/novedades", headers=headers, json={"alcance": alcance, "texto": texto})
        return r.json()["id_novedad"]

    def test_filtra_por_alcance(self, client: TestClient, admin_sistema_auth_headers):
        self._crear(client, admin_sistema_auth_headers, "TODOS", "Para todos.")
        self._crear(client, admin_sistema_auth_headers, "RESIDENTES", "Para residentes.")

        r = client.get("/api/v1/novedades/todas", params={"alcance": "RESIDENTES"}, headers=admin_sistema_auth_headers)
        data = r.json()
        assert data["total"] == 1
        assert data["items"][0]["alcance"] == "RESIDENTES"

    def test_incluir_archivadas_false_oculta_archivadas_y_vencidas(
        self, client: TestClient, db: Session, admin_sistema_auth_headers
    ):
        activa = self._crear(client, admin_sistema_auth_headers, "TODOS", "Activa.")
        archivada = self._crear(client, admin_sistema_auth_headers, "TODOS", "Archivada.")
        vencida = self._crear(client, admin_sistema_auth_headers, "TODOS", "Vencida.")
        client.post(f"/api/v1/novedades/{archivada}/archivar", headers=admin_sistema_auth_headers)

        from app.models.novedad import Novedad

        n = db.get(Novedad, vencida)
        n.fecha_expiracion = datetime.now(timezone.utc) - timedelta(hours=1)
        db.commit()

        r = client.get(
            "/api/v1/novedades/todas", params={"incluir_archivadas": "false"}, headers=admin_sistema_auth_headers
        )
        data = r.json()
        assert data["total"] == 1
        assert data["items"][0]["id_novedad"] == activa

        con_todas = client.get("/api/v1/novedades/todas", headers=admin_sistema_auth_headers).json()
        assert con_todas["total"] == 3

    def test_busca_por_texto_sin_distinguir_mayusculas(self, client: TestClient, admin_sistema_auth_headers):
        self._crear(client, admin_sistema_auth_headers, "TODOS", "Mantenimiento del Punto de Acopio.")
        self._crear(client, admin_sistema_auth_headers, "TODOS", "Encuesta de satisfacción.")

        r = client.get("/api/v1/novedades/todas", params={"search": "mantenimiento"}, headers=admin_sistema_auth_headers)
        data = r.json()
        assert data["total"] == 1
        assert "Mantenimiento" in data["items"][0]["texto"]


class TestEditarNovedad:
    def _crear(self, client: TestClient, admin_sistema_auth_headers) -> int:
        response = client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "TODOS", "texto": "Texto original."},
        )
        return response.json()["id_novedad"]

    def test_edita_correctamente_y_marca_editado(self, client: TestClient, admin_sistema_auth_headers):
        id_novedad = self._crear(client, admin_sistema_auth_headers)

        response = client.patch(
            f"/api/v1/novedades/{id_novedad}",
            headers=admin_sistema_auth_headers,
            json={"texto": "Texto corregido."},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["texto"] == "Texto corregido."
        assert data["editado"] is True

    def test_sin_fecha_nueva_conserva_la_actual(self, client: TestClient, admin_sistema_auth_headers):
        id_novedad = self._crear(client, admin_sistema_auth_headers)
        original = client.get("/api/v1/novedades/todas", headers=admin_sistema_auth_headers).json()["items"][0]

        response = client.patch(
            f"/api/v1/novedades/{id_novedad}",
            headers=admin_sistema_auth_headers,
            json={"texto": "Texto corregido."},
        )
        assert response.json()["fecha_expiracion"] == original["fecha_expiracion"]

    def test_reenvia_notificacion_a_los_mismos_destinatarios(
        self, client: TestClient, admin_sistema_auth_headers, auth_headers
    ):
        id_novedad = self._crear(client, admin_sistema_auth_headers)
        client.patch(
            f"/api/v1/novedades/{id_novedad}",
            headers=admin_sistema_auth_headers,
            json={"texto": "Texto corregido."},
        )
        notifs = client.get("/api/v1/notificaciones/mis-notificaciones", headers=auth_headers)
        tipos = [n["tipo"] for n in notifs.json()]
        assert "NOVEDAD_NUEVA" in tipos
        assert "NOVEDAD_ACTUALIZADA" in tipos

    def test_novedad_inexistente_devuelve_404(self, client: TestClient, admin_sistema_auth_headers):
        response = client.patch(
            f"/api/v1/novedades/{uuid.uuid4()}",
            headers=admin_sistema_auth_headers,
            json={"texto": "No debería aplicar."},
        )
        assert response.status_code == 404


class TestArchivarNovedad:
    def test_archiva_correctamente(self, client: TestClient, admin_sistema_auth_headers):
        crear = client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "TODOS", "texto": "Novedad a archivar."},
        )
        id_novedad = crear.json()["id_novedad"]

        response = client.post(f"/api/v1/novedades/{id_novedad}/archivar", headers=admin_sistema_auth_headers)
        assert response.status_code == 200

    def test_no_se_puede_archivar_dos_veces(self, client: TestClient, admin_sistema_auth_headers):
        crear = client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "TODOS", "texto": "Novedad a archivar."},
        )
        id_novedad = crear.json()["id_novedad"]
        client.post(f"/api/v1/novedades/{id_novedad}/archivar", headers=admin_sistema_auth_headers)

        segunda = client.post(f"/api/v1/novedades/{id_novedad}/archivar", headers=admin_sistema_auth_headers)
        assert segunda.status_code == 400


class TestFeed:
    def test_sin_login_devuelve_401(self, client: TestClient):
        response = client.get("/api/v1/novedades/feed")
        assert response.status_code == 401

    def test_admin_sistema_no_tiene_feed(self, client: TestClient, admin_sistema_auth_headers):
        response = client.get("/api/v1/novedades/feed", headers=admin_sistema_auth_headers)
        assert response.status_code == 403

    def test_residente_ve_novedad_para_todos(self, client: TestClient, admin_sistema_auth_headers, auth_headers):
        client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "TODOS", "texto": "Aviso para todos."},
        )
        response = client.get("/api/v1/novedades/feed", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_reciclador_no_ve_novedad_solo_para_residentes(
        self, client: TestClient, admin_sistema_auth_headers, reciclador_auth_headers
    ):
        client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "RESIDENTES", "texto": "Solo para residentes."},
        )
        response = client.get("/api/v1/novedades/feed", headers=reciclador_auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_admin_conjunto_ve_novedad_de_su_alcance(
        self, client: TestClient, admin_sistema_auth_headers, admin_conjunto_auth_headers
    ):
        client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "ADMIN_CONJUNTO", "texto": "Solo para administradores de conjunto."},
        )
        response = client.get("/api/v1/novedades/feed", headers=admin_conjunto_auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_novedad_archivada_no_aparece_en_feed(
        self, client: TestClient, admin_sistema_auth_headers, auth_headers
    ):
        crear = client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "TODOS", "texto": "Aviso que se va a archivar."},
        )
        id_novedad = crear.json()["id_novedad"]
        client.post(f"/api/v1/novedades/{id_novedad}/archivar", headers=admin_sistema_auth_headers)

        response = client.get("/api/v1/novedades/feed", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_novedad_vencida_no_aparece_en_feed(
        self, client: TestClient, db: Session, admin_sistema_auth_headers, auth_headers
    ):
        crear = client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={"alcance": "TODOS", "texto": "Este ya debería estar vencido."},
        )
        id_novedad = crear.json()["id_novedad"]

        from app.models.novedad import Novedad

        novedad = db.get(Novedad, id_novedad)
        novedad.fecha_expiracion = datetime.now(timezone.utc) - timedelta(hours=1)
        db.commit()

        response = client.get("/api/v1/novedades/feed", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []


class TestConjuntosDestino:
    """
    ¿Qué? Cubre el campo `conjuntos`: sin él (lista vacía), una novedad sigue
          yendo a TODOS los conjuntos del alcance (comportamiento de siempre,
          ya cubierto arriba) — con uno o varios ids, solo a esos conjuntos,
          tanto en notificaciones como en el feed.
    """

    def _residente_en(self, db: Session, conjunto: ConjuntoResidencial, correo: str) -> dict[str, str]:
        """Crea un Residente en el conjunto dado y devuelve sus headers de autenticación."""
        usuario = Usuario(
            correo_electronico=correo,
            id_rol=RolId.RESIDENTE,
            password=hash_password("Password123*"),
            is_active=True,
        )
        db.add(usuario)
        db.flush()
        unidad = Unidad(id_conjunto_residencial=conjunto.id_conjunto_residencial, torre="TORRE 2", apto="202")
        db.add(unidad)
        db.flush()
        db.add(Residente(id_usuario=usuario.id_usuario, id_unidad=unidad.id_unidad, nombre="Otro", apellidos="Residente"))
        db.commit()
        access_token = create_access_token(data={"sub": usuario.correo_electronico, "role_id": usuario.id_rol})
        return {"Authorization": f"Bearer {access_token}"}

    def _otro_conjunto(self, db: Session, localidad_test, nombre: str) -> ConjuntoResidencial:
        conjunto = ConjuntoResidencial(
            id_localidad=localidad_test.id_localidad,
            nombre_conjunto=nombre,
            nit=f"9{uuid.uuid4().int % 10**8:08d}-1",
            direccion="Calle 1 # 2-3",
            verificado=True,
        )
        db.add(conjunto)
        db.commit()
        db.refresh(conjunto)
        return conjunto

    def _autorizar_reciclador(self, db: Session, reciclador_usuario: Usuario, conjunto: ConjuntoResidencial) -> None:
        from app.models.reciclador import Reciclador

        reciclador = db.execute(
            Reciclador.__table__.select().where(Reciclador.id_usuario == reciclador_usuario.id_usuario)
        ).first()
        db.add(RecicladorConjunto(id_reciclador=reciclador.id_reciclador, id_conjunto_residencial=conjunto.id_conjunto_residencial))
        db.commit()

    def _publicar(self, client, headers, conjuntos, alcance="RESIDENTES", texto="Aviso puntual.", **extra):
        return client.post(
            "/api/v1/novedades",
            headers=headers,
            json={"alcance": alcance, "texto": texto, "conjuntos": [str(c.id_conjunto_residencial) for c in conjuntos], **extra},
        )

    def test_sin_conjuntos_llega_a_todos_y_la_respuesta_trae_lista_vacia(
        self, client: TestClient, admin_sistema_auth_headers
    ):
        response = self._publicar(client, admin_sistema_auth_headers, [], alcance="TODOS")
        assert response.status_code == 201
        assert response.json()["conjuntos"] == []

    def test_crea_con_un_conjunto_y_video_los_devuelve_en_la_respuesta(
        self, client: TestClient, admin_sistema_auth_headers, conjunto_verificado: ConjuntoResidencial
    ):
        response = self._publicar(
            client, admin_sistema_auth_headers, [conjunto_verificado], url_video="https://youtube.com/watch?v=abc123"
        )
        assert response.status_code == 201
        data = response.json()
        assert data["url_video"] == "https://youtube.com/watch?v=abc123"
        assert data["conjuntos"] == [
            {
                "id_conjunto_residencial": str(conjunto_verificado.id_conjunto_residencial),
                "nombre_conjunto": conjunto_verificado.nombre_conjunto,
            }
        ]

    def test_crea_con_varios_conjuntos_y_quita_repetidos(
        self,
        client: TestClient,
        db: Session,
        admin_sistema_auth_headers,
        conjunto_verificado: ConjuntoResidencial,
        localidad_test,
    ):
        otro = self._otro_conjunto(db, localidad_test, "Conjunto Dos")
        response = self._publicar(client, admin_sistema_auth_headers, [conjunto_verificado, otro, conjunto_verificado])
        assert response.status_code == 201
        nombres = [c["nombre_conjunto"] for c in response.json()["conjuntos"]]
        assert sorted(nombres) == sorted([conjunto_verificado.nombre_conjunto, "Conjunto Dos"])

    def test_un_conjunto_inexistente_devuelve_404_y_no_crea_nada(
        self, client: TestClient, admin_sistema_auth_headers, conjunto_verificado: ConjuntoResidencial
    ):
        response = client.post(
            "/api/v1/novedades",
            headers=admin_sistema_auth_headers,
            json={
                "alcance": "TODOS",
                "texto": "Aviso.",
                "conjuntos": [str(conjunto_verificado.id_conjunto_residencial), str(uuid.uuid4())],
            },
        )
        assert response.status_code == 404
        historial = client.get("/api/v1/novedades/todas", headers=admin_sistema_auth_headers).json()
        assert historial["total"] == 0

    def test_notifica_solo_a_los_conjuntos_elegidos(
        self,
        client: TestClient,
        db: Session,
        admin_sistema_auth_headers,
        auth_headers,
        conjunto_verificado: ConjuntoResidencial,
        localidad_test,
    ):
        """Con 2 de 3 conjuntos elegidos, el residente del tercero no recibe nada."""
        segundo = self._otro_conjunto(db, localidad_test, "Conjunto Dos")
        tercero = self._otro_conjunto(db, localidad_test, "Conjunto Tres")
        headers_segundo = self._residente_en(db, segundo, "segundo@verdeapp.com")
        headers_tercero = self._residente_en(db, tercero, "tercero@verdeapp.com")

        self._publicar(client, admin_sistema_auth_headers, [conjunto_verificado, segundo])

        for headers in (auth_headers, headers_segundo):
            notifs = client.get("/api/v1/notificaciones/mis-notificaciones", headers=headers)
            assert any(n["tipo"] == "NOVEDAD_NUEVA" for n in notifs.json())
        notifs_tercero = client.get("/api/v1/notificaciones/mis-notificaciones", headers=headers_tercero)
        assert not any(n["tipo"] == "NOVEDAD_NUEVA" for n in notifs_tercero.json())

    def test_feed_muestra_la_novedad_solo_a_los_conjuntos_elegidos(
        self,
        client: TestClient,
        db: Session,
        admin_sistema_auth_headers,
        auth_headers,
        conjunto_verificado: ConjuntoResidencial,
        localidad_test,
    ):
        otro = self._otro_conjunto(db, localidad_test, "Conjunto Dos")
        headers_otro = self._residente_en(db, otro, "otro.residente@verdeapp.com")
        self._publicar(client, admin_sistema_auth_headers, [conjunto_verificado], alcance="TODOS")

        assert len(client.get("/api/v1/novedades/feed", headers=auth_headers).json()) == 1
        assert client.get("/api/v1/novedades/feed", headers=headers_otro).json() == []

    def test_feed_reciclador_ve_novedad_si_esta_autorizado_en_alguno_de_los_conjuntos(
        self,
        client: TestClient,
        db: Session,
        admin_sistema_auth_headers,
        reciclador_auth_headers,
        reciclador_test: Usuario,
        conjunto_verificado: ConjuntoResidencial,
        localidad_test,
    ):
        otro = self._otro_conjunto(db, localidad_test, "Conjunto Dos")
        self._autorizar_reciclador(db, reciclador_test, conjunto_verificado)
        self._publicar(client, admin_sistema_auth_headers, [otro, conjunto_verificado], alcance="RECICLADORES")

        response = client.get("/api/v1/novedades/feed", headers=reciclador_auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_reciclador_en_dos_conjuntos_elegidos_recibe_una_sola_notificacion(
        self,
        client: TestClient,
        db: Session,
        admin_sistema_auth_headers,
        reciclador_auth_headers,
        reciclador_test: Usuario,
        conjunto_verificado: ConjuntoResidencial,
        localidad_test,
    ):
        otro = self._otro_conjunto(db, localidad_test, "Conjunto Dos")
        self._autorizar_reciclador(db, reciclador_test, conjunto_verificado)
        self._autorizar_reciclador(db, reciclador_test, otro)
        self._publicar(client, admin_sistema_auth_headers, [conjunto_verificado, otro], alcance="RECICLADORES")

        notifs = client.get("/api/v1/notificaciones/mis-notificaciones", headers=reciclador_auth_headers)
        assert len([n for n in notifs.json() if n["tipo"] == "NOVEDAD_NUEVA"]) == 1

    def test_editar_no_cambia_los_conjuntos(
        self, client: TestClient, admin_sistema_auth_headers, conjunto_verificado: ConjuntoResidencial
    ):
        """EditarNovedadRequest a propósito no acepta conjuntos — igual que alcance (CA-034.2)."""
        crear = self._publicar(client, admin_sistema_auth_headers, [conjunto_verificado], alcance="TODOS", texto="Original.")
        id_novedad = crear.json()["id_novedad"]

        editar = client.patch(
            f"/api/v1/novedades/{id_novedad}",
            headers=admin_sistema_auth_headers,
            json={"texto": "Editado.", "url_video": "https://youtube.com/watch?v=xyz", "conjuntos": []},
        )
        assert editar.status_code == 200
        data = editar.json()
        assert [c["id_conjunto_residencial"] for c in data["conjuntos"]] == [str(conjunto_verificado.id_conjunto_residencial)]
        assert data["url_video"] == "https://youtube.com/watch?v=xyz"
