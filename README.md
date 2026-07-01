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

| Capa / Componente  | Elemento Tecnológico    | Versión de Referencia | Impacto Operativo                                                                 |
| :----------------- | :---------------------- | :-------------------- | :-------------------------------------------------------------------------------- |
| Backend Core       | Python & FastAPI        | 3.12-slim / 0.110+    | Ejecución asíncrona de alto rendimiento para endpoints corporativos.              |
| Persistencia / ORM | PostgreSQL & SQLAlchemy | 17-alpine / 2.0+      | Motor relacional robusto con consultas tipadas y transacciones atómicas.          |
| Control de BD      | init_db.sql + create_all | —                    | El esquema se crea con `init_db.sql` al levantar Docker y con `create_all` en cada arranque del backend para tablas nuevas. |
| Seguridad          | JWT & bcrypt            | 0.2.0 / 4.1+          | Cifrado de contraseñas en Hash y tokens de sesión con claims de roles inyectados. |
| Frontend Core      | React & TypeScript      | 18.3 / 5.4+           | Interfaz reactiva basada en componentes modulares y tipado seguro.                |
| Estilos UI         | TailwindCSS             | 4.0-beta+             | Paradigma Utility-First para diseño adaptivo y consistente con Figma.             |
| Gestor de Paquetes | pnpm (Corepack)         | 11.0.9                | Resolución eficiente de dependencias mediante almacenamiento enlazado.            |
| Infraestructura    | Docker & Docker Compose | 24+ / 2.20+           | Contenedores herméticos que aseguran el funcionamiento idéntico en cualquier PC.  |
| Servidor Web FE    | Nginx                   | 1.27-alpine           | Servidor de alto rendimiento para la distribución de los estáticos del Frontend.  |
| Servidor SMTP Dev  | Mailpit                 | 1.15+                 | Captura local de correos (activación de cuentas) en el puerto 8025.               |

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

**Requisitos:** Docker Desktop, Python 3.12 y Node.js 20 instalados.

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

```powershell
cd be

# Solo la primera vez: crear entorno virtual e instalar dependencias
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Encender el servidor
uvicorn app.main:app --reload --port 8000
```

> El esquema de la base de datos se crea automáticamente al arrancar el backend (`Base.metadata.create_all`). No se necesita ejecutar ningún comando de migración.

> En ejecuciones siguientes solo necesitamos activar el entorno y correr uvicorn:
> ```powershell
> .\.venv\Scripts\Activate.ps1
> uvicorn app.main:app --reload --port 8000
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

El proyecto ya incluye la conexión preconfigurada. Solo necesitas:

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
│   ├── alembic.ini          # Configuración heredada de Alembic (no se usa activamente; el esquema lo gestiona init_db.sql + create_all)
│   ├── Dockerfile           # Instrucciones de empaquetado para la imagen Docker
│   └── requirements.txt     # Manifiesto estricto de paquetes y dependencias
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
├── init_db.sql              # Script SQL de arranque para la creación de PostgreSQL
├── LICENSE                  # Licencia del proyecto (CC BY-NC-SA 4.0)
└── README.md                # Documento principal de presentación y guía (Este archivo)
```

## 📏 Convenciones del Equipo de Desarrollo

### Código Limpio e Idioma Homogéneo

Toda la lógica de persistencia, nombres de variables, funciones, rutas de endpoints y nombres de tablas en PostgreSQL se escriben estrictamente en inglés, manteniendo consistencia con los estándares internacionales de desarrollo de software **(actualmente este proceso de estandarización aún se encuentra en implementación y parte del proyecto conserva nomenclatura provisional mientras avanza el desarrollo).**

### Documentación Estructural Obligatoria

Los bloques funcionales y métodos de negocio del backend y frontend deben incorporar comentarios bajo el estándar pedagógico de responder de manera explícita:

* **¿Qué hace?**: Propósito inmediato del bloque de código.
* **¿Para qué sirve?**: Justificación de su existencia en la regla de negocio.
* **¿Impacto técnico?**: Comportamiento en memoria, base de datos o UI.

NOTA: **(actualmente este proceso de documentacion aún se encuentra en implementación y parte del proyecto no esta 100% documentado).**

### Gobernanza del Gestor de Paquetes

Queda estrictamente restringido el uso de npm o yarn en el directorio frontend. Toda adición de bibliotecas debe ejecutarse a través de pnpm para salvaguardar la integridad estructural del archivo `pnpm-lock.yaml`.

---

## 🎓 Contexto Formativo

Este software se desarrolla bajo la metodología activa de "Apropiación de Conocimiento Mediante Proyectos" en cumplimiento con las fases de análisis, diseño y desarrollo del programa de formación tecnológica ADSO del SENA. Su distribución tiene fines netamente pedagógicos, ilustrativos y demostrativos para el portafolio de evidencias del equipo de trabajo.
