"""
Módulo: seed.py
Descripción: Siembra los datos de prueba (roles, localidades, conjuntos de
ejemplo, usuarios de prueba, puntos de acopio) en la base de datos.
¿Para qué? Antes, ese SQL vivía en init_db.sql en la raíz del repo y Postgres
lo ejecutaba solo, automáticamente, al crear su volumen — pero ese mismo
archivo también CREABA las tablas, compitiendo con Alembic: en un volumen
nuevo, Alembic intentaba crear las mismas tablas que init_db.sql ya había
creado, y el backend se caía con "relation ... already exists". Ahora Alembic
es el único que crea/modifica tablas, y este script solo inserta datos,
después de que las migraciones ya corrieron.
¿Impacto? Se ejecuta desde el Dockerfile, después de "alembic upgrade head"
y antes de arrancar Uvicorn. Es seguro correrlo muchas veces: si la tabla
"roles" ya tiene datos, asume que la base ya fue sembrada y no hace nada
(evita repetir los DELETE de app/seed_data.sql contra una base con datos
reales).
"""

from pathlib import Path

from sqlalchemy import text

from app.database import engine

SEED_FILE = Path(__file__).parent / "seed_data.sql"


def ya_esta_sembrada(connection) -> bool:
    resultado = connection.execute(text("SELECT COUNT(*) FROM roles"))
    return resultado.scalar() > 0


def main() -> None:
    with engine.connect() as connection:
        if ya_esta_sembrada(connection):
            print("[seed] La base de datos ya tiene datos, no se siembra de nuevo.")
            return

        sql = SEED_FILE.read_text(encoding="utf-8")
        connection.exec_driver_sql(sql)
        connection.commit()
        print("[seed] Datos de prueba sembrados correctamente.")


if __name__ == "__main__":
    main()
