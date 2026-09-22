"""
Módulo: tests/test_auditoria_conjunto_admin.py
Descripción: Pruebas de GET /api/v1/auditorias-conjunto/admin (RQF-018) —
             la vista del Admin del Sistema sobre las auditorías del
             reciclador, por semana o las más recientes.
¿Para qué? Archivo aparte de test_auditoria_conjunto.py (que ya cubre crear,
           listar por rol y ver el detalle) para no mezclar el flujo del
           Reciclador/Residente/Admin de Conjunto con el del Admin del
           Sistema, que es de solo lectura y no pasa por el candado de
           24h ni por "avisar llegada".
"""
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.auditoria_conjunto import AuditoriaConjunto
from app.models.conjunto_residencial import ConjuntoResidencial
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
        # Semana del lunes 14 al domingo 20 de septiembre de 2026.
        dentro = _crear_auditoria(db, reciclador, conjunto_verificado, creado=datetime(2026, 9, 20, 23, 59, tzinfo=timezone.utc))
        justo_fuera = _crear_auditoria(db, reciclador, conjunto_verificado, creado=datetime(2026, 9, 21, 0, 0, tzinfo=timezone.utc))
        antes = _crear_auditoria(db, reciclador, conjunto_verificado, creado=datetime(2026, 9, 13, 23, 59, tzinfo=timezone.utc))

        response = client.get(URL, headers=admin_sistema_auth_headers, params={"lunes": "2026-09-14"})
        assert response.status_code == 200
        ids = {item["id_auditoria"] for item in response.json()["items"]}
        assert str(dentro.id_auditoria) in ids
        assert str(justo_fuera.id_auditoria) not in ids
        assert str(antes.id_auditoria) not in ids

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
        assert response.json() == {"items": [], "total": 0}

    def test_lunes_con_formato_invalido_devuelve_422(self, client: TestClient, admin_sistema_auth_headers):
        response = client.get(URL, headers=admin_sistema_auth_headers, params={"lunes": "no-es-una-fecha"})
        assert response.status_code == 422
