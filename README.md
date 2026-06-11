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

Ideal para desplegar toda la aplicación con un solo comando sin necesidad de configurar lenguajes locales. Docker se encargará de compilar el Frontend, levantar el Backend, estructurar PostgreSQL y encender Mailpit.

```bash
# 1. Clonar el repositorio oficial
git clone https://github.com/Yilmerher12/proyecto-verdeapp-adso.git
cd verde-app

# 2. Construir y encender todos los servicios en segundo plano
docker compose up -d --build

# 3. Validar el estado de salud de los contenedores
docker compose ps
```

**Frontend Web:** http://localhost:3000 (Servido por Nginx).

**Backend API:** http://localhost:8000/docs (Documentación interactiva Swagger).
        
**Buzón de Correos Local:** http://localhost:8025 (Panel de Mailpit para verificar tokens de registro).

### Método B: Entorno de Desarrollo Local (Modo Programación / Hot-Reload)

Recomendado para realizar modificaciones en tiempo real en el código fuente con recarga inmediata en el navegador.

#### 1. Infraestructura Base (Base de Datos y Servidor de Correo)

Deje corriendo únicamente los motores de soporte en Docker:

```bash
# Apagar servicios completos si están activos
docker compose down

# Levantar exclusivamente PostgreSQL y Mailpit
docker compose up -d db mailpit
```

#### 2. Configuración y Lanzamiento del Backend (be/)

Abra una terminal Git Bash y configure el servidor FastAPI:

```bash
cd be

# Crear y activar el entorno virtual de Python
python -m venv .venv
source .venv/bin/activate

# Instalar dependencias del archivo de requisitos
pip install -r requirements.txt

# Inicializar variables de entorno base
cp .env.example .env

# Sincronizar PostgreSQL con el historial de migraciones de Alembic
alembic upgrade head

# Iniciar el servidor Uvicorn con escucha de cambios activa
uvicorn app.main:app --reload --port 8000
```

#### 3. Configuración y Lanzamiento del Frontend (fe/)

Abra una segunda terminal y active la interfaz de desarrollo de Vite:

```bash
cd fe

# Instalar las dependencias bloqueadas de forma segura con pnpm
pnpm install

# Copiar configuración de variables de entorno
cp .env.example .env

# Lanzar el servidor de desarrollo local
pnpm dev
```

En este modo, el Frontend de desarrollo estará disponible en:

`http://localhost:5173`

---

## 📁 Estructura Detallada del Proyecto

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
