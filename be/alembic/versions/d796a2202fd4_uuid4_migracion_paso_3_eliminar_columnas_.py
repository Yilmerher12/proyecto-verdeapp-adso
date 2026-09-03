"""uuidv4 migracion paso 3 eliminar columnas viejas y renombrar

¿Qué? Paso 3 de 3 (el "contract") de la migración de UUIDv7 a UUIDv4
      (issue #167). Con las columnas "id_v4"/"*_v4" ya validadas en los
      pasos 1 y 2 (0 huérfanas, 0 colisiones — verificar contra la base
      real ANTES de aplicar este paso, ver checklist en la descripción del
      PR), este paso: elimina las restricciones de llave foránea y
      primaria viejas, elimina las columnas UUIDv7 viejas, renombra las
      columnas "_v4" a los nombres originales, y recrea las restricciones
      de llave primaria/foránea sobre las columnas ya renombradas.
¿Para qué? Es el único paso realmente destructivo de los tres — por eso
          va último, después de que los pasos 1 y 2 ya demostraron que la
          correspondencia vieja-v7 -> nuevo-v4 es correcta y completa.
¿Impacto? DESTRUCTIVA E IRREVERSIBLE en la práctica: downgrade() no puede
          recuperar los UUIDv7 originales (una vez eliminados, no hay
          forma de reconstruirlos — y aunque se pudiera, ya no tendría
          caso, el objetivo es justamente dejar de usarlos). Antes de
          correr esto contra una base de datos real, confirmar que los
          pasos 1 y 2 ya se validaron ahí mismo.

Revision ID: d796a2202fd4
Revises: 1c320004d065
Create Date: 2026-09-03 00:10:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'd796a2202fd4'
down_revision: Union[str, Sequence[str], None] = '1c320004d065'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ¿Qué? Las 18 tablas con llave primaria propia (no compuesta) que se
#       generó de cero en el paso 1 — a diferencia de la migración de
#       enteros a UUID, aquí SÍ van las 18 completas (incluidas las 4 que
#       ya eran UUID: invitaciones_admin_conjunto, invitaciones_reciclador_conjunto,
#       password_reset_tokens, email_verification_tokens), porque esta vez
#       lo que cambia es el VALOR del UUID, no su tipo — esas 4 también
#       necesitan un id_v4 nuevo y su propio ciclo de drop/rename.
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
    ("invitaciones_admin_conjunto", "id", "invitaciones_admin_conjunto_pkey"),
    ("invitaciones_reciclador_conjunto", "id", "invitaciones_reciclador_conjunto_pkey"),
    ("password_reset_tokens", "id", "password_reset_tokens_pkey"),
    ("email_verification_tokens", "id", "email_verification_tokens_pkey"),
]

# ¿Qué? Cada FK real: (tabla_hija, columna_fk_original, nombre_constraint_vieja,
#       tabla_padre, columna_pk_padre_original, ondelete, nullable,
#       es_parte_de_pk_compuesta). Mismo grafo exacto que 8e5d632004ca.
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
          (simples y compuestas), 3) eliminar columnas UUIDv7 viejas,
          4) renombrar columnas "_v4" a los nombres originales,
          5) recrear PKs sobre las columnas renombradas, 6) recrear FKs.
    ¿Para qué? Postgres no permite eliminar una columna referenciada por
              una FK sin soltar antes esa FK — este orden es obligatorio,
              no solo prolijo. Mismo orden exacto que 8e5d632004ca.
    ¿Impacto? Ver advertencia del módulo: destructiva e irreversible.
    """
    connection = op.get_bind()

    # 0) "vista_directorio_residentes" depende de usuarios.id_usuario —
    #    Postgres bloquea el DROP COLUMN si la vista sigue viva. Se
    #    recrea al final con la misma definición exacta (los nombres de
    #    columna no cambian, solo su valor).
    connection.execute(sa.text("DROP VIEW IF EXISTS vista_directorio_residentes"))

    # 1) Soltar todas las FKs viejas primero (dependen de las PKs viejas).
    for tabla_hija, _col_fk, nombre_fk, _tabla_padre, _col_pk_padre, _ondelete, _nullable, _pk_compuesta in FKS:
        op.drop_constraint(nombre_fk, tabla_hija, type_="foreignkey")

    # 2) Soltar las PKs viejas (simples y compuestas).
    for tabla, _col_pk, nombre_pk in PKS_SIMPLES:
        op.drop_constraint(nombre_pk, tabla, type_="primary")
    for tabla, (_col_a, _col_b, nombre_pk) in TABLAS_PK_COMPUESTA.items():
        op.drop_constraint(nombre_pk, tabla, type_="primary")

    # 3) Eliminar las columnas UUIDv7 viejas.
    for tabla, col_pk, _nombre_pk in PKS_SIMPLES:
        op.drop_column(tabla, col_pk)
    for tabla_hija, col_fk, _nombre_fk, _tabla_padre, _col_pk_padre, _ondelete, _nullable, _pk_compuesta in FKS:
        op.drop_column(tabla_hija, col_fk)
    op.drop_column(*NOTIFICACIONES_ID_REFERENCIA)

    # 4) Renombrar las columnas "_v4" a los nombres originales.
    for tabla, col_pk, _nombre_pk in PKS_SIMPLES:
        op.alter_column(tabla, "id_v4", new_column_name=col_pk)
    for tabla_hija, col_fk, _nombre_fk, _tabla_padre, _col_pk_padre, _ondelete, _nullable, _pk_compuesta in FKS:
        op.alter_column(tabla_hija, f"{col_fk}_v4", new_column_name=col_fk)
    tabla_ref, col_ref = NOTIFICACIONES_ID_REFERENCIA
    op.alter_column(tabla_ref, f"{col_ref}_v4", new_column_name=col_ref)

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
    #    los nombres de columna no cambiaron, solo su valor.
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

    ¿Qué? NO ES POSIBLE recuperar los UUIDv7 originales — se eliminaron
          en upgrade() y Postgres no guarda ningún rastro de esos valores.
    ¿Para qué? Documentar honestamente la limitación, en vez de fingir una
              reversión que en realidad perdería datos o generaría
              valores nuevos sin relación con los originales.
    ¿Impacto? Lanza un error a propósito — si alguien necesita revertir
              esto de verdad, la única forma segura es restaurar un
              respaldo de la base de datos tomado ANTES del paso 3, no un
              downgrade automático.
    """
    raise NotImplementedError(
        "Este paso es irreversible: los UUIDv7 originales ya se "
        "eliminaron y no se pueden reconstruir. Restaura un respaldo de "
        "la base de datos tomado antes de aplicar esta migración."
    )
