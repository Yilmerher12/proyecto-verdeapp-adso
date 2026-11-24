# Informe semanal — Semana 01

| Campo | Valor |
|---|---|
| **Scrum Master** | Yilmer Hernández Camargo (@Yilmerher12) |
| **Fechas** | 11/10/2026 al 16/10/2026 |
| **Presentado al profesor** | 16/10/2026 |

> **Cómo se escribió:** los datos de tarjetas, ramas y PR salen del repositorio. Lo que dice cada integrante sobre sus dificultades y cómo se sintió es lo que comentó de forma verbal al Scrum Master; no son comentarios escritos por ellos. Donde no hubo información, se dice así.

## Resumen de la semana

Fue una semana de planeación y organización del trabajo en equipo. Se revisó el proyecto completo como si se usara con cada uno de los 4 roles, se documentó la forma de trabajo (Scrum Master rotativo, formato de issues y PR, regla de traspaso de tarjetas, método de prioridad y tamaño) y se crearon y asignaron las 6 tarjetas del siguiente bloque de mejoras (#434 a #439). También se actualizaron las dependencias del backend y se avanzó en el bootcamp de testing. Las tarjetas se asignaron el 12 de octubre y, al cierre de la semana, todavía no tenían rama ni PR.

## Trabajo por integrante

### Yilmer Hernández Camargo (@Yilmerher12) — Scrum Master

| Campo | Detalle |
|---|---|
| **Tarjeta o HU** | #446 — Actualizar a mano las dependencias del backend que Dependabot no pudo subir. Tipo: `chore`. Además #437 (investigación de gráficas), asignada y sin iniciar |
| **Rama y PR** | `chore/actualizar-dependencias-backend` — #447 |
| **Resultado** | #446: terminada. #437: sin iniciar |

- **Exploración:** revisó el proyecto corriéndolo en local con las 4 cuentas de prueba (Administrador del Sistema, de Conjunto, Reciclador y Residente), en escritorio y celular, y en modo claro y oscuro. Contrastó el código con lo que se ve en pantalla y dejó un informe de hallazgos por rol (menú móvil, aviso de auditoría, formato de fechas y nombres de "Novedades", entre otros).
- **Desarrollo:** documentó la forma de trabajo del equipo y creó las plantillas de issue y de PR (#432). Documentó la regla de traspaso semanal, el comentario de cierre y el método de prioridad y tamaño, conectado con la matriz de prioridad del profesor (#433). Redactó y creó las 6 tarjetas del siguiente bloque. Actualizó las dependencias del backend (#447).
- **Testing:** corrió las suites completas. Backend: 707 pruebas pasando con 96.80 % de cobertura. Frontend: 438 pruebas pasando (un archivo falló una vez por un error de lectura de archivo de Windows y pasó al correrlo solo, 24 de 24). `ruff`, `eslint` y `tsc` sin errores. También probó la API con las cuatro cuentas (permisos entre roles, límite de intentos de inicio de sesión y cookies).
- **Archivos que tocó:** `README.md`, `.github/` (plantillas), `docs/gestion-proyecto/` (prioridad y tamaño, informes) y las dependencias del backend en `be/`.
- **Dificultades:** entender la organización nueva, medir la complejidad de cada issue y, con eso, asignarlo a cada integrante.
- **Cómo se sintió:** agobiado por sentirse responsable de cada tarea, de organizar el repositorio y de aclarar todo a sus compañeros, y algo inconforme por no recibir respuestas ni resultados esa semana.

### Yordan Castro Guerrero (@yordancastrog7-pixel)

| Campo | Detalle |
|---|---|
| **Tarjeta o HU** | Asignadas: #434 — Mover la agenda del conjunto a una página propia, y #435 — Agenda: quitar "Dejar en espera", agregar Archivar y mejorar el diseño de las notas (depende de #434). Además: cambio de nombres de menú (`chore`) y el reto de la semana 1 del bootcamp de testing |
| **Rama y PR** | `chore/renombrar-novedades-verdeapp-y-comunicados` — #440 (fusionado el 14/10). `test/semana-01` — #448 (pruebas E2E de los flujos de inicio de sesión; se cerró el 16/10 sin fusionar porque no seguía lo acordado en el grupo para el reto) |
| **Resultado** | #434 y #435: sin iniciar. #440: terminada. #448: cerrada sin fusionar |

- **Exploración:** sin información sobre qué revisó antes de empezar. Según lo que comentó, no tuvo una idea clara de lo que le tocaba hacer.
- **Desarrollo:** renombró en los menús "Novedades" a "Novedades VerdeApp" y "Comunicados de mis Conjuntos" a "Comunicados" (#440).
- **Testing:** escribió las pruebas E2E del reto de la semana 1 (flujos de inicio de sesión, #448): 2 archivos de prueba y la configuración de Playwright. Ese PR se cerró sin fusionar; el reto de E2E de la semana entró por el PR #467 (fusionado el 19/10).
- **Archivos que tocó:** menú lateral y traducciones (#440); carpeta `e2e/` (#448).
- **Dificultades:** según lo que comentó, desconocimiento total del proceso nuevo (rol de Scrum Master, roles, asignaciones, discusiones y trabajo en equipo dentro del repositorio), poca flexibilidad del modo de trabajo acordado para retomar tarjetas y mucho cansancio.
- **Cómo se sintió:** muy bien con lo que hizo. Lo comprendió, lo explicó al grupo y el grupo lo aprobó.

### Juan Carlos Barajas (@Juanbarajas90)

| Campo | Detalle |
|---|---|
| **Tarjeta o HU** | #436 — Notificaciones por conjunto en el panel del Administrador de Conjunto |
| **Rama y PR** | Sin rama ni PR registrados esta semana |
| **Resultado** | Sin iniciar |

- **Exploración, desarrollo, testing y archivos:** sin actividad registrada en el repositorio. Participó en las discusiones del proyecto y aportó ideas, pero según lo que comentó no quiso interferir en el trabajo por no saber cómo hacerlo.
- **Dificultades:** según lo que comentó, mucho trabajo y problemas personales, no tenía un equipo para realizar las actividades, no entendía qué le tocaba hacer y no respondía a los mensajes.
- **Cómo se sintió:** perdido.

### José Guerrero (@josperaes-dotcom)

| Campo | Detalle |
|---|---|
| **Tarjeta o HU** | Sin tarjeta asignada en el tablero esta semana |
| **Rama y PR** | Sin rama ni PR registrados esta semana |
| **Resultado** | Sin actividad práctica |

- **Exploración, desarrollo, testing y archivos:** sin actividad registrada en el repositorio. Participó en las discusiones y reuniones sobre el proyecto y opinó, pero según lo que comentó no ha podido involucrarse en lo práctico.
- **Dificultades:** según lo que comentó, no tiene equipo y su trabajo le dificulta dedicar tiempo; no entiende qué le toca hacer.
- **Cómo se sintió:** perdido y algo indiferente.

## Tarjetas bloqueadas

| Tarjeta | Motivo del bloqueo | Qué la desbloquea |
|---|---|---|
| #435 — Agenda: archivar y rediseñar las notas | Usa la misma pantalla que #434 y conviene hacerla después | Que #434 se fusione |
| #438 — Investigación: reporte del historial de la agenda | Necesita que las notas se puedan archivar | Que #435 se fusione |

Ninguna está bloqueada por falta de información: son dependencias de orden.

## Para la próxima semana

- Empezar las tarjetas asignadas: #434 y #435 (Yordan), #436 (Juan Carlos) y #437 (Yilmer).
- Asignar #439 (documentos del Administrador de Conjunto, prioridad P0) y #438, y definir la tarjeta de José.
- Decidir con el equipo: cada cuánto se audita (la pantalla dice 7 días y el backend exige 24 horas), el nombre de "Escribir novedad" y si los hallazgos pequeños (menú móvil, aviso de auditoría, fechas) se atienden como `fix/`.
- Cada integrante deja su comentario de cierre en su issue (plantilla en `docs/gestion-proyecto/informes-scrum/_cierre-de-issue.md`).
