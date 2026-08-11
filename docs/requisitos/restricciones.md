# VerdeApp — Restricciones del Proyecto

<!--
  ¿Qué? Documento que establece los límites técnicos y de proceso, no negociables,
        para el desarrollo de VerdeApp.
  ¿Para qué? Que cualquier persona del equipo (o que se sume después) sepa qué
             decisiones ya están tomadas y no debe cuestionar en cada tarea nueva —
             qué versión de cada tecnología usar, cómo se ve la interfaz, en qué
             idioma se escribe cada cosa, y qué reglas de seguridad son obligatorias.
  ¿Impacto? Sin este documento, cada integrante nuevo (o cada sesión con IA) tendría
            que adivinar estas reglas, con el riesgo real de que alguien instale una
            versión distinta de una librería, mezcle inglés y español sin criterio,
            o rompa una convención de diseño ya acordada.
-->

---

## Resumen

Este documento fija seis categorías de restricciones para VerdeApp: tecnología obligatoria, herramientas de desarrollo, diseño visual, idioma, contexto educativo y seguridad. A diferencia de una guía de estilo opcional, lo que está aquí **no se negocia tarea por tarea** — si algo necesita cambiar, se discute y se actualiza este documento primero, no se decide sobre la marcha en una sola PR.

---

## Tecnología Obligatoria

### Backend

| Tecnología   | Versión fijada  |
| ------------ | ---------------- |
| Python       | 3.12              |
| FastAPI      | 0.135.1           |
| SQLAlchemy   | 2.0.48 (ORM 2.0, no el estilo 1.x)|
| Alembic      | 1.18.4 (migraciones versionadas — nunca `Base.metadata.create_all()`)|
| Pydantic     | 2.12.5             |

No se permiten versiones sin fijar (`>=`, `~=`, sin versión) en `requirements.txt` — toda dependencia va con `==`, según la regla ya documentada ahí mismo.

### Frontend

| Tecnología      | Versión fijada |
| ---------------- | --------------- |
| React            | 19.2.4           |
| TypeScript       | 5.9.3 (modo estricto)|
| Vite             | 7.3.1             |
| TailwindCSS      | 4.1.18            |
| React Router     | 7.13.0            |

### Base de datos

PostgreSQL 17 (imagen `postgres:17-alpine`), corriendo en Docker. No se usa SQLite ni MySQL en ningún entorno, ni siquiera para pruebas locales.

---

## Herramientas de Desarrollo

- **Python**: entorno virtual (`.venv`), nunca instalar paquetes en el Python global de la máquina.
- **Node.js**: **pnpm** como único gestor de paquetes del frontend — no `npm install` ni `yarn add`. La versión de pnpm queda fijada en `packageManager` dentro de `package.json`.
- **Linting y formato backend**: `ruff` (lint + formato en una sola herramienta).
- **Linting y formato frontend**: `eslint` + `prettier`.
- **Testing**: `pytest` en el backend, `vitest` en el frontend — toda funcionalidad nueva debe llevar sus pruebas correspondientes antes de considerarse terminada.

---

## Diseño Visual

- Prohibidos los degradados (`gradient`) en la interfaz — colores sólidos únicamente.
- Tipografía exclusivamente sans-serif.
- Los botones de acción principal van alineados a la derecha en formularios y modales.
- Iconografía: únicamente `lucide-react` — no mezclar con otras librerías de íconos.
- El color de marca (`accent-*`) es el único acento de color permitido en componentes reutilizables; los colores por rol (sidebar, badges) viven centralizados en `fe/src/config/roleTheme.ts`, no repetidos por archivo.
- Todo componente nuevo debe soportar modo claro y modo oscuro (`dark:`) desde el primer commit — no se agrega como una tarea aparte después.

---

## Idioma

- **Código** (variables, funciones, nombres de archivo, rutas de API): en **inglés**.
- **Comentarios y documentación** (este documento incluido, los RFs, las HUs, los mensajes de commit descriptivos): en **español**.
- Los mensajes de error mostrados al usuario final: en español, sin importar el idioma del código que los genera.

---

## Contexto Educativo

- VerdeApp es un proyecto de formación del programa ADSO del SENA — las decisiones técnicas priorizan que el equipo aprenda buenas prácticas reales, no solo que "funcione".
- Versionamiento de API bajo el prefijo `/api/v1/` en todos los endpoints nuevos.
- El proyecto corre pensado para desarrollo local y sustentación (Docker Compose) — no hay todavía un entorno de producción real desplegado, y ninguna decisión debe asumir que lo hay.
- Los commits siguen la convención de [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, etc.), y todo cambio nuevo se hace en su propia rama partiendo de `develop` — nunca directo sobre `develop` o `main`.

---

## Seguridad

- Autenticación JWT sin estado (*stateless*), contraseñas con `bcrypt` — nunca en texto plano, ni en la base de datos ni en logs.
- Toda credencial (contraseñas de base de datos, `SECRET_KEY`, credenciales de correo) vive en `.env`, nunca en el código ni en el repositorio. `.env.example` es obligatorio y debe mantenerse con valores de ejemplo funcionales (no reales).
- CORS restringido explícitamente al dominio del frontend — nunca `allow_origins=["*"]`.
- Límite de intentos de inicio de sesión (rate limiting) para mitigar fuerza bruta.
- Ningún endpoint que modifique o consulte datos sensibles queda sin autenticación — cualquier excepción debe justificarse explícitamente en el código, como ya se documentó en el incidente de `admin.py` corregido en este proyecto.
