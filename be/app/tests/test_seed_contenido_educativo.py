"""
Pruebas de la carga del contenido educativo desde el seed (issue #519).

¿Qué? Comprueban que importar_contenido_educativo carga los módulos del archivo
      data/contenido_educativo.json, que correrla varias veces no duplica nada ni
      pisa lo que el Admin del Sistema editó, y que cada categoría auditable tiene
      más de un módulo.
¿Para qué? Quien ya tenía su base sembrada tiene que poder recibir los módulos
          nuevos corriendo el seed otra vez, sin repetir los que ya existían.
¿Impacto? Si alguien borra una categoría del archivo o deja una con un solo
          módulo, la prueba falla antes de que llegue al catálogo.
"""

import json

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import seed
from app.models.contenido_educativo import ContenidoEducativo
from app.schemas.contenido_educativo import CUERPO_MAX_LENGTH, MODULO_MAX_LENGTH, TITULO_MAX_LENGTH

# ¿Qué? Las 8 categorías de docs/gestion-proyecto/estructura-contenido-educativo.md.
CATEGORIAS = {
    "Separación en la fuente y código de colores",
    "Tipos de residuos y su preparación",
    "Puntos limpios y Ecopuntos",
    "Economía circular y aprovechamiento",
    "Residuos de construcción y demolición",
    "Marco distrital y consumo responsable",
    "Residuos peligrosos del hogar",
    "Aparatos, llantas y baterías",
}


def _archivo() -> list[dict]:
    return json.loads(seed.CONTENIDO_EDUCATIVO_JSON.read_text(encoding="utf-8"))


def _contar(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(ContenidoEducativo))


class TestArchivoDeContenido:
    def test_cada_categoria_tiene_al_menos_dos_modulos(self):
        por_categoria: dict[str, int] = {}
        for modulo in _archivo():
            por_categoria[modulo["modulo_categoria"]] = por_categoria.get(modulo["modulo_categoria"], 0) + 1

        assert set(por_categoria) == CATEGORIAS
        assert all(cantidad >= 2 for cantidad in por_categoria.values()), por_categoria

    def test_no_hay_titulos_repetidos_dentro_de_una_categoria(self):
        # ¿Impacto? La carga decide si un módulo ya existe por categoría + título: si el archivo
        #           repite una pareja, el segundo módulo nunca se insertaría.
        parejas = [(m["modulo_categoria"], m["titulo_tema"]) for m in _archivo()]
        assert len(parejas) == len(set(parejas))

    def test_cada_modulo_respeta_los_limites_y_trae_su_guia(self):
        for modulo in _archivo():
            assert len(modulo["modulo_categoria"]) <= MODULO_MAX_LENGTH
            assert len(modulo["titulo_tema"]) <= TITULO_MAX_LENGTH
            assert 0 < len(modulo["cuerpo_texto"]) <= CUERPO_MAX_LENGTH
            assert modulo["url_guia"].startswith("https://"), modulo["titulo_tema"]
            if modulo["url_video"]:
                assert modulo["url_video"].startswith("https://"), modulo["titulo_tema"]

    def test_los_modulos_nuevos_citan_su_fuente(self):
        # ¿Impacto? El issue #519 exige "cada afirmación lleva su fuente": los 16 módulos
        #           nuevos terminan con un párrafo "Fuente: ...".
        con_fuente = [m for m in _archivo() if "\n\nFuente: " in m["cuerpo_texto"]]
        assert len(con_fuente) >= 16


class TestImportarContenidoEducativo:
    def test_carga_todos_los_modulos_del_archivo(self, db: Session):
        seed.importar_contenido_educativo(db.connection())

        assert _contar(db) == len(_archivo())

    def test_correrla_dos_veces_no_duplica(self, db: Session):
        seed.importar_contenido_educativo(db.connection())
        seed.importar_contenido_educativo(db.connection())

        assert _contar(db) == len(_archivo())

    def test_solo_agrega_lo_que_falta(self, db: Session):
        # ¿Qué? Simula a quien ya tenía un módulo sembrado: al correrla, recibe solo el resto.
        primero = _archivo()[0]
        db.add(
            ContenidoEducativo(
                modulo_categoria=primero["modulo_categoria"],
                titulo_tema=primero["titulo_tema"],
                cuerpo_texto="texto que ya existía",
                fecha_publicacion="2026-08-15",
            )
        )
        db.commit()

        seed.importar_contenido_educativo(db.connection())

        assert _contar(db) == len(_archivo())

    def test_no_pisa_el_texto_que_el_admin_edito(self, db: Session):
        seed.importar_contenido_educativo(db.connection())
        modulo = db.scalar(select(ContenidoEducativo).limit(1))
        modulo.cuerpo_texto = "EDITADO POR EL ADMIN"
        db.commit()

        seed.importar_contenido_educativo(db.connection())

        db.refresh(modulo)
        assert modulo.cuerpo_texto == "EDITADO POR EL ADMIN"
        assert _contar(db) == len(_archivo())
