"""
Módulo: tests/test_limpiar_evidencias.py
Descripción: Pruebas del comando que borra las fotos de evidencia de las auditorías con más
             de 6 meses y conserva la auditoría (issue #587).
"""
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app import limpiar_evidencias
from app.limpiar_evidencias import PLAZO_RETENCION, limpiar
from app.models.auditoria_conjunto import AuditoriaConjunto
from app.models.reciclador import Reciclador

RUTA = "/uploads/evidencias-auditoria/"


def _reciclador(db: Session, reciclador_test) -> Reciclador:
    return db.query(Reciclador).filter(Reciclador.id_usuario == reciclador_test.id_usuario).one()


def _foto(carpeta, nombre: str):
    archivo = carpeta / nombre
    archivo.write_bytes(b"x")
    return archivo


def _auditoria(db: Session, reciclador, conjunto, dias: int, *nombres: str) -> AuditoriaConjunto:
    """Auditoría de hace `dias` días con hasta 3 fotos (por nombre de archivo)."""
    rutas = [f"{RUTA}{n}" for n in nombres] + [None, None, None]
    auditoria = AuditoriaConjunto(
        id_reciclador=reciclador.id_reciclador,
        id_conjunto_residencial=conjunto.id_conjunto_residencial,
        nivel_desempeno="REGULAR",
        tema_educativo="Separación en la fuente",
        ruta_evidencia=rutas[0],
        ruta_evidencia_2=rutas[1],
        ruta_evidencia_3=rutas[2],
        created_at=datetime.now(timezone.utc) - timedelta(days=dias),
    )
    db.add(auditoria)
    db.commit()
    db.refresh(auditoria)
    return auditoria


VENCIDA = PLAZO_RETENCION.days + 5
RECIENTE = 10


def test_borra_las_fotos_vencidas_y_conserva_la_auditoria(db, reciclador_test, conjunto_verificado, tmp_path):
    reciclador = _reciclador(db, reciclador_test)
    f1, f2 = _foto(tmp_path, "a.jpg"), _foto(tmp_path, "b.jpg")
    auditoria = _auditoria(db, reciclador, conjunto_verificado, VENCIDA, "a.jpg", "b.jpg")

    vencidas, archivos = limpiar(db, tmp_path, simular=False)

    assert [a.id_auditoria for a in vencidas] == [auditoria.id_auditoria]
    assert archivos == ["a.jpg", "b.jpg"]
    assert not f1.exists() and not f2.exists()
    db.refresh(auditoria)
    assert auditoria.ruta_evidencia is None
    assert auditoria.ruta_evidencia_2 is None
    assert auditoria.ruta_evidencia_3 is None
    # ¿Qué? Lo que alimenta el historial y las gráficas queda igual.
    assert auditoria.nivel_desempeno == "REGULAR"
    assert auditoria.tema_educativo == "Separación en la fuente"


def test_no_toca_las_auditorias_recientes(db, reciclador_test, conjunto_verificado, tmp_path):
    reciclador = _reciclador(db, reciclador_test)
    foto = _foto(tmp_path, "nueva.jpg")
    auditoria = _auditoria(db, reciclador, conjunto_verificado, RECIENTE, "nueva.jpg")

    assert limpiar(db, tmp_path, simular=False) == ([], [])
    assert foto.exists()
    db.refresh(auditoria)
    assert auditoria.ruta_evidencia == f"{RUTA}nueva.jpg"


def test_simular_lista_pero_no_borra_ni_cambia_la_base_de_datos(db, reciclador_test, conjunto_verificado, tmp_path):
    reciclador = _reciclador(db, reciclador_test)
    foto = _foto(tmp_path, "vieja.jpg")
    auditoria = _auditoria(db, reciclador, conjunto_verificado, VENCIDA, "vieja.jpg")

    vencidas, archivos = limpiar(db, tmp_path, simular=True)

    assert len(vencidas) == 1
    assert archivos == ["vieja.jpg"]
    assert foto.exists()
    db.refresh(auditoria)
    assert auditoria.ruta_evidencia == f"{RUTA}vieja.jpg"


def test_una_foto_compartida_con_una_auditoria_vigente_no_se_borra_del_disco(
    db, reciclador_test, conjunto_verificado, tmp_path
):
    """El seed de demostración reutiliza archivos: borrar el de la vencida rompería la vigente."""
    reciclador = _reciclador(db, reciclador_test)
    compartida = _foto(tmp_path, "compartida.jpg")
    propia = _foto(tmp_path, "propia.jpg")
    vencida = _auditoria(db, reciclador, conjunto_verificado, VENCIDA, "compartida.jpg", "propia.jpg")
    vigente = _auditoria(db, reciclador, conjunto_verificado, RECIENTE, "compartida.jpg")

    _, archivos = limpiar(db, tmp_path, simular=False)

    assert archivos == ["propia.jpg"]
    assert compartida.exists()
    assert not propia.exists()
    db.refresh(vencida)
    db.refresh(vigente)
    assert vencida.ruta_evidencia is None
    assert vigente.ruta_evidencia == f"{RUTA}compartida.jpg"


def test_un_archivo_que_ya_no_esta_en_el_disco_no_falla(db, reciclador_test, conjunto_verificado, tmp_path):
    reciclador = _reciclador(db, reciclador_test)
    auditoria = _auditoria(db, reciclador, conjunto_verificado, VENCIDA, "perdida.jpg")

    limpiar(db, tmp_path, simular=False)

    db.refresh(auditoria)
    assert auditoria.ruta_evidencia is None


def test_una_auditoria_vencida_sin_fotos_no_aparece(db, reciclador_test, conjunto_verificado, tmp_path):
    """Ya se limpió antes: correr el comando dos veces no hace nada la segunda."""
    reciclador = _reciclador(db, reciclador_test)
    _foto(tmp_path, "a.jpg")
    _auditoria(db, reciclador, conjunto_verificado, VENCIDA, "a.jpg")

    limpiar(db, tmp_path, simular=False)

    assert limpiar(db, tmp_path, simular=False) == ([], [])


def test_main_con_simular_imprime_y_no_borra(db, reciclador_test, conjunto_verificado, tmp_path, monkeypatch, capsys):
    reciclador = _reciclador(db, reciclador_test)
    foto = _foto(tmp_path, "vieja.jpg")
    _auditoria(db, reciclador, conjunto_verificado, VENCIDA, "vieja.jpg")
    monkeypatch.setattr(limpiar_evidencias, "CARPETA_EVIDENCIAS", tmp_path)
    monkeypatch.setattr(limpiar_evidencias, "SessionLocal", lambda: db)
    monkeypatch.setattr("sys.argv", ["limpiar_evidencias", "--simular"])

    limpiar_evidencias.main()

    salida = capsys.readouterr().out
    assert "vieja.jpg" in salida
    assert "Se borrarían 1 foto(s) de 1 auditoría(s)" in salida
    assert foto.exists()


def test_main_sin_simular_borra(db, reciclador_test, conjunto_verificado, tmp_path, monkeypatch, capsys):
    reciclador = _reciclador(db, reciclador_test)
    foto = _foto(tmp_path, "vieja.jpg")
    _auditoria(db, reciclador, conjunto_verificado, VENCIDA, "vieja.jpg")
    monkeypatch.setattr(limpiar_evidencias, "CARPETA_EVIDENCIAS", tmp_path)
    monkeypatch.setattr(limpiar_evidencias, "SessionLocal", lambda: db)
    monkeypatch.setattr("sys.argv", ["limpiar_evidencias"])

    limpiar_evidencias.main()

    assert "Se borraron 1 foto(s)" in capsys.readouterr().out
    assert not foto.exists()


def test_la_api_responde_una_auditoria_sin_foto_con_rutas_vacias(
    client: TestClient, db, reciclador_test, reciclador_auth_headers, conjunto_verificado, tmp_path
):
    """La pantalla recibe null y muestra "La foto ya no está disponible", en vez de fallar."""
    reciclador = _reciclador(db, reciclador_test)
    _foto(tmp_path, "a.jpg")
    _auditoria(db, reciclador, conjunto_verificado, VENCIDA, "a.jpg")
    limpiar(db, tmp_path, simular=False)

    response = client.get("/api/v1/auditorias-conjunto/mias", headers=reciclador_auth_headers)

    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["ruta_evidencia"] is None
    assert item["ruta_evidencia_2"] is None
    assert item["ruta_evidencia_3"] is None
    assert item["nivel_desempeno"] == "REGULAR"
