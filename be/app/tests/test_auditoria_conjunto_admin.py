"""
Módulo: tests/test_auditoria_conjunto_admin.py
Descripción: Pruebas de GET /api/v1/auditorias-conjunto/admin (RQF-009) —
             la vista del Admin del Sistema sobre las auditorías del
             reciclador, por semana o las más recientes.
¿Para qué? Archivo aparte de test_auditoria_conjunto.py (que ya cubre crear,
           listar por rol y ver el detalle) para no mezclar el flujo del
           Reciclador/Residente/Admin de Conjunto con el del Admin del
           Sistema, que es de solo lectura y no pasa por el candado de
           24h ni por "avisar llegada".
"""
from datetime import datetime, timezone

import pytest

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.auditoria_conjunto import AuditoriaConjunto
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.localidad import Localidad
from app.models.notificacion import Notificacion, NotificacionDestinatario
from app.models.reciclador import Reciclador
from app.models.usuario import Usuario

URL = "/api/v1/auditorias-conjunto/admin"


def _crear_auditoria(
    db: Session,
    reciclador: Reciclador,
    conjunto: ConjuntoResidencial,
    *,
    nivel: str = "REGULAR",
    tema: str = "Separación en la fuente y código de colores",
    creado: datetime,
    descripcion: str | None = None,
) -> AuditoriaConjunto:
    """¿Qué? Inserta la fila directo en la base, sin pasar por el endpoint
    de crear (que exige avisar llegada, un archivo de imagen real y el
    candado de 24h) — esas reglas ya las cubre test_auditoria_conjunto.py;
    aquí solo interesa qué devuelve /admin dado un estado ya guardado."""
    auditoria = AuditoriaConjunto(
        id_reciclador=reciclador.id_reciclador,
        id_conjunto_residencial=conjunto.id_conjunto_residencial,
        nivel_desempeno=nivel,
        tema_educativo=tema,
        descripcion=descripcion,
        ruta_evidencia="/uploads/evidencias-auditoria/fake.jpg",
        created_at=creado,
    )
    db.add(auditoria)
    db.commit()
    db.refresh(auditoria)
    return auditoria


def _notificar(db: Session, auditoria: AuditoriaConjunto, destinatarios: list[Usuario]) -> None:
    """Simula lo que _notificar_recomendacion_si_corresponde ya haría de
    verdad (ver test_auditoria_conjunto.py) — aquí solo hace falta el dato
    para probar el conteo de "avisados"."""
    notif = Notificacion(
        tipo="CONTENIDO_RECOMENDADO",
        id_conjunto_residencial=auditoria.id_conjunto_residencial,
        id_referencia=auditoria.id_auditoria,
        mensaje="El reciclador recomienda contenido educativo para tu conjunto.",
    )
    db.add(notif)
    db.flush()
    for usuario in destinatarios:
        db.add(NotificacionDestinatario(id_notificacion=notif.id, id_usuario=usuario.id_usuario))
    db.commit()


class TestAcceso:
    def test_sin_login_devuelve_401(self, client: TestClient):
        assert client.get(URL).status_code == 401

    def test_reciclador_no_puede_verlo(self, client: TestClient, reciclador_auth_headers):
        assert client.get(URL, headers=reciclador_auth_headers).status_code == 403

    def test_residente_no_puede_verlo(self, client: TestClient, auth_headers):
        assert client.get(URL, headers=auth_headers).status_code == 403


class TestListado:
    def test_sin_filtro_trae_las_mas_recientes_primero(
        self, client: TestClient, admin_sistema_auth_headers, db, reciclador_test, conjunto_verificado
    ):
        reciclador = db.query(Reciclador).filter_by(id_usuario=reciclador_test.id_usuario).one()
        vieja = _crear_auditoria(db, reciclador, conjunto_verificado, creado=datetime(2026, 9, 1, tzinfo=timezone.utc))
        nueva = _crear_auditoria(db, reciclador, conjunto_verificado, creado=datetime(2026, 9, 20, tzinfo=timezone.utc))

        response = client.get(URL, headers=admin_sistema_auth_headers)
        assert response.status_code == 200
        data = response.json()
        ids = [item["id_auditoria"] for item in data["items"]]
        assert ids.index(str(nueva.id_auditoria)) < ids.index(str(vieja.id_auditoria))
        assert data["total"] >= 2

    def test_filtra_por_semana_lunes_a_domingo(
        self, client: TestClient, admin_sistema_auth_headers, db, reciclador_test, conjunto_verificado
    ):
        reciclador = db.query(Reciclador).filter_by(id_usuario=reciclador_test.id_usuario).one()
        # ¿Qué? Semana del lunes 14 al domingo 20 de septiembre de 2026, en hora de Bogotá (UTC-5):
        #       empieza el lunes 14 a las 05:00 UTC y termina el lunes 21 a las 05:00 UTC.
        dentro = _crear_auditoria(db, reciclador, conjunto_verificado, creado=datetime(2026, 9, 21, 4, 59, tzinfo=timezone.utc))
        justo_fuera = _crear_auditoria(db, reciclador, conjunto_verificado, creado=datetime(2026, 9, 21, 5, 0, tzinfo=timezone.utc))
        antes = _crear_auditoria(db, reciclador, conjunto_verificado, creado=datetime(2026, 9, 14, 4, 59, tzinfo=timezone.utc))

        response = client.get(URL, headers=admin_sistema_auth_headers, params={"lunes": "2026-09-14"})
        assert response.status_code == 200
        ids = {item["id_auditoria"] for item in response.json()["items"]}
        assert str(dentro.id_auditoria) in ids
        assert str(justo_fuera.id_auditoria) not in ids
        assert str(antes.id_auditoria) not in ids

    def test_domingo_9pm_en_bogota_cuenta_en_la_semana_de_ese_domingo(
        self, client: TestClient, admin_sistema_auth_headers, db, reciclador_test, conjunto_verificado
    ):
        """¿Qué? Domingo 20 de septiembre a las 21:00 en Bogotá es lunes 21 a las 02:00 en UTC.
        Cortada en UTC caía en la semana siguiente; en hora de Bogotá es de la semana del domingo."""
        reciclador = db.query(Reciclador).filter_by(id_usuario=reciclador_test.id_usuario).one()
        domingo_noche = _crear_auditoria(
            db, reciclador, conjunto_verificado, creado=datetime(2026, 9, 21, 2, 0, tzinfo=timezone.utc)
        )

        de_su_semana = client.get(URL, headers=admin_sistema_auth_headers, params={"lunes": "2026-09-14"}).json()
        de_la_siguiente = client.get(URL, headers=admin_sistema_auth_headers, params={"lunes": "2026-09-21"}).json()

        assert str(domingo_noche.id_auditoria) in {i["id_auditoria"] for i in de_su_semana["items"]}
        assert str(domingo_noche.id_auditoria) not in {i["id_auditoria"] for i in de_la_siguiente["items"]}

    def test_incluye_conjunto_tema_y_nombre_del_reciclador(
        self, client: TestClient, admin_sistema_auth_headers, db, reciclador_test, conjunto_verificado
    ):
        reciclador = db.query(Reciclador).filter_by(id_usuario=reciclador_test.id_usuario).one()
        _crear_auditoria(
            db, reciclador, conjunto_verificado,
            nivel="DEFICIENTE", descripcion="Escombros junto al SHUT.",
            creado=datetime(2026, 9, 18, tzinfo=timezone.utc),
        )

        response = client.get(URL, headers=admin_sistema_auth_headers)
        fila = response.json()["items"][0]
        assert fila["nombre_conjunto"] == conjunto_verificado.nombre_conjunto
        assert fila["nombre_reciclador"] == f"{reciclador.nombre} {reciclador.apellidos}"
        assert fila["nivel_desempeno"] == "DEFICIENTE"
        assert fila["descripcion"] == "Escombros junto al SHUT."

    def test_incluye_la_localidad_del_conjunto(
        self, client: TestClient, admin_sistema_auth_headers, db, reciclador_test, conjunto_verificado, localidad_test
    ):
        reciclador = db.query(Reciclador).filter_by(id_usuario=reciclador_test.id_usuario).one()
        auditoria = _crear_auditoria(db, reciclador, conjunto_verificado, creado=datetime(2026, 9, 18, tzinfo=timezone.utc))

        response = client.get(URL, headers=admin_sistema_auth_headers)
        fila = next(f for f in response.json()["items"] if f["id_auditoria"] == str(auditoria.id_auditoria))
        assert fila["id_localidad"] == localidad_test.id_localidad
        assert fila["nombre_localidad"] == localidad_test.nombre_localidad

    def test_avisados_cuenta_los_destinatarios_de_la_notificacion(
        self, client: TestClient, admin_sistema_auth_headers, db, reciclador_test, conjunto_verificado, test_user
    ):
        reciclador = db.query(Reciclador).filter_by(id_usuario=reciclador_test.id_usuario).one()
        auditoria = _crear_auditoria(db, reciclador, conjunto_verificado, nivel="REGULAR", creado=datetime(2026, 9, 20, tzinfo=timezone.utc))
        _notificar(db, auditoria, [test_user])

        response = client.get(URL, headers=admin_sistema_auth_headers)
        fila = next(f for f in response.json()["items"] if f["id_auditoria"] == str(auditoria.id_auditoria))
        assert fila["avisados"] == 1

    def test_nivel_bueno_sin_notificacion_tiene_avisados_en_cero(
        self, client: TestClient, admin_sistema_auth_headers, db, reciclador_test, conjunto_verificado
    ):
        reciclador = db.query(Reciclador).filter_by(id_usuario=reciclador_test.id_usuario).one()
        auditoria = _crear_auditoria(db, reciclador, conjunto_verificado, nivel="BUENA", creado=datetime(2026, 9, 20, tzinfo=timezone.utc))

        response = client.get(URL, headers=admin_sistema_auth_headers)
        fila = next(f for f in response.json()["items"] if f["id_auditoria"] == str(auditoria.id_auditoria))
        assert fila["avisados"] == 0

    def test_semana_sin_auditorias_devuelve_lista_vacia(self, client: TestClient, admin_sistema_auth_headers):
        response = client.get(URL, headers=admin_sistema_auth_headers, params={"lunes": "2020-01-06"})
        assert response.status_code == 200
        assert response.json() == {"items": [], "total": 0, "conteos": {"BUENA": 0, "REGULAR": 0, "DEFICIENTE": 0}}

    def test_lunes_con_formato_invalido_devuelve_422(self, client: TestClient, admin_sistema_auth_headers):
        response = client.get(URL, headers=admin_sistema_auth_headers, params={"lunes": "no-es-una-fecha"})
        assert response.status_code == 422


def _ids(response) -> list[str]:
    return [item["id_auditoria"] for item in response.json()["items"]]


@pytest.fixture()
def reciclador(db, reciclador_test) -> Reciclador:
    return db.query(Reciclador).filter_by(id_usuario=reciclador_test.id_usuario).one()


class TestFiltrosYPaginas:
    """Issue #618: la lista filtra, ordena y corta en el servidor."""

    def test_pagina_de_a_pocas_filas_con_el_total_completo(
        self, client: TestClient, admin_sistema_auth_headers, db, reciclador, conjunto_verificado
    ):
        auditorias = [
            _crear_auditoria(db, reciclador, conjunto_verificado, creado=datetime(2026, 9, dia, 15, tzinfo=timezone.utc))
            for dia in range(1, 6)
        ]
        primera = client.get(URL, headers=admin_sistema_auth_headers, params={"limit": 2, "offset": 0}).json()
        tercera = client.get(URL, headers=admin_sistema_auth_headers, params={"limit": 2, "offset": 4}).json()

        assert primera["total"] == 5 and len(primera["items"]) == 2
        assert len(tercera["items"]) == 1
        # De la más reciente a la más antigua, sin repetir ni saltarse filas entre páginas.
        assert primera["items"][0]["id_auditoria"] == str(auditorias[4].id_auditoria)
        assert tercera["items"][0]["id_auditoria"] == str(auditorias[0].id_auditoria)

    def test_nivel_filtra_el_total_pero_no_los_conteos(
        self, client: TestClient, admin_sistema_auth_headers, db, reciclador, conjunto_verificado
    ):
        for nivel in ("BUENA", "REGULAR", "REGULAR", "DEFICIENTE"):
            _crear_auditoria(db, reciclador, conjunto_verificado, nivel=nivel, creado=datetime(2026, 9, 15, 15, tzinfo=timezone.utc))

        data = client.get(URL, headers=admin_sistema_auth_headers, params={"nivel": "REGULAR"}).json()

        assert data["total"] == 2
        assert {i["nivel_desempeno"] for i in data["items"]} == {"REGULAR"}
        assert data["conteos"] == {"BUENA": 1, "REGULAR": 2, "DEFICIENTE": 1}

    def test_los_conteos_respetan_los_demas_filtros(
        self, client: TestClient, admin_sistema_auth_headers, db, reciclador, conjunto_verificado, conjunto_verificado_sin_admin
    ):
        _crear_auditoria(db, reciclador, conjunto_verificado, nivel="DEFICIENTE", creado=datetime(2026, 9, 15, 15, tzinfo=timezone.utc))
        _crear_auditoria(db, reciclador, conjunto_verificado_sin_admin, nivel="BUENA", creado=datetime(2026, 9, 15, 15, tzinfo=timezone.utc))

        data = client.get(
            URL, headers=admin_sistema_auth_headers, params={"id_conjunto": str(conjunto_verificado.id_conjunto_residencial)}
        ).json()

        assert data["conteos"] == {"BUENA": 0, "REGULAR": 0, "DEFICIENTE": 1}

    def test_desde_y_hasta_incluyen_ambos_dias_en_hora_de_bogota(
        self, client: TestClient, admin_sistema_auth_headers, db, reciclador, conjunto_verificado
    ):
        # Bogotá es UTC-5: el día 10 va del 10 a las 05:00 UTC al 11 a las 05:00 UTC.
        antes = _crear_auditoria(db, reciclador, conjunto_verificado, creado=datetime(2026, 9, 10, 4, 59, tzinfo=timezone.utc))
        primer_dia = _crear_auditoria(db, reciclador, conjunto_verificado, creado=datetime(2026, 9, 10, 5, 0, tzinfo=timezone.utc))
        ultimo_dia = _crear_auditoria(db, reciclador, conjunto_verificado, creado=datetime(2026, 9, 30, 4, 59, tzinfo=timezone.utc))
        despues = _crear_auditoria(db, reciclador, conjunto_verificado, creado=datetime(2026, 9, 30, 5, 0, tzinfo=timezone.utc))

        ids = _ids(client.get(URL, headers=admin_sistema_auth_headers, params={"desde": "2026-09-10", "hasta": "2026-09-29"}))

        assert str(primer_dia.id_auditoria) in ids and str(ultimo_dia.id_auditoria) in ids
        assert str(antes.id_auditoria) not in ids and str(despues.id_auditoria) not in ids

    def test_un_mes_entero_trae_calificaciones_de_varias_semanas(
        self, client: TestClient, admin_sistema_auth_headers, db, reciclador, conjunto_verificado
    ):
        for dia in (2, 12, 22):
            _crear_auditoria(db, reciclador, conjunto_verificado, creado=datetime(2026, 9, dia, 15, tzinfo=timezone.utc))

        data = client.get(URL, headers=admin_sistema_auth_headers, params={"desde": "2026-09-01", "hasta": "2026-09-30"}).json()

        assert data["total"] == 3

    def test_hasta_anterior_a_desde_devuelve_422(self, client: TestClient, admin_sistema_auth_headers):
        response = client.get(URL, headers=admin_sistema_auth_headers, params={"desde": "2026-09-10", "hasta": "2026-09-01"})
        assert response.status_code == 422

    def test_filtra_por_conjunto(
        self, client: TestClient, admin_sistema_auth_headers, db, reciclador, conjunto_verificado, conjunto_verificado_sin_admin
    ):
        mia = _crear_auditoria(db, reciclador, conjunto_verificado, creado=datetime(2026, 9, 15, 15, tzinfo=timezone.utc))
        _crear_auditoria(db, reciclador, conjunto_verificado_sin_admin, creado=datetime(2026, 9, 15, 15, tzinfo=timezone.utc))

        ids = _ids(client.get(URL, headers=admin_sistema_auth_headers, params={"id_conjunto": str(conjunto_verificado.id_conjunto_residencial)}))

        assert ids == [str(mia.id_auditoria)]

    def test_filtra_por_localidad(
        self, client: TestClient, admin_sistema_auth_headers, db, reciclador, conjunto_verificado, localidad_test
    ):
        otra = Localidad(nombre_localidad="Chapinero")
        db.add(otra)
        db.commit()
        db.refresh(otra)
        conjunto_otra = ConjuntoResidencial(
            id_localidad=otra.id_localidad, nombre_conjunto="CONJUNTO CHAPINERO", direccion="Calle 60 # 5-5", verificado=True
        )
        db.add(conjunto_otra)
        db.commit()
        db.refresh(conjunto_otra)
        _crear_auditoria(db, reciclador, conjunto_verificado, creado=datetime(2026, 9, 15, 15, tzinfo=timezone.utc))
        de_chapinero = _crear_auditoria(db, reciclador, conjunto_otra, creado=datetime(2026, 9, 15, 15, tzinfo=timezone.utc))

        ids = _ids(client.get(URL, headers=admin_sistema_auth_headers, params={"id_localidad": otra.id_localidad}))

        assert ids == [str(de_chapinero.id_auditoria)]

    @pytest.mark.parametrize("texto", ["torres de prueba", "ESCOMBROS", "código de colores"])
    def test_buscar_encuentra_por_conjunto_descripcion_o_tema_sin_importar_mayusculas(
        self, client: TestClient, admin_sistema_auth_headers, db, reciclador, conjunto_verificado, texto
    ):
        encontrada = _crear_auditoria(
            db, reciclador, conjunto_verificado, descripcion="Escombros junto al SHUT.", creado=datetime(2026, 9, 15, 15, tzinfo=timezone.utc)
        )
        response = client.get(URL, headers=admin_sistema_auth_headers, params={"buscar": texto})
        assert _ids(response) == [str(encontrada.id_auditoria)]
        assert response.json()["total"] == 1

    def test_buscar_sin_coincidencias_devuelve_vacio(
        self, client: TestClient, admin_sistema_auth_headers, db, reciclador, conjunto_verificado
    ):
        _crear_auditoria(db, reciclador, conjunto_verificado, creado=datetime(2026, 9, 15, 15, tzinfo=timezone.utc))
        assert client.get(URL, headers=admin_sistema_auth_headers, params={"buscar": "zzz-no-existe"}).json()["total"] == 0

    def test_orden_criticas_pone_lo_peor_primero_aunque_sea_mas_vieja(
        self, client: TestClient, admin_sistema_auth_headers, db, reciclador, conjunto_verificado
    ):
        buena_nueva = _crear_auditoria(db, reciclador, conjunto_verificado, nivel="BUENA", creado=datetime(2026, 9, 20, 15, tzinfo=timezone.utc))
        regular = _crear_auditoria(db, reciclador, conjunto_verificado, nivel="REGULAR", creado=datetime(2026, 9, 18, 15, tzinfo=timezone.utc))
        mala_vieja = _crear_auditoria(db, reciclador, conjunto_verificado, nivel="DEFICIENTE", creado=datetime(2026, 9, 10, 15, tzinfo=timezone.utc))

        ids = _ids(client.get(URL, headers=admin_sistema_auth_headers, params={"orden": "criticas"}))

        assert ids == [str(mala_vieja.id_auditoria), str(regular.id_auditoria), str(buena_nueva.id_auditoria)]

    def test_orden_por_conjunto_es_alfabetico(
        self, client: TestClient, admin_sistema_auth_headers, db, reciclador, conjunto_verificado, conjunto_verificado_sin_admin
    ):
        # "RESERVA DE PRUEBA" va antes que "TORRES DE PRUEBA".
        torres = _crear_auditoria(db, reciclador, conjunto_verificado, creado=datetime(2026, 9, 20, 15, tzinfo=timezone.utc))
        reserva = _crear_auditoria(db, reciclador, conjunto_verificado_sin_admin, creado=datetime(2026, 9, 10, 15, tzinfo=timezone.utc))

        ids = _ids(client.get(URL, headers=admin_sistema_auth_headers, params={"orden": "conjunto"}))

        assert ids == [str(reserva.id_auditoria), str(torres.id_auditoria)]

    def test_orden_invalido_devuelve_422(self, client: TestClient, admin_sistema_auth_headers):
        assert client.get(URL, headers=admin_sistema_auth_headers, params={"orden": "al-azar"}).status_code == 422


class TestResumenDeLaSemana:
    URL_RESUMEN = f"{URL}/resumen-semana"

    def test_cuenta_por_nivel_y_lista_los_temas_con_recomendacion(
        self, client: TestClient, admin_sistema_auth_headers, db, reciclador, conjunto_verificado
    ):
        # Semana del lunes 14 de septiembre de 2026.
        _crear_auditoria(db, reciclador, conjunto_verificado, nivel="BUENA", tema="Tema A", creado=datetime(2026, 9, 15, 15, tzinfo=timezone.utc))
        _crear_auditoria(db, reciclador, conjunto_verificado, nivel="REGULAR", tema="Tema B", creado=datetime(2026, 9, 16, 15, tzinfo=timezone.utc))
        _crear_auditoria(db, reciclador, conjunto_verificado, nivel="DEFICIENTE", tema="Tema B", creado=datetime(2026, 9, 17, 15, tzinfo=timezone.utc))
        # Fuera de la semana: no cuenta.
        _crear_auditoria(db, reciclador, conjunto_verificado, nivel="DEFICIENTE", tema="Tema C", creado=datetime(2026, 9, 22, 15, tzinfo=timezone.utc))

        data = client.get(self.URL_RESUMEN, headers=admin_sistema_auth_headers, params={"lunes": "2026-09-14"}).json()

        assert data["lunes"] == "2026-09-14"
        assert (data["bueno"], data["regular"], data["malo"]) == (1, 1, 1)
        assert data["temas_con_recomendacion"] == ["Tema B"]

    def test_semana_vacia_devuelve_ceros(self, client: TestClient, admin_sistema_auth_headers):
        data = client.get(self.URL_RESUMEN, headers=admin_sistema_auth_headers, params={"lunes": "2020-01-06"}).json()
        assert (data["bueno"], data["regular"], data["malo"]) == (0, 0, 0)
        assert data["temas_con_recomendacion"] == []

    def test_exige_lunes(self, client: TestClient, admin_sistema_auth_headers):
        assert client.get(self.URL_RESUMEN, headers=admin_sistema_auth_headers).status_code == 422

    def test_solo_el_admin_del_sistema(self, client: TestClient, auth_headers, reciclador_auth_headers):
        params = {"lunes": "2026-09-14"}
        assert client.get(self.URL_RESUMEN, params=params).status_code == 401
        assert client.get(self.URL_RESUMEN, headers=auth_headers, params=params).status_code == 403
        assert client.get(self.URL_RESUMEN, headers=reciclador_auth_headers, params=params).status_code == 403
