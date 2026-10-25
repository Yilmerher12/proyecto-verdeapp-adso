"""
Módulo: seed_demo.py
Descripción: Llena la base de datos con historia de demostración para la feria:
             3 conjuntos con residentes, recicladores, 8 semanas de auditorías con
             fotos, comunicados, novedades, soporte, agenda y pendientes del Admin
             del Sistema.
¿Para qué? app/seed.py deja lo mínimo (roles, conjuntos, 4 cuentas de prueba) y casi
          todos los paneles salen vacíos. Este script agrega lo que haría falta
          meses de uso real para que cada rol tenga algo que mostrar.
¿Impacto? Se corre a mano, después de app/seed.py: `uv run python -m app.seed_demo`.
          Todo usuario inventado termina en MARCADOR_DEMO: con ese sufijo el script
          sabe que ya corrió (no duplica) y se puede borrar lo demo con un
          DELETE ... LIKE. Las fechas son relativas al día en que se corre, así que
          conviene correrlo justo antes de la presentación.
"""
import random
import secrets
import shutil
import unicodedata
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from PIL import Image, ImageDraw
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.administrador_conjunto import AdministradorConjunto
from app.models.administrador_conjunto_asignacion import AdministradorConjuntoAsignacion
from app.models.agenda_conjunto import AgendaConjunto, EstadoAgenda
from app.models.auditoria_conjunto import AuditoriaConjunto
from app.models.comunicado import Comunicado
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.contenido_educativo import ContenidoEducativo
from app.models.contenido_educativo_visto import ContenidoEducativoVisto
from app.models.invitacion_admin_conjunto import InvitacionAdminConjunto
from app.models.notificacion import Notificacion
from app.models.novedad import Novedad
from app.models.novedad_enviada import PRIORIDAD_POR_MOTIVO, NovedadEnviada
from app.models.reciclador import Reciclador
from app.models.reciclador_conjunto import RecicladorConjunto
from app.models.residente import Residente
from app.models.rol import RolId
from app.models.solicitud_desvinculacion import SolicitudDesvinculacion
from app.models.unidad import Unidad
from app.models.usuario import Usuario
from app.seed import CONJUNTO_DE_PRUEBA, PASSWORD_HASH_PRUEBA
from app.services.notificaciones_helpers import (
    admins_del_conjunto,
    crear_notificacion,
    recicladores_del_conjunto,
    residentes_del_conjunto,
)

MARCADOR_DEMO = "@demo.verdeapp.com"
CARPETA_FOTOS = Path(__file__).parent / "data" / "demo" / "fotos"
CARPETA_UPLOADS = Path(__file__).parent / "uploads"

# ¿Qué? Bogotá no tiene horario de verano: siempre UTC-5.
# ¿Para qué? Las semanas del Admin del Sistema se cortan en hora de Bogotá (PR #498);
#           sin zoneinfo se evita depender de tzdata en Windows.
BOGOTA = timezone(timedelta(hours=-5))

PISOS_POR_TORRE = 6
APTOS_POR_PISO = 4
RESIDENTES_POR_CONJUNTO = 25

CONJUNTOS = [
    {"clave": "aranjuez", "nombre": CONJUNTO_DE_PRUEBA, "localidad": 1, "direccion": "KR7#140-20", "torres": 3},
    {"clave": "urapan", "nombre": "PARQUES DE BOGOTA URAPAN", "localidad": 7, "direccion": "CL84SUR#96-20", "torres": 4},
    {"clave": "kennedy", "nombre": "ALAMEDA SAN JOSE ETAPA V", "localidad": 8, "direccion": "KR88C#45A-66SUR", "torres": 3},
]

# ¿Qué? Los 4 recicladores demo y los conjuntos que atiende cada uno. El
#       reciclador de prueba atiende Aranjuez y Urapan.
RECICLADORES_DEMO = [
    ("Hernán", "Quiroga Peña", "Asociación de Recicladores de Usaquén", 1, ["aranjuez"]),
    ("Luz Marina", "Pinzón Cruz", "Recicladores Unidos de Bosa", 7, ["urapan"]),
    ("Wilson", "Cárdenas Mora", "Asociación Ambiental de Kennedy", 8, ["urapan", "kennedy"]),
    ("Nelly", "Ortiz Beltrán", "Asociación Ambiental de Kennedy", 8, ["kennedy"]),
]
RECICLADORES_POR_CONJUNTO = {
    "aranjuez": ["prueba", "Hernán"],
    "urapan": ["prueba", "Luz Marina", "Wilson"],
    "kennedy": ["Wilson", "Nelly"],
}

NOMBRES = [
    "Laura", "Carlos", "Valentina", "Andrés", "Camila", "Juan", "Daniela", "Sebastián", "Paula", "Felipe",
    "Natalia", "Santiago", "Mariana", "David", "Carolina", "Julián", "Alejandra", "Mateo", "Sara", "Nicolás",
    "Diana", "Esteban", "Luisa", "Miguel", "Andrea", "Cristian", "Juliana", "Jorge", "Tatiana", "Óscar",
    "Verónica", "Iván", "Lorena", "Héctor", "Marcela", "Germán", "Yesenia", "Ricardo", "Sandra", "Fabián",
]
APELLIDOS = [
    "Gómez", "Rincón", "Martínez", "Rodríguez", "Pardo", "Castañeda", "Ramírez", "Torres", "Vargas", "Moreno",
    "Suárez", "Herrera", "Jiménez", "Acosta", "Salazar", "Rojas", "Cortés", "Guerrero", "Mendoza", "Peña",
    "Bernal", "Ortega", "Cárdenas", "Beltrán", "Cifuentes", "Lozano", "Duarte", "Medina", "Quintero", "Rueda",
    "Zambrano", "Ávila", "Barrera", "Camacho", "Escobar", "Fonseca", "Gutiérrez", "Higuera", "Ibáñez", "Villamil",
]

# ¿Qué? Los 6 temas son los mismos textos de contenido_educativo.modulo_categoria
#       (ver app/seed.py): así el botón de recomendación de una auditoría abre la lección.
T_SEPARACION = "Separación en la fuente y código de colores"
T_PREPARACION = "Tipos de residuos y su preparación"
T_ECOPUNTOS = "Puntos limpios y Ecopuntos"
T_CIRCULAR = "Economía circular y aprovechamiento"
T_RCD = "Residuos de construcción y demolición"
T_CONSUMO = "Marco distrital y consumo responsable"

# ¿Qué? Cada descripción lleva el número (1 a 4) de la foto de su nivel que la ilustra:
#       buena-N / regular-N / deficiente-N en data/demo/fotos/. La foto principal de una
#       auditoría es la de su descripción; las extras son las siguientes de la lista.
# ¿Para qué? Que el texto y la imagen cuenten lo mismo (un texto de escombros no puede
#           mostrar una foto de cartón).
DESCRIPCIONES = {
    "BUENA": [
        (T_SEPARACION, "El SHUT está limpio y tiene el aviso a la vista pidiendo no dejar bolsas en las escaleras. Esta semana nadie dejó bolsas afuera: todas llegaron a su sitio.", 1),
        (T_ECOPUNTOS, "La puerta del SHUT estaba cerrada y limpia, sin bolsas alrededor. Los muebles viejos ya se habían llevado al Ecopunto: no hay nada estorbando el paso.", 1),
        (T_CONSUMO, "Puerta del SHUT y pasillo despejados, con el aviso de reciclaje a la vista. Se nota el cuidado de la administración y de los vecinos.", 1),
        (T_SEPARACION, "Vi a un vecino echar al SHUT una bolsa blanca bien cerrada, con el material limpio y seco. Así es como debe llegar.", 2),
        (T_PREPARACION, "Las bolsas blancas llegaron cerradas y livianas: envases enjuagados y cartón aplanado. Pude cargarlas sin volver a separarlas.", 2),
        (T_CIRCULAR, "Casi todo el material se pudo aprovechar: bolsas blancas limpias y secas, sin restos de comida. Felicitaciones.", 2),
        (T_SEPARACION, "El ducto del SHUT y su puerta estaban limpios, sin derrames ni malos olores. Todo en orden.", 3),
        (T_PREPARACION, "El SHUT no tenía olores ni residuos regados y la puerta cierra bien. Se nota que lo limpian con frecuencia.", 3),
        (T_SEPARACION, "El cuarto de residuos está ordenado: las bolsas por un lado y las cajas de huevo y el cartón apilados y secos por el otro. Da gusto trabajar así.", 4),
        (T_CIRCULAR, "Cartón apilado y seco, bolsas bien cerradas y cada cosa aparte. Hoy se pudo aprovechar casi todo.", 4),
    ],
    "REGULAR": [
        (T_SEPARACION, "La bolsa blanca iba bien llena, pero con servilletas y papel higiénico usado adentro; eso va en la bolsa negra. El resto estaba correcto.", 1),
        (T_PREPARACION, "Dentro de la bolsa blanca había papeles sucios mezclados con el papel limpio. Hay que separarlos para que el papel limpio se pueda vender.", 1),
        (T_CIRCULAR, "La bolsa blanca traía material aprovechable, pero con papeles usados de cocina. Con un poco más de cuidado habría quedado perfecta.", 1),
        (T_CONSUMO, "Muchas bolsas plásticas metidas unas dentro de otras. Reciclarlas ayuda, pero lo ideal es reutilizarlas y pedir menos bolsas en la tienda.", 2),
        (T_PREPARACION, "Las bolsas plásticas llegaron arrugadas y algunas con restos. Si están limpias y secas, sí se aprovechan.", 2),
        (T_PREPARACION, "Bolsas de papel arrugadas y limpias, bien; pero algunas traían grasa de comida y esas no se aprovechan.", 3),
        (T_CIRCULAR, "El papel llegó suelto y revuelto. Si lo aplanan y lo guardan en una bolsa blanca cerrada, se transporta mejor y se aprovecha todo.", 3),
        (T_SEPARACION, "Buen material, pero llegó sin bolsa y regado en el piso del cuarto. Con una bolsa blanca cerrada se evita que se ensucie.", 3),
        (T_SEPARACION, "Dos bolsas verdes quedaron afuera, junto a la puerta, con restos de comida y ropa. La ropa no va en la bolsa verde: ahí solo van los orgánicos.", 4),
        (T_ECOPUNTOS, "Dejaron bolsas fuera del cuarto de residuos, con ropa vieja adentro. La ropa se puede donar o llevar a un punto limpio; no va en la bolsa verde.", 4),
    ],
    "DEFICIENTE": [
        (T_RCD, "Había bolsas negras con tejas rotas y escombro mezcladas con la basura de la casa. Es peligroso para quien las recoge y no se puede reciclar así.", 1),
        (T_RCD, "Más escombro de obra metido en bolsas de basura. Para eso hay que avisar a la administración y contratar un gestor autorizado.", 1),
        (T_ECOPUNTOS, "Escombros y cartón dejados en la entrada. Los volúmenes pequeños se pueden llevar a un Ecopunto sin costo; no deben quedar en el andén.", 1),
        (T_PREPARACION, "Una caja de cartón quedó afuera del cuarto de residuos y se mojó con la lluvia. Mojado ya no sirve para reciclar: hay que dejarlo bajo techo.", 2),
        (T_CIRCULAR, "El cartón estaba empapado y roto; casi todo se tuvo que descartar. Aplanarlo y guardarlo seco es lo que lo hace valioso.", 2),
        (T_PREPARACION, "Más cartón expuesto a la lluvia. Pidan a los vecinos que lo dejen en el cuarto cubierto hasta el día de la recolección.", 2),
        (T_SEPARACION, "El cartón iba dentro de una bolsa negra con la basura ordinaria. El cartón limpio debe ir en la bolsa blanca, sin mezclar.", 3),
        (T_SEPARACION, "Casi todo llegó en una sola bolsa negra, con orgánicos, plástico y cartón juntos. No pude aprovechar nada. Se necesita una charla corta con los residentes.", 3),
        (T_SEPARACION, "Encontré una bolsa negra con desechos de mascota y bolsas blancas amarradas encima. Los desechos de mascota van a la bolsa negra, nunca con el material aprovechable.", 4),
        (T_CONSUMO, "Bolsas mezcladas y sin cerrar en la entrada, con desechos de mascota. Sugiero que la administración vuelva a compartir la guía de colores.", 4),
    ],
}

# ¿Qué? Cómo le fue a cada conjunto en las últimas 8 semanas (de la más antigua a
#       la actual). Cada tupla es (nivel, nivel de una segunda auditoría esa semana o None).
# ¿Para qué? Que la gráfica "Desempeño" cuente una historia distinta por conjunto:
#           Urapan mejora, Aranjuez empeora y Kennedy sube y baja.
TENDENCIAS = {
    "urapan": [("DEFICIENTE", None), ("DEFICIENTE", "REGULAR"), ("REGULAR", None), ("REGULAR", None),
               ("REGULAR", "BUENA"), ("BUENA", None), ("BUENA", None), ("BUENA", None)],
    "aranjuez": [("BUENA", None), ("BUENA", None), ("BUENA", "BUENA"), ("REGULAR", None),
                 ("BUENA", None), ("REGULAR", "REGULAR"), ("REGULAR", None), ("DEFICIENTE", None)],
    "kennedy": [("REGULAR", None), ("BUENA", None), ("DEFICIENTE", "REGULAR"), ("REGULAR", None),
                ("BUENA", None), ("REGULAR", "DEFICIENTE"), ("DEFICIENTE", None), ("REGULAR", None)],
}
DESFASE_TEXTOS = {"aranjuez": 0, "urapan": 3, "kennedy": 6}

COLOR_PLACEHOLDER = {"BUENA": (74, 160, 108), "REGULAR": (214, 170, 70), "DEFICIENTE": (190, 90, 80)}


def _sin_tildes(texto: str) -> str:
    return unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower().replace(" ", "")


def _telefono(indice: int) -> str:
    return "3" + str(100_000_000 + (indice * 7_654_321) % 800_000_000)


def _lunes_de_esta_semana(ahora: datetime) -> datetime:
    local = ahora.astimezone(BOGOTA)
    return (local - timedelta(days=local.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)


def _usuario(db: Session, correo: str, id_rol: int) -> Usuario:
    """
    ¿Qué? Devuelve el usuario con ese correo, o lo crea activo con la contraseña de las
          cuentas de prueba.
    ¿Para qué? Las 4 cuentas de prueba ya existen si corrió app.seed; en una BD vacía
              (como la de las pruebas automáticas) se crean aquí.
    ¿Impacto? Nunca modifica un usuario que ya existe.
    """
    usuario = db.scalar(select(Usuario).where(Usuario.correo_electronico == correo))
    if usuario is None:
        usuario = Usuario(correo_electronico=correo, id_rol=id_rol, password=PASSWORD_HASH_PRUEBA, is_active=True)
        db.add(usuario)
        db.flush()
    return usuario


def _conjunto(db: Session, datos: dict, id_verificador) -> ConjuntoResidencial:
    conjunto = db.scalar(select(ConjuntoResidencial).where(ConjuntoResidencial.nombre_conjunto == datos["nombre"]))
    if conjunto is None:
        conjunto = ConjuntoResidencial(
            id_localidad=datos["localidad"], nombre_conjunto=datos["nombre"], direccion=datos["direccion"]
        )
        db.add(conjunto)
    # ¿Qué? Los 3 quedan verificados y con el total de apartamentos que sale de sus torres.
    # ¿Impacto? Un conjunto sin verificar no deja registrar residentes ni asignar recicladores.
    conjunto.verificado = True
    conjunto.verificado_por_id = id_verificador
    if conjunto.total_apartamentos is None:
        conjunto.total_apartamentos = datos["torres"] * PISOS_POR_TORRE * APTOS_POR_PISO
    db.flush()
    return conjunto


def _crear_unidades(db: Session, conjunto: ConjuntoResidencial, torres: int) -> list[Unidad]:
    """Torres numeradas desde 1; 6 pisos de 4 apartamentos (101-104 ... 601-604)."""
    unidades = []
    for torre in range(1, torres + 1):
        for piso in range(1, PISOS_POR_TORRE + 1):
            for apto in range(1, APTOS_POR_PISO + 1):
                unidad = Unidad(
                    id_conjunto_residencial=conjunto.id_conjunto_residencial,
                    torre=f"TORRE {torre}",
                    apto=f"{piso}0{apto}",
                )
                db.add(unidad)
                unidades.append(unidad)
    db.flush()
    return unidades


def _foto(nivel: str, indice: int, carpeta_uploads: Path, copiadas: dict[Path, str]) -> str:
    """
    ¿Qué? Devuelve la ruta pública (/uploads/evidencias-auditoria/...) de una foto de
          evidencia del nivel dado, copiándola de CARPETA_FOTOS a uploads.
    ¿Para qué? uploads/ está en .gitignore y no viaja con el repositorio; las fotos de
              la demo viven en data/demo/fotos/ (esa sí se commitea) y se copian aquí.
    ¿Impacto? Si no hay fotos de ese nivel (BD de pruebas, o alguien aún no las sube),
             genera una imagen de color con la leyenda "Foto de demostración" para que
             el seed nunca falle.
    """
    disponibles = sorted(
        p for p in CARPETA_FOTOS.glob(f"{nivel.lower()}-*") if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    )
    destino_dir = carpeta_uploads / "evidencias-auditoria"
    destino_dir.mkdir(parents=True, exist_ok=True)

    if disponibles:
        origen = disponibles[indice % len(disponibles)]
        if origen not in copiadas:
            nombre = f"demo-{origen.stem}{origen.suffix.lower()}"
            shutil.copyfile(origen, destino_dir / nombre)
            copiadas[origen] = f"/uploads/evidencias-auditoria/{nombre}"
        return copiadas[origen]

    nombre = f"demo-{nivel.lower()}-sin-foto.jpg"
    ruta = destino_dir / nombre
    if not ruta.exists():
        imagen = Image.new("RGB", (800, 600), COLOR_PLACEHOLDER[nivel])
        ImageDraw.Draw(imagen).text((40, 40), f"Foto de demostración ({nivel})", fill=(255, 255, 255))
        imagen.save(ruta, "JPEG")
    return f"/uploads/evidencias-auditoria/{nombre}"


def _notificar(db: Session, hace: timedelta, ahora: datetime, **datos) -> None:
    """
    ¿Qué? crear_notificacion + ajustar su fecha. El helper pone la fecha de hoy y la
          demo necesita que cada aviso tenga su antigüedad.
    ¿Impacto? Se toma la notificación recién insertada (la de created_at más reciente).
    """
    crear_notificacion(db, **datos)
    notificacion = db.scalars(select(Notificacion).order_by(Notificacion.created_at.desc()).limit(1)).first()
    notificacion.created_at = ahora - hace


def _sembrar_personas(db: Session, ahora: datetime, admin_sistema: Usuario) -> dict:
    """Crea (o reutiliza) las cuentas de prueba y a toda la gente inventada; devuelve lo que el resto necesita."""
    admin_prueba_usuario = _usuario(db, "admin.conjunto.prueba@verdeapp.com", RolId.ADMIN_CONJUNTO)
    reciclador_prueba_usuario = _usuario(db, "reciclador.prueba@verdeapp.com", RolId.RECICLADOR)
    residente_prueba_usuario = _usuario(db, "residente.prueba@verdeapp.com", RolId.RESIDENTE)

    admin_prueba = db.scalar(select(AdministradorConjunto).where(AdministradorConjunto.id_usuario == admin_prueba_usuario.id_usuario))
    if admin_prueba is None:
        admin_prueba = AdministradorConjunto(
            id_usuario=admin_prueba_usuario.id_usuario, nombre="ADMIN", apellidos="DE PRUEBA", numero_telefonico="3000000000"
        )
        db.add(admin_prueba)

    reciclador_prueba = db.scalar(select(Reciclador).where(Reciclador.id_usuario == reciclador_prueba_usuario.id_usuario))
    if reciclador_prueba is None:
        reciclador_prueba = Reciclador(
            id_usuario=reciclador_prueba_usuario.id_usuario, localidad_id=1, nombre="RECICLADOR",
            apellidos="DE PRUEBA", asociacion="INDEPENDIENTE", numero_telefonico="3000000001",
        )
        db.add(reciclador_prueba)

    # ¿Qué? Segunda administradora, solo de Kennedy, con una solicitud de desvinculación
    #       pendiente. El Admin de Conjunto de prueba queda libre de pendientes para
    #       poder usarse en vivo sin sorpresas.
    admin_demo_usuario = _usuario(db, f"patricia.salazar{MARCADOR_DEMO}", RolId.ADMIN_CONJUNTO)
    admin_demo = AdministradorConjunto(
        id_usuario=admin_demo_usuario.id_usuario, nombre="Patricia", apellidos="Salazar Rojas", numero_telefonico=_telefono(901)
    )
    db.add(admin_demo)

    recicladores = {"prueba": reciclador_prueba}
    for indice, (nombre, apellidos, asociacion, localidad, _) in enumerate(RECICLADORES_DEMO):
        usuario = _usuario(db, f"{_sin_tildes(nombre)}.{_sin_tildes(apellidos.split()[0])}{MARCADOR_DEMO}", RolId.RECICLADOR)
        reciclador = Reciclador(
            id_usuario=usuario.id_usuario, localidad_id=localidad, nombre=nombre, apellidos=apellidos,
            asociacion=asociacion, numero_telefonico=_telefono(800 + indice),
        )
        db.add(reciclador)
        recicladores[nombre] = reciclador
    db.flush()

    return {
        "admin_prueba": admin_prueba,
        "admin_prueba_usuario": admin_prueba_usuario,
        "admin_demo": admin_demo,
        "admin_demo_usuario": admin_demo_usuario,
        "residente_prueba_usuario": residente_prueba_usuario,
        "recicladores": recicladores,
    }


def _sembrar_conjuntos(db: Session, ahora: datetime, admin_sistema: Usuario, personas: dict) -> dict:
    """Conjuntos, unidades, residentes, vínculos de recicladores y asignaciones de administradores."""
    conjuntos: dict[str, ConjuntoResidencial] = {}
    residentes_por_conjunto: dict[str, list[Residente]] = {}
    emails_usados: set[str] = set()
    global_n = 0

    for datos in CONJUNTOS:
        conjunto = _conjunto(db, datos, admin_sistema.id_usuario)
        conjuntos[datos["clave"]] = conjunto
        unidades = _crear_unidades(db, conjunto, datos["torres"])
        residentes: list[Residente] = []

        # ¿Qué? El residente de prueba vive en Aranjuez (en la unidad que ya sembró app.seed,
        #       o en una nueva si no existe) y cuenta dentro de sus 25.
        if datos["clave"] == "aranjuez":
            existente = db.scalar(
                select(Residente).where(Residente.id_usuario == personas["residente_prueba_usuario"].id_usuario)
            )
            if existente is None:
                unidad_prueba = Unidad(id_conjunto_residencial=conjunto.id_conjunto_residencial, torre="Torre A", apto="101")
                db.add(unidad_prueba)
                db.flush()
                existente = Residente(
                    id_usuario=personas["residente_prueba_usuario"].id_usuario, id_unidad=unidad_prueba.id_unidad,
                    nombre="RESIDENTE", apellidos="DE PRUEBA", numero_telefonico="3000000002",
                )
                db.add(existente)
            residentes.append(existente)

        # ¿Qué? Cada residente ocupa un apartamento por medio (stride 2): no están todos los
        #       apartamentos registrados, como pasa en un conjunto real.
        n = 0
        while len(residentes) < RESIDENTES_POR_CONJUNTO:
            nombre = NOMBRES[global_n % len(NOMBRES)]
            # ¿Qué? Cada 40 residentes se acaban los nombres y se repiten; "vuelta" cambia los
            #       apellidos para que no aparezcan dos personas con el mismo nombre completo.
            vuelta = global_n // len(NOMBRES)
            apellido1 = APELLIDOS[(global_n * 7 + 3 + vuelta * 13) % len(APELLIDOS)]
            apellido2 = APELLIDOS[(global_n * 11 + 5 + vuelta * 17) % len(APELLIDOS)]
            correo = f"{_sin_tildes(nombre)}.{_sin_tildes(apellido1)}{MARCADOR_DEMO}"
            if correo in emails_usados:
                correo = f"{_sin_tildes(nombre)}.{_sin_tildes(apellido1)}{global_n}{MARCADOR_DEMO}"
            emails_usados.add(correo)
            usuario = _usuario(db, correo, RolId.RESIDENTE)
            residente = Residente(
                id_usuario=usuario.id_usuario, id_unidad=unidades[n * 2].id_unidad, nombre=nombre,
                apellidos=f"{apellido1} {apellido2}", numero_telefonico=_telefono(global_n),
            )
            db.add(residente)
            residentes.append(residente)
            n += 1
            global_n += 1
        residentes_por_conjunto[datos["clave"]] = residentes
    db.flush()

    # Recicladores autorizados (ya aceptaron la invitación).
    for clave, nombres in RECICLADORES_POR_CONJUNTO.items():
        for nombre in nombres:
            id_reciclador = personas["recicladores"][nombre].id_reciclador
            id_conjunto = conjuntos[clave].id_conjunto_residencial
            # ¿Impacto? app.seed ya vinculó al reciclador de prueba con Aranjuez: repetirlo
            #           rompe el índice único ux_reciclador_conjunto_activo.
            ya_vinculado = db.scalar(select(RecicladorConjunto).where(
                RecicladorConjunto.id_reciclador == id_reciclador,
                RecicladorConjunto.id_conjunto_residencial == id_conjunto,
                RecicladorConjunto.fecha_revocacion.is_(None),
            ))
            if ya_vinculado is None:
                db.add(RecicladorConjunto(
                    id_reciclador=id_reciclador, id_conjunto_residencial=id_conjunto,
                    fecha_autorizacion=ahora - timedelta(days=70),
                ))

    # ¿Qué? El de prueba lleva Aranjuez y Urapan; Patricia (demo), Kennedy.
    # ¿Impacto? Un conjunto solo puede tener UN administrador activo (índice único
    #           ux_admin_conjunto_activo): por eso no llevan los 3 juntos.
    for clave, administrador in (("aranjuez", personas["admin_prueba"]), ("urapan", personas["admin_prueba"]), ("kennedy", personas["admin_demo"])):
        conjunto = conjuntos[clave]
        ya_asignado = db.scalar(select(AdministradorConjuntoAsignacion).where(
            AdministradorConjuntoAsignacion.id_administrador == administrador.id_administrador,
            AdministradorConjuntoAsignacion.id_conjunto_residencial == conjunto.id_conjunto_residencial,
            AdministradorConjuntoAsignacion.fecha_desvinculacion.is_(None),
        ))
        if ya_asignado is None:
            db.add(AdministradorConjuntoAsignacion(
                id_administrador=administrador.id_administrador,
                id_conjunto_residencial=conjunto.id_conjunto_residencial,
                fecha_asignacion=ahora - timedelta(days=75),
            ))
    db.flush()
    return {"conjuntos": conjuntos, "residentes": residentes_por_conjunto}


def _sembrar_auditorias(db: Session, ahora: datetime, personas: dict, base: dict, carpeta_uploads: Path) -> dict[str, list[AuditoriaConjunto]]:
    """8 semanas por conjunto con la tendencia de TENDENCIAS; cada auditoría lleva de 1 a 3 fotos."""
    lunes = _lunes_de_esta_semana(ahora)
    copiadas: dict[Path, str] = {}
    usadas = {"BUENA": 0, "REGULAR": 0, "DEFICIENTE": 0}
    resultado: dict[str, list[AuditoriaConjunto]] = {}

    for clave, tendencia in TENDENCIAS.items():
        conjunto = base["conjuntos"][clave]
        auditores = [personas["recicladores"][nombre] for nombre in RECICLADORES_POR_CONJUNTO[clave]]
        resultado[clave] = []
        contador_texto = {"BUENA": 0, "REGULAR": 0, "DEFICIENTE": 0}

        for semana, (nivel, segundo_nivel) in enumerate(tendencia):
            inicio = lunes - timedelta(days=7 * (len(tendencia) - 1 - semana))
            for orden, nivel_auditoria in enumerate((nivel, segundo_nivel)):
                if nivel_auditoria is None:
                    continue
                pool = DESCRIPCIONES[nivel_auditoria]
                tema, texto, foto = pool[(DESFASE_TEXTOS[clave] + contador_texto[nivel_auditoria]) % len(pool)]
                contador_texto[nivel_auditoria] += 1

                # ¿Qué? Miércoles 10 a. m. (primera) y jueves 3 p. m. (segunda) en hora de Bogotá;
                #       la de esta semana no puede quedar en el futuro.
                momento = inicio + timedelta(days=2 + orden, hours=10 + 5 * orden)
                momento = min(momento, ahora - timedelta(hours=2 + 3 * orden))

                cantidad = 1 + (usadas[nivel_auditoria] % (2 if nivel_auditoria == "BUENA" else 3))
                rutas = [_foto(nivel_auditoria, foto - 1 + i, carpeta_uploads, copiadas) for i in range(cantidad)]
                usadas[nivel_auditoria] += cantidad

                auditoria = AuditoriaConjunto(
                    id_reciclador=auditores[(semana + orden) % len(auditores)].id_reciclador,
                    id_conjunto_residencial=conjunto.id_conjunto_residencial,
                    nivel_desempeno=nivel_auditoria,
                    tema_educativo=tema,
                    descripcion=texto,
                    ruta_evidencia=rutas[0],
                    ruta_evidencia_2=rutas[1] if cantidad > 1 else None,
                    ruta_evidencia_3=rutas[2] if cantidad > 2 else None,
                    created_at=momento,
                )
                db.add(auditoria)
                db.flush()
                resultado[clave].append(auditoria)
    return resultado


def _fecha_dentro_de(ahora: datetime, dias: int) -> date:
    return (ahora + timedelta(days=dias)).astimezone(BOGOTA).date()


def _sembrar_comunicados(db: Session, ahora: datetime, personas: dict, base: dict) -> dict[str, list[Comunicado]]:
    """4 comunicados por conjunto, escritos por el administrador de cada uno; 1 por conjunto ya expiró."""
    administradores = {"aranjuez": personas["admin_prueba"], "urapan": personas["admin_prueba"], "kennedy": personas["admin_demo"]}
    # (tipo, destinatarios, texto, días del evento o None, creado hace (días), expira en (días))
    plan = {
        "aranjuez": [
            ("RECICLAJE", "AMBOS", "Este sábado de 9:00 a. m. a 12:00 m. el reciclador estará en el cuarto de basuras de la Torre 1 recibiendo material limpio y seco. Traigan el cartón aplanado y los envases enjuagados.", 5, 1, 6),
            ("CONVOCATORIA", "RESIDENTES", "Asamblea ordinaria de copropietarios el próximo jueves a las 7:00 p. m. en el salón comunal. Se tratará el presupuesto del año y el plan de reciclaje del conjunto.", 9, 2, 10),
            ("MANTENIMIENTO", "AMBOS", "El martes se lavará el tanque de agua. Habrá corte entre las 8:00 a. m. y las 2:00 p. m. Almacenen el agua que necesiten.", 2, 3, 3),
            ("INFORMATIVO", "RESIDENTES", "Gracias por la jornada de reciclaje del mes pasado: entre todos entregamos más de 300 kilos de material aprovechable.", None, 25, -3),
        ],
        "urapan": [
            ("URGENTE", "AMBOS", "Hoy a las 3:00 p. m. se interrumpe la energía en las torres 3 y 4 por una reparación de la empresa de servicios. Quedará restablecida en la noche. Disculpen las molestias.", 0, 0, 1),
            ("RECICLAJE", "RESIDENTES", "Desde esta semana el cuarto de residuos de cada torre tiene carteles con el código de colores: blanca para aprovechable limpio y seco, verde para orgánicos y negra para lo demás. Mantenerlos a la vista nos ayuda a mejorar la calificación del conjunto.", None, 2, 20),
            ("CONVOCATORIA", "AMBOS", "Reunión del comité de convivencia el miércoles a las 6:30 p. m. en el salón social, para revisar cómo mejorar la separación de residuos después de la última auditoría.", 3, 3, 4),
            ("INFORMATIVO", "AMBOS", "El horario de recolección de material aprovechable cambió: ahora el reciclador pasa los martes y viernes por la mañana.", None, 30, -2),
        ],
        "kennedy": [
            ("MANTENIMIENTO", "AMBOS", "Esta semana se pintarán las zonas comunes de la Torre 2. Por favor no dejen bolsas ni objetos en los pasillos.", 1, 1, 6),
            ("RECICLAJE", "RESIDENTES", "Recuerden que los muebles y colchones NO van en el cuarto de residuos. Revisen el cronograma de Ecopuntos de la UAESP para Kennedy antes de sacarlos.", None, 4, 15),
            ("INFORMATIVO", "RESIDENTES", "Wilson Cárdenas y Nelly Ortiz son los recicladores asignados al conjunto. La app avisa cuando llega cada uno.", None, 8, 30),
            ("URGENTE", "AMBOS", "Se encontraron bolsas de escombro en el parqueadero. Quien esté haciendo una obra debe avisar a la administración para coordinar su retiro.", None, 18, -4),
        ],
    }
    resultado: dict[str, list[Comunicado]] = {}
    for clave, filas in plan.items():
        resultado[clave] = []
        for tipo, destinatarios, texto, dias_evento, creado_hace, expira_en in filas:
            comunicado = Comunicado(
                id_conjunto_residencial=base["conjuntos"][clave].id_conjunto_residencial,
                id_administrador=administradores[clave].id_administrador,
                destinatarios=destinatarios,
                tipo=tipo,
                texto=texto,
                fecha_evento=_fecha_dentro_de(ahora, dias_evento) if dias_evento is not None else None,
                fecha_expiracion=ahora + timedelta(days=expira_en),
                created_at=ahora - timedelta(days=creado_hace),
            )
            db.add(comunicado)
            resultado[clave].append(comunicado)
    db.flush()
    return resultado


def _sembrar_novedades(db: Session, ahora: datetime, admin_sistema: Usuario) -> None:
    """5 novedades de plataforma (Admin del Sistema), todas sobre cosas que la app ya hace."""
    filas = [
        ("TODOS", "Aprende a reciclar se renovó: cada tema ahora tiene portada y fotos dentro de la lección, las lecciones que ya abriste aparecen como Visto y puedes ver tu avance desde cualquier celular o computador.", 2, 60, None),
        ("RESIDENTES", "En Aprende a reciclar ahora ves «Tu semana»: cómo salió la última auditoría de tu conjunto y qué lección te conviene repasar si salió Regular o Mala.", 4, 60, None),
        ("ADMIN_CONJUNTO", "Ahora puedes descargar el historial de la agenda de tu conjunto en PDF o CSV, con filtro por estado y por fechas, y ver el desempeño semanal de tu conjunto en la nueva página Desempeño.", 6, 60, None),
        ("RECICLADORES", "Al registrar una auditoría la foto de evidencia es obligatoria y puedes adjuntar hasta 3. Cada foto debe pesar menos de 5 MB; si es más grande, bájale la resolución antes de subirla.", 9, 60, None),
        ("TODOS", "Mantenimiento programado: el sábado pasado la plataforma estuvo disponible con lentitud entre las 11:00 p. m. y la 1:00 a. m. Ya quedó todo normal.", 16, 30, 12),
    ]
    for alcance, texto, creado_hace, expira_en, archivada_hace in filas:
        db.add(Novedad(
            id_admin_sistema=admin_sistema.id_usuario,
            alcance=alcance,
            texto=texto,
            fecha_expiracion=ahora + timedelta(days=expira_en),
            created_at=ahora - timedelta(days=creado_hace),
            fecha_archivado=ahora - timedelta(days=archivada_hace) if archivada_hace else None,
        ))


def _sembrar_soporte(db: Session, ahora: datetime, personas: dict, base: dict) -> None:
    """5 consultas de Soporte técnico, como las escribirían un residente, un reciclador y un administrador."""
    residentes_urapan = base["residentes"]["urapan"]
    residentes_aranjuez = base["residentes"]["aranjuez"]
    consultas = [
        (residentes_urapan[3].id_usuario, "urapan", "residenteShut",
         "Avisé que el SHUT de mi torre estaba lleno, pero no veo que a los demás les haya llegado el aviso. ¿Cómo sé que sí se envió?", 7, "RESUELTA",
         "Hola. El aviso sí se envía a los residentes y al administrador del conjunto; lo ves en la campanita. Si ya hay un aviso de SHUT lleno vigente, la app no deja enviar otro igual. Gracias por escribirnos."),
        (personas["recicladores"]["Wilson"].id_usuario, "kennedy", "recicladorAuditoria",
         "No me deja enviar la auditoría de Alameda San José: dice que la foto es muy pesada. La tomé con el celular y pesa 7 MB.", 2, "EN_REVISION",
         "Revisamos: cada foto puede pesar máximo 5 MB. Bájale la resolución o tómala con una calidad menor e inténtalo de nuevo. Seguimos atentos."),
        (personas["admin_prueba_usuario"].id_usuario, "urapan", "adminApartamentos",
         "¿Cómo cambio el número de apartamentos si el conjunto construye una torre nueva?", 1, "NUEVA", None),
        (residentes_urapan[8].id_usuario, "urapan", "sugerencia",
         "Estaría bueno que la gráfica de desempeño mostrara también cuántos kilos se reciclaron. Gracias por la app.", 3, "NUEVA", None),
        (residentes_aranjuez[5].id_usuario, "aranjuez", "notificaciones",
         "No me llegan los avisos de nuevas auditorías, solo veo los comunicados.", 9, "RESUELTA",
         "Las auditorías llegan como un aviso aparte dentro de la campanita. Si sigues sin verlas, cuéntanos desde qué fecha."),
    ]
    for autor_id, clave, motivo, texto, creado_hace, estado, respuesta in consultas:
        creada = ahora - timedelta(days=creado_hace)
        db.add(NovedadEnviada(
            autor_id=autor_id,
            id_conjunto_residencial=base["conjuntos"][clave].id_conjunto_residencial,
            texto=texto,
            motivo=motivo,
            prioridad=PRIORIDAD_POR_MOTIVO[motivo].value,
            estado=estado,
            respuesta=respuesta,
            respondida_at=creada + timedelta(days=1) if respuesta else None,
            resuelta_at=creada + timedelta(days=1) if estado == "RESUELTA" else None,
            created_at=creada,
        ))


def _sembrar_agenda(db: Session, ahora: datetime, personas: dict, base: dict) -> None:
    autores = {
        "aranjuez": personas["admin_prueba_usuario"].id_usuario,
        "urapan": personas["admin_prueba_usuario"].id_usuario,
        "kennedy": personas["admin_demo_usuario"].id_usuario,
    }
    plan = {
        "aranjuez": [
            ("Revisar con el reciclador el horario de recogida de los sábados.", None, 2),
            ("Pedir cotización de dos canecas de colores para el cuarto de residuos de la Torre 3.", None, 4),
            ("Reunión con la empresa de aseo sobre la ruta de recolección.", 10, 20),
        ],
        "urapan": [
            ("Imprimir carteles del código de colores para cada torre.", None, 1),
            ("Preparar la charla de separación de residuos para la asamblea.", None, 3),
            ("Hablar con las familias de la Torre 2 sobre las bolsas mezcladas.", None, 5),
            ("Instalar el punto de reciclaje en la entrada del conjunto.", 15, 30),
            ("Reunión de comité del mes pasado.", 22, 35),
        ],
        "kennedy": [
            ("Definir quién recibe al reciclador los jueves.", None, 2),
            ("Compra de guantes y bolsas para el cuarto de residuos.", 8, 18),
        ],
    }
    for clave, filas in plan.items():
        for texto, archivada_hace, creada_hace in filas:
            db.add(AgendaConjunto(
                id_conjunto_residencial=base["conjuntos"][clave].id_conjunto_residencial,
                autor_id=autores[clave],
                texto=texto,
                estado=EstadoAgenda.ARCHIVADA.value if archivada_hace else EstadoAgenda.PENDIENTE.value,
                created_at=ahora - timedelta(days=creada_hace),
                archivado_en=ahora - timedelta(days=archivada_hace) if archivada_hace else None,
            ))


def _sembrar_pendientes_admin_sistema(db: Session, ahora: datetime, admin_sistema: Usuario, personas: dict, base: dict) -> None:
    db.add(InvitacionAdminConjunto(
        correo_electronico=f"administracion.nueva{MARCADOR_DEMO}",
        token=secrets.token_urlsafe(32),
        conjuntos_asignados=str(base["conjuntos"]["urapan"].id_conjunto_residencial),
        invitado_por_id=admin_sistema.id_usuario,
        expires_at=ahora + timedelta(days=5),
    ))
    db.add(SolicitudDesvinculacion(
        id_administrador=personas["admin_demo"].id_administrador,
        id_conjunto_residencial=base["conjuntos"]["kennedy"].id_conjunto_residencial,
        motivo="Cambié de trabajo y ya no voy a administrar este conjunto.",
        estado="PENDIENTE",
    ))


def _sembrar_lecciones_vistas(db: Session, ahora: datetime, personas: dict, base: dict) -> None:
    """El residente de prueba ya vio 3 de 6 lecciones; unos cuantos demo, entre 1 y 6."""
    contenidos = list(db.scalars(select(ContenidoEducativo).order_by(ContenidoEducativo.fecha_publicacion)))
    if not contenidos:
        return
    vistos_prueba = 3
    for contenido in contenidos[:vistos_prueba]:
        db.add(ContenidoEducativoVisto(id_usuario=personas["residente_prueba_usuario"].id_usuario, id_contenido=contenido.id_contenido))
    azar = random.Random(2026)
    for residente in base["residentes"]["urapan"][1:13] + base["residentes"]["kennedy"][1:9]:
        for contenido in contenidos[: azar.randint(1, len(contenidos))]:
            db.add(ContenidoEducativoVisto(id_usuario=residente.id_usuario, id_contenido=contenido.id_contenido))


def _sembrar_notificaciones(db: Session, ahora: datetime, base: dict, auditorias: dict, comunicados: dict) -> None:
    """
    ¿Qué? Los avisos de lo más reciente: la última auditoría de cada conjunto (con la
          recomendación de lección si salió Regular o Mala) y sus 2 comunicados vigentes
          más nuevos.
    ¿Impacto? No crea avisos de llegada del reciclador ni de SHUT: esos cambian quién
             está "presente" en el conjunto y pueden estorbar si se prueban en vivo.
    """
    db.flush()
    for clave, conjunto in base["conjuntos"].items():
        id_conjunto = conjunto.id_conjunto_residencial
        residentes = residentes_del_conjunto(db, id_conjunto)
        ultima = auditorias[clave][-1]
        _notificar(
            db, ahora - ultima.created_at, ahora, tipo="AUDITORIA_PUBLICADA",
            mensaje="El reciclador auditó la separación de residuos de tu conjunto.",
            destinatarios=set(residentes) | set(admins_del_conjunto(db, id_conjunto)),
            id_conjunto=id_conjunto, id_referencia=ultima.id_auditoria,
        )
        if ultima.nivel_desempeno in {"REGULAR", "DEFICIENTE"}:
            _notificar(
                db, ahora - ultima.created_at, ahora, tipo="CONTENIDO_RECOMENDADO",
                mensaje="El reciclador recomienda contenido educativo para tu conjunto.",
                destinatarios=residentes, id_conjunto=id_conjunto, id_referencia=ultima.id_auditoria,
            )
        vigentes = sorted((c for c in comunicados[clave] if c.fecha_expiracion > ahora), key=lambda c: c.created_at, reverse=True)[:2]
        for comunicado in vigentes:
            destinatarios: set = set()
            if comunicado.destinatarios in ("RESIDENTES", "AMBOS"):
                destinatarios.update(residentes)
            if comunicado.destinatarios in ("RECICLADORES", "AMBOS"):
                destinatarios.update(recicladores_del_conjunto(db, id_conjunto))
            _notificar(
                db, ahora - comunicado.created_at, ahora, tipo="COMUNICADO_NUEVO",
                mensaje=f"Nuevo comunicado: {comunicado.texto[:120]}",
                destinatarios=destinatarios, id_conjunto=id_conjunto,
            )


def sembrar_demo(db: Session, carpeta_uploads: Path = CARPETA_UPLOADS, ahora: Optional[datetime] = None) -> bool:
    """
    ¿Qué? Siembra toda la demostración. Devuelve False si ya estaba sembrada.
    ¿Impacto? Todo en una sola transacción: si algo falla, no queda nada a medias.
    """
    ahora = ahora or datetime.now(timezone.utc)
    ya_sembrada = db.scalar(select(Usuario.id_usuario).where(Usuario.correo_electronico.like(f"%{MARCADOR_DEMO}")).limit(1))
    if ya_sembrada is not None:
        return False

    admin_sistema = _usuario(db, "admin@verdeapp.com", RolId.ADMIN_SISTEMA)
    personas = _sembrar_personas(db, ahora, admin_sistema)
    base = _sembrar_conjuntos(db, ahora, admin_sistema, personas)
    auditorias = _sembrar_auditorias(db, ahora, personas, base, carpeta_uploads)
    comunicados = _sembrar_comunicados(db, ahora, personas, base)
    _sembrar_novedades(db, ahora, admin_sistema)
    _sembrar_soporte(db, ahora, personas, base)
    _sembrar_agenda(db, ahora, personas, base)
    _sembrar_pendientes_admin_sistema(db, ahora, admin_sistema, personas, base)
    _sembrar_lecciones_vistas(db, ahora, personas, base)
    _sembrar_notificaciones(db, ahora, base, auditorias, comunicados)
    db.commit()
    return True


def main() -> None:
    with SessionLocal() as db:
        if sembrar_demo(db):
            print("[seed-demo] Demostración sembrada: 3 conjuntos, residentes, recicladores, auditorías y más.")
        else:
            print(f"[seed-demo] Ya hay usuarios {MARCADOR_DEMO}: no se siembra de nuevo.")


if __name__ == "__main__":
    main()
