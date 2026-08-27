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

            filas_a_insertar.append(
                {"id_localidad": id_localidad, "nombre_conjunto": nombre, "direccion": direccion}
            )

    if filas_a_insertar:
        connection.execute(
            text(
                "INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, direccion, verificado) "
                "VALUES (:id_localidad, :nombre_conjunto, :direccion, TRUE)"
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
    connection.execute(
        text(
            "INSERT INTO usuarios (id_rol, correo_electronico, password, is_active) VALUES "
            "(4, 'admin.conjunto.prueba@verdeapp.com', :pw, true), "
            "(3, 'reciclador.prueba@verdeapp.com', :pw, true), "
            "(2, 'residente.prueba@verdeapp.com', :pw, true) "
            "ON CONFLICT DO NOTHING"
        ),
        {"pw": PASSWORD_HASH_PRUEBA},
    )

    connection.execute(
        text(
            "INSERT INTO administradores_conjunto (id_usuario, nombre, apellidos, numero_telefonico) "
            "SELECT id_usuario, 'ADMIN', 'DE PRUEBA', '3000000000' FROM usuarios "
            "WHERE correo_electronico = 'admin.conjunto.prueba@verdeapp.com' ON CONFLICT DO NOTHING"
        )
    )

    connection.execute(
        text(
            "INSERT INTO recicladores (id_usuario, localidad_id, nombre, apellidos, numero_telefonico, asociacion) "
            "SELECT id_usuario, 1, 'RECICLADOR', 'DE PRUEBA', '3000000001', 'INDEPENDIENTE' FROM usuarios "
            "WHERE correo_electronico = 'reciclador.prueba@verdeapp.com' ON CONFLICT DO NOTHING"
        )
    )

    # ¿Qué? Vincula al Admin de Conjunto de prueba con CONJUNTO_DE_PRUEBA.
    connection.execute(
        text(
            "INSERT INTO administradores_conjuntos (id_administrador, id_conjunto_residencial) "
            "SELECT ac.id_administrador, c.id_conjunto_residencial "
            "FROM administradores_conjunto ac "
            "JOIN usuarios u ON u.id_usuario = ac.id_usuario "
            "CROSS JOIN (SELECT id_conjunto_residencial FROM conjuntos_residenciales "
            "            WHERE nombre_conjunto = :nombre LIMIT 1) c "
            "WHERE u.correo_electronico = 'admin.conjunto.prueba@verdeapp.com' "
            "ON CONFLICT DO NOTHING"
        ),
        {"nombre": CONJUNTO_DE_PRUEBA},
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
            "INSERT INTO unidades (id_conjunto_residencial, torre, apto) "
            "SELECT id_conjunto_residencial, 'Torre A', '101' FROM conjuntos_residenciales "
            "WHERE nombre_conjunto = :nombre LIMIT 1 ON CONFLICT DO NOTHING"
        ),
        {"nombre": CONJUNTO_DE_PRUEBA},
    )

    connection.execute(
        text(
            "INSERT INTO residentes (id_usuario, id_unidad, nombre, apellidos, numero_telefonico) "
            "SELECT u.id_usuario, un.id_unidad, 'RESIDENTE', 'DE PRUEBA', '3000000002' "
            "FROM usuarios u "
            "CROSS JOIN (SELECT un2.id_unidad FROM unidades un2 "
            "            JOIN conjuntos_residenciales c ON c.id_conjunto_residencial = un2.id_conjunto_residencial "
            "            WHERE c.nombre_conjunto = :nombre AND un2.torre = 'Torre A' AND un2.apto = '101' "
            "            LIMIT 1) un "
            "WHERE u.correo_electronico = 'residente.prueba@verdeapp.com' "
            "ON CONFLICT DO NOTHING"
        ),
        {"nombre": CONJUNTO_DE_PRUEBA},
    )
    print("[seed] Usuarios de prueba sembrados (Admin de Conjunto, Reciclador, Residente).")


def main() -> None:
    with engine.connect() as connection:
        if ya_esta_sembrada(connection):
            print("[seed] La base de datos ya tiene datos, no se siembra de nuevo.")
            return

        sql = SEED_FILE.read_text(encoding="utf-8")
        connection.exec_driver_sql(sql)
        connection.commit()

        importar_conjuntos_reales(connection)
        connection.commit()

        sembrar_usuarios_prueba(connection)
        connection.commit()

        print("[seed] Datos de prueba sembrados correctamente.")


if __name__ == "__main__":
    main()
