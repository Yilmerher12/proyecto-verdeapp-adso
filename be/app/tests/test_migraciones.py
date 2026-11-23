"""Pruebas de la cadena de migraciones de Alembic (be/alembic/versions/).

¿Qué? Revisan los archivos de migración sin tocar ninguna base de datos: que cada id sea único, que haya
      una sola migración final ("head") y que todas estén enlazadas en una sola cadena desde la primera.
¿Para qué? Las demás pruebas arman la base con Base.metadata.create_all() y nunca corren migraciones, así que
           un id repetido pasaba todas las pruebas y solo fallaba al correr `alembic upgrade head` en una base
           nueva (le pasó a un compañero con los dos archivos `b1c2d3e4f5a6_...`, ids escritos a mano).
¿Impacto? Si alguien repite un id o deja dos cabezas, `pytest` falla y dice cuáles archivos son. Los ids de
          migración se generan con `alembic revision`, nunca a mano.
"""

import re
from collections import defaultdict
from pathlib import Path

from alembic.script import ScriptDirectory

CARPETA = Path(__file__).resolve().parents[2] / "alembic" / "versions"
ID = re.compile(r"^revision(?:: str)?\s*=\s*'([^']+)'", re.MULTILINE)


def ids_repetidos(carpeta: Path) -> dict[str, list[str]]:
    """Devuelve {id: [archivos]} solo para los ids que aparecen en más de un archivo.

    ¿Por qué leer los archivos y no usar Alembic? Cuando dos archivos comparten id, Alembic se queda con uno y
    solo avisa con una advertencia: no hay forma de verlo desde su propia API.
    """
    por_id: dict[str, list[str]] = defaultdict(list)
    for archivo in sorted(carpeta.glob("*.py")):
        coincidencia = ID.search(archivo.read_text(encoding="utf-8"))
        if coincidencia:
            por_id[coincidencia.group(1)].append(archivo.name)
    return {i: nombres for i, nombres in por_id.items() if len(nombres) > 1}


class TestCadenaDeMigraciones:
    def test_ningun_id_de_migracion_se_repite(self):
        repetidos = ids_repetidos(CARPETA)
        assert not repetidos, f"Hay ids de migración repetidos (genera el id con `alembic revision`): {repetidos}"

    def test_hay_una_sola_migracion_final(self):
        cabezas = ScriptDirectory(str(CARPETA.parent)).get_heads()
        assert len(cabezas) == 1, f"Debe haber una sola cabeza y hay {len(cabezas)}: {cabezas}"

    def test_todas_las_migraciones_forman_una_sola_cadena(self):
        # ¿Qué? Recorre la cadena desde la cabeza hasta la primera migración y cuenta los eslabones.
        # ¿Para qué? Una migración con un `down_revision` que no existe, o que cuelga de otra rama, queda fuera.
        archivos = [a for a in CARPETA.glob("*.py") if ID.search(a.read_text(encoding="utf-8"))]
        eslabones = list(ScriptDirectory(str(CARPETA.parent)).walk_revisions())
        assert len(eslabones) == len(archivos), f"Hay {len(archivos)} archivos pero la cadena tiene {len(eslabones)} migraciones"

    def test_detecta_dos_archivos_con_el_mismo_id(self, tmp_path):
        for nombre in ("aaa_primera.py", "bbb_segunda.py"):
            (tmp_path / nombre).write_text("revision: str = 'abc123def456'\n", encoding="utf-8")
        (tmp_path / "ccc_otra.py").write_text("revision: str = 'fff000fff000'\n", encoding="utf-8")
        assert ids_repetidos(tmp_path) == {"abc123def456": ["aaa_primera.py", "bbb_segunda.py"]}
