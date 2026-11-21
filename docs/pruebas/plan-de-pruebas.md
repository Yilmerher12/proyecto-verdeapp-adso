# Plan de pruebas — VerdeApp

<!--
  ¿Qué? Plan de pruebas del proyecto: qué se prueba, con qué niveles, en qué ambiente y
        cuándo se da una prueba por superada.
  ¿Para qué? Es la evidencia de planeación de pruebas que pide el comité (issue #678). Lo
            que ya se probó está en el informe de pruebas automatizadas y en el reporte de
            ejecución y defectos (misma carpeta).
  ¿Impacto? Solo documenta lo que existe en el repositorio; si un nivel, una herramienta o un
            umbral cambia, este documento se actualiza en la misma rama.
-->

| Campo | Valor |
|---|---|
| **Proyecto** | VerdeApp — plataforma de coordinación de reciclaje para conjuntos residenciales de Bogotá |
| **Versión del documento** | 1.0 |
| **Fecha** | 20 de noviembre de 2026 |
| **Issue** | #678 |
| **Documentos hermanos** | [Informe de pruebas automatizadas](informe-pruebas-automatizadas.md) · [Reporte de ejecución y defectos](reporte-ejecucion-y-defectos.md) |

---

## 1. Objetivo

Comprobar que VerdeApp cumple los requisitos funcionales (`docs/requisitos/RFs/`), las historias de usuario (`docs/requisitos/HUs/`) y los requisitos no funcionales (`docs/requisitos/RNFs/`) de sus cuatro roles (Administrador del Sistema, Administrador de Conjunto, Reciclador y Residente), y que un cambio nuevo no rompe lo que ya funcionaba (pruebas de regresión).

---

## 2. Alcance

### Está dentro del alcance

| Área | Qué se prueba |
|---|---|
| Autenticación y sesión | Registro, verificación de correo, inicio y cierre de sesión, renovación y rotación de tokens, bloqueo de cuenta por intentos fallidos, recuperación de contraseña. |
| Roles y permisos | Cada endpoint responde solo al rol que le corresponde (401 sin sesión, 403 con otro rol). |
| Operación del conjunto | Auditorías de separación de residuos, aviso de SHUT lleno o libre, notificaciones, agenda del conjunto, invitaciones y desvinculaciones. |
| Comunicación y contenido | Comunicados, novedades, contenido educativo (catálogo, envío manual, lecciones vistas, portada e imágenes). |
| Directorio | Puntos de acopio y ECA, con su paginación y sus fotos. |
| Archivos subidos | Validación de imágenes (contenido real, tamaño, píxeles, formatos), cuota por usuario y limpieza de adjuntos sin uso. |
| Base de datos | La cadena de migraciones de Alembic (un solo id por migración y una sola migración final). |
| Seguridad | Validación de enlaces e imágenes, límite de peticiones, que los logs no guarden tokens, y auditoría de dependencias. |
| Interfaz | Componentes, páginas y reglas de uso del frontend (formularios, mensajes de error, accesibilidad básica, i18n en español e inglés). |
| Calidad visual | Contraste, adaptación a celular y tableta, y navegadores (auditorías documentadas, ver el nivel 6). |

### Está fuera del alcance

- **Hardware e IoT** (cámaras y sensores en el SHUT): el proyecto lo declara fuera de alcance (`docs/gestion-proyecto/propuesta-tecnica.md`).
- **Pruebas de carga y de rendimiento:** no hay una herramienta ni un escenario definido; se corrigieron consultas lentas puntuales (por ejemplo las consultas N+1) sin una prueba de carga.
- **Pruebas con usuarios reales:** no están cubiertas por este plan.

---

## 3. Niveles de prueba

| # | Nivel | Qué verifica | Herramienta | Dónde vive | Cómo se corre |
|---|---|---|---|---|---|
| 1 | API e integración (backend) | Los endpoints contra una base de datos PostgreSQL real, con sus permisos, validaciones y reglas de negocio. | `pytest` + `httpx` (`TestClient` de FastAPI) | `be/app/tests/` | `uv run pytest` desde `be/` |
| 2 | Componentes y lógica (frontend) | Páginas, componentes, hooks y funciones de `lib/` en un navegador simulado. | `Vitest` + Testing Library + `jsdom` | `fe/src/__tests__/` | `pnpm test` desde `fe/` |
| 3 | De extremo a extremo (E2E) | Flujos completos en un navegador real, contra el frontend y el backend levantados. | `Playwright` (Chromium) | `e2e/tests/` | `pnpm test` desde `e2e/` |
| 4 | Estáticas | Errores de estilo, de tipos y de lint sin ejecutar el código. | `ruff`, `tsc`, `eslint` | `be/`, `fe/` | `uv run ruff check .`, `npx tsc -b --noEmit`, `pnpm lint` |
| 5 | Seguridad | Pruebas automáticas de seguridad (límite de peticiones, enlaces, logs) y auditoría de dependencias con vulnerabilidades conocidas. | `pytest`, `pip-audit`, `pnpm audit` | `be/app/tests/`, CI | CI en cada PR |
| 6 | Calidad visual y accesibilidad | Contraste (WCAG AA), pantallas medianas, tableta, adaptación a celular y navegadores, con revisión manual. Más una prueba automática que impide enlaces o botones sin identificar. | Revisión manual + `Vitest` (`elementosClicables.test.ts`) | `docs/gestion-proyecto/auditoria-rnf-003-*.md` | Manual por auditoría; la prueba automática corre con `pnpm test` |

**Tipos de caso que se escriben en cada nivel:** camino feliz, datos inválidos, valores límite (por ejemplo, 100 ids como máximo en una petición), permisos por rol (cada rol permitido y al menos uno prohibido) y seguridad (enlaces externos, rutas con `..`, reintentos).

**Regla de trabajo del equipo (`CLAUDE.md`):** toda funcionalidad nueva lleva sus pruebas antes de darse por terminada, y un defecto corregido deja una prueba que lo habría detectado.

---

## 4. Ambiente de pruebas

El ambiente de pruebas está separado del de desarrollo: una prueba nunca toca los datos con los que se trabaja a mano.

| Aspecto | Desarrollo | Pruebas |
|---|---|---|
| Base de datos | `verdeapp_db`, en el contenedor `verde_db` | `verdeapp_test_db`, otra base en la misma instancia de PostgreSQL |
| Cómo se arma | Migraciones de Alembic y `app.seed` | `pytest` crea las tablas al empezar la sesión y las borra al terminar (`create_all` y `drop_all`); cada prueba corre dentro de una transacción que se revierte al final |
| Datos | Cuentas de prueba, 6 módulos educativos, conjuntos y ECA reales (siembra) | Fixtures de `be/app/tests/conftest.py` (un usuario por rol y sus cabeceras de sesión) |
| Correo | Mailpit (`verde_mailpit`): captura los correos, no salen a internet | Con el `.env.example` (`SMTP_HOST` apunta a Mailpit) los correos de las pruebas quedan en Mailpit. En el CI no hay proveedor de correo configurado y `be/app/utils/email.py` solo registra que no se envió |
| CI (GitHub Actions) | No aplica | PostgreSQL 17 temporal en cada ejecución, con la misma base `verdeapp_test_db` y sus propias variables de entorno (la `SECRET_KEY` del CI no es una clave real) |
| E2E | Frontend, backend y base de desarrollo encendidos | Playwright levanta el frontend solo; usa las cuentas de prueba de `e2e/.env` |

Para producción, la variable `ENVIRONMENT` es obligatoria (el backend no arranca sin ella) y la siembra de cuentas de prueba solo corre en `development`.

**Preparación** (una sola vez; está en el README y en `CLAUDE.md`):

1. `docker compose up -d verde_db verde_mailpit`
2. `docker exec verde_db psql -U verde_user -d verdeapp_db -c "CREATE DATABASE verdeapp_test_db OWNER verde_user;"`
3. `uv sync` (backend) y `pnpm install` (frontend y e2e).

---

## 5. Criterios de entrada y de salida

**Para empezar a probar:** dependencias instaladas con sus versiones exactas (`uv.lock` y `pnpm-lock.yaml`), la base `verdeapp_test_db` creada y el servidor de correo de prueba encendido.

**Una prueba o un cambio se da por superado cuando se cumple todo esto:**

| Criterio | Umbral |
|---|---|
| Todas las pruebas pasan | 0 fallos |
| Cobertura del backend | ≥ 97 % de líneas (`fail_under` en `be/pyproject.toml`) |
| Cobertura del frontend | ≥ 89 % líneas, 87 % sentencias, 84 % ramas y 83 % funciones (`thresholds` en `fe/vite.config.ts`) |
| Estilo y tipos | `ruff`, `tsc` y `eslint` sin errores |
| Compilación | `pnpm build` termina sin errores |
| Dependencias | `pip-audit` y `pnpm audit` sin hallazgos nuevos |
| Revisión | El PR pasa el CI antes de integrarse a `develop`, y el paso de `develop` a `stg` y de `stg` a `main` pasa el mismo CI |

Los umbrales de cobertura **solo suben, nunca bajan**: al cerrar cada semana del bootcamp de testing se registra la cobertura real y el umbral de la semana siguiente es ese valor redondeado hacia abajo (`docs/matriz-rotacion.md`).

---

## 6. Herramientas y versiones

| Herramienta | Versión | Uso |
|---|---|---|
| `pytest` | 9.2.0 | Pruebas del backend |
| `pytest-cov` | 7.1.0 | Cobertura del backend |
| `pytest-asyncio` | 1.4.1.post1 | Pruebas asíncronas |
| `httpx` | 0.28.1 | Cliente HTTP de las pruebas de API |
| `ruff` | 0.17.4 | Estilo del backend |
| `Vitest` y `@vitest/coverage-v8` | 4.1.12 | Pruebas y cobertura del frontend |
| Testing Library (`react`, `user-event`, `jest-dom`) | 16.3.3 / 14.6.8 / 6.9.1 | Pruebas de componentes |
| `jsdom` | 28.1.0 | Navegador simulado |
| `@playwright/test` | 1.65.0 | Pruebas E2E |
| `pip-audit` | 2.10.1 | Auditoría de dependencias del backend |
| `pnpm audit` | incluido en pnpm | Auditoría de dependencias del frontend y de e2e |
| GitHub Actions | `.github/workflows/ci.yml` | Corre ruff, pytest, tsc, eslint, vitest, build y las auditorías en cada PR |

---

## 7. Responsables y calendario

- **Equipo:** cuatro integrantes. Cada semana de la rotación del bootcamp de testing uno prueba una capa distinta (Front, API, BD o E2E), y quien revisa el PR trabajó en otra capa esa semana. La matriz está en `docs/matriz-rotacion.md`.
- **Scrum Master rotativo:** hace seguimiento y deja los informes semanales (`docs/gestion-proyecto/informes-scrum/`).
- **Cobertura registrada por semana:** S1 (6 de octubre de 2026): frontend 78.2 %, backend 96.69 %. S2 (3 de noviembre): frontend 86.4 %, backend 97.17 %. S3 (10 de noviembre): frontend 89.36 %, backend 97.24 %.

---

## 8. Gestión de defectos

Un **defecto** es un comportamiento del sistema que no cumple un requisito o que daña la seguridad, la integridad de los datos o el uso. Se corrige en una rama `fix/` de una sola tarjeta, con su prueba de regresión, y se integra por PR.

**Severidad:**

| Severidad | Cuándo se usa | Prioridad en el tablero |
|---|---|---|
| Crítica | Compromete cuentas o datos, o deja el sistema sin poder usarse. | P0 |
| Alta | Falla de seguridad que expone cuentas o datos, pérdida o daño de datos, o un flujo principal que se rompe. | P0 |
| Media | Falla funcional o de uso con una alternativa, un incumplimiento de accesibilidad o un refuerzo de seguridad sin riesgo directo sobre cuentas o datos. | P1 |
| Baja | Detalle visual o de redacción sin efecto en el uso. | P2 |

**Estados:** Abierto, En corrección (rama y PR en revisión) y Cerrado (corregido, con su prueba, e integrado a `develop`).

El registro de los defectos corregidos y de los abiertos está en el [reporte de ejecución y defectos](reporte-ejecucion-y-defectos.md).

---

## 9. Riesgos y limitaciones conocidas

| Riesgo | Efecto | Qué se hace |
|---|---|---|
| Pocas pruebas E2E: hoy hay 2 flujos (login con credenciales incorrectas y panel del Residente con credenciales válidas), y no corren en el CI | Un fallo que solo aparece al juntar frontend, backend y base de datos puede pasar sin detectarse | Los flujos críticos se cubren a nivel de API y de componentes. La rotación del bootcamp contempla más E2E (issue #661) |
| El frontend tiene menos cobertura que el backend | Más lógica de pantalla sin probar | El umbral sube cada semana; la matriz de rotación lista los archivos con menos cobertura |
| Las pruebas del backend necesitan PostgreSQL | Si la base de pruebas no existe, toda la suite falla con `database "verdeapp_test_db" does not exist` | Está documentado en el README y en `CLAUDE.md`, y el CI crea la base solo |
| Pruebas intermitentes (por ejemplo, el candado de 2 horas del reciclador, corregida en el PR #327) | Falsos fallos que cuestan tiempo | Se corrigen como defecto, sin reintentos automáticos |
| Sin pruebas de carga | No se conoce el límite de usuarios simultáneos | Fuera del alcance de esta etapa |
| Alertas de dependencias ignoradas de forma temporal (por ejemplo `GHSA-fc5q-39xc-vjpf`, de `picomatch`) | Una vulnerabilidad conocida sin corregir | Está registrada y comentada en `fe/pnpm-workspace.yaml`; se revisa en cada actualización de dependencias |
