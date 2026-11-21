# Reporte de ejecución y defectos — VerdeApp

<!--
  ¿Qué? Reporte de la ejecución de pruebas del 20 de noviembre de 2026 y registro de los
        defectos del proyecto, cada uno con su severidad y su estado.
  ¿Para qué? Es la evidencia de «reporte de ejecución + defectos registrados con severidad y
            estado» que pide el comité (issue #678).
  ¿Impacto? Los defectos cerrados salen del historial real de PR del repositorio; las
            severidades son una propuesta que el equipo debe validar (sección 3.4).
-->

| Campo | Valor |
|---|---|
| **Fecha** | 20 de noviembre de 2026 |
| **Código probado** | Rama `develop`, commit `758d6bb` |
| **Issue** | #678 |
| **Documentos hermanos** | [Plan de pruebas](plan-de-pruebas.md) · [Informe de pruebas automatizadas](informe-pruebas-automatizadas.md) |

---

## 1. Reporte de ejecución

### 1.1 Resultado

| Capa | Ejecutadas | Pasaron | Fallaron | Omitidas | Cobertura de líneas |
|---|---|---|---|---|---|
| Backend (`pytest`) | 1012 | 1012 | 0 | 0 | 97.30 % |
| Frontend (`vitest`) | 1124 | 1123 | 0 | 1 | 89.41 % |
| E2E (`playwright`) | 2 | No se ejecutaron | — | — | — |
| **Total automatizadas** | **2136** | **2135** | **0** | **1** | |

Verificaciones estáticas: `ruff`, `tsc` y `eslint` sin errores. Los umbrales de cobertura se cumplieron en las dos capas (backend ≥ 97 %; frontend ≥ 89 % de líneas). El detalle por archivo y la tabla de 42 casos están en el [informe de pruebas automatizadas](informe-pruebas-automatizadas.md).

### 1.2 Comandos ejecutados

| Capa | Comando | Inicio – fin | Duración |
|---|---|---|---|
| Backend | `uv run pytest -v` (desde `be/`) | 20:14 – 20:27 | 12 min 5 s |
| Frontend | `npx vitest run --coverage` (desde `fe/`) | 20:27 – 20:36 | 9 min 18 s |
| Estáticas | `uv run ruff check .`, `npx tsc -b --noEmit`, `npx eslint .` | — | — |
| E2E | `pnpm test` (desde `e2e/`) | — | No se pudo correr (ver 1.3) |

### 1.3 Incidentes de la ejecución

| # | Qué pasó | Causa | Qué se hizo |
|---|---|---|---|
| I-1 | Una primera ejecución del backend dio **4 fallos y 27 errores** (`DeadlockDetected`). | Dos corridas de `pytest` se lanzaron por error al mismo tiempo y compartieron la base `verdeapp_test_db`. No fue un defecto del sistema. | Se detuvieron los procesos, se verificó que no quedaran conexiones abiertas a la base de pruebas y se repitió **una sola corrida**: 1012 de 1012 pasaron. Las cifras de este reporte son de la corrida limpia. |
| I-2 | Las 2 pruebas E2E **no arrancaron**. | `Playwright` no encontró el navegador Chromium en esta máquina (`browserType.launch: Executable doesn't exist`). Es un problema del ambiente, no del sistema. | No se instaló el navegador durante la ejecución. Queda pendiente correrlas con `pnpm exec playwright install chromium` y luego `pnpm test` desde `e2e/`. |

---

## 2. Escala de severidad y estados

Misma escala del [plan de pruebas](plan-de-pruebas.md), sección 8.

| Severidad | Cuándo se usa | Prioridad en el tablero |
|---|---|---|
| Crítica | Compromete cuentas o datos, o deja el sistema sin poder usarse. | P0 |
| Alta | Falla de seguridad, pérdida o daño de datos, o un flujo principal que se rompe. | P0 |
| Media | Falla funcional o de uso con una alternativa, o un incumplimiento de accesibilidad. | P1 |
| Baja | Detalle visual o de redacción sin efecto en el uso. | P2 |

**Estados:** Abierto · En corrección (rama y PR en revisión) · Cerrado (corregido, con su prueba, e integrado a `develop`).

---

## 3. Registro de defectos

### 3.1 Resumen

- **Defectos cerrados registrados: 35**, de los 105 PR de ramas `fix/` integrados a `develop` hasta hoy. Se eligieron 35 que corrigen un defecto real, repartidos por tipo y por severidad. Los demás PR `fix/` incluyen más correcciones del mismo tipo, además de refactorizaciones y ajustes de diseño; no se listan todos para que el registro sea legible.
- **Defectos abiertos: 1** (D-36, sección 3.3).
- Los **19 issues abiertos** en GitHub al día de hoy son tareas de funcionalidad, documentación, pruebas del bootcamp y mantenimiento; **ninguno** es un defecto, salvo el D-36, que **todavía no tiene issue**.

| Severidad | Cerrados | Abiertos |
|---|---|---|
| Crítica | 1 | 0 |
| Alta | 17 | 1 |
| Media | 14 | 0 |
| Baja | 3 | 0 |
| **Total** | **35** | **1** |

| Tipo | Cerrados |
|---|---|
| Seguridad | 14 |
| Funcional | 10 |
| Integridad de datos | 4 |
| Accesibilidad | 2 |
| Interfaz | 2 |
| Infraestructura | 1 |
| Configuración | 1 |
| Prueba intermitente | 1 |

### 3.2 Defectos cerrados

Ordenados por fecha de corrección. Cada fila enlaza al PR que lo corrigió e integró a `develop`.

| ID | PR | Fecha | Tipo | Capa | Defecto | Severidad | Estado |
|---|---|---|---|---|---|---|---|
| D-01 | [#77](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/77) | 2026-08-19 | Funcional | Frontend | La campana de notificaciones no actualizaba el contador al marcar una notificación como leída. | Baja | Cerrado |
| D-02 | [#91](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/91) | 2026-08-24 | Accesibilidad | Frontend | Los botones verdes y ámbar no cumplían el contraste WCAG AA (RNF-003). | Media | Cerrado |
| D-03 | [#100](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/100) | 2026-08-25 | Integridad de datos | Backend | El registro dejaba usuarios huérfanos, aceptaba contraseñas débiles y mostraba un éxito falso. | Alta | Cerrado |
| D-04 | [#101](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/101) | 2026-08-25 | Seguridad | Backend | La documentación interactiva (Swagger) seguía abierta en producción. | Media | Cerrado |
| D-05 | [#103](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/103) | 2026-08-25 | Accesibilidad | Frontend | El foco del teclado no quedaba dentro de los modales. | Media | Cerrado |
| D-06 | [#121](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/121) | 2026-08-27 | Seguridad | Backend y frontend | Vulnerabilidades y malas prácticas halladas en el informe de seguridad inicial. | Alta | Cerrado |
| D-07 | [#132](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/132) | 2026-08-28 | Funcional | Backend | Se podían repetir los avisos de SHUT lleno y de llegada del reciclador sin una ventana de espera. | Media | Cerrado |
| D-08 | [#133](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/133) | 2026-08-28 | Seguridad | Backend | No había bloqueo ante intentos de inicio de sesión repetidos; ahora la cuenta se bloquea 15 minutos tras 5 fallos. | Alta | Cerrado |
| D-09 | [#145](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/145) | 2026-08-31 | Infraestructura | Backend | El contenedor del backend corría como root y sin healthcheck. | Alta | Cerrado |
| D-10 | [#146](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/146) | 2026-08-31 | Seguridad | Backend | Las cuentas de prueba se sembraban en cualquier entorno; ahora solo con `ENVIRONMENT=development`. | Crítica | Cerrado |
| D-11 | [#152](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/152) | 2026-08-31 | Funcional | Backend | Subir fotos de evidencia de una auditoría bloqueaba el servidor. | Alta | Cerrado |
| D-12 | [#159](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/159) | 2026-09-01 | Funcional | Frontend | El enlace de la guía de RCD en el contenido educativo estaba roto. | Media | Cerrado |
| D-13 | [#190](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/190) | 2026-09-04 | Interfaz | Frontend | Los elementos clicables no mostraban el cursor de mano. | Baja | Cerrado |
| D-14 | [#257](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/257) | 2026-09-13 | Funcional | Frontend | Se podía registrar un residente sin torre o apartamento. | Media | Cerrado |
| D-15 | [#290](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/290) | 2026-09-16 | Funcional | Frontend | Cuatro páginas quedaban sin mostrar el error cuando fallaba la carga. | Media | Cerrado |
| D-16 | [#304](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/304) | 2026-09-17 | Funcional | Backend | `PATCH /me/locale` devolvía un nombre de usuario falso. | Media | Cerrado |
| D-17 | [#318](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/318) | 2026-09-23 | Seguridad | Backend | Las sesiones activas no se invalidaban al cambiar o restablecer la contraseña. | Alta | Cerrado |
| D-18 | [#321](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/321) | 2026-09-23 | Seguridad | Backend | Los logs del backend registraban tokens. | Alta | Cerrado |
| D-19 | [#322](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/322) | 2026-09-23 | Seguridad | Backend | Había endpoints sensibles sin límite de intentos. | Alta | Cerrado |
| D-20 | [#324](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/324) | 2026-09-23 | Seguridad | Backend | Aceptar la invitación de Administrador de Conjunto devolvía los tokens en el cuerpo de la respuesta. | Alta | Cerrado |
| D-21 | [#325](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/325) | 2026-09-23 | Seguridad | Backend | Las subidas no validaban el tamaño antes de leerlas y los enlaces no estaban restringidos. | Alta | Cerrado |
| D-22 | [#327](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/327) | 2026-09-24 | Prueba intermitente | Backend | La prueba del candado de 2 horas del Reciclador fallaba a veces sin que el código estuviera mal. | Media | Cerrado |
| D-23 | [#362](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/362) | 2026-09-30 | Integridad de datos | Backend | Al enviar contenido o novedades se aceptaban conjuntos repetidos y sin tope. | Media | Cerrado |
| D-24 | [#363](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/363) | 2026-09-30 | Seguridad | Backend | La rotación del refresh token no era atómica y los JWT no exigían `exp`, `type` y `jti`. | Alta | Cerrado |
| D-25 | [#384](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/384) | 2026-10-05 | Configuración | Backend | `ENVIRONMENT` era opcional: el backend podía arrancar en modo desarrollo por accidente. | Alta | Cerrado |
| D-26 | [#385](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/385) | 2026-10-05 | Seguridad | Backend | El login, el registro y la recuperación de contraseña revelaban qué correos existen, y los tokens de un solo uso no se guardaban con hash. | Alta | Cerrado |
| D-27 | [#387](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/387) | 2026-10-05 | Funcional | Frontend | Un inicio de sesión fallido mostraba el aviso de sesión expirada. | Baja | Cerrado |
| D-28 | [#407](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/407) | 2026-10-07 | Integridad de datos | Backend | Se perdía el NIT al editar un conjunto, y se aceptaban invitaciones que chocaban con otro administrador. | Alta | Cerrado |
| D-29 | [#411](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/411) | 2026-10-07 | Funcional | Backend | Error 500 al aceptar una invitación cuyo conjunto se asignó después. | Alta | Cerrado |
| D-30 | [#412](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/412) | 2026-10-07 | Seguridad | Backend | El conteo de intentos no se reiniciaba al vencer el bloqueo y los enlaces de recuperación anteriores seguían valiendo. | Media | Cerrado |
| D-31 | [#416](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/416) | 2026-10-07 | Seguridad | Frontend | Los enlaces y fotos del frontend no se revisaban y aceptaban rutas con `%2e` y `%2f`. | Alta | Cerrado |
| D-32 | [#423](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/423) | 2026-10-08 | Seguridad | Backend | Los documentos de `uploads` se servían sin política de seguridad y la cookie `refresh_token` tenía una ruta demasiado amplia. | Media | Cerrado |
| D-33 | [#468](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/468) | 2026-10-19 | Interfaz | Frontend | Mala adaptación a celular y tableta: menú, textos cortados y áreas táctiles menores a 44 px. | Media | Cerrado |
| D-34 | [#498](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/498) | 2026-10-22 | Funcional | Backend | Las semanas del Administrador del Sistema se cortaban en hora UTC y no en hora de Bogotá. | Media | Cerrado |
| D-35 | [#650](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/650) | 2026-11-12 | Integridad de datos | Backend | Una migración repetía el id de otra y rompía `alembic upgrade head` en una base nueva; se agregó una prueba de la cadena de migraciones. | Alta | Cerrado |

### 3.3 Defectos abiertos

| ID | Fecha en que se detectó | Tipo | Capa | Defecto | Severidad | Estado |
|---|---|---|---|---|---|---|
| D-36 | 1 de noviembre de 2026 | Funcional | Frontend | Al **quitar una foto de evidencia** en el formulario de auditoría del Reciclador, el formulario se rompe: las miniaturas se redibujan con la lista de vistas previas, que se recalcula un render después de actualizar la lista de fotos, y en ese render se lee el nombre de una foto que ya no existe (`alt={evidencias[i].name}` en `fe/src/components/AuditoriaConjuntoForm.tsx`). | Alta (propuesta) | Abierto |

**Cómo se detectó:** al escribir las pruebas del formulario, que dejaron la prueba «vuelve a deshabilitarse si se quita la única foto» en `it.skip`, con el comentario del defecto (`fe/src/__tests__/components/AuditoriaConjuntoForm.test.tsx`).

**Por qué es Alta:** el formulario de auditoría es el flujo principal del Reciclador, y quitar una foto es una acción normal (por ejemplo, para cambiarla por otra).

**Qué falta:** abrir el issue en GitHub (título con `fix:`, etiqueta `error`), corregirlo en una rama `fix/` y quitar el `skip` de la prueba, que ya describe el comportamiento esperado.

### 3.4 Alcance y límites de este registro

- Las severidades de la sección 3.2 son una **propuesta** hecha a partir de la descripción de cada corrección y de la escala de la sección 2. Deben ser **validadas por el equipo** antes de presentarlas.
- Los 35 defectos cerrados son una selección. El historial completo está en los PR de ramas `fix/` de [GitHub](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pulls?q=is%3Apr+is%3Amerged+head%3Afix%2F).
- GitHub tiene una etiqueta `error`, pero este registro **no depende de ella**: se armó desde el historial de PR integrados. Para llevarlo al día en GitHub bastaría con etiquetar con `error` los issues correspondientes.
- El seguimiento de defectos se hace con GitHub: issues, PR y el tablero del proyecto.
