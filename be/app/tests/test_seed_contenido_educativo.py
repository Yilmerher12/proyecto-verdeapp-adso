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
import re
from urllib.parse import unquote

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

    def test_el_orden_de_cada_categoria_va_de_1_en_1_sin_huecos(self):
        # ¿Impacto? "Anterior / Siguiente" de "Aprende a reciclar" sigue este orden (issue #705).
        por_categoria: dict[str, list[int]] = {}
        for modulo in _archivo():
            por_categoria.setdefault(modulo["modulo_categoria"], []).append(modulo["orden"])

        for categoria, ordenes in por_categoria.items():
            assert sorted(ordenes) == list(range(1, len(ordenes) + 1)), categoria

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
        # ¿Impacto? El issue #519 exige "cada afirmación lleva su fuente": todos los módulos del
        #           archivo terminan con un párrafo "Fuente: ...".
        sin_fuente = [m["titulo_tema"] for m in _archivo() if "\n\nFuente: " not in m["cuerpo_texto"]]
        assert sin_fuente == []

    def test_los_enlaces_internos_apuntan_a_categorias_que_existen(self):
        # ¿Qué? Un enlace como [texto](/catalogo-educativo/Nombre%20de%20la%20categoría) lleva a esa categoría.
        # ¿Impacto? Si se renombra una categoría y un módulo sigue apuntando al nombre viejo, el Residente
        #           llegaría a una lista vacía. Los enlaces a una lección puntual no se permiten: su id
        #           cambia en cada base de datos y el enlace no sirviría para todos.
        prefijo = "/catalogo-educativo/"
        malos = []
        for modulo in _archivo():
            for destino in re.findall(r"\]\((/[^)\s]*)\)", modulo["cuerpo_texto"]):
                categoria = unquote(destino.removeprefix(prefijo)) if destino.startswith(prefijo) else None
                if categoria not in CATEGORIAS:
                    malos.append((modulo["titulo_tema"], destino))
        assert malos == []

    def test_dos_modulos_de_una_categoria_no_repiten_la_misma_estructura(self):
        # ¿Qué? La secuencia de títulos de sección ("**Título**" al inicio de un párrafo) de cada módulo.
        # ¿Impacto? Issue #707: los módulos de una categoría rotan sus secciones según su tema. Si dos
        #           tienen exactamente los mismos títulos en el mismo orden, se leen como copia de plantilla.
        vistas: dict[tuple, str] = {}
        repetidas = []
        for modulo in _archivo():
            titulos = tuple(re.findall(r"(?m)^\*\*([^*\n]+)\*\*\s*$", modulo["cuerpo_texto"]))
            clave = (modulo["modulo_categoria"], titulos)
            if clave in vistas:
                repetidas.append((vistas[clave], modulo["titulo_tema"]))
            vistas[clave] = modulo["titulo_tema"]
        assert repetidas == []

    def test_la_introduccion_no_se_confunde_con_un_titulo(self):
        # ¿Qué? "Hay casos que engañan: parecen..." se mostraría como una sección titulada «Hay casos que
        #       engañan» y la lección quedaría sin introducción. Es la misma regla de la etiqueta corta de
        #       fe/src/lib/muroLeccion.ts: hasta 40 caracteres sin punto ni signos antes de los dos puntos.
        # ¿Impacto? El primer párrafo de cada módulo no debe empezar en negrita, con # ni con esa etiqueta.
        etiqueta_corta = re.compile(r"^([^.:?!\n]{3,40}):\s+\S")
        malos = []
        for modulo in _archivo():
            primero = modulo["cuerpo_texto"].split("\n\n")[0].strip()
            if primero.startswith(("**", "#", "![")) or etiqueta_corta.match(primero):
                malos.append(modulo["titulo_tema"])
        assert malos == []


class TestImportarContenidoEducativo:
    def test_carga_todos_los_modulos_del_archivo(self, db: Session):
        seed.importar_contenido_educativo(db.connection())

        assert _contar(db) == len(_archivo())

    def test_guarda_el_orden_del_archivo(self, db: Session):
        seed.importar_contenido_educativo(db.connection())

        esperado = {(m["modulo_categoria"], m["titulo_tema"]): m["orden"] for m in _archivo()}
        guardado = {(c.modulo_categoria, c.titulo_tema): c.orden for c in db.scalars(select(ContenidoEducativo))}
        assert guardado == esperado

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
