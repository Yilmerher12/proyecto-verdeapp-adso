# Investigación: cómo se comporta VerdeApp con mala conexión o sin datos móviles

<!--
  ¿Qué? Investigación del issue #459: cuántos datos gasta cada acción de
        VerdeApp, qué ve el usuario con conexión lenta o sin conexión, qué se
        sabe del acceso a datos y de la señal, y qué se puede hacer.
  ¿Para qué? Los profesores pidieron pensar qué pasa si los usuarios no tienen
             buena conexión. Con números medidos el equipo puede contestar
             "¿cuántos datos gasta un reciclador?" y "¿qué pasa si no hay
             señal?" sin suposiciones.
  ¿Impacto? Esta tarjeta solo investiga: no cambia código de la aplicación.
            Lo que concluye se abre como tarjetas aparte (sección 8).
-->

**Fecha:** 2026-10-19
**Rama:** `docs/investigacion-conectividad`
**Quién mide:** sesión de Claude Code con el Playwright que el proyecto ya tiene en `e2e/` (sin instalar nada nuevo). Los scripts de medición son temporales y no están en el repositorio.

## 1. Cómo se midió (y qué límites tiene)

- **Aplicación probada:** el *build de producción* del frontend (`vite build`), servido por un servidor local que imita el `nginx.conf` del proyecto (gzip en HTML, CSS, JS, JSON y SVG; caché de 1 año para los archivos con hash). No se midió el servidor de desarrollo de Vite: ese entrega los módulos sin empaquetar y pesa varios MB más, así que no representa lo que verá un usuario.
- **Navegador:** Chromium emulando un celular (375x812, pantalla táctil), con la caché vacía en cada "primera visita".
- **Bytes:** los reportados por el propio navegador (`encodedDataLength` del protocolo de Chrome), que incluyen las cabeceras de la respuesta. Para lo que se **sube** se suma el cuerpo y las cabeceras de la petición (unos 850 bytes por petición, sobre todo las cookies de sesión). Las cabeceras de `localhost` (HTTP/1.1) no se comprimen; en internet con HTTP/2 serían algo menores.
- **Redes simuladas** (valores explícitos que se pusieron en el navegador, no un estándar oficial; la documentación de Chrome DevTools solo explica cómo crear perfiles propios, ver fuentes):

  | Perfil | Bajada | Subida | Latencia |
  | --- | --- | --- | --- |
  | 3G rápida | 1,6 Mbps (≈ 200 KB/s) | 750 Kbps (≈ 94 KB/s) | 150 ms |
  | 3G lenta | 400 Kbps (≈ 50 KB/s) | 400 Kbps (≈ 50 KB/s) | 400 ms |
  | Sin conexión | — | — | — |

- **Cuentas:** las 4 de prueba del README, con la base de datos sembrada. **Los datos son pocos** (1 conjunto, 1 a 5 notificaciones por usuario): las respuestas de la API crecen con los datos reales, y por eso se agrega una proyección en la sección 3.
- **Acciones reales:** avisar llegada, SHUT lleno, SHUT libre, finalización y una auditoría con 3 fotos se ejecutaron de verdad y dejaron datos en la base de desarrollo (que se reinicia al terminar).
- **Fotos de prueba (simuladas):** JPG reales con ruido, de 0,99 MB, 3,0 MB y 4,79 MB (suman 8,79 MB). Un JPG de ruido no se comprime, así que es el peor caso; una foto real de celular puede pesar menos o más.
- **Lo que no se pudo medir:** la señal real en un cuarto de basuras (hace falta ir a un conjunto) y un celular físico.

## 2. (c) Gasto de datos por acción

### 2.1 Cargar la aplicación

| Acción | Peticiones | Bajada | Subida |
| --- | --- | --- | --- |
| Landing, **primera visita** (caché vacía) | 11 | **1 410 KB** (1,38 MB) | 5 KB |
| Landing, **segunda visita** | 11 | **1,4 KB** | 0,7 KB |
| Página de login, primera visita | 12 | 1 421 KB | 6 KB |

Desglose de la primera visita a la landing:

| Qué | KB | % |
| --- | --- | --- |
| 2 fotos de fondo (`hero-background.jpg`, `leaves-overlay.jpg`) | 949,6 | 67% |
| JavaScript de la app (un solo archivo de 1 196 KB, 333 KB comprimido) | 332,9 | 24% |
| Tipografías de Google Fonts (Inter y Outfit, 3 peticiones a otros servidores) | 80,6 | 6% |
| 3 logos SVG | 31,1 | 2% |
| CSS y HTML | 17,6 | 1% |

La segunda visita casi no gasta porque `nginx.conf` pone `Cache-Control: public, immutable` por 1 año a los archivos con hash; el `index.html` sí se vuelve a pedir (1,4 KB).

### 2.2 Iniciar sesión y abrir el panel (la app ya cargada)

| Rol | Peticiones | Bajada | Subida |
| --- | --- | --- | --- |
| Reciclador | 10 | 5,7 KB | 6,9 KB |
| Residente | 8 | 4,6 KB | 4,4 KB |
| Administrador de Conjunto | 10 | 6,0 KB | 6,1 KB |
| Administrador del Sistema | 14 | 11,3 KB | 6,8 KB |

### 2.3 Cambiar de pantalla (sin recargar)

| Pantalla | Peticiones | Bajada |
| --- | --- | --- |
| Comunicados, Soporte técnico (Novedades) | 1 | 0,4 KB |
| Perfil | 3 | 2,0 a 2,1 KB |
| Puntos de Acopio, Directorio | 3 | 2,9 a 3,1 KB |
| Catálogo educativo | 1 | 8,5 KB |
| Contenido educativo (Admin. del Sistema) | 4 | 11,8 KB |
| Agenda (Admin. de Conjunto) | 3 | 1,6 KB |

Video educativo: la pantalla de una categoría con sus miniaturas pesa **40 KB**; **al reproducir un video** se bajaron **4,7 MB en 12 segundos** (1,1 MB del reproductor de YouTube y 3,4 MB de video). Es, de lejos, lo más pesado de la aplicación, y es opcional: el enlace "Ver en YouTube" no lo descarga dentro de VerdeApp.

### 2.4 Acciones del Reciclador

| Acción | Peticiones | Bajada | Subida | Tiempo (red libre, local) |
| --- | --- | --- | --- | --- |
| Avisar llegada | 7 | 2,9 KB | 5,7 KB | 1,7 s |
| SHUT está lleno | 6 | 2,9 KB | 4,3 KB | 1,6 s |
| SHUT ya está libre | 6 | 2,9 KB | 3,5 KB | 1,6 s |
| Finalicé separación | 6 | 2,9 KB | 4,3 KB | 1,6 s |
| **Auditoría con 3 fotos (8,79 MB)** | 7 | 4,4 KB | **8 793 KB (8,39 MiB)** | 0,6 s en red local |

- Cada aviso es **1 petición de envío (467 B de respuesta) más 5 lecturas** que refrescan el panel. La subida de algunos avisos sale menor porque el navegador no reportó las cabeceras de una de las peticiones; en la práctica son unos 850 B por petición.
- **Reportar SHUT lleno (Residente)** usa la misma petición (`POST /notificaciones/enviar`); no se pudo medir otra vez porque el botón queda en espera tras cada reporte. Se espera un costo igual al de arriba.
- **Auditoría:** el cuerpo enviado fue de 8 788 399 B: las 3 fotos (8 787 517 B) más 882 B de formulario. Por eso **con 1 foto de 0,99 MB la subida es de ≈ 1,0 MB y con 2 fotos (0,99 y 3,0 MB) de ≈ 4,0 MB** (calculado con esa fórmula, no ejecutado: solo se puede crear una auditoría por conjunto y semana).
- **Dato perdido:** en un primer intento el servidor recibió los 8,8 MB completos y recién después contestó `400: Debes avisar tu llegada a este conjunto antes de poder auditarlo`. El botón "Auditar ahora" aparece aunque no haya llegada reportada, así que se pueden gastar 8,8 MB para nada.

### 2.5 Una hora con la aplicación abierta (actualización cada 20 segundos)

`usePolling.ts` repite las lecturas cada 20 s, **esté el usuario mirando la pantalla o no**, y no se detiene con la pestaña oculta. Se midió una ventana de 60 s (3 ciclos) con cada panel abierto:

| Rol | Peticiones por ciclo | Por hora (×180) | Bajada por hora | Subida por hora |
| --- | --- | --- | --- | --- |
| Reciclador | 6 | 1 080 | 513 KB | 893 KB |
| Residente | 3 | 540 | 236 KB | 446 KB |
| Administrador de Conjunto | 2 | 360 | 154 KB | 300 KB |
| Administrador del Sistema | 1 | 180 | 78 KB | 146 KB |

Casi todo son **cabeceras**: cada petición baja unos 434 B (de los cuales el cuerpo es de 2 a 400 B) y sube unos 850 B.

## 3. Proyección: cuántos datos gasta un Reciclador

Con los datos de la semilla la lista de notificaciones tiene 1 a 5 elementos. El backend la devuelve **sin comprimir y con tope de 30** (`listar_mis_notificaciones`), a unos **280 B por notificación**: con 30, cada lectura pesaría ≈ 8,4 KB, y a 180 lecturas por hora serían ≈ 1,5 MB por hora solo de esa lista. Con gzip, una lista de 5 notificaciones pesó 605 B en lugar de 1 402 B (−57%).

**Ejemplo con supuestos explícitos** (1 conjunto, 22 días de trabajo al mes, 1 hora de app abierta por día, 4 auditorías al mes con 3 fotos de 8,79 MB en total, un ciclo de 4 avisos por día):

| Concepto | Por mes |
| --- | --- |
| Primera carga de la app (una sola vez) | 1,4 MB |
| 1 hora al día con la app abierta, datos de hoy (1,4 MB/h × 22) | ≈ 31 MB |
| 4 avisos al día (≈ 32 KB × 22) | ≈ 0,7 MB |
| 4 auditorías con 3 fotos (8,8 MB × 4) | ≈ 35 MB |
| **Total, datos de hoy** | **≈ 68 MB** |
| Si la lista de notificaciones llega a 30 (+1,5 MB por hora) | +33 MB, **≈ 101 MB** |

Cada conjunto adicional suma unos 35 MB al mes por sus auditorías. Las **fotos** y las **actualizaciones cada 20 s** pesan casi lo mismo, y ambas se pueden reducir (sección 6). Estas cifras valen mientras no se vean videos: un video de 5 minutos podría gastar más que todo lo de arriba.

## 4. (b) Qué ve el usuario con conexión lenta o sin conexión

| Situación | Resultado medido |
| --- | --- |
| **Abrir VerdeApp sin conexión** (nunca cargada) | No abre: sale la pantalla de error del navegador (`ERR_INTERNET_DISCONNECTED`). No hay `service worker` ni caché propia. |
| **Se pierde la conexión con la app abierta** | Aparece el banner rojo "No se pudo conectar con el servidor. Verifica tu conexión — reintentaremos automáticamente." unos **15 s** después (lo dispara la siguiente actualización automática). La pantalla no se congela ni queda en blanco. |
| **Tocar un botón sin conexión** (probado: "Marcar leídas", "Enviar aviso") | A los ~3,5 s aparece "No se pudo completar la acción. Inténtalo de nuevo." El modal sigue abierto con el conjunto elegido; al volver la red, reintentar **funciona sin recargar**. |
| **Iniciar sesión sin conexión** | Mensaje "No se pudo conectar con el servidor"; el correo y la contraseña **se conservan**. |
| **Auditoría sin conexión** (3 fotos) | Falla en 1,3 s con "No se pudo conectar con el servidor"; **las 3 fotos y los datos quedan** y el botón sigue activo. |
| **Auditoría con 3 fotos en 3G rápida** | La barra de progreso avanza ≈ 1% por segundo (≈ 96 KB/s medidos). A los 30 s se corta por tiempo ("La subida está tardando demasiado — revisa tu conexión e intenta de nuevo.") con ≈ **2,8 MB** enviados de 8,8 MB. Datos y fotos quedan. |
| **Auditoría con 1 foto de 3 MB en 3G lenta** | ≈ 50 KB/s medidos: a los 30 s se corta con ≈ **1,5 MB** enviados de 3 MB. |
| **Cargar la landing (primera visita)** | 3G rápida: la página aparece a los **2,2 s** y termina de cargar (fotos incluidas) a los **8,4 s**. 3G lenta: **8,1 s** y **30,9 s**. |
| **Login + panel, app ya cargada** | 3G rápida **0,75 s**; 3G lenta **1,2 s**. |

**Lo bueno:** los mensajes son claros, no se pierde lo escrito, y las acciones pequeñas (unos KB) funcionan aun con 3G lenta.

**Lo que no funciona:** con el tiempo máximo de 30 s de la auditoría y sin compresión de fotos, **lo que se puede subir antes del corte es ≈ 2,8 MB en 3G rápida y ≈ 1,5 MB en 3G lenta**. Si una foto de celular pesa más (las fotos de teléfonos modernos suelen pasar de 2 MB; es un supuesto, no una medición), **la auditoría no se puede enviar nunca** con esas redes. Y **cada reintento empieza de cero**: se vuelven a gastar esos MB.

**Pendiente de medir:** si el banner desaparece solo al volver la red, y formularios distintos a los probados (comunicados, novedades, perfil con foto).

## 5. (a) y (b) Acceso a datos y señal: lo que se sabe

Fecha de consulta de todas las fuentes: **2026-10-19**. Ninguna incluye datos personales.

**(a) Acceso a internet y datos**

- **DANE, Encuesta Nacional de Calidad de Vida 2024** (comunicado del 24 de abril de 2025): el 65,6% de los hogares del país tenía acceso a internet; **Bogotá tuvo el mayor porcentaje (82,7%)**, y el 79,3% de las personas de 5 años o más usó internet (dato nacional). Fuente: [DANE, comunicado ECV 2024](https://www.dane.gov.co/files/operaciones/ECV/cp-ECV-2024.pdf).
- **Límite importante:** son datos de **toda la población**, no de recicladores. **No se encontró un dato público** sobre cuántos recicladores de oficio de Bogotá tienen teléfono con datos. Se buscó en la caracterización de la UAESP de 2011 ([Hábitat Bogotá](https://www.habitatbogota.gov.co/sites/default/files/archivos-adjuntos/CARACTERIZACION_DE_LA_ACTIVIDAD_DEL_RECICLAJE_EN_BOGOTA%20%281%29.pdf)) y en el resumen de WIEGO ([IEMS Bogotá](https://wiego.org/wp-content/uploads/2019/09/IEMS-Bogota-Waste-Pickers-Executive-Summary-Espanol.pdf)), pero la búsqueda solo devolvió los títulos: su contenido **no se pudo leer** en esta investigación (el segundo PDF salió ilegible), así que no se afirma nada de ellos.
- **Qué hacer (no técnico):** preguntarlo directamente. Tres preguntas bastan: ¿tienes teléfono con datos?, ¿cuántos MB tienes al mes?, ¿usas wifi en el conjunto? Hacerlo con los recicladores o la asociación con la que el equipo ya tiene contacto, sin guardar nombres.
- **Opciones y sus implicaciones:**

  | Opción | Implicación |
  | --- | --- |
  | Que el conjunto dé wifi en el cuarto de basuras | Resuelve datos y señal en el punto donde se trabaja, pero depende de la administración de cada conjunto y de que el wifi llegue ahí. |
  | Que el conjunto o la asociación pague un plan de datos al reciclador | Quita la barrera económica, pero hay que acordarlo conjunto por conjunto. Con ≈ 70 a 100 MB al mes (sección 3), el consumo de VerdeApp es pequeño frente a otras apps; las fotos se pueden reducir. |
  | Hacer la app más liviana (sección 6) | No depende de nadie: baja el consumo y evita fallos con señal débil. |

**(b) Señal en el cuarto de basuras**

- **No existe un dato público** de señal dentro de cuartos de basuras. Los mapas oficiales de la CRC en DaTIC muestran cobertura por operador, tecnología (2G a 5G) y nivel de señal con datos del cuarto trimestre de 2024, pero **a nivel municipal y sin cobertura en interiores** ([DPL News, 16-dic-2025](https://dplnews.com/colombia-crc-presenta-mapas-interactivos-para-consultar-la-cobertura-movil/)). Una búsqueda de normas sobre señal en sótanos de propiedad horizontal tampoco halló nada vigente.
- **Cómo medirlo si se visita un conjunto** (una hora, sin datos personales): en la portería, en una torre y en el cuarto de basuras, con el mismo teléfono y el mismo operador: (1) abrir un medidor de velocidad del operador o de cualquier servicio público y anotar bajada, subida y latencia; (2) abrir `/login` de VerdeApp y cronometrar hasta ver el formulario; (3) enviar un aviso de prueba y anotar si falla. Repetir 3 veces en horas distintas y anotar operador, sitio y hora.

## 6. Soluciones técnicas comparadas

Las horas son aproximadas, para una persona del equipo.

| # | Solución | Qué resuelve (con lo medido) | Esfuerzo | Riesgo | Mantenimiento |
| --- | --- | --- | --- | --- | --- |
| 1 | **Comprimir las fotos antes de subirlas** (con `canvas` del navegador, sin librería nueva) | Las fotos son el 35 MB de los ≈ 68 MB mensuales y la causa de que la auditoría falle en 3G. Reducir el lado mayor a ≈ 1 600 px bajaría una foto de 12 MP a ≈ 1/6 de los píxeles; **estimación (no medida con fotos reales): de 2 a 6 MB a 0,3 a 0,8 MB**. Con eso 3 fotos caben en 3G rápida dentro de los 30 s. | M (6-8 h) | Medio: menos calidad de evidencia; formatos de iPhone (HEIC); hay que probar con fotos reales | Bajo |
| 2 | **Aviso inmediato de "sin conexión"** (evento `offline` del navegador) | Hoy el aviso tarda ≈ 15 s. Con el evento sale al instante y el botón podría avisar antes de intentar. | S (2-3 h) | Bajo | Bajo |
| 3 | **Reducir las actualizaciones cada 20 s**: pausar con la pestaña oculta; unir las 6 lecturas del Reciclador en 1; comprimir con gzip las respuestas de la API (−57% medido en una lista de 5 notificaciones) | Baja los ≈ 1,4 MB por hora (hasta ≈ 2,9 MB con 30 notificaciones). Pausar con la pestaña oculta evita el gasto cuando el usuario guardó el celular. | S a M (3-8 h según cuántas partes) | Medio: las notificaciones podrían tardar más en llegar | Bajo |
| 4 | **Bloquear "Auditar ahora" sin llegada reportada** | Evita subir 8,8 MB para recibir un 400 (visto en la medición). | S (1-2 h) | Bajo | Bajo |
| 5 | **Reintento automático** | Las lecturas ya se repiten solas cada 20 s. En las **escrituras** es peligroso: reintentar "SHUT lleno" podría duplicar el aviso. Sirve solo para lecturas. | S | Alto en escrituras | Bajo |
| 6 | **PWA instalable con caché de la app** (`service worker`) | La segunda visita ya cuesta 1,4 KB gracias al caché de nginx. Una PWA aporta abrir la app **sin conexión** (hoy no abre) y el ícono en la pantalla de inicio, pero no más ahorro. | L (16-24 h) y una dependencia nueva (p. ej. un plugin de PWA para Vite; requiere aprobarse) | Medio-alto: cachés viejas que muestran una versión antigua de la app | Medio |
| 7 | **Cola de acciones sin conexión** (enviar después) | Permite "avisar" sin señal. Pero un aviso como **"SHUT está lleno" enviado 2 horas tarde engaña** a los residentes. La API de sincronización en segundo plano (Background Sync) está en la categoría "Limited availability" de MDN y es un borrador de la comunidad WICG: no está en todos los navegadores. | XL (24+ h) | Alto | Alto |

Mejoras adicionales que salieron de las mediciones:

| # | Mejora | Medido |
| --- | --- | --- |
| 8 | **Imágenes de la landing en WebP a 1 280 px** | `hero-background.jpg` 612 658 B → 178 304 B (−71%); `leaves-overlay.jpg` 359 345 B → 88 168 B (−75%). Total **972 KB → 266 KB (−73%)**. La calidad visual no se evaluó. Esfuerzo S (1-2 h). |
| 9 | **Dividir el JavaScript por pantalla** (carga diferida) | Hoy son 1 196 KB (333 KB comprimido) en un solo archivo, aunque el visitante solo vea la landing. No se midió cuánto bajaría. Esfuerzo M (4-8 h). |
| 10 | **Tipografías propias en vez de Google Fonts** | 80,6 KB y 3 peticiones a servidores ajenos. Baja prioridad. |

Librería para la solución 1, si se prefiere una (no es necesaria): `browser-image-compression` 2.0.2, licencia MIT, última publicación el 2023-03-06 ([npm](https://registry.npmjs.org/browser-image-compression)). Lleva más de 3 años sin versión nueva; por eso se recomienda `canvas`, que no agrega dependencia (restricciones.md pide versión exacta para cualquier dependencia nueva).

## 7. Hallazgos aparte (no son parte de esta tarjeta)

1. **Posible error al adjuntar fotos en la auditoría.** En `AuditoriaConjuntoForm.tsx` (líneas 315-318) se llama `agregarFotos(e.target.files)` y enseguida `e.target.value = ""`. En Chromium, esa lista de archivos es "viva": al borrar el valor queda **vacía** antes de que React la lea (comprobado con un script de 6 líneas: tenía 1 archivo y quedó en 0). En la medición **ninguna foto se pudo adjuntar** hasta que se desactivó ese borrado; el formulario se quedaba en "Completa el formulario". **Hay que confirmarlo a mano** en Chrome (escritorio y celular): elegir una foto en "Auditar ahora" y ver si aparece la miniatura. Si falla, el Reciclador **no puede auditar**. La corrección es copiar los archivos a un arreglo antes de borrar el valor. Los otros campos de archivo del proyecto leen `files?.[0]` (un `File`, no la lista) y no tienen el problema.

   > **Actualización (2026-10-19):** el equipo lo confirmó a mano en Chrome (la miniatura no aparecía) y **se corrigió en la rama de #458**: ahora se copian los archivos a un arreglo antes de vaciar el campo. Hay una prueba que imita la lista "viva" de Chrome y se comprobó con 3 fotos seguidas en un Chromium real, sin ningún parche.
2. **El servidor valida la regla de la llegada después de recibir las fotos** (sección 2.4) y el botón "Auditar ahora" no la comprueba antes.

## 8. Recomendación

**Antes de la feria** (poco riesgo, mucho efecto):
1. Confirmar el hallazgo 1 de la sección 7. Si es real, corregirlo primero: sin esto el Reciclador no audita.
2. **Comprimir las fotos** antes de subirlas (solución 1): es lo que más datos ahorra y lo que evita los fallos en 3G.
3. **Bloquear "Auditar ahora" sin llegada** (solución 4) y **pausar las actualizaciones con la pestaña oculta** (parte de la 3).
4. **Imágenes de la landing en WebP** (mejora 8): es lo que más pesa en la primera visita y lo que ve el público de la feria.
5. **Aviso inmediato de "sin conexión"** (solución 2).

**Después:** dividir el JavaScript (9), gzip en la API y unir las lecturas del Reciclador (3), encuestar a los recicladores y medir la señal en un conjunto (sección 5), y decidir con esos datos si hace falta una PWA.

**No vale la pena ahora:**
- **Cola de acciones sin conexión** (7): un aviso de SHUT con retraso es peor que un aviso que falla y se ve fallar, que es lo que pasa hoy con mensajes claros.
- **PWA instalable** (6) por ahorro de datos: la segunda visita ya cuesta 1,4 KB. Solo se justifica si se quiere abrir sin conexión o tener ícono en el celular.
- **Reintento automático de escrituras** (5): riesgo de avisos duplicados.

### Tarjetas de implementación propuestas

(Las crea el equipo en GitHub; aquí solo se listan.)

| # | Título | Tamaño | Prioridad sugerida |
| --- | --- | --- | --- |
| 1 | Auditoría: confirmar y corregir que las fotos no se adjuntan (FileList vivo) | XS | P0 |
| 2 | Auditoría: comprimir las fotos en el celular antes de subirlas | M | P1 |
| 3 | Auditoría: no mostrar "Auditar ahora" si no hay llegada reportada | XS | P1 |
| 4 | Pausar las actualizaciones cada 20 s con la pestaña oculta | S | P1 |
| 5 | Landing: imágenes de fondo en WebP | S | P1 |
| 6 | Aviso inmediato cuando el navegador pierde la conexión | S | P2 |
| 7 | API: gzip en las respuestas y unir las lecturas del panel del Reciclador | M | P2 |
| 8 | Frontend: dividir el JavaScript por pantalla | M | P2 |
| 9 | Encuesta de acceso a datos a recicladores y medición de señal en un conjunto | S | P2 |

Si de aquí sale una tarjeta que cambie las actualizaciones cada 20 segundos, conviene coordinarla con la de indicadores de carga (#458).

## 9. Fuentes

Todas consultadas el 2026-10-19.

- DANE, *Condiciones de vida en Colombia en 2024* (comunicado de prensa, 24-abr-2025): <https://www.dane.gov.co/files/operaciones/ECV/cp-ECV-2024.pdf>
- DPL News, *CRC presenta mapas interactivos para consultar la cobertura móvil* (16-dic-2025): <https://dplnews.com/colombia-crc-presenta-mapas-interactivos-para-consultar-la-cobertura-movil/>
- Chrome for Developers, *Throttling* de DevTools (actualizada 2024-04-16; explica cómo crear perfiles propios y no trae valores de "Slow 3G" o "Fast 3G"): <https://developer.chrome.com/docs/devtools/settings/throttling>
- MDN, *Background Synchronization API* ("Limited availability"; especificación en borrador de WICG): <https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API>
- npm, `browser-image-compression` 2.0.2, MIT, 2023-03-06: <https://registry.npmjs.org/browser-image-compression>
- No se pudieron leer (PDF ilegible o sin datos de conectividad): [Hábitat Bogotá, caracterización de la actividad del reciclaje (2011)](https://www.habitatbogota.gov.co/sites/default/files/archivos-adjuntos/CARACTERIZACION_DE_LA_ACTIVIDAD_DEL_RECICLAJE_EN_BOGOTA%20%281%29.pdf) y [WIEGO, IEMS Bogotá](https://wiego.org/wp-content/uploads/2019/09/IEMS-Bogota-Waste-Pickers-Executive-Summary-Espanol.pdf).
