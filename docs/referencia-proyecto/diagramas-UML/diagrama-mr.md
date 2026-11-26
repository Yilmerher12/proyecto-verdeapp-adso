# Modelo Relacional (MR) - VerdeApp

<!--
  ¿Qué? Modelo relacional de la base de datos de VerdeApp: las 30 tablas como están en
        PostgreSQL, con sus columnas, tipos, llaves primarias (PK), llaves foráneas (FK),
        valores por defecto e índices.
  ¿Para qué? Complementa el modelo entidad-relación (`diagrama-er.md`): el MER explica qué
            entidades existen y cómo se relacionan; este documento muestra cómo quedó eso
            en tablas reales (criterio 1 de la revisión).
  ¿Impacto? Si una migración de Alembic cambia una tabla, este documento se actualiza en la
            misma rama, igual que el MER y el diagrama de clases.
-->

| Campo | Valor |
|---|---|
| **Fecha** | 20 de noviembre de 2026 |
| **Motor** | PostgreSQL 17 |
| **Tablas** | 30 |
| **Fuente** | Modelos SQLAlchemy de `be/app/models/` (la misma definición que usan las migraciones de `be/alembic/versions/`) |
| **Documentos hermanos** | [Modelo entidad-relación](diagrama-er.md) · [Diagrama de clases](diagrama-clases.md) · [Casos de uso](casos-de-uso.md) |

## Cómo se obtuvo y cómo se verificó

El contenido **no se escribió a mano**: se generó leyendo `Base.metadata` de SQLAlchemy, que es lo que describe cada columna, llave e índice de los modelos. Después se comparó, solo en lectura, contra la base de datos de desarrollo (`verdeapp_db`, con las migraciones aplicadas hasta `head`): las 30 tablas y todas sus columnas coinciden con los modelos, y no hay ninguna tabla de más ni de menos.

## Cómo leerlo

- **PK** es la llave primaria. En `contenido_educativo_vistos`, `novedades_conjuntos` y `notificaciones_destinatarios` la llave primaria es **compuesta** (dos columnas).
- **FK → tabla.columna** indica a qué tabla apunta la llave foránea. `ON DELETE` dice qué le pasa a la fila cuando se borra la fila a la que apunta (`CASCADE` la borra también, `SET NULL` deja la columna vacía).
- Todas las llaves son `UUID` versión 4, salvo `roles.id_rol` y `localidades.id_localidad`, que son enteros porque son catálogos fijos.
- Un **índice único con condición** (por ejemplo `ux_reciclador_conjunto_activo`) hace que una regla se cumpla solo sobre las filas que cumplen la condición: solo puede haber una autorización activa por reciclador y conjunto, pero sí varias revocadas.

## Notación relacional

Cada línea es una relación: la llave primaria va subrayada con `_..._` y las llaves foráneas llevan `#`.

```text
administradores_conjunto(_id_administrador_, #id_usuario, nombre, apellidos, numero_telefonico)
administradores_conjuntos(_id_administrador_conjunto_, #id_administrador, #id_conjunto_residencial, fecha_asignacion, fecha_desvinculacion)
agenda_conjunto(_id_, #id_conjunto_residencial, #autor_id, texto, url_evidencia, estado, created_at, archivado_en)
archivos_subidos(_id_, #id_usuario, ruta, created_at)
auditorias_conjunto(_id_auditoria_, #id_reciclador, #id_conjunto_residencial, nivel_desempeno, tema_educativo, descripcion, ruta_evidencia, ruta_evidencia_2, ruta_evidencia_3, created_at, orden_interno)
comunicados(_id_comunicado_, #id_conjunto_residencial, #id_administrador, destinatarios, tipo, texto, url_adjunto, fecha_evento, fecha_expiracion, created_at, fecha_edicion)
conjuntos_residenciales(_id_conjunto_residencial_, #id_localidad, nombre_conjunto, nit, direccion, total_apartamentos, verificado, #verificado_por_id, codigo_acceso)
contenido_educativo(_id_contenido_, modulo_categoria, titulo_tema, cuerpo_texto, fecha_publicacion, orden, url_video, url_guia, url_imagen)
contenido_educativo_envios(_id_, #id_contenido, #id_conjunto_residencial, #enviado_por_id, created_at)
contenido_educativo_vistos(#_id_usuario_, #_id_contenido_, visto_at)
email_verification_tokens(_id_, #id_usuario, token, expires_at, used, created_at)
invitaciones_admin_conjunto(_id_, correo_electronico, token, conjuntos_asignados, #invitado_por_id, expires_at, used, created_at)
invitaciones_reciclador_conjunto(_id_, #id_reciclador, #id_conjunto_residencial, #invitado_por_id, estado, expires_at, created_at)
localidades(_id_localidad_, nombre_localidad)
notificaciones(_id_, tipo, #id_conjunto_residencial, #id_emisor, mensaje, id_referencia, created_at)
notificaciones_destinatarios(#_id_notificacion_, #_id_usuario_, leida, leida_at)
novedades(_id_novedad_, #id_admin_sistema, alcance, texto, url_adjunto, url_video, fecha_expiracion, created_at, fecha_edicion, fecha_archivado)
novedades_conjuntos(#_id_novedad_, #_id_conjunto_residencial_)
novedades_enviadas(_id_, #autor_id, #id_conjunto_residencial, texto, url_imagen, motivo, prioridad, estado, respuesta, respondida_at, created_at, resuelta_at)
password_reset_tokens(_id_, #id_usuario, token, expires_at, used, created_at)
puntos_acopio_comentarios(_id_comentario_, #id_punto_acopio, #id_autor, texto, created_at)
puntos_acopios(_id_punto_acopio_, #id_localidad, nombre, nombre_encargado, direccion, telefono_contacto, url_foto, activo, numero_resolucion, organizacion, correo_contacto, latitud, longitud)
recicladores(_id_reciclador_, #id_usuario, #localidad_id, nombre, apellidos, asociacion, numero_telefonico, mostrar_contacto_directorio)
recicladores_conjuntos(_id_, #id_reciclador, #id_conjunto_residencial, fecha_autorizacion, fecha_revocacion, #revocado_por_id)
residentes(_id_residente_, #id_usuario, #id_unidad, nombre, apellidos, numero_telefonico)
roles(_id_rol_, tipo_rol)
solicitudes_desvinculacion(_id_, #id_administrador, #id_conjunto_residencial, motivo, estado, motivo_rechazo, created_at, resuelta_at, #resuelta_por_id)
tokens_revocados(_jti_, expira_en)
unidades(_id_unidad_, #id_conjunto_residencial, torre, apto)
usuarios(_id_usuario_, #id_rol, correo_electronico, password, is_active, habilitado, fecha_desactivacion, motivo_desactivacion, locale, intentos_fallidos, bloqueado_hasta, version_sesion, foto_perfil_url)
```

## Detalle de las tablas

### administradores_conjunto

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id_administrador | UUID | No | PK |  |
| id_usuario | UUID | No | FK → usuarios.id_usuario | UNIQUE |
| nombre | VARCHAR(100) | No |  |  |
| apellidos | VARCHAR(150) | No |  |  |
| numero_telefonico | VARCHAR(15) | Sí |  |  |

### administradores_conjuntos

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id_administrador_conjunto | UUID | No | PK |  |
| id_administrador | UUID | No | FK → administradores_conjunto.id_administrador | ON DELETE CASCADE |
| id_conjunto_residencial | UUID | No | FK → conjuntos_residenciales.id_conjunto_residencial | ON DELETE CASCADE |
| fecha_asignacion | TIMESTAMP WITHOUT TIME ZONE | No |  | default now() |
| fecha_desvinculacion | TIMESTAMP WITHOUT TIME ZONE | Sí |  |  |

- Índice único `ux_admin_conjunto_activo` sobre (id_conjunto_residencial) donde `fecha_desvinculacion IS NULL`

### agenda_conjunto

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id | UUID | No | PK |  |
| id_conjunto_residencial | UUID | No | FK → conjuntos_residenciales.id_conjunto_residencial | ON DELETE CASCADE |
| autor_id | UUID | Sí | FK → usuarios.id_usuario | ON DELETE SET NULL |
| texto | TEXT | No |  |  |
| url_evidencia | VARCHAR(500) | Sí |  |  |
| estado | VARCHAR(20) | No |  |  |
| created_at | TIMESTAMP WITH TIME ZONE | No |  | default now() |
| archivado_en | TIMESTAMP WITH TIME ZONE | Sí |  |  |

- Índice `ix_agenda_conjunto_id_conjunto_residencial` sobre (id_conjunto_residencial)

### archivos_subidos

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id | UUID | No | PK |  |
| id_usuario | UUID | Sí | FK → usuarios.id_usuario | ON DELETE SET NULL |
| ruta | VARCHAR(500) | No |  |  |
| created_at | TIMESTAMP WITH TIME ZONE | No |  | default now() |

- Índice `ix_archivos_subidos_usuario_fecha` sobre (id_usuario, created_at)

### auditorias_conjunto

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id_auditoria | UUID | No | PK |  |
| id_reciclador | UUID | No | FK → recicladores.id_reciclador | ON DELETE CASCADE |
| id_conjunto_residencial | UUID | No | FK → conjuntos_residenciales.id_conjunto_residencial | ON DELETE CASCADE |
| nivel_desempeno | VARCHAR(20) | No |  |  |
| tema_educativo | VARCHAR(255) | No |  |  |
| descripcion | TEXT | Sí |  |  |
| ruta_evidencia | VARCHAR(500) | Sí |  |  |
| ruta_evidencia_2 | VARCHAR(500) | Sí |  |  |
| ruta_evidencia_3 | VARCHAR(500) | Sí |  |  |
| created_at | TIMESTAMP WITH TIME ZONE | No |  | default now() |
| orden_interno | BIGINT | No |  | UNIQUE; GENERATED ALWAYS AS IDENTITY |

### comunicados

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id_comunicado | UUID | No | PK |  |
| id_conjunto_residencial | UUID | No | FK → conjuntos_residenciales.id_conjunto_residencial | ON DELETE CASCADE |
| id_administrador | UUID | No | FK → administradores_conjunto.id_administrador | ON DELETE CASCADE |
| destinatarios | VARCHAR(20) | No |  |  |
| tipo | VARCHAR(20) | No |  |  |
| texto | TEXT | No |  |  |
| url_adjunto | VARCHAR(500) | Sí |  |  |
| fecha_evento | DATE | Sí |  |  |
| fecha_expiracion | TIMESTAMP WITH TIME ZONE | No |  |  |
| created_at | TIMESTAMP WITH TIME ZONE | No |  | default now() |
| fecha_edicion | TIMESTAMP WITH TIME ZONE | Sí |  |  |

### conjuntos_residenciales

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id_conjunto_residencial | UUID | No | PK |  |
| id_localidad | INTEGER | No | FK → localidades.id_localidad |  |
| nombre_conjunto | VARCHAR(255) | No |  |  |
| nit | VARCHAR(50) | Sí |  |  |
| direccion | VARCHAR(255) | No |  |  |
| total_apartamentos | INTEGER | Sí |  |  |
| verificado | BOOLEAN | No |  |  |
| verificado_por_id | UUID | Sí | FK → usuarios.id_usuario |  |
| codigo_acceso | VARCHAR(10) | No |  | UNIQUE |

### contenido_educativo

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id_contenido | UUID | No | PK |  |
| modulo_categoria | VARCHAR(255) | No |  |  |
| titulo_tema | VARCHAR(255) | No |  |  |
| cuerpo_texto | TEXT | No |  |  |
| fecha_publicacion | DATE | No |  |  |
| orden | INTEGER | No |  | Por defecto 0; posición dentro de su categoría |
| url_video | VARCHAR(500) | Sí |  |  |
| url_guia | VARCHAR(500) | Sí |  |  |
| url_imagen | VARCHAR(500) | Sí |  |  |

### contenido_educativo_envios

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id | UUID | No | PK |  |
| id_contenido | UUID | No | FK → contenido_educativo.id_contenido | ON DELETE CASCADE |
| id_conjunto_residencial | UUID | No | FK → conjuntos_residenciales.id_conjunto_residencial | ON DELETE CASCADE |
| enviado_por_id | UUID | Sí | FK → usuarios.id_usuario | ON DELETE SET NULL |
| created_at | TIMESTAMP WITH TIME ZONE | No |  | default now() |

- Índice `ix_contenido_educativo_envios_id_conjunto_residencial` sobre (id_conjunto_residencial)
- Índice `ix_contenido_educativo_envios_id_contenido` sobre (id_contenido)

### contenido_educativo_vistos

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id_usuario | UUID | No | PK, FK → usuarios.id_usuario | ON DELETE CASCADE |
| id_contenido | UUID | No | PK, FK → contenido_educativo.id_contenido | ON DELETE CASCADE |
| visto_at | TIMESTAMP WITH TIME ZONE | No |  | default now() |

### email_verification_tokens

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id | UUID | No | PK |  |
| id_usuario | UUID | No | FK → usuarios.id_usuario | ON DELETE CASCADE |
| token | VARCHAR(255) | No |  | UNIQUE |
| expires_at | TIMESTAMP WITH TIME ZONE | No |  |  |
| used | BOOLEAN | No |  |  |
| created_at | TIMESTAMP WITH TIME ZONE | No |  | default now() |

- Índice único `ix_email_verification_tokens_token` sobre (token)

### invitaciones_admin_conjunto

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id | UUID | No | PK |  |
| correo_electronico | VARCHAR(255) | No |  |  |
| token | VARCHAR(255) | No |  | UNIQUE |
| conjuntos_asignados | TEXT | No |  |  |
| invitado_por_id | UUID | No | FK → usuarios.id_usuario |  |
| expires_at | TIMESTAMP WITH TIME ZONE | No |  |  |
| used | BOOLEAN | Sí |  |  |
| created_at | TIMESTAMP WITH TIME ZONE | Sí |  | default now() |

### invitaciones_reciclador_conjunto

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id | UUID | No | PK |  |
| id_reciclador | UUID | No | FK → recicladores.id_reciclador | ON DELETE CASCADE |
| id_conjunto_residencial | UUID | No | FK → conjuntos_residenciales.id_conjunto_residencial | ON DELETE CASCADE |
| invitado_por_id | UUID | No | FK → usuarios.id_usuario |  |
| estado | VARCHAR(20) | No |  |  |
| expires_at | TIMESTAMP WITH TIME ZONE | No |  |  |
| created_at | TIMESTAMP WITH TIME ZONE | Sí |  |  |

### localidades

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id_localidad | INTEGER | No | PK |  |
| nombre_localidad | VARCHAR(100) | No |  |  |

### notificaciones

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id | UUID | No | PK |  |
| tipo | VARCHAR(50) | No |  |  |
| id_conjunto_residencial | UUID | Sí | FK → conjuntos_residenciales.id_conjunto_residencial | ON DELETE CASCADE |
| id_emisor | UUID | Sí | FK → usuarios.id_usuario | ON DELETE SET NULL |
| mensaje | TEXT | No |  |  |
| id_referencia | UUID | Sí |  |  |
| created_at | TIMESTAMP WITH TIME ZONE | No |  | default now() |

- Índice `ix_notificaciones_conjunto_tipo` sobre (id_conjunto_residencial, tipo)

### notificaciones_destinatarios

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id_notificacion | UUID | No | PK, FK → notificaciones.id | ON DELETE CASCADE |
| id_usuario | UUID | No | PK, FK → usuarios.id_usuario | ON DELETE CASCADE |
| leida | BOOLEAN | No |  |  |
| leida_at | TIMESTAMP WITH TIME ZONE | Sí |  |  |

### novedades

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id_novedad | UUID | No | PK |  |
| id_admin_sistema | UUID | No | FK → usuarios.id_usuario | ON DELETE CASCADE |
| alcance | VARCHAR(20) | No |  |  |
| texto | TEXT | No |  |  |
| url_adjunto | VARCHAR(500) | Sí |  |  |
| url_video | VARCHAR(500) | Sí |  |  |
| fecha_expiracion | TIMESTAMP WITH TIME ZONE | No |  |  |
| created_at | TIMESTAMP WITH TIME ZONE | No |  | default now() |
| fecha_edicion | TIMESTAMP WITH TIME ZONE | Sí |  |  |
| fecha_archivado | TIMESTAMP WITH TIME ZONE | Sí |  |  |

### novedades_conjuntos

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id_novedad | UUID | No | PK, FK → novedades.id_novedad | ON DELETE CASCADE |
| id_conjunto_residencial | UUID | No | PK, FK → conjuntos_residenciales.id_conjunto_residencial | ON DELETE CASCADE |

### novedades_enviadas

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id | UUID | No | PK |  |
| autor_id | UUID | Sí | FK → usuarios.id_usuario | ON DELETE SET NULL |
| id_conjunto_residencial | UUID | Sí | FK → conjuntos_residenciales.id_conjunto_residencial | ON DELETE SET NULL |
| texto | TEXT | No |  |  |
| url_imagen | VARCHAR(500) | Sí |  |  |
| motivo | VARCHAR(40) | Sí |  |  |
| prioridad | VARCHAR(10) | No |  |  |
| estado | VARCHAR(20) | No |  |  |
| respuesta | TEXT | Sí |  |  |
| respondida_at | TIMESTAMP WITH TIME ZONE | Sí |  |  |
| created_at | TIMESTAMP WITH TIME ZONE | No |  | default now() |
| resuelta_at | TIMESTAMP WITH TIME ZONE | Sí |  |  |

### password_reset_tokens

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id | UUID | No | PK |  |
| id_usuario | UUID | No | FK → usuarios.id_usuario | ON DELETE CASCADE |
| token | VARCHAR(255) | No |  | UNIQUE |
| expires_at | TIMESTAMP WITH TIME ZONE | No |  |  |
| used | BOOLEAN | No |  |  |
| created_at | TIMESTAMP WITH TIME ZONE | No |  | default now() |

- Índice único `ix_password_reset_tokens_token` sobre (token)

### puntos_acopio_comentarios

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id_comentario | UUID | No | PK |  |
| id_punto_acopio | UUID | No | FK → puntos_acopios.id_punto_acopio | ON DELETE CASCADE |
| id_autor | UUID | Sí | FK → usuarios.id_usuario | ON DELETE SET NULL |
| texto | TEXT | No |  |  |
| created_at | TIMESTAMP WITH TIME ZONE | No |  | default now() |

- Índice `ix_puntos_acopio_comentarios_id_punto_acopio` sobre (id_punto_acopio)

### puntos_acopios

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id_punto_acopio | UUID | No | PK |  |
| id_localidad | INTEGER | No | FK → localidades.id_localidad |  |
| nombre | VARCHAR(200) | No |  |  |
| nombre_encargado | VARCHAR(100) | Sí |  |  |
| direccion | VARCHAR(255) | No |  |  |
| telefono_contacto | VARCHAR(15) | Sí |  |  |
| url_foto | VARCHAR(500) | Sí |  |  |
| activo | BOOLEAN | No |  |  |
| numero_resolucion | VARCHAR(10) | Sí |  | UNIQUE |
| organizacion | VARCHAR(300) | Sí |  |  |
| correo_contacto | VARCHAR(255) | Sí |  |  |
| latitud | NUMERIC(10, 7) | Sí |  |  |
| longitud | NUMERIC(10, 7) | Sí |  |  |

### recicladores

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id_reciclador | UUID | No | PK |  |
| id_usuario | UUID | No | FK → usuarios.id_usuario | UNIQUE |
| localidad_id | INTEGER | Sí | FK → localidades.id_localidad |  |
| nombre | VARCHAR(100) | No |  |  |
| apellidos | VARCHAR(150) | No |  |  |
| asociacion | VARCHAR(255) | Sí |  |  |
| numero_telefonico | VARCHAR(15) | Sí |  |  |
| mostrar_contacto_directorio | BOOLEAN | No |  | default false |

### recicladores_conjuntos

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id | UUID | No | PK |  |
| id_reciclador | UUID | No | FK → recicladores.id_reciclador | ON DELETE CASCADE |
| id_conjunto_residencial | UUID | No | FK → conjuntos_residenciales.id_conjunto_residencial | ON DELETE CASCADE |
| fecha_autorizacion | TIMESTAMP WITHOUT TIME ZONE | No |  | default now() |
| fecha_revocacion | TIMESTAMP WITHOUT TIME ZONE | Sí |  |  |
| revocado_por_id | UUID | Sí | FK → usuarios.id_usuario |  |

- Índice único `ux_reciclador_conjunto_activo` sobre (id_reciclador, id_conjunto_residencial) donde `fecha_revocacion IS NULL`

### residentes

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id_residente | UUID | No | PK |  |
| id_usuario | UUID | No | FK → usuarios.id_usuario | UNIQUE |
| id_unidad | UUID | No | FK → unidades.id_unidad |  |
| nombre | VARCHAR(100) | No |  |  |
| apellidos | VARCHAR(150) | No |  |  |
| numero_telefonico | VARCHAR(15) | Sí |  |  |

### roles

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id_rol | INTEGER | No | PK |  |
| tipo_rol | VARCHAR(50) | No |  | UNIQUE |

### solicitudes_desvinculacion

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id | UUID | No | PK |  |
| id_administrador | UUID | No | FK → administradores_conjunto.id_administrador | ON DELETE CASCADE |
| id_conjunto_residencial | UUID | No | FK → conjuntos_residenciales.id_conjunto_residencial | ON DELETE CASCADE |
| motivo | TEXT | Sí |  |  |
| estado | VARCHAR(20) | No |  |  |
| motivo_rechazo | TEXT | Sí |  |  |
| created_at | TIMESTAMP WITHOUT TIME ZONE | No |  | default now() |
| resuelta_at | TIMESTAMP WITHOUT TIME ZONE | Sí |  |  |
| resuelta_por_id | UUID | Sí | FK → usuarios.id_usuario | ON DELETE SET NULL |

- Índice único `ux_solicitud_desvinculacion_pendiente` sobre (id_administrador, id_conjunto_residencial) donde `estado = 'PENDIENTE'`

### tokens_revocados

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| jti | UUID | No | PK |  |
| expira_en | TIMESTAMP WITH TIME ZONE | No |  |  |

### unidades

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id_unidad | UUID | No | PK |  |
| id_conjunto_residencial | UUID | No | FK → conjuntos_residenciales.id_conjunto_residencial |  |
| torre | VARCHAR(50) | No |  |  |
| apto | VARCHAR(50) | No |  |  |

### usuarios

| Columna | Tipo PostgreSQL | ¿Acepta NULL? | Llave | Otras restricciones |
| --- | --- | --- | --- | --- |
| id_usuario | UUID | No | PK |  |
| id_rol | INTEGER | No | FK → roles.id_rol |  |
| correo_electronico | VARCHAR(255) | No |  | UNIQUE |
| password | VARCHAR(255) | No |  |  |
| is_active | BOOLEAN | Sí |  |  |
| habilitado | BOOLEAN | No |  | default true |
| fecha_desactivacion | TIMESTAMP WITH TIME ZONE | Sí |  |  |
| motivo_desactivacion | VARCHAR(200) | Sí |  |  |
| locale | VARCHAR(10) | No |  | default es |
| intentos_fallidos | INTEGER | No |  | default 0 |
| bloqueado_hasta | TIMESTAMP WITH TIME ZONE | Sí |  |  |
| version_sesion | INTEGER | No |  | default 0 |
| foto_perfil_url | VARCHAR(255) | Sí |  |  |

- Índice único `ix_usuarios_correo_electronico` sobre (correo_electronico)

