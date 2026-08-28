"""uuid migracion paso 3 eliminar columnas viejas y renombrar

¿Qué? Paso 3 de 3 (el "contract") de la migración de llaves primarias
      enteras a UUIDv7. Con las columnas "id_uuid"/"*_uuid" ya validadas
      en los pasos 1 y 2 (0 huérfanas, 0 colisiones — verificado contra
      una copia desechable de la base real antes de escribir este
      archivo), este paso: elimina las restricciones de llave foránea y
      primaria viejas, elimina las columnas enteras viejas, renombra las
      columnas UUID a los nombres originales, y recrea las restricciones
      de llave primaria/foránea sobre las columnas ya renombradas.
¿Para qué? Es el único paso realmente destructivo de los tres — por eso
          va último, después de que los pasos 1 y 2 ya demostraron que
          la correspondencia vieja-entero -> nuevo-UUID es correcta y
          completa.
¿Impacto? DESTRUCTIVA E IRREVERSIBLE en la práctica: downgrade() no
          puede recuperar los enteros originales (una vez eliminados, no
          hay forma de reconstruir la secuencia). Antes de correr esto
          contra una base de datos real, confirmar que los pasos 1 y 2
          ya se validaron ahí mismo.

Revision ID: 8e5d632004ca
Revises: 23c835f44d12
Create Date: 2026-08-27 20:05:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = '8e5d632004ca'
down_revision: Union[str, Sequence[str], None] = '23c835f44d12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ¿Qué? Las 14 tablas con llave primaria propia (no compuesta) que se
#       generó de cero en el paso 1. (tabla, columna_pk_original,
#       nombre_constraint_pk_vieja).
PKS_SIMPLES = [
    ("usuarios", "id_usuario", "usuarios_pkey"),
    ("conjuntos_residenciales", "id_conjunto_residencial", "conjuntos_residenciales_pkey"),
    ("contenido_educativo", "id_contenido", "contenido_educativo_pkey"),
    ("puntos_acopios", "id_punto_acopio", "puntos_acopios_pkey"),
    ("unidades", "id_unidad", "unidades_pkey"),
    ("recicladores", "id_reciclador", "recicladores_pkey"),
    ("administradores_conjunto", "id_administrador", "administradores_conjunto_pkey"),
    ("residentes", "id_residente", "residentes_pkey"),
    ("administradores_conjuntos", "id_administrador_conjunto", "administradores_conjuntos_pkey"),
    ("novedades", "id_novedad", "novedades_pkey"),
    ("comunicados", "id_comunicado", "comunicados_pkey"),
    ("solicitudes_desvinculacion", "id", "solicitudes_desvinculacion_pkey"),
    ("auditorias_conjunto", "id_auditoria", "auditorias_conjunto_pkey"),
    ("notificaciones", "id", "notificaciones_pkey"),
]

# ¿Qué? Cada FK real: (tabla_hija, columna_fk_original, nombre_constraint_vieja,
#       tabla_padre, columna_pk_padre_original, ondelete, nullable,
#       es_parte_de_pk_compuesta).
# ¿Impacto? "notificaciones.id_referencia" NO tiene entrada de FK real
#           aquí (nunca tuvo ForeignKey()) — se renombra aparte, sin
#           constraint que recrear.
FKS = [
    ("conjuntos_residenciales", "verificado_por_id", "conjuntos_residenciales_verificado_por_id_fkey", "usuarios", "id_usuario", None, True, False),
    ("unidades", "id_conjunto_residencial", "unidades_id_conjunto_residencial_fkey", "conjuntos_residenciales", "id_conjunto_residencial", None, False, False),
    ("residentes", "id_usuario", "residentes_id_usuario_fkey", "usuarios", "id_usuario", None, False, False),
    ("residentes", "id_unidad", "residentes_id_unidad_fkey", "unidades", "id_unidad", None, False, False),
    ("recicladores", "id_usuario", "recicladores_id_usuario_fkey", "usuarios", "id_usuario", None, False, False),
    ("administradores_conjunto", "id_usuario", "administradores_conjunto_id_usuario_fkey", "usuarios", "id_usuario", None, False, False),
    ("administradores_conjuntos", "id_administrador", "administradores_conjuntos_id_administrador_fkey", "administradores_conjunto", "id_administrador", "CASCADE", False, False),
    ("administradores_conjuntos", "id_conjunto_residencial", "administradores_conjuntos_id_conjunto_residencial_fkey", "conjuntos_residenciales", "id_conjunto_residencial", "CASCADE", False, False),
    ("novedades", "id_admin_sistema", "novedades_id_admin_sistema_fkey", "usuarios", "id_usuario", "CASCADE", False, False),
    ("comunicados", "id_conjunto_residencial", "comunicados_id_conjunto_residencial_fkey", "conjuntos_residenciales", "id_conjunto_residencial", "CASCADE", False, False),
    ("comunicados", "id_administrador", "comunicados_id_administrador_fkey", "administradores_conjunto", "id_administrador", "CASCADE", False, False),
    ("solicitudes_desvinculacion", "id_administrador", "solicitudes_desvinculacion_id_administrador_fkey", "administradores_conjunto", "id_administrador", "CASCADE", False, False),
    ("solicitudes_desvinculacion", "id_conjunto_residencial", "solicitudes_desvinculacion_id_conjunto_residencial_fkey", "conjuntos_residenciales", "id_conjunto_residencial", "CASCADE", False, False),
    ("solicitudes_desvinculacion", "resuelta_por_id", "solicitudes_desvinculacion_resuelta_por_id_fkey", "usuarios", "id_usuario", "SET NULL", True, False),
    ("auditorias_conjunto", "id_reciclador", "auditorias_conjunto_id_reciclador_fkey", "recicladores", "id_reciclador", "CASCADE", False, False),
    ("auditorias_conjunto", "id_conjunto_residencial", "auditorias_conjunto_id_conjunto_residencial_fkey", "conjuntos_residenciales", "id_conjunto_residencial", "CASCADE", False, False),
    ("notificaciones", "id_conjunto_residencial", "notificaciones_id_conjunto_residencial_fkey", "conjuntos_residenciales", "id_conjunto_residencial", "CASCADE", True, False),
    ("notificaciones", "id_emisor", "notificaciones_id_emisor_fkey", "usuarios", "id_usuario", "SET NULL", True, False),
    ("notificaciones_destinatarios", "id_notificacion", "notificaciones_destinatarios_id_notificacion_fkey", "notificaciones", "id", "CASCADE", False, True),
    ("notificaciones_destinatarios", "id_usuario", "notificaciones_destinatarios_id_usuario_fkey", "usuarios", "id_usuario", "CASCADE", False, True),
    ("recicladores_conjuntos", "id_reciclador", "recicladores_conjuntos_id_reciclador_fkey", "recicladores", "id_reciclador", None, False, True),
    ("recicladores_conjuntos", "id_conjunto_residencial", "recicladores_conjuntos_id_conjunto_residencial_fkey", "conjuntos_residenciales", "id_conjunto_residencial", None, False, True),
    ("invitaciones_admin_conjunto", "invitado_por_id", "invitaciones_admin_conjunto_invitado_por_id_fkey", "usuarios", "id_usuario", None, False, False),
    ("invitaciones_reciclador_conjunto", "id_reciclador", "invitaciones_reciclador_conjunto_id_reciclador_fkey", "recicladores", "id_reciclador", "CASCADE", False, False),
    ("invitaciones_reciclador_conjunto", "id_conjunto_residencial", "invitaciones_reciclador_conjunto_id_conjunto_residencial_fkey", "conjuntos_residenciales", "id_conjunto_residencial", "CASCADE", False, False),
    ("invitaciones_reciclador_conjunto", "invitado_por_id", "invitaciones_reciclador_conjunto_invitado_por_id_fkey", "usuarios", "id_usuario", None, False, False),
    ("password_reset_tokens", "id_usuario", "password_reset_tokens_id_usuario_fkey", "usuarios", "id_usuario", "CASCADE", False, False),
    ("email_verification_tokens", "id_usuario", "email_verification_tokens_id_usuario_fkey", "usuarios", "id_usuario", "CASCADE", False, False),
]

# ¿Qué? El puntero especial sin ForeignKey() real — solo se renombra.
NOTIFICACIONES_ID_REFERENCIA = ("notificaciones", "id_referencia")

# ¿Qué? Las 2 tablas puente con llave primaria compuesta por sus 2 FKs.
TABLAS_PK_COMPUESTA = {
    "notificaciones_destinatarios": ("id_notificacion", "id_usuario", "notificaciones_destinatarios_pkey"),
    "recicladores_conjuntos": ("id_reciclador", "id_conjunto_residencial", "recicladores_conjuntos_pkey"),
}


def upgrade() -> None:
    """Aplica los cambios al esquema de la base de datos.

    ¿Qué? Orden estricto: 1) soltar FKs viejas, 2) soltar PKs viejas
          (simples y compuestas), 3) eliminar columnas enteras viejas,
          4) renombrar columnas UUID a los nombres originales,
          5) recrear PKs sobre las columnas renombradas, 6) recrear FKs.
    ¿Para qué? Postgres no permite eliminar una columna referenciada por
              una FK sin soltar antes esa FK — este orden es obligatorio,
              no solo prolijo.
    ¿Impacto? Ver advertencia del módulo: destructiva e irreversible.
    """
    connection = op.get_bind()

    # 0) "vista_directorio_residentes" (be/app/routers/admin.py) depende
    #    de usuarios.id_usuario — Postgres bloquea el DROP COLUMN si la
    #    vista sigue viva. El endpoint que la usa ya hace
    #    "CREATE OR REPLACE VIEW" en cada llamada, así que técnicamente
    #    se recrearía sola — pero se recrea aquí también, con la misma
    #    definición exacta (los nombres de columna no cambian, solo su
    #    tipo, así que el SQL de la vista no necesita ningún ajuste),
    #    para no dejar la base de datos en un estado roto entre que
    #    corre esta migración y que alguien visite ese endpoint.
    connection.execute(sa.text("DROP VIEW IF EXISTS vista_directorio_residentes"))

    # 1) Soltar todas las FKs viejas primero (dependen de las PKs viejas).
    for tabla_hija, _col_fk, nombre_fk, _tabla_padre, _col_pk_padre, _ondelete, _nullable, _pk_compuesta in FKS:
        op.drop_constraint(nombre_fk, tabla_hija, type_="foreignkey")

    # 2) Soltar las PKs viejas (simples y compuestas).
    for tabla, _col_pk, nombre_pk in PKS_SIMPLES:
        op.drop_constraint(nombre_pk, tabla, type_="primary")
    for tabla, (_col_a, _col_b, nombre_pk) in TABLAS_PK_COMPUESTA.items():
        op.drop_constraint(nombre_pk, tabla, type_="primary")

    # 3) Eliminar las columnas enteras viejas.
    for tabla, col_pk, _nombre_pk in PKS_SIMPLES:
        op.drop_column(tabla, col_pk)
    for tabla_hija, col_fk, _nombre_fk, _tabla_padre, _col_pk_padre, _ondelete, _nullable, _pk_compuesta in FKS:
        op.drop_column(tabla_hija, col_fk)
    op.drop_column(*NOTIFICACIONES_ID_REFERENCIA)

    # 4) Renombrar las columnas UUID a los nombres originales.
    for tabla, col_pk, _nombre_pk in PKS_SIMPLES:
        op.alter_column(tabla, "id_uuid", new_column_name=col_pk)
    for tabla_hija, col_fk, _nombre_fk, _tabla_padre, _col_pk_padre, _ondelete, _nullable, _pk_compuesta in FKS:
        op.alter_column(tabla_hija, f"{col_fk}_uuid", new_column_name=col_fk)
    tabla_ref, col_ref = NOTIFICACIONES_ID_REFERENCIA
    op.alter_column(tabla_ref, f"{col_ref}_uuid", new_column_name=col_ref)

    # 5) NOT NULL en las columnas que no eran nullable, y recrear PKs.
    for tabla, col_pk, _nombre_pk in PKS_SIMPLES:
        op.alter_column(tabla, col_pk, nullable=False)
        op.create_primary_key(f"{tabla}_pkey", tabla, [col_pk])
    for tabla_hija, col_fk, _nombre_fk, _tabla_padre, _col_pk_padre, _ondelete, nullable, _pk_compuesta in FKS:
        if not nullable:
            op.alter_column(tabla_hija, col_fk, nullable=False)
    for tabla, (col_a, col_b, nombre_pk) in TABLAS_PK_COMPUESTA.items():
        op.create_primary_key(nombre_pk, tabla, [col_a, col_b])

    # 6) Recrear las FKs reales (todas, menos id_referencia que nunca tuvo una).
    for tabla_hija, col_fk, nombre_fk, tabla_padre, col_pk_padre, ondelete, _nullable, _pk_compuesta in FKS:
        op.create_foreign_key(
            nombre_fk, tabla_hija, tabla_padre, [col_fk], [col_pk_padre], ondelete=ondelete
        )

    # 7) Recrear la vista — misma definición exacta que be/app/routers/admin.py,
    #    los nombres de columna no cambiaron, solo su tipo.
    connection.execute(sa.text("""
        CREATE OR REPLACE VIEW vista_directorio_residentes AS
        SELECT
            u.correo_electronico AS "Correo",
            r.nombre AS "Nombre",
            r.apellidos AS "Apellido",
            r.numero_telefonico AS "Teléfono",
            c.nombre_conjunto AS "Conjunto",
            uni.torre AS "Bloque",
            uni.apto AS "Apartamento",
            l.id_localidad AS "id_localidad",
            l.nombre_localidad AS "Localidad"
        FROM residentes r
        JOIN usuarios u ON r.id_usuario = u.id_usuario
        JOIN unidades uni ON r.id_unidad = uni.id_unidad
        JOIN conjuntos_residenciales c ON uni.id_conjunto_residencial = c.id_conjunto_residencial
        JOIN localidades l ON c.id_localidad = l.id_localidad;
    """))


def downgrade() -> None:
    """Revierte los cambios aplicados por upgrade().

    ¿Qué? NO ES POSIBLE recuperar los enteros autoincrementales
          originales — se eliminaron en upgrade() y Postgres no guarda
          ningún rastro de esos valores.
    ¿Para qué? Documentar honestamente la limitación, en vez de fingir
              una reversión que en realidad perdería datos o generaría
              números nuevos sin relación con los originales.
    ¿Impacto? Lanza un error a propósito — si alguien necesita revertir
              esto de verdad, la única forma segura es restaurar un
              respaldo de la base de datos tomado ANTES del paso 3, no
              un downgrade automático.
    """
    raise NotImplementedError(
        "Este paso es irreversible: los IDs enteros originales ya se "
        "eliminaron y no se pueden reconstruir. Restaura un respaldo de "
        "la base de datos tomado antes de aplicar esta migración."
    )
