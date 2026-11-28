# Informe semanal — Semana 05

| Campo | Valor |
|---|---|
| **Scrum Master** | Yordan Castro Guerrero (@yordancastrog7-pixel) |
| **Fechas** | 18/11/2026 al 24/11/2026 |
| **Presentado al profesor** | Por confirmar |

## Resumen de la semana

La semana 5 del bootcamp de testing («Dobles de prueba») quedó con pruebas en los cuatro ángulos del reto, todas integradas a `develop`: BD con la sesión de base de datos simulada (#692), API con dobles del correo de invitación a recicladores (#663), Front con MSW sobre el cliente HTTP de autenticación (#696) y E2E con `page.route` (#714). Se agregaron 21 pruebas nuevas: 3 de BD, 3 de API, 12 de Front y 3 de E2E.

Lo más importante a tener en cuenta: la tarjeta #661 (E2E) no tuvo entrega de su responsable, Juan Carlos, y la entregó Yilmer en el PR #714. Los PR #663, #692 y #696 se integraron entre el 23 y el 25 de noviembre, y el #714 después, ya fuera de la semana.

## Trabajo por integrante

### Yilmer Hernández Camargo (@Yilmerher12)

| Campo | Detalle |
|---|---|
| **Tarjeta o HU** | #659 — Pruebas con dobles: un servicio no guarda datos inválidos (capa BD). Tipo: `tests`. Además #661 — pruebas E2E con `page.route`, entregada en lugar de Juan Carlos |
| **Rama y PR** | `test/semana-05-bd-comunicado-service` — #692; `test/semana-05-e2e-page-route` — #714 |
| **Resultado** | Terminada |

- **Exploración:** escogió el servicio `crear_comunicado` y, para el E2E, los fallos del login que son difíciles de provocar con el backend real.
- **Desarrollo:** no se modificó código de la aplicación; solo se agregaron pruebas.
- **Testing:**
  - #692: 3 pruebas de `crear_comunicado` con la sesión de base de datos reemplazada por un doble (403 sin vínculo, 400 sin fecha en Convocatoria y guardado correcto con expiración de 48 horas). Tipo de doble anotado por prueba, una de estado y una de comportamiento. 3 mutantes, cada uno detectado por su prueba.
  - #714: 3 pruebas E2E del login con `page.route` (servidor caído, error 500 y límite de peticiones 429) y 2 mutantes. En la revisión se repitieron las pruebas (3 pasan) y 3 mutantes nuevos, cada uno detectado.
- **Archivos que tocó:** `be/app/tests/` (pruebas de `crear_comunicado`) y `e2e/tests/login-estados-dificiles.spec.js`.
- **Dificultades:** dijo que se le complicó reemplazar las dependencias de cualquier unidad (no solo las de `Depends()`), porque le tocó una función larga del servicio y la sintaxis de Python no ayudaba (viene de Java), pero lo logró. Reportó además un hallazgo del E2E: un 500 real del backend no trae `detail`, así que la pantalla muestra «Request failed with status code 500» (técnico y en inglés). No se corrigió porque el issue prohíbe tocar el frontend; queda para un issue aparte. Sobre el #692 reportó que con un doble no se puede ver ninguna restricción de la base de datos, y eso se prueba en la semana 6.
- **Cómo se sintió:** según su comentario, con lo aprendido en la semana 4 (simular dependencias con `dependency_overrides`) el concepto no se le complicó y entendió los diferentes tipos de dobles. Reportó unas 8 horas de las 10 de la semana en el #659 y unas 2 en el #661.
- **Revisión e integración:** el #692 se integró el 25/11/2026. El #714 lo revisó y lo integró Yordan (capa API).

### Yordan Castro Guerrero (@yordancastrog7-pixel)

| Campo | Detalle |
|---|---|
| **Tarjeta o HU** | #660 — Pruebas con dobles del envío de correos, inventario de dependencias y umbral del 60 %. Tipo: `tests` |
| **Rama y PR** | `test/semana-05-api` — #663; `test/semana-05-umbrales` — #715 (umbrales) |
| **Resultado** | Terminada |

- **Exploración:** vio que los correos de recuperar contraseña, verificación e invitar administrador ya tenían pruebas con dobles, y que el correo de invitación a recicladores no tenía ninguna.
- **Desarrollo:** no se modificó código de la aplicación; solo se agregaron pruebas.
- **Testing:** 3 pruebas con dobles del correo de invitación a recicladores: un espía comprueba que se envía una vez con el correo del reciclador y el nombre del conjunto, otro espía comprueba que una segunda invitación pendiente no manda otro correo, y un stub que falla comprueba que la invitación igual queda guardada. 3 mutantes, cada uno detectado. Revisó el #714 corriéndolo y rompiendo el código a propósito.
- **Archivos que tocó:** `be/app/tests/test_correo_invitacion_reciclador.py`.
- **Dificultades:**
  - La tabla de señales de exceso de mocks de la teoría no era fácil de explicar al grupo; se simplificó a una pregunta: ¿el test prueba algo real o solo el doble?
  - Las revisiones cruzadas tardaron varios días.
  - El PR de umbrales (#715) se abrió primero hacia `main` y sin el cambio guardado en un commit; se corrigió la base a `develop` y se hizo el commit.
  - El CI del frontend falló en el #715 porque las funciones dieron 83.97 % y el umbral estaba en 84 (84.03 % en un equipo local). Se dejó el umbral de funciones en 83.
- **Cómo se sintió:** carga de trabajo alta por sumar, a las pruebas, el cierre de la semana (inventario de dependencias, revisión de mocks, medición de cobertura y el PR de umbrales). Lo más exigente fue entender cómo se miden los umbrales de cobertura y por qué el CI da una décima distinta que el equipo local.
- **Revisión e integración:** el #663 lo revisó Yilmer y se integró el 23/11/2026. En el PR dejó el inventario de dependencias externas y la revisión de exceso de mocks del primer test. El PR de umbrales (#715) se abrió al cierre de la semana.

### Juan Carlos Barajas (@Juanbarajas90)

| Campo | Detalle |
|---|---|
| **Tarjeta o HU** | #661 — Pruebas E2E de estados difíciles con `page.route`. Tipo: `tests` |
| **Rama y PR** | Sin PR propio. Entregada por Yilmer (#714) |
| **Resultado** | Terminada por otro integrante |

- **Exploración, desarrollo, testing y archivos:** sin actividad registrada a su nombre en el repositorio; ver el trabajo de Yilmer.
- **Dificultades:** según su comentario, a veces se desubica dentro de GitHub y siente que debe practicar más para ganar experiencia. El comentario de cierre de la tarjeta, publicado desde la cuenta de Yilmer, indica que no hubo bloqueo técnico y que la tarjeta se empezó tarde.
- **Cómo se sintió:** bien, según su comentario.

### José Guerrero (@josperaes-dotcom)

| Campo | Detalle |
|---|---|
| **Tarjeta o HU** | #662 — Pruebas del cliente HTTP del frontend con MSW. Tipo: `tests` |
| **Rama y PR** | `test/semana-05-front-msw` — #696 |
| **Resultado** | Terminada |

- **Exploración:** escogió `fe/src/api/auth.ts`, el archivo del frontend con menos cobertura.
- **Desarrollo:** no se modificó el cliente HTTP ni las pantallas. Se instaló `msw` 3.0.7 como dependencia de desarrollo, con versión exacta.
- **Testing:** 12 pruebas con MSW en `fe/src/__tests__/api/auth.msw.test.ts`: caso feliz, error 500, error 422, respuesta que no es JSON, y que cada función que hace un POST le pega a la ruta correcta con el cuerpo esperado. Tipo de doble: stub de red.
- **Archivos que tocó:** `fe/src/__tests__/api/auth.msw.test.ts`, `fe/package.json` y `fe/pnpm-lock.yaml`.
- **Dificultades:** no reportadas. No dejó comentario de cierre en el issue #662.
- **Cómo se sintió:** no reportado.
- **Revisión e integración:** se integró el 24/11/2026. El PR cierra el #662.

## Tarjetas bloqueadas

Ninguna al cierre de este informe. La #661 no tuvo entrega de su responsable y la resolvió Yilmer en el #714.

## Cobertura al cierre de la semana

| Capa | Cobertura de líneas | Umbral configurado | Piso del bootcamp |
|---|---|---|---|
| Backend | 97.56 % (28/11/2026, 1049 pruebas en verde) | `fail_under` = 97 (sin cambio) | 60 % |
| Frontend | 89.91 % de líneas; sentencias 88.11, ramas 84.71 y funciones 83.97 en el CI (28/11/2026, 1140 pruebas en verde) | 89 / 88 / 84 / 83 (sube el de sentencias, de 87 a 88; PR #715) | 60 % |

## Para la próxima semana

- Semana 6 («Integración con BD»): las capas ya están asignadas en la matriz (Yilmer Front, Yordan BD, Juan Carlos API, José E2E).
- El hallazgo del 500 que se ve en inglés en la pantalla de login (Yilmer) queda para un issue aparte.
- Riesgos o dudas para consultarle al profesor:
  - Las revisiones cruzadas tardaron varios días y algunos PR se integraron después del cierre de la semana.
  - Una tarjeta (#661) la entregó otro integrante y no hay forma de evaluar el aporte individual de su responsable.
