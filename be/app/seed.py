"""
Módulo: seed.py
Descripción: Siembra los datos de prueba (roles, localidades, conjuntos
residenciales reales, usuarios de prueba, puntos de acopio) en la base de
datos.
¿Para qué? Antes ese SQL vivía en init_db.sql en la raíz del repo y Postgres
lo ejecutaba solo, automáticamente, al crear su volumen — pero ese mismo
archivo también CREABA las tablas, compitiendo con Alembic: en un volumen
nuevo, Alembic intentaba crear las mismas tablas que init_db.sql ya había
creado, y el backend se caía con "relation ... already exists". Ahora Alembic
es el único que crea/modifica tablas, y este script solo inserta datos,
después de que las migraciones ya corrieron.
¿Impacto? Se ejecuta desde el Dockerfile, después de "alembic upgrade head"
y antes de arrancar Uvicorn. Es seguro correrlo muchas veces: si la tabla
"roles" ya tiene datos, asume que la base ya fue sembrada y no hace nada
(evita repetir los DELETE de app/seed_data.sql y de importar_conjuntos_reales
contra una base con datos reales).
"""

import csv
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.database import engine
from app.utils.ids import generar_uuid7

SEED_FILE = Path(__file__).parent / "seed_data.sql"
CONJUNTOS_CSV = Path(__file__).parent / "data" / "conjuntos_residenciales_bogota.csv"

# ¿Qué? Contraseña compartida por los usuarios de prueba: AdminVerde2026*
PASSWORD_HASH_PRUEBA = "$2b$12$xSluyevTDoPhwiydwB3OhetVHh1miUiGivw99ChVJxBGl.zaC6EMW"

# ¿Qué? Conjunto real (de Usaquén) que usan el Admin de Conjunto, el
#       Reciclador y el Residente de prueba.
# ¿Para qué? Antes esto era un conjunto INVENTADO ("TORRES DE ARANJUEZ").
#           Ahora es un nombre real y único en el CSV (verificado con
#           `awk` antes de elegirlo — varios nombres del dataset se repiten
#           en más de un edificio de la misma localidad), para que los
#           usuarios de prueba apunten siempre al mismo registro exacto.
CONJUNTO_DE_PRUEBA = "AGRUPACION QUINTAS DE ARANJUEZ"


def ya_esta_sembrada(connection: Connection) -> bool:
    resultado = connection.execute(text("SELECT COUNT(*) FROM roles"))
    return resultado.scalar() > 0


def conjuntos_ya_importados(connection: Connection) -> bool:
    """
    ¿Qué? Revisión INDEPENDIENTE de `ya_esta_sembrada` — esta solo mira si
          ya hay conjuntos residenciales importados del CSV real.
    ¿Para qué? Bug real encontrado (2026-08-27): antes `main()` solo
              revisaba `ya_esta_sembrada` (tabla `roles`) para decidir si
              sembrar TODO, incluyendo `importar_conjuntos_reales()`. Quien
              ya tenía una base de datos local sembrada ANTES de que se
              agregara el CSV real de conjuntos (feat/conjuntos-reales-bogota)
              nunca recibía los conjuntos nuevos al hacer `git pull` y
              volver a correr `seed.py` — `roles` ya tenía filas, así que
              `main()` se salía de inmediato sin llegar a
              `importar_conjuntos_reales()`.
    ¿Impacto? Con esta revisión aparte, si en el futuro se agrega otra
              sección nueva a la siembra, cada una puede revisar su propia
              condición en vez de depender de un único flag "ya sembrada"
              que solo es cierto para lo que existía en ese momento.
    """
    resultado = connection.execute(text("SELECT COUNT(*) FROM conjuntos_residenciales"))
    return resultado.scalar() > 0


def importar_conjuntos_reales(connection: Connection) -> None:
    """
    ¿Qué? Reemplaza los conjuntos de prueba por los conjuntos residenciales
          REALES de Bogotá — dataset "Propiedad Horizontal.BogotáDC"
          (Secretaría Distrital de Gobierno, vía su servicio geográfico
          ArcGIS REST, actualizado a noviembre de 2025). Ver
          docs/gestion-proyecto/fuente-datos-conjuntos-reales.md.
    ¿Para qué? Antes había 40 conjuntos inventados (2 por localidad, con
              NITs de relleno "900123456-X"). Con datos reales, un residente
              puede buscar y de verdad encontrar su conjunto al registrarse.
    ¿Impacto? El CSV ya viene filtrado a "PROPIEDAD HORIZONTAL RESIDENCIAL"
             desde el origen (campo CATEPROP del servicio) y con el id de
             localidad ya numérico (mismo esquema 1-20 que usa nuestra
             tabla `localidades`) — no hace falta adivinar tipos de
             propiedad ni mapear nombres de localidad aquí.
             El NIT queda NULL — el dataset no lo trae, y un NIT inventado
             se vería tan real como uno de verdad sin serlo (el campo ya es
             editable por el Admin de Conjunto desde su panel, para cuando
             quiera completarlo). Tampoco se importa el nombre de la persona
             de contacto que si trae el dataset original: es un dato
             personal real de alguien que nunca autorizó mostrarlo aquí.
    """
    connection.execute(text("DELETE FROM unidades"))
    connection.execute(text("DELETE FROM conjuntos_residenciales"))

    vistos: set[tuple[int, str, str]] = set()
    filas_a_insertar: list[dict] = []

    with CONJUNTOS_CSV.open(encoding="utf-8", newline="") as archivo:
        for fila in csv.DictReader(archivo, delimiter=";"):
            nombre = fila["nombre_conjunto"].strip()
            direccion = fila["direccion"].strip()
            id_localidad_texto = fila["id_localidad"].strip()
            if not nombre or not direccion or not id_localidad_texto:
                continue
            id_localidad = int(id_localidad_texto)

            clave = (id_localidad, nombre.upper(), direccion.upper())
            if clave in vistos:
                continue
            vistos.add(clave)

            # ¿Qué? id_conjunto_residencial se genera aquí, en Python.
            # ¿Para qué? Esta inserción usa SQL crudo (text()), no el ORM —
            #           el "default=generar_uuid7" que vive en el modelo
            #           SQLAlchemy NUNCA se ejecuta en este camino. Sin
            #           generarlo a mano aquí, Postgres intentaría insertar
            #           la fila sin valor para su llave primaria y fallaría.
            filas_a_insertar.append(
                {
                    "id_conjunto_residencial": generar_uuid7(),
                    "id_localidad": id_localidad,
                    "nombre_conjunto": nombre,
                    "direccion": direccion,
                }
            )

    if filas_a_insertar:
        connection.execute(
            text(
                "INSERT INTO conjuntos_residenciales "
                "(id_conjunto_residencial, id_localidad, nombre_conjunto, direccion, verificado) "
                "VALUES (:id_conjunto_residencial, :id_localidad, :nombre_conjunto, :direccion, TRUE)"
            ),
            filas_a_insertar,
        )
    print(f"[seed] {len(filas_a_insertar)} conjuntos residenciales reales sembrados.")


def sembrar_usuarios_prueba(connection: Connection) -> None:
    """
    ¿Qué? Admin de Conjunto, Reciclador y Residente de prueba, todos
          vinculados a CONJUNTO_DE_PRUEBA (un conjunto real de Usaquén).
    ¿Para qué? Evitar repetir registro + verificación de correo + invitación
              + aceptación a mano en cada prueba durante el desarrollo.
    ¿Impacto? Misma contraseña que el superadmin (AdminVerde2026*). Quedan
             ACTIVOS y el reciclador YA autorizado en el conjunto — no hace
             falta repetir el flujo de invitar/aceptar para probar el resto
             de la app.
    """
    # ¿Qué? id_usuario/id_administrador/id_reciclador/id_administrador_conjunto
    #       se generan aquí, en Python — mismo motivo que en
    #       importar_conjuntos_reales(): este INSERT es SQL crudo, no pasa
    #       por el ORM, así que el "default=generar_uuid7" del modelo nunca
    #       se ejecuta en este camino.
    connection.execute(
        text(
            "INSERT INTO usuarios (id_usuario, id_rol, correo_electronico, password, is_active) VALUES "
            "(:id_admin_conjunto, 4, 'admin.conjunto.prueba@verdeapp.com', :pw, true), "
            "(:id_reciclador_usuario, 3, 'reciclador.prueba@verdeapp.com', :pw, true), "
            "(:id_residente_usuario, 2, 'residente.prueba@verdeapp.com', :pw, true) "
            "ON CONFLICT DO NOTHING"
        ),
        {
            "id_admin_conjunto": generar_uuid7(),
            "id_reciclador_usuario": generar_uuid7(),
            "id_residente_usuario": generar_uuid7(),
            "pw": PASSWORD_HASH_PRUEBA,
        },
    )

    connection.execute(
        text(
            "INSERT INTO administradores_conjunto (id_administrador, id_usuario, nombre, apellidos, numero_telefonico) "
            "SELECT :id_administrador, id_usuario, 'ADMIN', 'DE PRUEBA', '3000000000' FROM usuarios "
            "WHERE correo_electronico = 'admin.conjunto.prueba@verdeapp.com' ON CONFLICT DO NOTHING"
        ),
        {"id_administrador": generar_uuid7()},
    )

    connection.execute(
        text(
            "INSERT INTO recicladores (id_reciclador, id_usuario, localidad_id, nombre, apellidos, numero_telefonico, asociacion) "
            "SELECT :id_reciclador, id_usuario, 1, 'RECICLADOR', 'DE PRUEBA', '3000000001', 'INDEPENDIENTE' FROM usuarios "
            "WHERE correo_electronico = 'reciclador.prueba@verdeapp.com' ON CONFLICT DO NOTHING"
        ),
        {"id_reciclador": generar_uuid7()},
    )

    # ¿Qué? Vincula al Admin de Conjunto de prueba con CONJUNTO_DE_PRUEBA.
    connection.execute(
        text(
            "INSERT INTO administradores_conjuntos (id_administrador_conjunto, id_administrador, id_conjunto_residencial) "
            "SELECT :id_asignacion, ac.id_administrador, c.id_conjunto_residencial "
            "FROM administradores_conjunto ac "
            "JOIN usuarios u ON u.id_usuario = ac.id_usuario "
            "CROSS JOIN (SELECT id_conjunto_residencial FROM conjuntos_residenciales "
            "            WHERE nombre_conjunto = :nombre LIMIT 1) c "
            "WHERE u.correo_electronico = 'admin.conjunto.prueba@verdeapp.com' "
            "ON CONFLICT DO NOTHING"
        ),
        {"nombre": CONJUNTO_DE_PRUEBA, "id_asignacion": generar_uuid7()},
    )

    # ¿Qué? Vincula directamente al Reciclador de prueba con CONJUNTO_DE_PRUEBA,
    #       como si ya hubiera aceptado una invitación.
    connection.execute(
        text(
            "INSERT INTO recicladores_conjuntos (id_reciclador, id_conjunto_residencial) "
            "SELECT r.id_reciclador, c.id_conjunto_residencial "
            "FROM recicladores r "
            "JOIN usuarios u ON u.id_usuario = r.id_usuario "
            "CROSS JOIN (SELECT id_conjunto_residencial FROM conjuntos_residenciales "
            "            WHERE nombre_conjunto = :nombre LIMIT 1) c "
            "WHERE u.correo_electronico = 'reciclador.prueba@verdeapp.com' "
            "ON CONFLICT DO NOTHING"
        ),
        {"nombre": CONJUNTO_DE_PRUEBA},
    )

    connection.execute(
        text(
            "INSERT INTO unidades (id_unidad, id_conjunto_residencial, torre, apto) "
            "SELECT :id_unidad, id_conjunto_residencial, 'Torre A', '101' FROM conjuntos_residenciales "
            "WHERE nombre_conjunto = :nombre LIMIT 1 ON CONFLICT DO NOTHING"
        ),
        {"nombre": CONJUNTO_DE_PRUEBA, "id_unidad": generar_uuid7()},
    )

    connection.execute(
        text(
            "INSERT INTO residentes (id_residente, id_usuario, id_unidad, nombre, apellidos, numero_telefonico) "
            "SELECT :id_residente, u.id_usuario, un.id_unidad, 'RESIDENTE', 'DE PRUEBA', '3000000002' "
            "FROM usuarios u "
            "CROSS JOIN (SELECT un2.id_unidad FROM unidades un2 "
            "            JOIN conjuntos_residenciales c ON c.id_conjunto_residencial = un2.id_conjunto_residencial "
            "            WHERE c.nombre_conjunto = :nombre AND un2.torre = 'Torre A' AND un2.apto = '101' "
            "            LIMIT 1) un "
            "WHERE u.correo_electronico = 'residente.prueba@verdeapp.com' "
            "ON CONFLICT DO NOTHING"
        ),
        {"nombre": CONJUNTO_DE_PRUEBA, "id_residente": generar_uuid7()},
    )
    print("[seed] Usuarios de prueba sembrados (Admin de Conjunto, Reciclador, Residente).")


def sembrar_datos_con_uuid_generado(connection: Connection) -> None:
    """
    ¿Qué? Siembra el superadministrador, los 9 puntos de acopio reales y los
          6 módulos de contenido educativo — datos que antes vivían como
          INSERT estáticos en seed_data.sql.
    ¿Para qué? Sus llaves primarias ahora son UUIDv7, generado en Python
              (Postgres 17 no tiene una función uuidv7() nativa) — un
              INSERT de SQL puro y estático ya no puede generarlas, así que
              se movieron aquí junto con conjuntos_residenciales y los
              usuarios de prueba, que ya tenían este mismo tratamiento.
    ¿Impacto? Mismos datos exactos que antes, solo cambia dónde se generan
              sus IDs.
    """
    # ¿Qué? Superadministrador oficial compartido para el equipo de desarrollo.
    # Contraseña hasheada: AdminVerde2026*
    connection.execute(
        text(
            "INSERT INTO usuarios (id_usuario, id_rol, correo_electronico, password, is_active) "
            "VALUES (:id_usuario, 1, 'admin@verdeapp.com', "
            "'$2b$12$xSluyevTDoPhwiydwB3OhetVHh1miUiGivw99ChVJxBGl.zaC6EMW', true) "
            "ON CONFLICT DO NOTHING"
        ),
        {"id_usuario": generar_uuid7()},
    )

    puntos_acopio = [
        (8, "ECA Kennedy", "Carrera 84 # 11A-34"),
        (1, "ECA Usaquén I", "Carrera 21 # 164-82"),
        (1, "ECA Usaquén II", "Carrera 18 # 164-32"),
        (10, "ECA Engativá", "Calle 80C # 92-44"),
        (10, "ECA Engativá 2 (Las Ferias)", "Carrera 69K # 79-49"),
        (9, "ECA Fontibón (Montevideo)", "Calle 17A # 69F-26"),
        (14, "ECA Mártires", "Calle 8 # 26-80"),
        (16, "ECA Puente Aranda 1", "Carrera 36 # 19-53"),
        (16, "ECA Puente Aranda 2", "Carrera 65B # 17-80"),
    ]
    connection.execute(
        text(
            "INSERT INTO puntos_acopios (id_punto_acopio, id_localidad, nombre, direccion) "
            "VALUES (:id_punto_acopio, :id_localidad, :nombre, :direccion) ON CONFLICT DO NOTHING"
        ),
        [
            {
                "id_punto_acopio": generar_uuid7(),
                "id_localidad": id_localidad,
                "nombre": nombre,
                "direccion": direccion,
            }
            for id_localidad, nombre, direccion in puntos_acopio
        ],
    )

    contenido_educativo = [
        (
            "Separación en la fuente y código de colores",
            "Código de colores para la separación en la fuente",
            "En Bogotá la separación de residuos en la fuente se hace con tres colores de bolsa, unificados a nivel nacional por el Ministerio de Ambiente y Desarrollo Sostenible y aplicados en la ciudad por la UAESP.\n\nBolsa blanca: material aprovechable, limpio y seco. Aquí van el papel, el cartón, el plástico, el vidrio, el metal y las latas de aluminio.\n\nBolsa negra: residuos ordinarios que ya no se pueden aprovechar, como residuos de comida muy contaminados, papel higiénico, pañales, servilletas usadas y barrido de la casa.\n\nBolsa verde: residuos orgánicos aprovechables, como cáscaras, restos de comida, semillas y huesos.\n\nLa regla de oro es simple: si el material está limpio y seco, casi siempre es aprovechable y va en la bolsa blanca. Si está mojado, sucio o mezclado con comida, ya no sirve para reciclar. Separar bien en el hogar es el primer paso de toda la cadena de reciclaje: si las bolsas llegan mezcladas, el reciclador de oficio tiene que volver a separar el material a mano, perdiendo tiempo y calidad en el proceso.",
            "2026-08-15",
            "https://www.youtube.com/watch?v=Jxzw1xyxE2s",
            "https://bogota.gov.co/mi-ciudad/habitat/asi-puedes-separar-residuos-segun-el-color-de-las-bolsas-en-bogota",
        ),
        (
            "Tipos de residuos y su preparación",
            "Cómo preparar cada material antes de entregarlo para reciclaje",
            "No basta con poner el material en la bolsa correcta: cómo se prepara cada residuo también afecta si de verdad se puede aprovechar.\n\nPapel y cartón: deben estar secos y sin residuos de comida o grasa (por ejemplo, una caja de pizza grasosa no sirve). Es buena práctica aplanar las cajas para que ocupen menos espacio.\n\nPlástico: enjuagar brevemente los envases para quitar restos de líquido o comida, y aplanar las botellas. No es necesario quitar las etiquetas.\n\nVidrio: enjuagar los frascos y envases. Hay que manejarlo con cuidado para evitar que se rompa y se vuelva un riesgo para quien recoge el material.\n\nMetal y latas: enjuagar y, si es posible, aplastar las latas para ahorrar espacio en la bolsa.\n\nUn residuo mal preparado (sucio, mojado o mezclado con orgánicos) puede contaminar todo el contenido de la bolsa blanca y hacer que el material que sí estaba bien separado termine descartado como basura ordinaria.",
            "2026-08-16",
            None,
            "https://bogota.gov.co/mi-ciudad/ambiente/como-hacer-separacion-de-residuos-y-reciclar-desde-casa",
        ),
        (
            "Puntos limpios y Ecopuntos",
            "Ecopuntos: qué son y cómo usarlos para muebles, colchones y escombros",
            "Los Ecopuntos son cajas o puntos fijos que dispone la UAESP en distintos barrios de la ciudad, de forma rotativa semana a semana, para que los residentes entreguen de manera gratuita elementos voluminosos que NO caben en la recolección normal de basuras.\n\nQué se puede llevar: muebles viejos, colchones, tejas y escombros o material de obra en pequeñas cantidades.\n\nQué NO se puede llevar: llantas ni electrodomésticos — estos tienen puntos de recolección aparte, especializados en residuos eléctricos y electrónicos (RAEE).\n\nUsar los Ecopuntos evita que estos elementos terminen abandonados en andenes, parques o rondas de quebradas, que es uno de los problemas más visibles de la gestión de residuos en la ciudad. La ubicación de los Ecopuntos cambia cada semana según la localidad, así que conviene revisar el cronograma vigente antes de sacar el material.",
            "2026-08-17",
            None,
            "https://bogota.gov.co/mi-ciudad/habitat/como-funcionan-los-ecopunto-en-bogota-y-para-que-sirven",
        ),
        (
            "Economía circular y aprovechamiento",
            "Economía circular en Bogotá: el papel del reciclador de oficio",
            "La economía circular busca que un material se mantenga en uso el mayor tiempo posible, en lugar de terminar en un relleno sanitario después de un solo uso. En Bogotá, esa cadena depende directamente del trabajo del reciclador de oficio.\n\nLos recicladores de oficio son quienes recogen, transportan y comercializan el material aprovechable que los hogares separan. Desde 2016 (Decreto Nacional 596), su actividad está reconocida y remunerada como un servicio público — no es informalidad, es parte formal del sistema de aseo de la ciudad.\n\nBogotá cuenta con miles de recicladores de oficio organizados, y buena parte del material aprovechable de la ciudad se recupera gracias a su trabajo directo con los hogares. Por eso VerdeApp conecta a cada conjunto residencial con un reciclador autorizado: entregarle el material limpio y bien separado, en el horario acordado, es la forma más directa de que ese material sí vuelva a la economía en lugar de convertirse en basura.",
            "2026-08-18",
            None,
            "https://www.uaesp.gov.co/aprovechamiento-residuos-solidos-bogota",
        ),
        (
            "Residuos de construcción y demolición",
            "Manejo adecuado de escombros y residuos de construcción (RCD)",
            "Los Residuos de Construcción y Demolición (RCD) son el material que sobra de obras, remodelaciones o reparaciones dentro del conjunto: escombros, restos de baldosa, cemento, ladrillo, tejas rotas, entre otros.\n\nEstos residuos NO se deben mezclar con las bolsas blanca, negra o verde de la recolección domiciliaria normal, ni acumularse en zonas comunes, andenes o antejardines — además del riesgo de accidentes, es una infracción que puede generar comparendos ambientales.\n\nPara volúmenes pequeños, la ciudad dispone de los Ecopuntos (ver el módulo correspondiente). Para volúmenes más grandes, propios de una obra, se debe contratar a un gestor autorizado de RCD, que se encarga de transportarlos hasta una escombrera legal.\n\nComo Administrador de Conjunto, vale la pena informar a los residentes con anticipación cuando se planee una obra o remodelación, para coordinar dónde y cómo se va a disponer el material sobrante antes de que se convierta en un problema para todo el conjunto.",
            "2026-08-19",
            None,
            "https://www.ambientebogota.gov.co/preguntas-frecuentes-rcd",
        ),
        (
            "Marco distrital y consumo responsable",
            "Consumo responsable: reducir antes de reciclar",
            "Reciclar bien es importante, pero el primer paso de una buena gestión de residuos es generar menos basura desde el principio. Bogotá produce miles de toneladas de residuos cada día, y solo una parte relativamente pequeña se recupera — reducir el consumo innecesario tiene tanto impacto como separar correctamente.\n\nAlgunas prácticas de consumo responsable que promueve la Alcaldía de Bogotá:\n\nReducir antes que reciclar: preferir productos con menos empaque, evitar los desechables de un solo uso y comprar solo lo necesario.\n\nReutilizar lo que ya se tiene: usar termos y botellas recargables en lugar de comprar agua embotellada, dar una segunda vida a envases y recipientes antes de descartarlos.\n\nConocer al reciclador del sector: entregarle directamente el material aprovechable, en el día y horario en que pasa, es más eficiente que dejarlo mezclado con la basura ordinaria.\n\nEstos hábitos, multiplicados por todos los hogares de un conjunto residencial, hacen una diferencia real en cuánto material termina en un relleno sanitario en lugar de volver a ser útil.",
            "2026-08-19",
            None,
            "https://bogota.gov.co/mi-ciudad/ambiente/10-mandamientos-para-una-bogota-con-cero-desechos",
        ),
    ]
    connection.execute(
        text(
            "INSERT INTO contenido_educativo "
            "(id_contenido, modulo_categoria, titulo_tema, cuerpo_texto, fecha_publicacion, url_video, url_guia) "
            "VALUES (:id_contenido, :modulo_categoria, :titulo_tema, :cuerpo_texto, :fecha_publicacion, :url_video, :url_guia) "
            "ON CONFLICT DO NOTHING"
        ),
        [
            {
                "id_contenido": generar_uuid7(),
                "modulo_categoria": modulo_categoria,
                "titulo_tema": titulo_tema,
                "cuerpo_texto": cuerpo_texto,
                "fecha_publicacion": fecha_publicacion,
                "url_video": url_video,
                "url_guia": url_guia,
            }
            for modulo_categoria, titulo_tema, cuerpo_texto, fecha_publicacion, url_video, url_guia in contenido_educativo
        ],
    )
    print("[seed] Superadmin, puntos de acopio y contenido educativo sembrados.")


def main() -> None:
    with engine.connect() as connection:
        nucleo_ya_sembrado = ya_esta_sembrada(connection)

        if not nucleo_ya_sembrado:
            sql = SEED_FILE.read_text(encoding="utf-8")
            connection.exec_driver_sql(sql)
            connection.commit()

            sembrar_datos_con_uuid_generado(connection)
            connection.commit()
        else:
            print("[seed] Los datos base (roles, localidades, superadmin, etc.) ya existen, no se siembran de nuevo.")

        # ¿Qué? Revisión aparte de la del núcleo — ver conjuntos_ya_importados().
        if not conjuntos_ya_importados(connection):
            importar_conjuntos_reales(connection)
            connection.commit()
        else:
            print("[seed] Los conjuntos residenciales reales ya están importados, no se vuelven a traer del CSV.")

        if not nucleo_ya_sembrado:
            sembrar_usuarios_prueba(connection)
            connection.commit()

        print("[seed] Siembra verificada/completada.")


if __name__ == "__main__":
    main()
