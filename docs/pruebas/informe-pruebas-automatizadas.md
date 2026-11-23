# Informe de pruebas automatizadas — VerdeApp

<!--
  ¿Qué? Resultado de una ejecución real de las suites automatizadas del proyecto (backend y
        frontend), con el detalle por capa y una tabla de casos distintos.
  ¿Para qué? Es la evidencia del informe de pruebas unitarias automatizadas que pide el comité
            (criterio de al menos 20 casos distintos, issue #678). El plan que explica qué se
            prueba y cómo está en `plan-de-pruebas.md`.
  ¿Impacto? Todas las cifras salen de la ejecución del 20 de noviembre de 2026 (comandos al
            final). Si se vuelve a ejecutar, las cifras cambian y este documento se actualiza.
-->

| Campo | Valor |
|---|---|
| **Fecha de la ejecución** | 20 de noviembre de 2026, de 20:14 a 20:36 |
| **Código probado** | Rama `develop` en el commit `758d6bb` (la rama de este documento no cambia código de la aplicación) |
| **Issue** | #678 |
| **Documentos hermanos** | [Plan de pruebas](plan-de-pruebas.md) · [Reporte de ejecución y defectos](reporte-ejecucion-y-defectos.md) |

---

## 1. Resumen

| Capa | Pruebas | Pasaron | Fallaron | Omitidas | Cobertura | Umbral | Duración |
|---|---|---|---|---|---|---|---|
| Backend (`pytest`) | 1012 | 1012 | 0 | 0 | 97.30 % de líneas | ≥ 97 % | 12 min 5 s |
| Frontend (`vitest`) | 1124 | 1123 | 0 | 1 | 89.41 % de líneas | ≥ 89 % | 9 min 18 s |
| E2E (`playwright`) | 2 | 2 | 0 | 0 | — | — | 21 s (ver sección 6) |

| Verificación estática | Resultado |
|---|---|
| `ruff check .` (backend) | Sin errores |
| `tsc -b --noEmit` (frontend) | Sin errores |
| `eslint .` (frontend) | Sin errores |

**En total: 2138 pruebas automatizadas ejecutadas (1012 + 1124 + 2), 2137 pasaron, 0 fallaron y 1 quedó omitida a propósito** por un defecto conocido (sección 5). La cobertura cumple los umbrales de las dos capas.

La tabla de la sección 4 lista **42 casos distintos** elegidos del código real, con el requisito o la historia de usuario a la que responden.

---

## 2. Entorno de la ejecución

| Elemento | Versión |
|---|---|
| Sistema operativo | Windows 11 (10.0.26200) |
| Python / `uv` | 3.12.14 / 0.12.5 |
| Node.js / `pnpm` | 24.16.0 / 11.6.0 |
| PostgreSQL (contenedor `verde_db`, Docker 29.5.3) | 17.11 |
| `pytest` / `Vitest` | 9.2.0 / 4.1.12 |
| Base de datos de las pruebas del backend | `verdeapp_test_db` (separada de la de desarrollo `verdeapp_db`) |

---

## 3. Resultados por capa

### 3.1 Backend: 1012 pruebas en 39 archivos

Todas pasaron. Cobertura total de líneas: **97.30 %** (el umbral `fail_under` es 97). Las pruebas son de API e integración contra PostgreSQL real, con una transacción que se revierte al final de cada prueba.

| Archivo de pruebas (`be/app/tests/`) | Pruebas |
|---|---|
| `test_auth.py` | 129 |
| `test_auditoria_conjunto.py` | 100 |
| `test_agenda_conjunto.py` | 76 |
| `test_novedad_enviada.py` | 67 |
| `test_novedades.py` | 52 |
| `test_notificaciones.py` | 43 |
| `test_admin.py` | 35 |
| `test_comunicados.py` | 35 |
| `test_uploads.py` | 34 |
| `test_auditoria_conjunto_admin.py` | 31 |
| `test_enlaces_y_subidas.py` | 31 |
| `test_puntos_acopio.py` | 30 |
| `test_desvinculacion.py` | 28 |
| `test_puntos_acopio_paginacion.py` | 27 |
| `test_limites_longitud.py` | 22 |
| `test_reciclador_conjunto.py` | 21 |
| `test_admin_usuarios.py` | 20 |
| `test_contenido_educativo_envios.py` | 19 |
| `test_admin_conjunto.py` | 18 |
| `test_contact.py` | 17 |
| `test_contenido_educativo.py` | 16 |
| `test_conjunto_panel.py` | 15 |
| `test_geography.py` | 13 |
| `test_contenido_educativo_imagenes.py` | 11 |
| `test_puntos_acopio_foto.py` | 11 |
| `test_config.py` | 10 |
| `test_contenido_educativo_vistos.py` | 10 |
| `test_rate_limiting.py` | 10 |
| `test_apartamentos_conjunto.py` | 9 |
| `test_auditoria_acciones_admin.py` | 9 |
| `test_limpiar_evidencias.py` | 9 |
| `test_comunicado_expiracion.py` | 8 |
| `test_directorio.py` | 8 |
| `test_limpiar_adjuntos.py` | 8 |
| `test_fechas_evento.py` | 7 |
| `test_purgar_tokens.py` | 7 |
| `test_seed_demo.py` | 7 |
| `test_logging_seguridad.py` | 5 |
| `test_migraciones.py` | 4 |

### 3.2 Frontend: 1124 pruebas en 86 archivos

1123 pasaron y 1 quedó omitida (sección 5). Cobertura: **89.41 %** de líneas, **87.62 %** de sentencias, **84.69 %** de ramas y **83.19 %** de funciones (umbrales: 89 / 87 / 84 / 83).

| Carpeta (`fe/src/__tests__/`) | Pruebas que pasaron |
|---|---|
| Páginas (`pages/`) | 615 |
| Componentes (`components/`) | 289 |
| Lógica y utilidades (`lib/`) | 173 |
| Hooks (`hooks/`) | 19 |
| Clientes de API (`api/`) | 13 |
| Contexto (`context/`) | 8 |
| Configuración (`config/`) | 6 |

---

## 4. Casos de prueba (42 casos distintos)

Los casos están elegidos del código real y repartidos entre autenticación, configuración, seguridad, archivos subidos, base de datos, auditorías, SHUT y notificaciones, contenido educativo, registro, accesibilidad y rutas protegidas. Cada fila indica el archivo y el nombre de la prueba, que se puede buscar en el repositorio. En el backend, el texto entre corchetes es el valor con el que se probó el caso.

| ID | Capa | Área | Prueba | Qué verifica | HU / RQF / RNF | Resultado |
|---|---|---|---|---|---|---|
| C-01 | Backend | Autenticación | `test_auth.py::test_bloqueo_tras_5_intentos_fallidos_responde_igual` | Tras 5 intentos fallidos la cuenta se bloquea y el servidor responde igual que ante credenciales malas, sin revelar el bloqueo. | HU-001 · RNF-001 | Pasó |
| C-02 | Backend | Autenticación | `test_auth.py::test_bloqueo_ya_vencido_permite_iniciar_sesion` | Cuando vence el bloqueo, la cuenta vuelve a poder iniciar sesión. | HU-001 | Pasó |
| C-03 | Backend | Autenticación | `test_auth.py::test_refresh_token_solo_sirve_una_vez` | Un refresh token solo sirve una vez (rotación): reusarlo es rechazado. | HU-001 · RNF-001 | Pasó |
| C-04 | Backend | Autenticación | `test_auth.py::test_refresh_with_access_token_rejected` | Un access token no se acepta como refresh token. | RNF-001 | Pasó |
| C-05 | Backend | Autenticación | `test_auth.py::test_logout_invalida_el_refresh_token` | Al cerrar sesión el refresh token deja de servir. | HU-008 · RQF-007 | Pasó |
| C-06 | Backend | Autenticación | `test_auth.py::test_logout_no_afecta_otra_sesion_del_mismo_usuario` | Cerrar sesión en un equipo no cierra la sesión del mismo usuario en otro. | HU-008 | Pasó |
| C-07 | Backend | Autenticación | `test_auth.py::test_register_duplicado_avisa_maximo_una_vez_por_hora` | Registrarse con un correo ya existente avisa al dueño como máximo una vez por hora. | HU-002 · RNF-001 | Pasó |
| C-08 | Backend | Autenticación | `test_auth.py::test_dos_revocaciones_simultaneas_solo_una_gana` | Dos revocaciones simultáneas del mismo token: solo una prospera (operación atómica). | RNF-001 | Pasó |
| C-09 | Backend | Configuración | `test_config.py::test_rechaza_una_clave_corta` | El backend no arranca con una `SECRET_KEY` de menos de 32 caracteres. | RNF-001 · RNF-006 | Pasó |
| C-10 | Backend | Configuración | `test_config.py::test_rechaza_arrancar_sin_environment` | El backend no arranca si falta la variable `ENVIRONMENT`. | RNF-001 · RNF-006 | Pasó |
| C-11 | Backend | Seguridad | `test_rate_limiting.py::test_supera_el_limite_devuelve_429[reset-password]` | Pasado el límite de intentos, restablecer contraseña responde 429. | HU-042 · RNF-001 | Pasó |
| C-12 | Backend | Seguridad | `test_enlaces_y_subidas.py::test_adjunto_invalido[//sitio-malo.com/phishing]` | Un enlace `//sitio-malo.com/...` (de otro sitio) se rechaza. | HU-027 · RNF-001 | Pasó |
| C-13 | Backend | Seguridad | `test_enlaces_y_subidas.py::test_adjunto_invalido[/uploads/%2e%2e/api/v1/users/me]` | Una ruta de `/uploads/` con `..` codificado (`%2e%2e`) se rechaza. | RNF-001 | Pasó |
| C-14 | Backend | Seguridad | `test_enlaces_y_subidas.py::test_video_invalido[https://youtube.com.sitio-malo.com/watch]` | Un enlace que imita a YouTube (`youtube.com.sitio-malo.com`) se rechaza. | HU-012 · RQF-010 | Pasó |
| C-15 | Backend | Archivos subidos | `test_enlaces_y_subidas.py::test_subida_de_mas_de_5_mb_devuelve_400` | Una subida de más de 5 MB se rechaza con 400. | RNF-001 | Pasó |
| C-16 | Backend | Archivos subidos | `test_uploads.py::test_png_con_chunk_corrupto_devuelve_400_no_500` | Un PNG corrupto da 400 y no un error 500. | RNF-001 | Pasó |
| C-17 | Backend | Archivos subidos | `test_uploads.py::test_residente_no_pasa_de_3_por_minuto` | Un Residente no puede subir más de 3 archivos por minuto (cuota). | RNF-001 | Pasó |
| C-18 | Backend | Seguridad | `test_logging_seguridad.py::test_en_produccion_el_log_no_trae_token_ni_correo_completo` | En producción el log no registra tokens ni correos completos. | RNF-001 | Pasó |
| C-19 | Backend | Base de datos | `test_migraciones.py::test_ningun_id_de_migracion_se_repite` | Ninguna migración de Alembic repite el id de otra. | RNF-006 | Pasó |
| C-20 | Backend | Auditorías | `test_auditoria_conjunto.py::test_no_puede_auditar_sin_haber_avisado_llegada` | El Reciclador no puede auditar sin haber avisado su llegada. | HU-010 · RQF-009 | Pasó |
| C-21 | Backend | Auditorías | `test_auditoria_conjunto.py::test_reciclador_revocado_no_puede_auditar` | Un Reciclador al que le revocaron el acceso no puede auditar. | HU-010 · HU-038 | Pasó |
| C-22 | Backend | Auditorías | `test_auditoria_conjunto.py::test_sin_fotos_de_evidencia_devuelve_422_y_no_guarda_nada` | Una auditoría sin fotos de evidencia se rechaza (422) y no guarda nada. | HU-010 · RQF-009 | Pasó |
| C-23 | Backend | Auditorías | `test_auditoria_conjunto.py::test_residente_del_conjunto_recibe_la_notificacion` | Al publicarse una auditoría, el Residente del conjunto recibe la notificación. | HU-010 · HU-011 | Pasó |
| C-24 | Backend | SHUT y notificaciones | `test_notificaciones.py::test_no_puede_reportar_shut_lleno_si_ya_esta_lleno` | No se puede reportar el SHUT lleno si ya está lleno. | HU-003 · RQF-003 | Pasó |
| C-25 | Backend | SHUT y notificaciones | `test_notificaciones.py::test_no_puede_avisar_llegada_dos_veces_en_menos_de_2_horas` | El Reciclador no puede avisar su llegada dos veces en menos de 2 horas. | HU-007 · RQF-006 | Pasó |
| C-26 | Backend | SHUT y notificaciones | `test_notificaciones.py::test_shut_lleno_rechazado_si_no_ha_avisado_llegada` | Se rechaza reportar el SHUT lleno si el Reciclador no avisó su llegada. | RQF-003 | Pasó |
| C-27 | Backend | Contenido educativo | `test_contenido_educativo_vistos.py::test_cada_residente_ve_solo_lo_suyo` | Cada Residente ve solo sus lecciones vistas. | HU-005 · RQF-004 | Pasó |
| C-28 | Backend | Contenido educativo | `test_contenido_educativo_vistos.py::test_solo_el_residente_marca_y_consulta` | Solo el Residente usa las lecciones vistas; los demás roles reciben 403. | HU-005 · RQF-004 | Pasó |
| C-29 | Backend | Contenido educativo | `test_contenido_educativo_imagenes.py::test_una_imagen_externa_dentro_del_texto_se_rechaza` | Una imagen de otro sitio dentro del texto de un módulo se rechaza (422). | HU-012 · RQF-010 | Pasó |
| C-30 | Backend | Archivos subidos | `test_contenido_educativo_imagenes.py::test_la_portada_cuenta_como_en_uso` | La limpieza de adjuntos no borra la portada de un módulo, que está en uso. | HU-012 · RQF-010 | Pasó |
| C-31 | Frontend | Inicio de sesión | `LoginPage.estados.test.tsx` — «muestra el error de formato en el campo de correo y no llama a login» | Un correo con formato inválido muestra el error en el campo y no llama a la API. | HU-001 | Pasó |
| C-32 | Frontend | Inicio de sesión | `LoginPage.estados.test.tsx` — «avisa que la sesión expiró y borra la marca» | Se avisa que la sesión expiró y se borra la marca. | HU-001 | Pasó |
| C-33 | Frontend | Registro | `RegisterPage.test.tsx` — «mantiene el botón deshabilitado si no se aceptan los términos» | El botón de registro sigue deshabilitado si no se aceptan los términos. | HU-002 | Pasó |
| C-34 | Frontend | Registro | `RegisterPage.test.tsx` — «muestra los campos de Ubicación de Residencia cuando el rol es Residente» | El rol Residente muestra los campos de ubicación de residencia. | HU-002 | Pasó |
| C-35 | Frontend | Rutas protegidas | `ProtectedRoute.test.tsx` — «redirige a /login si no está autenticado» | Una ruta protegida redirige a `/login` si no hay sesión. | HU-001 · RNF-001 | Pasó |
| C-36 | Frontend | Accesibilidad | `elementosClicables.test.ts` — «ningún botón de solo ícono ni enlace de texto pasa desapercibido» | Todo botón de solo ícono tiene nombre y título, y todo enlace de texto se distingue sin mouse. | RNF-003 · RNF-005 | Pasó |
| C-37 | Frontend | Auditorías | `AuditoriaConjuntoForm.test.tsx` — «admite hasta 3 fotos y entonces avisa que alcanzó el máximo» | El formulario admite hasta 3 fotos de evidencia y avisa al llegar al máximo. | HU-010 | Pasó |
| C-38 | Frontend | Contenido educativo | `muroLeccion.test.ts` — «una imagen sola en su línea se pega a la tarjeta que viene después» | La regla del muro pega una imagen sola en su línea a la tarjeta siguiente. | HU-005 | Pasó |
| C-39 | Frontend | Contenido educativo | `CatalogoEducativoPage.test.tsx` — «una categoría con todos sus módulos vistos dice Visto, y las demás Sin ver» | El catálogo marca «Visto» solo si todos los módulos de la categoría están vistos. | HU-005 | Pasó |
| C-40 | Frontend | Contenido educativo | `CategoriaEducativaPage.test.tsx` — «una imagen de otro sitio dentro del texto no se pinta» | Una imagen de otro sitio dentro del texto no se muestra al Residente. | HU-005 · RNF-001 | Pasó |
| C-41 | Frontend | Contenido educativo | `AdminContenidoEducativoPage.test.tsx` — «'Insertar imagen' sube la imagen y la escribe en el texto» | «Insertar imagen» sube el archivo y lo escribe en el texto, en su propia línea. | HU-012 | Pasó |
| C-42 | Frontend | Seguridad | `enlaceSeguro.test.ts` — «completa una imagen subida a VerdeApp con la URL del backend» | `imagenPropiaSegura` solo acepta imágenes subidas a VerdeApp. | RNF-001 | Pasó |

---

## 5. Observaciones

- **Una prueba omitida, ya activada.** En la corrida del 20 de noviembre, `AuditoriaConjuntoForm.test.tsx`: «vuelve a deshabilitarse si se quita la única foto» estaba marcada con `it.skip` por un defecto conocido: al quitar una foto de evidencia, el formulario de auditoría se rompía (D-36 en el [reporte de defectos](reporte-ejecucion-y-defectos.md)). El defecto se corrigió en el PR [#693](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/693): se quitó el `skip` y se agregaron 3 pruebas. El 23 de noviembre de 2026 se volvió a correr el frontend: **1127 de 1127 pruebas pasaron**, con 89.42 % de líneas, 87.70 % de sentencias, 84.69 % de ramas y 83.40 % de funciones. Ya no queda ninguna prueba omitida.
- **Avisos del backend (3).** Dos son de deprecación de librerías de terceros (el plugin de `anyio` con `pytest`, y `httpx` con el cliente de pruebas de Starlette) y no son del código del proyecto. El tercero es esperado: la prueba de una imagen de 36 millones de píxeles provoca a propósito el aviso de «bomba de descompresión» de Pillow, porque verifica que el sistema la rechace con 400.
- **Mensajes «Network Error» en la salida del frontend.** Son de pruebas que simulan a propósito una caída de red para comprobar que la pantalla muestra el error; no son fallos.
- **Las pruebas del backend no se pueden correr en paralelo entre sí.** Comparten la misma base `verdeapp_test_db`. Una primera ejecución de hoy se descartó porque dos corridas simultáneas chocaron en la base de datos (`DeadlockDetected`, 4 fallos y 27 errores); al repetirla de una sola vez, las 1012 pasaron. Las cifras de este informe son de la corrida limpia.
- **Las pruebas de frontend cambian con el tiempo.** El conteo de este informe (1124) es de hoy; el bootcamp de testing agrega pruebas cada semana (`docs/matriz-rotacion.md`).

---

## 6. Pruebas E2E

Hay 2 pruebas E2E en `e2e/tests/`, y **las 2 pasaron** (21 s) el 20 de noviembre de 2026, en una corrida aparte de las anteriores:

| Prueba | Archivo | Qué verifica | Resultado |
|---|---|---|---|
| Login con credenciales incorrectas | `login-error.spec.js` | Muestra el error y no deja entrar al panel | Pasó |
| Panel del Residente con credenciales válidas | `test-login-resident.spec.js` | Inicia sesión con la cuenta de prueba del Residente y comprueba que el menú muestra el rol «Residente» | Pasó |

**Cómo se corrieron:** el backend encendido con `uv run uvicorn` contra la base de desarrollo (`verdeapp_db`), y el frontend levantado por Playwright. Ninguna de las dos crea ni modifica datos de negocio: la de credenciales incorrectas usa un correo distinto en cada corrida, para no bloquear ninguna cuenta del seed.

**Navegador:** el intento con `pnpm test` falló porque `Playwright` 1.65 pide su propio Chromium (`chromium_headless_shell-1254`) y en este equipo estaba instalada otra versión (`chromium-1243`, Chromium 153). La corrida válida usó ese Chromium ya instalado, a través de una configuración temporal que no se agregó al repositorio. Quien quiera repetirlo con el navegador que pide Playwright lo instala una vez con `pnpm exec playwright install chromium`, desde `e2e/`.

Las E2E no corren en el CI (ver el [plan de pruebas](plan-de-pruebas.md), sección 9).

---

## 7. Cómo reproducir esta ejecución

Con la base de pruebas creada (ver el plan de pruebas, sección 4) y sin otra corrida a la vez:

```bash
# Backend (desde be/)
uv run pytest -v
uv run ruff check .

# Frontend (desde fe/)
pnpm test
npx tsc -b --noEmit
pnpm lint

# E2E (desde e2e/, con el backend y la base encendidos)
pnpm test
```

`uv run pytest` y `pnpm test` miden la cobertura solos y fallan si baja del umbral.
