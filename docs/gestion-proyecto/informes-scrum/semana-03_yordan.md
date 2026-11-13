# Informe semanal — Semana 03

| Campo | Valor |
|---|---|
| **Scrum Master** | Yordan Castro Guerrero (@yordancastrog7-pixel) |
| **Fechas** | octubre/2026 a octubre 2026 |
| **Presentado al profesor** | Erick Granados |

## Resumen de la semana

Los tres componentes de la semana 3 del bootcamp de testing quedaron con pruebas y los umbrales de cobertura subieron: frontend 89 / 87 / 84 / 83 (líneas, sentencias, ramas y funciones) y backend 97. De las cuatro tarjetas, dos las trabajaron sus responsables (Yordan y Yilmer) y las otras dos se reasignaron: Juan Carlos no pudo avanzar porque no le corría el backend, y José no tuvo actividad ni respondió al grupo durante la semana. Yilmer hizo la tarjeta de Juan Carlos y Yordan la de José. Lo más importante fue medir la cobertura real sobre `develop` con todos los PR fusionados: frontend 89.36 % de líneas con 1062 pruebas en verde y backend 97.24 % con 981 pruebas en verde.

## Trabajo por integrante

### Yordan Castro Guerrero (@yordancastrog7-pixel)

| Campo | Detalle |
|---|---|
| **Tarjeta o HU** | #610 — Pruebas de componente de LoginPage. Tipo: `tests`. Además #613 (tests y umbrales), asumida en lugar de José |
| **Rama y PR** | `test/semana-03-login-page` — #614; `test/semana-03-invitar-admin-form` — #631; `test/semana-03-umbrales` — #639 |
| **Resultado** | Terminada |

- **Exploración:** leyó el reto de la semana 3 del bootcamp y escogió, de la tabla de la matriz de rotación, los componentes con menos cobertura de líneas. Revisó qué cubrían ya las pruebas existentes para no repetirlas.
- **Desarrollo:** no se modificó código de la aplicación. Solo se agregaron pruebas nuevas en archivos aparte y se subieron los umbrales de cobertura.
- **Testing:** 8 pruebas nuevas de LoginPage (cobertura de líneas de 69.2 % a 92.3 %) y 6 de InvitarAdminConjuntoForm (de 52.3 % a 93.18 %). Cada prueba clave se verificó rompiendo el código a propósito (5 mutantes, todos detectados). Revisó los PR #637 y #638 de Yilmer corriéndolos y rompiendo el código (6 mutantes, todos detectados) y los aprobó.
- **Archivos que tocó:**
  - Frontend: `fe/src/__tests__/pages/LoginPage.estados.test.tsx`, `fe/src/__tests__/components/InvitarAdminConjuntoForm.test.tsx` y `fe/vite.config.ts`.
  - Backend: `be/pyproject.toml`.
- **Dificultades:**
  - La suite completa del frontend falla por tiempo en su equipo cuando corre con todos los procesos; con 2 procesos (`--maxWorkers=2`) pasa completa.
  - La lista desplegable de conjuntos oculta el resto de la página a las consultas de Testing Library mientras está abierta; hay que cerrarla con Escape antes de pulsar el botón de enviar.
  - Asumió una tarjeta que no era suya, lo que le dio más carga esta semana.
- **Cómo se sintió:** carga de trabajo alta por asumir la tarjeta #613 además de la propia; lo más exigente fue entender a fondo los tests de componentes y verificarlos con mutantes.

### Yilmer Hernández Camargo (@Yilmerher12)

| Campo | Detalle |
|---|---|
| **Tarjeta o HU** | #611 — Pruebas de componente de ProfilePage. Tipo: `tests`. Además #612, asumida en lugar de Juan Carlos |
| **Rama y PR** | `test/pruebas-componente-perfil` — #637; `test/pruebas-aceptar-invitacion` — #638 |
| **Resultado** | Terminada |

- **Exploración:** leyó cada componente y sus reglas, que no son solo condiciones sino reacciones a lo que hace la persona usuaria, y siguió los criterios del profesor para escoger los casos que valía la pena probar.
- **Desarrollo:** escribió pruebas que verifican, en ProfilePage, que aparece una advertencia si el teléfono tiene menos de 7 dígitos, que se muestra el texto de carga mientras llegan los datos, que se muestra un aviso si la foto pesa más de 5 MB y que el formulario se cierra al pulsar Cancelar. En AceptarInvitacionPage, que aparece el mensaje de verificación mientras se esperan los datos, que no se muestra el formulario si el enlace venció, que se crea la cuenta con datos válidos y que se muestra un error cuando el servidor rechaza el envío.
- **Testing:** 4 pruebas nuevas de ProfilePage (estado de carga, teléfono de menos de 7 dígitos, foto de más de 5 MB y cancelar la edición) y 5 de AceptarInvitacionPage (carga, enlace inválido, creación exitosa con el payload correcto, error del servidor y contraseñas distintas). Yordan las ejecutó y rompió el código a propósito: 6 mutantes, todos detectados.
- **Archivos que tocó:** `fe/src/__tests__/pages/ProfilePage.test.tsx` y `fe/src/__tests__/pages/AceptarInvitacionPage.test.tsx`.
- **Dificultades:** no entendía cómo simular (mockear) partes del proyecto que los componentes necesitan, como el usuario autenticado y los hooks (`useState` y similares), ni algunas cosas de JavaScript.
- **Cómo se sintió:** carga algo pesada por tener que responsabilizarse del trabajo de un compañero. Según él, esto afectó el proceso de aprendizaje que llevaba, porque no pudo completarlo.

### Juan Carlos Barajas (@Juanbarajas90)

| Campo | Detalle |
|---|---|
| **Tarjeta o HU** | #612 — Pruebas de componente de AceptarInvitacionPage. Tipo: `tests` |
| **Rama y PR** | Sin rama ni PR. Reasignada a Yilmer (#638) |
| **Resultado** | Bloqueada |

- **Exploración, desarrollo, testing y archivos:** sin actividad registrada en el repositorio al 10/11/2026.
- **Dificultades:** el backend no le corría en su equipo y por eso no fue posible realizar las pruebas.
- **Cómo se sintió:** sin información.

### José Guerrero (@josperaes-dotcom)

| Campo | Detalle |
|---|---|
| **Tarjeta o HU** | #613 — Pruebas de InvitarAdminConjuntoForm y umbral del backend. Tipo: `tests` |
| **Rama y PR** | Sin rama ni PR. Reasignada a Yordan (#631 y #639) |
| **Resultado** | Bloqueada |

- **Exploración, desarrollo, testing y archivos:** sin actividad registrada en el repositorio al 10/11/2026.
- **Dificultades:** no respondió al grupo durante la semana, por lo que no se conoce el motivo.
- **Cómo se sintió:** sin información.

## Tarjetas bloqueadas

| Tarjeta | Motivo del bloqueo | Qué la desbloquea |
|---|---|---|
| #612 — AceptarInvitacionPage | El backend no le corría al responsable original (Juan Carlos) y no pudo hacer las pruebas | Resuelta: Yilmer la hizo en el PR #638 |
| #613 — InvitarAdminConjuntoForm y umbrales | Sin actividad ni respuesta del responsable original (José) | Resuelta: Yordan la hizo en los PR #631 y #639 |

## Para la próxima semana

- Capa de la semana 4 según la matriz de rotación: API (pruebas de API: estados, validación y errores).
- Acordar con el grupo cómo avisar a tiempo cuando alguien no pueda con su tarjeta, para no repartirla al final de la semana.
- Para consultarle al profesor: cómo se evalúa el aporte individual cuando una tarjeta la hace otra persona por acuerdo del grupo, y qué pasa con quienes no participan.
