"""
Pruebas de app/seed_demo.py: la siembra de demostración para la feria.

¿Qué? Corre el seed completo sobre la BD de pruebas y revisa los conteos, la forma de las
      torres y que una segunda corrida no duplique nada.
¿Para qué? Si un modelo cambia (columna nueva obligatoria, enum renombrado), el seed demo se
          rompe en silencio y nadie lo nota hasta el día de la presentación. Esta prueba lo avisa.
"""
from datetime import date, datetime, timezone
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.agenda_conjunto import AgendaConjunto
from app.models.auditoria_conjunto import AuditoriaConjunto
from app.models.comunicado import Comunicado
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.contenido_educativo import ContenidoEducativo
from app.models.contenido_educativo_visto import ContenidoEducativoVisto
from app.models.localidad import Localidad
from app.models.notificacion import Notificacion
from app.models.novedad import Novedad
from app.models.novedad_enviada import NovedadEnviada
from app.models.reciclador import Reciclador
from app.models.reciclador_conjunto import RecicladorConjunto
from app.models.residente import Residente
from app.models.unidad import Unidad
from app.models.usuario import Usuario
from app.seed import CONJUNTO_DE_PRUEBA
from app.seed_demo import MARCADOR_DEMO, sembrar_demo


def _contar(db: Session, modelo) -> int:
    return db.scalar(select(func.count()).select_from(modelo))


def _preparar_base(db: Session) -> None:
    """Lo que app.seed trae y la BD de pruebas no: localidades usadas y módulos educativos."""
    db.add_all([Localidad(id_localidad=1, nombre_localidad="Usaquén"), Localidad(id_localidad=7, nombre_localidad="Bosa"), Localidad(id_localidad=8, nombre_localidad="Kennedy")])
    for numero in range(6):
        db.add(ContenidoEducativo(
            modulo_categoria=f"Módulo {numero}", titulo_tema=f"Tema {numero}", cuerpo_texto="Texto de prueba.",
            fecha_publicacion=date(2026, 8, 15 + numero),
        ))
    db.flush()


class TestSembrarDemo:
    def test_siembra_la_historia_completa(self, db: Session, tmp_path: Path) -> None:
        _preparar_base(db)

        assert sembrar_demo(db, carpeta_uploads=tmp_path) is True

        assert _contar(db, ConjuntoResidencial) == 3
        assert _contar(db, Residente) == 75
        assert _contar(db, Reciclador) == 5
        assert _contar(db, AuditoriaConjunto) == 30
        assert _contar(db, Comunicado) == 12
        assert _contar(db, Novedad) == 5
        assert _contar(db, NovedadEnviada) == 5
        assert _contar(db, AgendaConjunto) == 10
        assert _contar(db, Notificacion) > 0

    def test_las_torres_de_urapan_van_de_1_y_tienen_6_pisos_de_4_apartamentos(self, db: Session, tmp_path: Path) -> None:
        _preparar_base(db)
        sembrar_demo(db, carpeta_uploads=tmp_path)

        urapan = db.scalar(select(ConjuntoResidencial).where(ConjuntoResidencial.nombre_conjunto == "PARQUES DE BOGOTA URAPAN"))
        unidades = db.scalars(select(Unidad).where(Unidad.id_conjunto_residencial == urapan.id_conjunto_residencial)).all()

        assert urapan.id_localidad == 7
        assert urapan.total_apartamentos == 96
        assert len(unidades) == 96
        assert {u.torre for u in unidades} == {"TORRE 1", "TORRE 2", "TORRE 3", "TORRE 4"}
        assert {"101", "104", "601", "604"} <= {u.apto for u in unidades}

    def test_cada_auditoria_trae_una_foto_que_existe_y_un_tema_del_catalogo(self, db: Session, tmp_path: Path) -> None:
        _preparar_base(db)
        sembrar_demo(db, carpeta_uploads=tmp_path)

        for auditoria in db.scalars(select(AuditoriaConjunto)):
            assert auditoria.descripcion
            assert (tmp_path / "evidencias-auditoria" / Path(auditoria.ruta_evidencia).name).exists()
            assert auditoria.created_at <= datetime.now(timezone.utc)

    def test_el_residente_de_prueba_ya_vio_3_de_6_lecciones(self, db: Session, tmp_path: Path) -> None:
        _preparar_base(db)
        sembrar_demo(db, carpeta_uploads=tmp_path)

        residente = db.scalar(select(Usuario).where(Usuario.correo_electronico == "residente.prueba@verdeapp.com"))
        vistos = db.scalar(select(func.count()).select_from(ContenidoEducativoVisto).where(ContenidoEducativoVisto.id_usuario == residente.id_usuario))

        assert vistos == 3

    def test_no_hay_dos_residentes_con_el_mismo_nombre_completo(self, db: Session, tmp_path: Path) -> None:
        _preparar_base(db)
        sembrar_demo(db, carpeta_uploads=tmp_path)

        nombres = [(r.nombre, r.apellidos) for r in db.scalars(select(Residente))]

        assert len(nombres) == len(set(nombres))

    def test_reutiliza_el_vinculo_que_app_seed_ya_creo_entre_el_reciclador_de_prueba_y_aranjuez(self, db: Session, tmp_path: Path) -> None:
        _preparar_base(db)
        reciclador_usuario = Usuario(correo_electronico="reciclador.prueba@verdeapp.com", id_rol=3, password="x", is_active=True)
        conjunto = ConjuntoResidencial(id_localidad=1, nombre_conjunto=CONJUNTO_DE_PRUEBA, direccion="KR7#140-20")
        db.add_all([reciclador_usuario, conjunto])
        db.flush()
        reciclador = Reciclador(id_usuario=reciclador_usuario.id_usuario, localidad_id=1, nombre="RECICLADOR", apellidos="DE PRUEBA")
        db.add(reciclador)
        db.flush()
        db.add(RecicladorConjunto(id_reciclador=reciclador.id_reciclador, id_conjunto_residencial=conjunto.id_conjunto_residencial))
        db.flush()

        assert sembrar_demo(db, carpeta_uploads=tmp_path) is True

        vinculos = db.scalar(select(func.count()).select_from(RecicladorConjunto).where(RecicladorConjunto.id_reciclador == reciclador.id_reciclador))
        assert vinculos == 2  # Aranjuez (el de app.seed, sin repetir) y Urapan

    def test_una_segunda_corrida_no_duplica_nada(self, db: Session, tmp_path: Path) -> None:
        _preparar_base(db)
        sembrar_demo(db, carpeta_uploads=tmp_path)
        usuarios_antes = _contar(db, Usuario)

        assert sembrar_demo(db, carpeta_uploads=tmp_path) is False

        assert _contar(db, Usuario) == usuarios_antes
        assert _contar(db, AuditoriaConjunto) == 30
        assert db.scalar(select(func.count()).select_from(Usuario).where(Usuario.correo_electronico.like(f"%{MARCADOR_DEMO}"))) > 0
