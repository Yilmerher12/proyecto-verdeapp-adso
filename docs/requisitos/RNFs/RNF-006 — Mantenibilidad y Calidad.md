# RNF-006 — Mantenibilidad y Calidad

<!--
  ¿Qué? Este archivo antes se llamaba "Backend y Frontend" y solo listaba qué
        tecnología usábamos (FastAPI, React, Docker, Nginx) — eso no es un
        requisito no funcional real, es una restricción técnica, y ya vive
        documentada en docs/requisitos/restricciones.md. Se reemplaza por una
        categoría real de calidad que el repositorio de referencia sí exige y
        que a nosotros nos faltaba: Mantenibilidad y Calidad.
  ¿Para qué? Que el código siga siendo entendible y seguro de modificar a
             medida que crece el proyecto y cambia de manos entre el equipo.
  ¿Impacto? Sin esto documentado, la calidad del código queda a criterio de
            cada persona en cada tarea, en vez de a un estándar compartido.
-->

---

## Identificación

| Campo         | Valor                      |
| ------------- | ---------------------------- |
| **ID**        | RNF-006                       |
| **Nombre**    | Mantenibilidad y Calidad       |
| **Categoría** | Mantenibilidad y Calidad        |
| **Prioridad** | Alta                             |
| **Estado**    | Parcialmente implementado         |

---

## Requisitos

### RNF-006.1 — Comentarios explicando el porqué, no solo el qué

El código del backend debe documentar sus decisiones con comentarios que expliquen qué hace cada pieza, para qué existe, y qué pasaría si no estuviera — no solo repetir en palabras lo que el código ya dice. Verificado: es un patrón consistente en casi todo el backend.

### RNF-006.2 — Linting y formato automatizado

El backend usa `ruff` (lint + formato) y el frontend usa `eslint` + `prettier`. Todo código nuevo debe pasar estas herramientas sin errores antes de mezclarse a `develop`.

> **Nota (2026-08-28)**: ahora esto se verifica automáticamente — `.github/workflows/ci.yml` corre `ruff`/`pytest` (backend) y `tsc`/`eslint`/`vitest` (frontend) en cada Pull Request. Antes solo existía `close-prs.yml` (que ni siquiera corre estas herramientas, solo cierra PRs externos).

### RNF-006.3 — Cobertura de pruebas automatizadas

Cada router del backend con lógica de negocio real (permisos, invitaciones, notificaciones) debe tener sus propias pruebas.

> **Estado real (2026-08-28)**: backend con 233 tests en 13 archivos (creció de los 10 archivos originales), frontend con 167 tests en 24 archivos — **incluyendo ya los 4 dashboards por rol** (`ResidenteDashboard.test.tsx`, `RecicladorDashboard.test.tsx`, `AdminDashboard.test.tsx`, `AdminConjuntoDashboard.test.tsx`), que antes faltaban. Lo que decía "Pendiente" aquí ya no aplica.

### RNF-006.4 — Control de versiones del esquema de base de datos

Todo cambio a las tablas de la base de datos debe pasar por una migración versionada de Alembic — nunca se modifica el esquema a mano ni se regenera con `create_all()`.

### RNF-006.5 — Dependencias con versión exacta

Todas las dependencias (backend con `uv`/`pyproject.toml`, frontend con `pnpm`/`package.json`) deben fijarse con una versión exacta, nunca con rangos abiertos — así toda persona del equipo instala exactamente lo mismo.

> **Nota (2026-08-28)**: casi se cumple al 100% — la única excepción encontrada es `fe/package.json`: `"@headlessui/react": "^2.2.10"` usa un rango abierto (`^`), no una versión exacta. Es la razón por la que el Estado general de este RNF sigue en "Parcial" y no "Implementado", pese a que 006.1 a 006.4 y 006.6 ya cumplen del todo.

### RNF-006.6 — Historial de cambios trazable

Todo cambio se hace en su propia rama partiendo de `develop`, con mensajes de commit siguiendo [Conventional Commits](https://www.conventionalcommits.org/), y se integra mediante Pull Request — nunca directo sobre `develop` o `main`.
