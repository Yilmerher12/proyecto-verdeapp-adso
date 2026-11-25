# Informe semanal — Semana 04

| Campo | Valor |
|---|---|
| **Scrum Master** | Yordan Castro Guerrero (@yordancastrog7-pixel) |
| **Fechas** | 11/11/2026 al 17/11/2026 |
| **Presentado al profesor** | Por confirmar |

## Resumen de la semana

La semana 4 del bootcamp de testing («Pruebas de API») quedó con pruebas en los cuatro ángulos del reto, todas integradas a `develop`: API de puntos de acopio (#676), contrato de API que consume el frontend (#669), seguridad y contrato de errores transversales (#658) y duplicados, relaciones y filtros (#695). Se agregaron 26 pruebas de API nuevas, cada ángulo con sus mutantes documentados, y la cobertura del backend quedó en 97.54 %. Una de ellas sacó un hallazgo que se corrigió: un error inesperado respondía 500 en texto plano y no en JSON.

Lo más importante a tener en cuenta: los PR se integraron después del cierre de la semana (entre el 20 y el 24 de noviembre), por revisiones cruzadas pendientes, y la tarjeta #657 no tuvo entrega de su responsable al cierre; la asumió el Scrum Master para no dejar un ángulo del reto sin cubrir.

## Trabajo por integrante

### Yilmer Hernández Camargo (@Yilmerher12)

| Campo | Detalle |
|---|---|
| **Tarjeta o HU** | #654 — Pruebas de API del recurso principal: puntos de acopio. Tipo: `tests` |
| **Rama y PR** | `test/semana-04-puntos-de-acopio-api` — #676 |
| **Resultado** | Terminada |

- **Exploración:** escogió el recurso principal «puntos de acopio» y los errores 401, 422 y 404.
- **Desarrollo:** no se modificó código de la aplicación; solo se agregaron pruebas.
- **Testing:** 4 pruebas nuevas: 401 al crear sin token, 422 al crear sin nombre, 404 al editar un punto inexistente y 422 cuando el id de la ruta no es un UUID. Tres verifican código, cuerpo y `Content-Type`. Documentó 4 mutantes, uno por prueba; en la revisión se repitieron y cada uno hace fallar su prueba. Hallazgo: el API tiene dos formatos de error (el 422 de validación con `detail` como lista y los errores de los servicios con `detail` como texto) y las pruebas fijan los dos; no hay ruptura de contrato.
- **Archivos que tocó:**
  - Backend: `be/app/tests/test_puntos_acopio.py`.
- **Dificultades:** el CI del frontend fallaba en todos los PR por la alerta de `pnpm audit` de `picomatch`; se resolvió en `develop` con el PR #677.
- **Cómo se sintió:** según su propio comentario: «Semana 04: muy bien, se comprendió a qué unidad estaba enfocada los tests (API), las partes de como se organizaba un test (AAA), diferencias sobre la semana 03 y 02 (componentes y pruebas unitarias) y me desenvolví de una gran manera al entender los retos del profe, al aplicarlos en el código del proyecto y al probarlos.»
- **Revisión e integración:** lo revisó Yordan (capa E2E) y se integró el 20/11/2026. El issue #654 se cerró sin comentario de cierre.

### Yordan Castro Guerrero (@yordancastrog7-pixel)

| Campo | Detalle |
|---|---|
| **Tarjeta o HU** | #655 — Pruebas transversales del API: seguridad y contrato de errores. Tipo: `tests`. Además #657 — Pruebas de API que dependen de los datos guardados: duplicados y relaciones, asumida en lugar de José |
| **Rama y PR** | `test/semana-04-e2e` — #658; `test/semana-04-bd-duplicados-y-filtros` — #695 |
| **Resultado** | Terminada |

- **Exploración:** revisó qué cubrían ya las pruebas existentes: los 6 puntos del API que responden 409 y los filtros de listados ya tenían prueba, así que las nuevas cubren bordes.
- **Desarrollo:** en el #658 se corrigió código de la aplicación: un manejador de errores inesperados en `be/app/main.py` que responde `500` con `{"detail": "Error interno del servidor."}`. En el #695 solo se agregaron pruebas.
- **Testing:**
  - #658: 9 pruebas transversales (todas las rutas piden credenciales salvo las públicas, token falso o vencido da 401, rol equivocado da 403, el caso autorizado da 200 y los errores no filtran información interna). 4 mutantes: quitar la comprobación del token, desactivar la comprobación de rol, quitar el manejador del 500 e invertir la comprobación de rol; cada uno hace fallar su prueba. Hallazgo corregido: un error inesperado respondía 500 en texto plano y no en JSON.
  - #695: 4 pruebas nuevas (el 409 al invitar con un conjunto ocupado y otro libre nombra solo al ocupado, ese 409 no deja invitaciones guardadas, los filtros `estado` y `prioridad` juntos en la bandeja de soporte, y el `total` con filtro y paginación) y 4 mutantes. Se anotó que, sin `estado`, la bandeja de soporte solo muestra lo pendiente.
  - Suite completa del backend: 1046 pruebas pasaron, cobertura 97.54 %.
- **Archivos que tocó:**
  - Backend: `be/app/tests/test_contrato_y_seguridad.py`, `be/app/main.py` y `be/app/tests/test_conflictos_y_filtros.py`.
- **Dificultades:**
  - La rama del #658 estaba 51 commits atrás de `develop`; al actualizarla, la base de pruebas pasó a un contenedor propio y hubo que agregar `TEST_DATABASE_URL` a `be/.env`.
  - Yilmer pidió cambios en el #658 el 17/11 (el caso autorizado y el 500 en JSON); se atendieron el 24/11.
  - Asumió una tarjeta que no era suya (#657), lo que le dio más carga esta semana.
- **Cómo se sintió:** carga de trabajo alta: asumió la tarjeta #657 además de la propia, y atender los cambios pedidos en el #658 implicó actualizar la rama (estaba 51 commits atrás de `develop`) y la configuración de las pruebas. Además de escribir las pruebas, como Scrum Master le tocó coordinar las revisiones cruzadas.
- **Revisión e integración:** el #658 lo revisó Yilmer (capa API). El #695 lo revisó el propio Scrum Master por acuerdo del equipo para ahorrar tiempo, así que no fue una revisión independiente; se integró el 24/11/2026.

### Juan Carlos Barajas (@Juanbarajas90)

| Campo | Detalle |
|---|---|
| **Tarjeta o HU** | #656 — Pruebas del contrato de API que consume el frontend. Tipo: `tests` |
| **Rama y PR** | `test/semana-04` — #669 |
| **Resultado** | Terminada |

- **Exploración:** escogió el contrato que lee el frontend: `/users/me`, los errores de autenticación y el idioma.
- **Desarrollo:** no se modificó código de la aplicación; solo se agregaron pruebas.
- **Testing:** 9 pruebas nuevas y un mutante documentado (borrar `"nombre_localidad": None` de `obtener_perfil`), que hace fallar 2 pruebas. En su cierre reportó 994 pruebas pasando y 97.42 % de cobertura del backend. Hallazgo: el tipo `UserResponse` del frontend (`fe/src/types/auth.ts`) declara `is_active` y `perfil`, que `GET /users/me` no envía; quedó fuera de alcance, para un issue aparte.
- **Archivos que tocó:**
  - Backend: `be/app/tests/test_contrato_api_frontend.py`.
- **Dificultades:** el paso `pip-audit` del CI falló por la versión de `dnspython` (CVE-2026-128089), sin relación con su PR; se resolvió en `develop`.
- **Cómo se sintió:** no reportado.
- **Revisión e integración:** su comentario de cierre se publicó el 14/11/2026 y dejó las horas sin llenar. Su revisión estaba pedida a Yilmer (capa API) y el PR se integró el 23/11/2026.

### José Guerrero (@josperaes-dotcom)

| Campo | Detalle |
|---|---|
| **Tarjeta o HU** | #657 — Pruebas de API que dependen de los datos guardados: duplicados y relaciones. Tipo: `tests` |
| **Rama y PR** | Sin rama ni PR al cierre de la semana |
| **Resultado** | No entregada; la asumió el Scrum Master (ver el trabajo de Yordan arriba, PR #695) |

- **Exploración:** sin registro.
- **Desarrollo:** sin registro.
- **Testing:** sin registro.
- **Archivos que tocó:** ninguno.
- **Dificultades:** no reportadas.
- **Cómo se sintió:** no reportado.

## Tarjetas bloqueadas

Ninguna al cierre de este informe. La #657 estuvo sin entrega y se resolvió asumiéndola el Scrum Master (PR #695).

## Cobertura al cierre de la semana

| Capa | Cobertura de líneas | Umbral configurado | Piso del bootcamp |
|---|---|---|---|
| Backend | 97.54 % (24/11/2026, con los PR de la semana integrados) | `fail_under` = 97 (sin cambio) | 50 % |
| Frontend | 89.41 % (medido el 20/11/2026; esta semana no hubo pruebas de frontend) | 89 / 87 / 84 / 83 (sin cambio) | 50 % |

## Para la próxima semana

- Semana 5 («Dobles de prueba», piso de cobertura 60 %): las tarjetas #659 (BD), #660 (API), #661 (E2E) y #662 (Front). Al día de hoy, #660 y #662 están integradas (PR #663 y #696); la #659 tiene una rama de Yilmer en curso y la #661 no tiene rama.
- El hallazgo del tipo `UserResponse` del frontend (Juan) queda para un issue aparte.
- Riesgos o dudas para consultarle al profesor:
  - Las revisiones cruzadas de los PR de esta semana tardaron varios días y los PR se integraron fuera de la semana.
  - En el #695 la revisión la hizo el autor por acuerdo del equipo; el reto pide revisión de otra capa.
  - Una respuesta 500 sigue sin cabeceras CORS (las agrega un middleware que ese error se salta).
