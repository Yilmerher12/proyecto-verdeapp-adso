# ♻️ Verde App — Sistema de Gestión de Residuos

> **Proyecto de Formación Titulada** — SENA ADSO | Año 2026
> **Versión:** `v1.0.0-dev` (Fase de Desarrollo)
> **Estado de Acreditación Académica:** Sincronizado con los criterios de evaluación del trimestre.

**Verde App** es una plataforma tecnológica e integral (Full Stack) diseñada para incentivar, coordinar y optimizar la separación de residuos en la fuente dentro de los conjuntos residenciales de Bogotá. El sistema actúa como un canal de comunicación directo y seguro entre los residentes locales y los recicladores de oficio oficiales de cada zona, permitiendo mitigar el impacto ambiental y formalizar los flujos de recolección selectiva en la ciudad.

---

## 👥 Integrantes del Proyecto (Grupo de Trabajo)

* **Yilmer Hernández Camargo** — Aprendiz ADSO (Desarrollador Full Stack / Core Backend)
* **Juan Barajas** — Aprendiz ADSO (Desarrollador Frontend / UI Designer)
* **Eisin Yordan Castro** — Aprendiz ADSO (Especialista en Bases de Datos / QA)
* **Jose Guerrero** — Aprendiz ADSO (Documentador Técnico / Analista de Requisitos)

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
| Control de BD      | Alembic Migrations      | 1.13+                 | Control de versiones del esquema de la base de datos sin pérdida de datos.        |
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


## 🚀 Guías de Ejecución (Portabilidad Total)

El entorno soporta dos métodos de inicialización dependiendo de los objetivos de la sesión de trabajo:

### Método A: Inicialización Total Automatizada (Modo Sustentación / Demo)

Ideal para desplegar toda la aplicación con un solo comando sin necesidad de configurar lenguajes locales. Docker compilará el frontend, levantará el backend, estructurará PostgreSQL y encenderá Mailpit.

```bash
# 1. Clonar el repositorio
git clone https://github.com/Yilmerher12/proyecto-verdeapp-adso.git
cd proyecto-verdeapp-adso

# 2. Crear los archivos .env (los valores del .env.example funcionan directamente con Docker)
cp be/.env.example be/.env
cp fe/.env.example fe/.env

# 3. Construir y levantar todos los servicios
docker compose up -d --build
```

Verificar que todo esté bien:

```bash
docker compose ps
```

Los 4 contenedores deben aparecer como `healthy` o `Up`:
- `verde_db` → healthy
- `verde_be` → Up
- `verde_fe` → Up
- `verde_mailpit` → Up

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend / Swagger | http://localhost:8000/docs |
| Mailpit (emails) | http://localhost:8025 |
| BD (pgAdmin/cliente) | `localhost:5433` |

---

### Método B: Entorno de Desarrollo Local (Modo Programación / Hot-Reload)

Recomendado para ver cambios en tiempo real sin hacer rebuild de Docker. La BD y Mailpit siguen en Docker; el backend y frontend corren localmente.

#### 1. Infraestructura base (BD y correo en Docker)

```bash
# Si tenías todo corriendo, primero bajar
docker compose down

# Levantar SOLO la BD y Mailpit
docker compose up -d verde_db verde_mailpit
```

#### 2. Configurar el `.env` del backend para modo local

⚠️ **Paso crítico** — el `.env.example` viene configurado para Docker. En modo local hay que cambiar dos valores:

```bash
cp be/.env.example be/.env
```

Luego abrir `be/.env` en VSCode y cambiar estas dos líneas:

```dotenv
# CAMBIAR ESTO (host de Docker → host local):
DATABASE_URL=postgresql://verde_user:verde_password@localhost:5433/verdeapp_db

# CAMBIAR ESTO (nombre del servicio Docker → localhost):
SMTP_HOST=localhost
```

El resto de variables no se tocan.

#### 3. Lanzar el backend (Terminal 1)

```bash
cd be

# Crear y activar el entorno virtual (solo la primera vez)
python -m venv .venv
source .venv/Scripts/activate  # Windows Git Bash
# source .venv/bin/activate    # Linux / macOS

# Instalar dependencias (solo la primera vez)
pip install -r requirements.txt

# Aplicar migraciones de base de datos (solo la primera vez o tras nuevas migraciones)
alembic upgrade head

# Iniciar el servidor con hot-reload
uvicorn app.main:app --reload --port 8000
```

#### 4. Lanzar el frontend (Terminal 2)

```bash
cd fe

# Instalar dependencias (solo la primera vez)
pnpm install

# Copiar variables de entorno (no requiere cambios para modo local)
cp fe/.env.example fe/.env

# Iniciar el servidor de desarrollo
pnpm dev
```

| Servicio | URL en modo local |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend / Swagger | http://localhost:8000/docs |
| Mailpit (emails) | http://localhost:8025 |
| BD (pgAdmin/cliente) | `localhost:5433` |

> **Nota:** Cuando termines el desarrollo y quieras volver al modo Docker completo, restaura los valores originales en `be/.env` (`verde_db:5432` y `verde_mailpit`) antes de hacer `docker compose up -d --build`.


Aquí está el apartado listo para agregar al README:

---

## 🗄️ Conexión a la Base de Datos

La base de datos corre dentro de Docker pero es accesible desde tu máquina local. Hay tres formas de visualizarla:

> ⚠️ **Requisito previo:** el contenedor `verde_db` debe estar corriendo antes de conectarte (`docker compose up -d verde_db` o `docker compose up -d --build`).

**Datos de conexión** (iguales para las tres opciones):

| Campo | Valor |
|---|---|
| Host | `localhost` |
| Port | `5433` |
| Database | `verdeapp_db` |
| Username | `verde_user` |
| Password | `verde_password` |
| SSL | `disable` |

> ⚠️ El puerto es `5433` (no 5432) porque la mayoría de equipos ya tienen PostgreSQL instalado localmente usando ese puerto, lo que generaría un conflicto.

---

### Opción 1: pgAdmin

1. Abrir pgAdmin
2. Clic derecho en **Servers** → **Register** → **Server**
3. Pestaña **General** → Name: `VerdeApp Docker`
4. Pestaña **Connection**:
   - Host: `localhost`
   - Port: `5433`
   - Database: `verdeapp_db`
   - Username: `verde_user`
   - Password: `verde_password`
5. Pestaña **SSL** → SSL mode: `disable`
6. **Save**

---

### Opción 2: Database Client (extensión VSCode)

1. Instalar la extensión **Database Client** de Weijan Chen en VSCode
2. En el panel izquierdo, clic en el ícono de base de datos
3. Clic en **+** para nueva conexión → seleccionar **PostgreSQL**
4. Llenar los campos:
   - Host: `localhost`
   - Port: `5433`
   - Database: `verdeapp_db`
   - Username: `verde_user`
   - Password: `verde_password`
   - SSL: dejar vacío o `disable`
5. Clic en **Connect**

---

### Opción 3: Terminal de Docker (sin instalar nada)

Si no tienes pgAdmin ni la extensión, puedes entrar directamente al contenedor desde Git Bash:

```bash
# Abrir una sesión interactiva de PostgreSQL dentro del contenedor
docker exec -it verde_db psql -U verde_user -d verdeapp_db

# Comandos útiles dentro de psql:
\dt                  # listar todas las tablas
\d nombre_tabla      # ver estructura de una tabla
SELECT * FROM users; # consultar datos (ejemplo)
\q                   # salir
```

Ejemplos de consultas útiles para el proyecto:

```sql
-- Ver todos los usuarios registrados
SELECT id, email, first_name, last_name, is_email_verified, role_id FROM users;

-- Ver roles disponibles
SELECT * FROM roles;

-- Contar usuarios por rol
SELECT role_id, COUNT(*) FROM users GROUP BY role_id;
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
│   ├── alembic/             # Control de versiones e historial de migraciones de BD
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
│   ├── alembic.ini          # Archivo de configuración del gestor de migraciones
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
