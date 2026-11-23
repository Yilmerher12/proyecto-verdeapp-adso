"""
Módulo: tests/test_cors_origenes.py
Descripción: Tests de los orígenes que el backend deja llamarlo desde un navegador (CORS).
¿Para qué? Comprobar que desplegar en otro dominio solo exige definir FRONTEND_URL, y que
           en producción no queda abierto ningún puerto de desarrollo.
"""

from app.main import ALLOWED_ORIGINS, origenes_permitidos

DOMINIO = "https://verdeapp.example.com"


def test_en_produccion_solo_se_permite_el_frontend() -> None:
    assert origenes_permitidos(DOMINIO, es_produccion=True) == [DOMINIO]


def test_una_barra_final_no_cambia_el_origen() -> None:
    """El navegador manda el origen sin "/" al final; con ella nunca coincidiría."""
    assert origenes_permitidos(DOMINIO + "/", es_produccion=True) == [DOMINIO]


def test_en_desarrollo_se_suman_los_puertos_locales() -> None:
    origenes = origenes_permitidos(DOMINIO, es_produccion=False)
    assert DOMINIO in origenes
    assert "http://localhost:5173" in origenes
    assert "http://localhost:3000" in origenes


def test_no_repite_el_frontend_si_ya_es_un_puerto_local() -> None:
    origenes = origenes_permitidos("http://localhost:3000", es_produccion=False)
    assert origenes.count("http://localhost:3000") == 1


def test_nunca_se_permite_cualquier_origen() -> None:
    assert "*" not in ALLOWED_ORIGINS
