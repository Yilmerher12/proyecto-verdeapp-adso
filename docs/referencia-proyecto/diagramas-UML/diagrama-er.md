# Sistema de Gestión de Reciclaje para Conjuntos Residenciales


El sistema permite:

* Administrar usuarios y roles.
* Gestionar residentes.
* Gestionar recicladores asociados.
* Registrar conjuntos residenciales y sus unidades.
* Administrar puntos de acopio.
* Publicar contenido educativo sobre reciclaje.

---

# Tecnologías Utilizadas

| Categoría            | Tecnología   |
| -------------------- | ------------ |
| Frontend             | React        |
| Lenguaje Frontend    | TypeScript   |
| Build Tool           | Vite         |
| Estilos              | Tailwind CSS |
| Backend              | FastAPI      |
| Lenguaje Backend     | Python       |
| Base de Datos        | PostgreSQL   |
| Control de Versiones | Git          |
| Repositorio          | GitHub       |

---

# Modelo Entidad Relación

```mermaid
erDiagram

    ROLES {
        INT id_rol PK
        VARCHAR tipo_rol
    }

    USUARIOS {
        INT id_usuario PK
        INT id_rol FK
        VARCHAR correo_electronico
        VARCHAR password
        BOOLEAN is_active
    }

    RESIDENTES {
        INT id_residente PK
        INT id_usuario FK
        INT id_unidad FK
        VARCHAR nombre
        VARCHAR apellidos
        VARCHAR numero_telefonico
    }

    RECICLADORES {
        INT id_reciclador PK
        INT id_usuario FK
        INT id_localidad FK
        VARCHAR nombre
        VARCHAR apellidos
        VARCHAR numero_telefonico
        VARCHAR asociacion
    }

    ADMINISTRADORES_CONJUNTO {
        INT id_administrador PK
        INT id_usuario FK
        VARCHAR nombre
        VARCHAR apellidos
        VARCHAR numero_telefonico
    }

    LOCALIDADES {
        INT id_localidad PK
        VARCHAR nombre_localidad
    }

    CONJUNTOS_RESIDENCIALES {
        INT id_conjunto_residencial PK
        INT id_localidad FK
        VARCHAR nombre_conjunto
        VARCHAR nit
        VARCHAR direccion
        BOOLEAN verificado
        INT verificado_por_id FK
    }

    UNIDADES {
        INT id_unidad PK
        INT id_conjunto_residencial FK
        VARCHAR torre
        VARCHAR apto
    }

    PUNTO_ACOPIO {
        INT id_punto_acopio PK
        INT id_localidad FK
        VARCHAR nombre_punto_acopio
        VARCHAR direccion
        VARCHAR nombre_encargado
        VARCHAR telefono_contacto
    }

    CONTENIDO_EDUCATIVO {
        INT id_contenido PK
        VARCHAR modulo_categoria
        VARCHAR titulo_tema
        VARCHAR cuerpo_texto
        DATE fecha_publicacion
    }

    RECICLADORES_CONJUNTOS {
        INT id_reciclador PK,FK
        INT id_conjunto PK,FK
    }

    ADMINISTRADORES_CONJUNTOS {
        INT id_administrador_conjunto PK
        INT id_administrador FK
        INT id_conjunto_residencial FK
        TIMESTAMP fecha_asignacion
    }

    INVITACIONES_ADMIN_CONJUNTO {
        VARCHAR id PK
        VARCHAR correo_electronico
        VARCHAR token
        VARCHAR conjuntos_asignados
        INT invitado_por_id FK
        TIMESTAMP expires_at
        BOOLEAN used
        TIMESTAMP created_at
    }

    INVITACIONES_RECICLADOR_CONJUNTO {
        VARCHAR id PK
        INT id_reciclador FK
        INT id_conjunto_residencial FK
        INT invitado_por_id FK
        VARCHAR estado
        TIMESTAMP expires_at
        TIMESTAMP created_at
    }

    NOTIFICACIONES {
        INT id PK
        VARCHAR tipo
        INT id_conjunto_residencial FK
        INT id_emisor FK
        TEXT mensaje
        TIMESTAMP created_at
    }

    NOTIFICACIONES_DESTINATARIOS {
        INT id_notificacion PK,FK
        INT id_usuario PK,FK
        BOOLEAN leida
        TIMESTAMP leida_at
    }

    ROLES ||--o{ USUARIOS : posee

    USUARIOS ||--|| RESIDENTES : pertenece
    USUARIOS ||--|| RECICLADORES : pertenece
    USUARIOS ||--|| ADMINISTRADORES_CONJUNTO : pertenece

    LOCALIDADES ||--o{ CONJUNTOS_RESIDENCIALES : contiene
    LOCALIDADES ||--o{ PUNTO_ACOPIO : contiene
    LOCALIDADES ||--o{ RECICLADORES : asigna

    CONJUNTOS_RESIDENCIALES ||--o{ UNIDADES : tiene
    UNIDADES ||--o{ RESIDENTES : habita

    RECICLADORES ||--o{ RECICLADORES_CONJUNTOS : asignado
    CONJUNTOS_RESIDENCIALES ||--o{ RECICLADORES_CONJUNTOS : asociado

    ADMINISTRADORES_CONJUNTO ||--o{ ADMINISTRADORES_CONJUNTOS : administra
    CONJUNTOS_RESIDENCIALES ||--o{ ADMINISTRADORES_CONJUNTOS : asignado

    USUARIOS ||--o{ INVITACIONES_ADMIN_CONJUNTO : invita

    RECICLADORES ||--o{ INVITACIONES_RECICLADOR_CONJUNTO : recibe
    CONJUNTOS_RESIDENCIALES ||--o{ INVITACIONES_RECICLADOR_CONJUNTO : origina
    USUARIOS ||--o{ INVITACIONES_RECICLADOR_CONJUNTO : invita

    CONJUNTOS_RESIDENCIALES ||--o{ NOTIFICACIONES : genera
    NOTIFICACIONES ||--o{ NOTIFICACIONES_DESTINATARIOS : envia
    USUARIOS ||--o{ NOTIFICACIONES_DESTINATARIOS : recibe
```

---

# Arquitectura General

```text
ROLES
   │
   ▼
USUARIOS
   │
   ├── RESIDENTES
   ├── RECICLADORES
   └── ADMINISTRADORES_CONJUNTO
              │
              ▼
       ADMINISTRADORES_CONJUNTOS ── CONJUNTOS_RESIDENCIALES

LOCALIDADES
   │
   ├── CONJUNTOS_RESIDENCIALES
   │          │
   │          ▼
   │      UNIDADES
   │          │
   │          ▼
   │     RESIDENTES
   │
   ├── PUNTO_ACOPIO
   │
   └── RECICLADORES

RECICLADORES
      ▲
      │
      ▼
RECICLADORES_CONJUNTOS
      ▲
      │
      ▼
CONJUNTOS_RESIDENCIALES

USUARIOS ── INVITACIONES_ADMIN_CONJUNTO
RECICLADORES + CONJUNTOS_RESIDENCIALES ── INVITACIONES_RECICLADOR_CONJUNTO

CONJUNTOS_RESIDENCIALES
   │
   ▼
NOTIFICACIONES
   │
   ▼
NOTIFICACIONES_DESTINATARIOS ── USUARIOS

CONTENIDO_EDUCATIVO
```

---

# Diccionario de Datos

## roles

| Campo    | Tipo    |
| -------- | ------- |
| id_rol   | INT     |
| tipo_rol | VARCHAR |

---

## usuarios

| Campo              | Tipo    |
| ------------------ | ------- |
| id_usuario         | INT     |
| id_rol             | INT     |
| correo_electronico | VARCHAR |
| password           | VARCHAR |
| is_active          | BOOLEAN |

---

## residentes

| Campo             | Tipo    |
| ----------------- | ------- |
| id_residente      | INT     |
| id_usuario        | INT     |
| id_unidad         | INT     |
| nombre            | VARCHAR |
| apellidos         | VARCHAR |
| numero_telefonico | VARCHAR |

---

## recicladores

| Campo             | Tipo    |
| ----------------- | ------- |
| id_reciclador     | INT     |
| id_usuario        | INT     |
| id_localidad      | INT     |
| nombre            | VARCHAR |
| apellidos         | VARCHAR |
| numero_telefonico | VARCHAR |
| asociacion        | VARCHAR |

---

## administradores_conjunto

| Campo             | Tipo    |
| ----------------- | ------- |
| id_administrador  | INT     |
| id_usuario        | INT     |
| nombre            | VARCHAR |
| apellidos         | VARCHAR |
| numero_telefonico | VARCHAR |

---

## localidades

| Campo            | Tipo    |
| ---------------- | ------- |
| id_localidad     | INT     |
| nombre_localidad | VARCHAR |

---

## conjuntos_residenciales

| Campo                   | Tipo    |
| ----------------------- | ------- |
| id_conjunto_residencial | INT     |
| id_localidad            | INT     |
| nombre_conjunto         | VARCHAR |
| nit                     | VARCHAR |
| direccion               | VARCHAR |
| verificado              | BOOLEAN |
| verificado_por_id       | INT     |

---

## unidades

| Campo                   | Tipo    |
| ----------------------- | ------- |
| id_unidad               | INT     |
| id_conjunto_residencial | INT     |
| torre                   | VARCHAR |
| apto                    | VARCHAR |

---

## punto_acopio

| Campo               | Tipo    |
| ------------------- | ------- |
| id_punto_acopio     | INT     |
| id_localidad        | INT     |
| nombre_punto_acopio | VARCHAR |
| direccion           | VARCHAR |
| nombre_encargado    | VARCHAR |
| telefono_contacto   | VARCHAR |

---

## contenido_educativo

| Campo             | Tipo    |
| ----------------- | ------- |
| id_contenido      | INT     |
| modulo_categoria  | VARCHAR |
| titulo_tema       | VARCHAR |
| cuerpo_texto      | VARCHAR |
| fecha_publicacion | DATE    |

---

## recicladores_conjuntos

| Campo         | Tipo |
| ------------- | ---- |
| id_reciclador | INT  |
| id_conjunto   | INT  |

**Clave primaria compuesta:**

```sql
PRIMARY KEY (id_reciclador, id_conjunto)
```

---

## administradores_conjuntos

| Campo                     | Tipo      |
| -------------------------- | --------- |
| id_administrador_conjunto | INT       |
| id_administrador          | INT       |
| id_conjunto_residencial   | INT       |
| fecha_asignacion          | TIMESTAMP |

---

## invitaciones_admin_conjunto

| Campo              | Tipo      |
| -------------------- | --------- |
| id                  | VARCHAR   |
| correo_electronico  | VARCHAR   |
| token               | VARCHAR   |
| conjuntos_asignados | VARCHAR   |
| invitado_por_id     | INT       |
| expires_at          | TIMESTAMP |
| used                | BOOLEAN   |
| created_at          | TIMESTAMP |

---

## invitaciones_reciclador_conjunto

| Campo                  | Tipo      |
| ------------------------ | --------- |
| id                      | VARCHAR   |
| id_reciclador           | INT       |
| id_conjunto_residencial | INT       |
| invitado_por_id         | INT       |
| estado                  | VARCHAR   |
| expires_at              | TIMESTAMP |
| created_at              | TIMESTAMP |

---

## notificaciones

| Campo                  | Tipo      |
| ------------------------ | --------- |
| id                      | INT       |
| tipo                    | VARCHAR   |
| id_conjunto_residencial | INT       |
| id_emisor               | INT       |
| mensaje                 | TEXT      |
| created_at              | TIMESTAMP |

---

## notificaciones_destinatarios

| Campo           | Tipo      |
| ----------------- | --------- |
| id_notificacion | INT       |
| id_usuario      | INT       |
| leida           | BOOLEAN   |
| leida_at        | TIMESTAMP |

**Clave primaria compuesta:**

```sql
PRIMARY KEY (id_notificacion, id_usuario)
```

---

# Relaciones

| Entidad A                    | Entidad B                       | Cardinalidad |
| ------------------------------ | --------------------------------- | ------------ |
| Roles                          | Usuarios                         | 1:N          |
| Usuarios                       | Residentes                       | 1:1          |
| Usuarios                       | Recicladores                     | 1:1          |
| Usuarios                       | Administradores de Conjunto      | 1:1          |
| Localidades                    | Conjuntos Residenciales          | 1:N          |
| Localidades                    | Puntos de Acopio                 | 1:N          |
| Localidades                    | Recicladores                     | 1:N          |
| Conjuntos Residenciales        | Unidades                         | 1:N          |
| Unidades                       | Residentes                       | 1:N          |
| Recicladores                   | Conjuntos Residenciales          | N:M (vía `recicladores_conjuntos`) |
| Administradores de Conjunto    | Conjuntos Residenciales          | N:M (vía `administradores_conjuntos`) |
| Usuarios                       | Invitaciones Admin Conjunto      | 1:N          |
| Recicladores                   | Invitaciones Reciclador Conjunto | 1:N          |
| Conjuntos Residenciales        | Invitaciones Reciclador Conjunto | 1:N          |
| Conjuntos Residenciales        | Notificaciones                   | 1:N          |
| Notificaciones                 | Notificaciones Destinatarios     | 1:N          |
| Usuarios                       | Notificaciones Destinatarios     | 1:N          |

---

# Reglas de Negocio

* Todo usuario debe tener un rol asignado.
* Un residente pertenece a una única unidad residencial.
* Un conjunto residencial puede contener múltiples unidades.
* Una localidad puede contener múltiples conjuntos residenciales.
* Una localidad puede contener múltiples puntos de acopio.
* Un reciclador puede estar asociado a varios conjuntos residenciales, y opcionalmente pertenecer a una localidad.
* Un conjunto residencial puede trabajar con varios recicladores.
* Un conjunto residencial solo es visible públicamente si `verificado = true`; queda registrado qué usuario lo verificó (`verificado_por_id`).
* Un Administrador de Conjunto puede administrar varios conjuntos, y un conjunto puede tener más de un administrador asignado a lo largo del tiempo.
* La cuenta de Administrador de Conjunto nunca se crea por registro público: solo se origina desde una `invitacion_admin_conjunto` emitida por un Admin_sistema, con token de un solo uso y fecha de expiración.
* Un Reciclador solo puede trabajar en un conjunto tras aceptar una `invitacion_reciclador_conjunto` emitida por el Admin_conjunto de ese conjunto.
* Las notificaciones (llegada del reciclador, SHUT lleno/vaciado) se generan una sola vez por evento y se reparten a varios destinatarios, cada uno con su propio estado de lectura.
* El contenido educativo puede ser consultado por los usuarios del sistema.
