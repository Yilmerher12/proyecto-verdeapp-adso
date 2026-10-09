"""
Módulo: tests/test_limpiar_adjuntos.py
Descripción: Pruebas del comando que borra los adjuntos que nadie usa
             (issue #395, CN-046).
"""
import os
import time

from sqlalchemy import String

from app import limpiar_adjuntos
from app.database import Base
from app.limpiar_adjuntos import COLUMNAS_CON_ADJUNTOS, COLUMNAS_SIN_ADJUNTOS, limpiar
from app.models.novedad_enviada import NovedadEnviada

DOS_DIAS = 2 * 24 * 3600


def _archivo(carpeta, nombre: str, antiguedad_segundos: float = 0):
    ruta = carpeta / nombre
    ruta.write_bytes(b"x")
    antes = time.time() - antiguedad_segundos
    os.utime(ruta, (antes, antes))
    return ruta


def test_borra_el_huerfano_viejo(db, tmp_path):
    huerfano = _archivo(tmp_path, "huerfano.png", DOS_DIAS)
    assert limpiar(db, tmp_path, simular=False) == [huerfano]
    assert not huerfano.exists()


def test_conserva_el_referenciado_aunque_sea_viejo(db, test_user, tmp_path):
    usado = _archivo(tmp_path, "usado.png", DOS_DIAS)
    db.add(NovedadEnviada(autor_id=test_user.id_usuario, texto="Con foto", url_imagen="/uploads/adjuntos/usado.png"))
    db.commit()
    assert limpiar(db, tmp_path, simular=False) == []
    assert usado.exists()


def test_conserva_el_huerfano_de_menos_de_24_horas(db, tmp_path):
    """Quien acaba de subir la foto todavía está llenando el formulario."""
    reciente = _archivo(tmp_path, "reciente.png", 3600)
    assert limpiar(db, tmp_path, simular=False) == []
    assert reciente.exists()


def test_simular_lista_pero_no_borra(db, tmp_path):
    huerfano = _archivo(tmp_path, "huerfano.png", DOS_DIAS)
    assert limpiar(db, tmp_path, simular=True) == [huerfano]
    assert huerfano.exists()


def test_el_registro_de_subidas_no_cuenta_como_uso(db, test_user, tmp_path):
    """archivos_subidos guarda la ruta de TODO lo subido: si contara como uso, nada se borraría nunca."""
    from app.models.archivo_subido import ArchivoSubido

    huerfano = _archivo(tmp_path, "huerfano.png", DOS_DIAS)
    db.add(ArchivoSubido(id_usuario=test_user.id_usuario, ruta="/uploads/adjuntos/huerfano.png"))
    db.commit()
    assert limpiar(db, tmp_path, simular=False) == [huerfano]


def test_carpeta_que_no_existe_no_falla(db, tmp_path):
    assert limpiar(db, tmp_path / "no-existe", simular=False) == []


def test_main_con_simular_imprime_y_no_borra(db, tmp_path, monkeypatch, capsys):
    huerfano = _archivo(tmp_path, "huerfano.png", DOS_DIAS)
    monkeypatch.setattr(limpiar_adjuntos, "CARPETA_ADJUNTOS", tmp_path)
    monkeypatch.setattr(limpiar_adjuntos, "SessionLocal", lambda: db)
    monkeypatch.setattr("sys.argv", ["limpiar_adjuntos", "--simular"])
    limpiar_adjuntos.main()
    salida = capsys.readouterr().out
    assert "huerfano.png" in salida
    assert "Se borrarían 1 archivo" in salida
    assert huerfano.exists()


def test_toda_columna_que_parece_enlace_esta_clasificada():
    """
    ¿Qué? Falla si un modelo tiene una columna de texto que parece guardar un
          enlace o una ruta (url_..., ruta_..., ..._url) y no está en ninguna de
          las dos listas de app/limpiar_adjuntos.py.
    ¿Para qué? Si la columna nueva guarda rutas de /uploads/adjuntos/ y nadie la
              suma a COLUMNAS_CON_ADJUNTOS, la limpieza borraría archivos que sí
              se usan. Quien agregue la columna debe decidir en cuál lista va.
    """
    clasificadas = {(c.class_.__tablename__, c.key) for c in COLUMNAS_CON_ADJUNTOS + COLUMNAS_SIN_ADJUNTOS}
    parecen_enlace = {
        (tabla.name, columna.name)
        for tabla in Base.metadata.tables.values()
        for columna in tabla.columns
        if isinstance(columna.type, String)
        and (columna.name.startswith(("url_", "ruta")) or columna.name.endswith("_url"))
    }
    assert parecen_enlace - clasificadas == set()
