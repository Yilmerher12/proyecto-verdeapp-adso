# ♻️ Verde App — Sistema de Gestión de Residuos

> **Proyecto de Formación Titulada** — SENA ADSO | Año 2026
> **Versión:** `v1.0.0-dev` (Fase de Desarrollo)
> **Estado de Acreditación Académica:** Sincronizado con los criterios de evaluación del trimestre.

**Verde App** es una plataforma tecnológica e integral (Full Stack) diseñada para incentivar, coordinar y optimizar la separación de residuos en la fuente dentro de los conjuntos residenciales de Bogotá. El sistema actúa como un canal de comunicación directo y seguro entre los residentes locales y los recicladores de oficio oficiales de cada zona, permitiendo mitigar el impacto ambiental y formalizar los flujos de recolección selectiva en la ciudad.

---

## 👥 Integrantes del Proyecto (Grupo de Trabajo)

* **Yilmer Hernández Camargo** — Aprendiz ADSO
* **Juan Barajas** — Aprendiz ADSO
* **Eisin Yordan Castro** — Aprendiz ADSO
* **Jose Guerrero** — Aprendiz ADSO

---

## 📋 Arquitectura y Modularidad del Repositorio

El proyecto utiliza una estructura de arquitectura limpia y desacoplada, facilitando que cualquier desarrollador o instructor pueda entender e implementar el ecosistema completo sin configuraciones complejas:

* **`be/` (Backend):** API REST robusta construida sobre Python y FastAPI. Administra la lógica de negocio modular, la seguridad criptográfica, autenticación mediante tokens mutables y el mapeo objeto-relacional (ORM).
* **`fe/` (Frontend):** Aplicación de una sola página (SPA) interactiva y de alta fidelidad visual (Estilo Figma) desarrollada en React con tipado estricto en TypeScript y componentes estilizados mediante utilidades de TailwindCSS.
* **`docs/` (Documentación Técnica):** Contiene los artefactos del ciclo de vida del software, incluyendo especificaciones de Requisitos Funcionales (RF), Esquema de Entidad-Relación de la Base de Datos, y configuraciones de despliegue.

---

## 🛠️ Stack Tecnológico y Control de Versiones

| Capa / Componente             | Elemento Tecnológico    | Versión de Referencia   | Impacto Operativo                                                                 |
| :----------------------------- | :---------------------- | :----------------------- | :-------------------------------------------------------------------------------- |
| Backend Core                  | Python & FastAPI        | 3.12-slim / 0.135+      | Ejecución asíncrona de alto rendimiento para endpoints corporativos.              |
| Gestor de Paquetes (Backend)  | uv                      | —                        | Resuelve e instala las dependencias exactas de `pyproject.toml`/`uv.lock` — reemplazó a pip + requirements.txt por resolución más rápida y reproducible. |
| Persistencia / ORM            | PostgreSQL & SQLAlchemy | 17-alpine / 2.0+         | Motor relacional robusto con consultas tipadas y transacciones atómicas.          |
| Control de BD                 | Alembic                 | 1.18+                    | El esquema (tablas y cambios futuros) se crea y versiona con migraciones de Alembic al arrancar el backend; los datos de prueba se siembran aparte con `be/app/seed.py`. |
| Seguridad                     | python-jose & bcrypt    | 3.5+ / 4.0+              | Cifrado de contraseñas en hash y tokens de sesión (JWT) con claims de roles inyectados. |
| Frontend Core                 | React & TypeScript      | 19.2 / 5.9+              | Interfaz reactiva basada en componentes modulares y tipado seguro.                |
| Empaquetador Frontend         | Vite                    | 7.3+                     | Servidor de desarrollo con recarga instantánea (HMR) y build de producción optimizado. |
| Estilos UI                    | TailwindCSS             | 4.1+                     | Paradigma Utility-First para diseño adaptivo y consistente con Figma.             |
| Gestor de Paquetes (Frontend) | pnpm (Corepack)         | 11.0.9                   | Resolución eficiente de dependencias mediante almacenamiento enlazado.            |
| Infraestructura               | Docker & Docker Compose | 24+ / 2.20+              | Contenedores herméticos que aseguran el funcionamiento idéntico en cualquier PC.  |
| Servidor Web FE               | Nginx                   | 1.27-alpine              | Servidor de alto rendimiento para la distribución de los estáticos del Frontend.  |
| Servidor SMTP Dev             | Mailpit                 | v1.31.0 | Captura local de correos (verificación, recuperación, invitaciones) en el puerto 8025. |

---

## ✅ Prerrequisitos del Sistema

Para garantizar que el proyecto se ejecute de forma inmediata en cualquier máquina (Windows, macOS o Linux), se asegura contar con:

* Docker Desktop (Esencial para la inicialización automática de servicios).
* Node.js (Versión 20 LTS o superior).
* pnpm (Habilitado globalmente mediante `corepack enable`).
* Git Bash (Requerido estrictamente en sistemas Windows para la ejecución nativa de scripts y comandos de consola).

---


## 🚀 Cómo ejecutar el proyecto

Hay dos formas de correr la aplicación. Elegir la que mejor que se adapte o se desee:

---

### Método A: Todo con Docker (recomendado para sustentación / demo)

Con este método, un solo comando levanta todo: base de datos, backend, frontend y correo. No se necesita instalar Python ni Node.js.

**Requisito:** tener Docker Desktop instalado y corriendo.

**Pasos:**

```bash
# 1. Clonar el repositorio
git clone https://github.com/Yilmerher12/proyecto-verdeapp-adso.git
cd proyecto-verdeapp-adso

# 2. Copiar los archivos de configuración (no hay que editarlos, funcionan tal cual)
cp be/.env.example be/.env
cp fe/.env.example fe/.env

# 3. Construir y encender todos los servicios
docker compose up -d --build
```

Para verificar que todo quedó encendido:

```bash
docker compose ps
```

Deben aparecer 4 servicios activos (`Up` o `healthy`):
- `verde_db` — Base de datos PostgreSQL
- `verde_be` — Backend (API)
- `verde_fe` — Frontend (interfaz web)
- `verde_mailpit` — Servidor de correo local

Una vez encendido, la aplicación está disponible en:

| Qué | Dirección |
|---|---|
| Aplicación web | http://localhost:3000 |
| API / documentación | http://localhost:8000/docs |
| Bandeja de correos (Mailpit) | http://localhost:8025 |
| Base de datos | `localhost:5433` |

Para apagar todo cuando termines:

```bash
docker compose down
```

---

### Método B: Modo desarrollo local (backend y frontend sin Docker)

Con este método, la base de datos corre en Docker pero el backend y el frontend corren directamente en tu máquina. Sirve para ver los cambios en tiempo real mientras programamos.

**Requisitos:** Docker Desktop, [uv](https://docs.astral.sh/uv/getting-started/installation/) (instala Python 3.12 automáticamente si hace falta) y Node.js 20 instalados.

#### Paso 1 — Encender solo la base de datos y el correo

```bash
docker compose up -d verde_db verde_mailpit
```

#### Paso 2 — Configurar el backend

```bash
# Copiar el archivo de configuración
cp be/.env.example be/.env
```

Luego abrir `be/.env` y verificar que estas dos líneas estén así (deben estar así por defecto):

```dotenv
DATABASE_URL=postgresql://verde_user:verde_password@localhost:5433/verdeapp_db
SMTP_HOST=localhost
```

#### Paso 3 — Encender el backend (Terminal 1 — PowerShell)

> ⚠️ **Importante:** el Paso 1 (encender `verde_db`) tiene que estar hecho y corriendo *antes* de este paso. Si el backend arranca sin la base de datos disponible, falla con un error de conexión rechazada en el puerto 5433.

```powershell
cd be

# Solo la primera vez: instalar dependencias exactas del uv.lock (uv crea el
# entorno virtual solo, no hace falta crearlo ni activarlo a mano)
uv sync

# Aplicar las migraciones de Alembic (crea las tablas)
uv run alembic upgrade head

# Sembrar los datos de prueba (roles, usuarios de ejemplo, conjuntos, etc.)
# Es seguro correrlo varias veces: si la base ya tiene datos, no hace nada.
uv run python -m app.seed

# Encender el servidor
uv run uvicorn app.main:app --reload --port 8000
```

> En ejecuciones siguientes normalmente solo hace falta encender uvicorn (uv usa el entorno correcto solo). Repetir `uv run python -m app.seed` no hace daño, pero solo es necesario si empezaste con una base de datos nueva (ej: borraste el volumen de Docker):
> ```powershell
> uv run uvicorn app.main:app --reload --port 8000
> ```

#### Paso 4 — Encender el frontend (Terminal 2 — PowerShell)

```powershell
cd fe

# Solo la primera vez: instalar dependencias
pnpm install

# Encender el servidor de desarrollo
pnpm dev
```

Una vez encendido, la aplicación está disponible en:

| Qué | Dirección |
|---|---|
| Aplicación web | http://localhost:5173 |
| API / documentación | http://localhost:8000/docs |
| Bandeja de correos (Mailpit) | http://localhost:8025 |
| Base de datos | `localhost:5433` |

---

## 🗄️ Conexión a la Base de Datos

La base de datos vive dentro de Docker pero se puede consultar desde tu máquina. Antes de conectarnos, asegurarse de que el contenedor `verde_db` esté corriendo.

**Datos de conexión:**

| Campo | Valor |
|---|---|
| Host | `localhost` |
| Puerto | `5433` |
| Base de datos | `verdeapp_db` |
| Usuario | `verde_user` |
| Contraseña | `verde_password` |
| SSL | `disable` |

> El puerto es `5433` y no `5432` para evitar conflictos con instalaciones locales de PostgreSQL.

---

### Opción 1: pgAdmin

1. Abrir pgAdmin
2. Clic derecho en **Servers** → **Register** → **Server**
3. Pestaña **General** → escribir como nombre: `VerdeApp`
4. Pestaña **Connection** → llenar los datos de la tabla de arriba
5. Pestaña **SSL** → SSL mode: `disable`
6. Clic en **Save**

---

### Opción 2: Extensión de VS Code (SQLTools)

El repositorio ya incluye la conexión preconfigurada en `.vscode/settings.json`. Solo necesitas:

1. Instalar la extensión **SQLTools** y **SQLTools PostgreSQL Driver** en VS Code
2. Abrir el panel de SQLTools (ícono de base de datos en la barra lateral)
3. Aparecerá la conexión **VerdeApp** lista para usar — solo hacer clic en **Connect**

---

### Opción 3: Desde la terminal (sin instalar nada extra)

```bash
docker exec -it verde_db psql -U verde_user -d verdeapp_db
```

Comandos útiles dentro de la consola de PostgreSQL:

```sql
\dt                       -- ver todas las tablas
SELECT * FROM usuarios;   -- ver usuarios registrados
SELECT * FROM roles;      -- ver roles disponibles
\q                        -- salir
```

## 🔑 Usuarios de Prueba Precargados

Cada vez que se siembra la base de datos (`uv run python -m app.seed`, o automáticamente al levantar con Docker), quedan creadas estas 4 cuentas de prueba. Todas comparten la misma contraseña.

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador del Sistema | `admin@verdeapp.com` | `AdminVerde2026*` |
| Administrador de Conjunto | `admin.conjunto.prueba@verdeapp.com` | `AdminVerde2026*` |
| Reciclador | `reciclador.prueba@verdeapp.com` | `AdminVerde2026*` |
| Residente | `residente.prueba@verdeapp.com` | `AdminVerde2026*` |

> ⚠️ **Importante:** Administrador del Sistema y Administrador de Conjunto **no tienen registro público** — solo existen estas cuentas sembradas (el Admin de Conjunto se crea normalmente por invitación del Admin del Sistema, ver [HU-018](docs/requisitos/HUs/HU-018_admin_sistema_invita_admin_conjunto.md)). Si olvidas estas credenciales en un equipo nuevo (p. ej. en el SENA), no hay forma de crear otra cuenta de esos dos roles desde la interfaz — hay que volver a esta tabla.
>
> Residente y Reciclador sí tienen registro público (`/register`), así que para esos dos roles siempre puedes crear una cuenta nueva si lo necesitas.

---

## 📁 Estructura Detallada del Proyecto

A continuación se detalla la organización exacta del monorepositorio alojado en GitHub. Cabe destacar que, por seguridad y rendimiento, los archivos de entorno (`.env`), módulos de Node (`node_modules`) y entornos virtuales de Python (`.venv`) están excluidos mediante el `.gitignore`.

```plaintext
verde-app/
├── .github/                 # Configuraciones del repositorio y flujos de trabajo
├── .vscode/                 # Configuraciones de interfaz y entorno para VS Code
├── assets/                  # Diagramas SVG y recursos gráficos de la arquitectura
├── scripts/                 # Utilidades Bash (start.sh, stop.sh) para automatizar contenedores
├── be/                      # Backend (Python + FastAPI)
│   ├── app/                 # Código fuente principal de la API
│   │   ├── data/            # Datos abiertos usados por el seed (ver seed.py)
│   │   ├── models/          # Entidades e imperativos relacionales de SQLAlchemy
│   │   ├── routers/         # Controladores de endpoints divididos por recursos
│   │   ├── schemas/         # Modelos de validación estricta de Pydantic (DTOs)
│   │   ├── services/        # Lógica de negocio pura encapsulada
│   │   ├── tests/           # Entorno de pruebas automatizadas (pytest)
│   │   ├── utils/           # Helpers de infraestructura (Seguridad, utilidades)
│   │   ├── database.py      # Configuración de la sesión y conexión con la BD
│   │   ├── dependencies.py  # Inyección de dependencias (Autenticación, Sesión DB)
│   │   └── main.py          # Punto de entrada y configuración central de FastAPI
│   ├── .env.example         # Plantilla de variables de entorno (Sin datos sensibles)
│   ├── alembic.ini          # Configuración de Alembic — el esquema se versiona con migraciones reales
│   ├── Dockerfile           # Instrucciones de empaquetado para la imagen Docker
│   ├── pyproject.toml       # Manifiesto de dependencias (lo lee uv)
│   └── uv.lock              # Versiones EXACTAS resueltas de cada dependencia
├── fe/                      # Frontend (React + TypeScript + Vite)
│   ├── src/                 # Código fuente de la interfaz
│   │   ├── __tests__/       # Entorno de pruebas del Frontend
│   │   ├── api/             # Instancias y configuraciones de clientes Axios/Fetch
│   │   ├── components/      # Componentes UI reutilizables (Botones, Formularios)
│   │   ├── context/         # Proveedores de estado global (Context API)
│   │   ├── hooks/           # Ganchos personalizados (Lógica reutilizable)
│   │   ├── locales/         # Archivos de internacionalización
│   │   ├── pages/           # Vistas principales de la aplicación
│   │   └── types/           # Definiciones estrictas de interfaces TypeScript
│   ├── .env.example         # Plantilla de variables de entorno del Frontend
│   ├── Dockerfile           # Instrucciones de empaquetado para la imagen Docker
│   ├── nginx.conf           # Configuración del servidor Nginx para despliegue
│   ├── package.json         # Manifiesto de dependencias y scripts de Node.js
│   ├── pnpm-lock.yaml       # Árbol de dependencias bloqueado (Instalaciones exactas)
│   └── vite.config.ts       # Configuración del empaquetador Vite
├── .gitignore               # Reglas de exclusión de Git (Ignora credenciales y cachés)
├── docker-compose.yml       # Archivo maestro de orquestación de contenedores Docker
├── LICENSE                  # Licencia del proyecto (CC BY-NC-SA 4.0)
└── README.md                # Documento principal de presentación y guía (Este archivo)
```

## 📏 Convenciones del Equipo de Desarrollo

### Código Limpio e Idioma Homogéneo

El código (variables, funciones, nombres de archivo, rutas de API) se escribe en inglés. Los comentarios, la documentación y los mensajes de commit descriptivos se escriben en español — regla documentada en [`docs/requisitos/restricciones.md`](docs/requisitos/restricciones.md) y aplicada de forma consistente en todo el proyecto.

### Documentación Estructural Obligatoria

Los bloques funcionales y métodos de negocio del backend y frontend deben incorporar comentarios bajo el estándar pedagógico de responder de manera explícita:

* **¿Qué hace?**: Propósito inmediato del bloque de código.
* **¿Para qué sirve?**: Justificación de su existencia en la regla de negocio.
* **¿Impacto técnico?**: Comportamiento en memoria, base de datos o UI.

### Gobernanza del Gestor de Paquetes

Queda estrictamente restringido el uso de npm o yarn en el directorio frontend. Toda adición de bibliotecas debe ejecutarse a través de pnpm para salvaguardar la integridad estructural del archivo `pnpm-lock.yaml`.

---

## 🌿 Modelo de Ramas y Commits

El proyecto usa dos ramas permanentes y ramas de trabajo temporales:

* **`main`** — versión estable, la que se etiqueta para cada entrega (ej. `v1.0.0`). Nunca se trabaja directo aquí.
* **`develop`** — rama de integración. Todo el trabajo en curso se fusiona aquí primero.
* **Ramas de trabajo** — una por cada tarjeta/tarea, siempre creada a partir de `develop`, nunca directo sobre `develop` o `main`. El prefijo indica el tipo de cambio:

| Prefijo | Se usa para |
|---|---|
| `feat/` | Una funcionalidad nueva |
| `fix/` | Corregir un error o comportamiento incorrecto |
| `docs/` | Solo documentación, sin cambios de código |
| `chore/` | Mantenimiento (dependencias, configuración) sin efecto funcional |
| `content/` | Cambios de contenido (textos, datos de ejemplo) sin lógica nueva |

**Flujo normal:** crear la rama desde `develop` → hacer el cambio → abrir un Pull Request hacia `develop` → esperar a que el CI (pruebas automáticas) pase en verde → fusionar. `main` solo recibe código a través de `develop`, cuando se prepara una entrega.

**Mensajes de commit:** siguen [Conventional Commits](https://www.conventionalcommits.org/) — `tipo: descripción en español`, por ejemplo `fix: bloquear reportes repetidos sin espera` o `docs: actualizar diagramas UML`. El tipo (`feat`, `fix`, `docs`, `chore`) coincide con el prefijo de la rama.

---

## 📚 Índice de Documentación

Toda la documentación vive en `docs/`, en Markdown, versionada junto con el código:

| Carpeta | Contenido |
|---|---|
| [`docs/requisitos/HUs/`](docs/requisitos/HUs/) | Historias de Usuario — una por funcionalidad concreta desde la perspectiva del usuario |
| [`docs/requisitos/RFs/`](docs/requisitos/RFs/) | Requisitos Funcionales (RQF) — qué debe hacer el sistema, con reglas de negocio y endpoints asociados |
| [`docs/requisitos/RNFs/`](docs/requisitos/RNFs/) | Requisitos No Funcionales — seguridad, disponibilidad, rendimiento, usabilidad, accesibilidad, mantenibilidad |
| [`docs/requisitos/restricciones.md`](docs/requisitos/restricciones.md) | Reglas transversales del proyecto (idioma del código, convención de ramas/commits, versionado de dependencias) |
| [`docs/conceptos/`](docs/conceptos/) | Explicación pedagógica de OWASP Top 10, accesibilidad (ARIA/WCAG) y patrones de arquitectura, con evidencia real de archivo y línea |
| [`docs/referencia-proyecto/diagramas-UML/`](docs/referencia-proyecto/diagramas-UML/) | Diagrama de clases y catálogo de casos de uso |
| [`docs/gestion-proyecto/`](docs/gestion-proyecto/) | Auditoría de dependencias, seguimiento de sprints y decisiones de alcance |

Cada HU/RF/RNF tiene un campo **Estado** (`Implementada`, `Parcial`, `Por implementar`) que se actualiza cada vez que su funcionalidad cambia de verdad — es la fuente de verdad más confiable sobre qué tan avanzado está el proyecto, más que cualquier resumen (incluido este README).

---

## 📊 Estado del Proyecto

| Métrica | Avance |
|---|---|
| Historias de Usuario | 33 / 38 implementadas |
| Requisitos Funcionales | 15 / 17 implementados |
| Requisitos No Funcionales | 3 / 6 completos (3 parciales — de naturaleza continua: se miden, no se "terminan") |
| Pruebas backend (pytest) | 245 |
| Pruebas frontend (vitest) | 167 |

Pendiente por implementar, ambos documentados con su alcance completo antes de programarlos:

* **RQF-011 — Gestión de Directorio de Acopio** ([issue #8](https://github.com/Yilmerher12/proyecto-verdeapp-adso/issues/8)): hoy solo existe la lectura pública; falta el panel de administración para registrar, actualizar y dar de baja puntos de acopio.
* **RQF-013 — Recomendación de contenido educativo por auditoría** ([issue #4](https://github.com/Yilmerher12/proyecto-verdeapp-adso/issues/4)): al publicarse una auditoría con resultado negativo, recomendar automáticamente módulos educativos relacionados a los residentes del conjunto.

---

## 🎓 Contexto Formativo

Este software se desarrolla bajo la metodología activa de "Apropiación de Conocimiento Mediante Proyectos" en cumplimiento con las fases de análisis, diseño y desarrollo del programa de formación tecnológica ADSO del SENA. Su distribución tiene fines netamente pedagógicos, ilustrativos y demostrativos para el portafolio de evidencias del equipo de trabajo.
