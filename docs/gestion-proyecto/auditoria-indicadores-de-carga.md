# Auditoría RNF-004.3 — Indicadores de carga (octubre 2026)

<!--
  ¿Qué? Revisión de todas las pantallas y acciones de VerdeApp que hablan con
        el servidor, para comprobar que cada una que puede tardar más de 500 ms
        muestra un indicador de carga, y las correcciones que salieron (#458).
  ¿Para qué? El RNF-004.3 pide un indicador (spinner o skeleton) en toda
             operación que tarde más de 500 ms. La revisión de agosto de 2026
             dijo que todos los flujos ya lo tenían, pero no había una lista y
             faltaban sobre todo las acciones de confirmar (eliminar, archivar,
             dar de baja) y las subidas de archivos. Con mala conexión, el
             Reciclador (que usa el celular en el conjunto) no sabía si su
             acción estaba en marcha.
  ¿Impacto? Queda escrito qué se revisó, qué ya tenía indicador, qué se agregó
            y qué sigue pendiente.
-->

**Fecha:** 2026-10-19
**Rama:** `feat/indicadores-de-carga`
**Estilo elegido:** círculo genérico (`Spinner`) en botones y tarjetas, y **barra de progreso con el porcentaje real en toda subida de archivos**.

## Método

1. **Inventario por código.** Un script recorrió `fe/src/pages` y `fe/src/components` y localizó las **102 llamadas al servidor** (las funciones de `lib/*Api.ts`, `axios` directo y `authApi`). Para cada una comprobó si la función que la contiene activa un estado de "en curso". Quedaron **82 con estado** y **20 sin estado detectado**.
2. **Revisión de cada caso.** Los 20 se leyeron uno por uno. Varios eran falsos positivos (la pantalla usa otro nombre de estado, o la carga es un `if (cargando) return <LoadingState/>`). Un segundo script buscó estados que se activan pero nunca se muestran; los 6 que marcó resultaron falsos positivos del mismo tipo.
3. **Comprobación en el navegador** con red lenta simulada (3G rápida: 1,6 Mbps bajada, 750 Kbps subida, 150 ms; 3G lenta: 400 Kbps, 400 ms) de lo que se agregó (sección 4).

**Límite honesto:** los indicadores que **ya existían** se comprobaron leyendo el código (el estado se activa y se muestra), no abriendo cada pantalla con red lenta. Lo agregado sí se vio en el navegador.

## 1. Indicadores que ya existían (por código)

| Pantalla | Acciones | Indicador |
| --- | --- | --- |
| Iniciar sesión, registro, recuperar, restablecer y cambiar contraseña, contacto | enviar el formulario | `Button isLoading` (spinner, se desactiva, `aria-busy`) |
| Aceptar invitación | consultar la invitación, enviar | `LoadingState` y `Button isLoading` |
| Panel del Reciclador | cargar, avisar llegada / SHUT / finalización, responder invitaciones, marcar leídas | `LoadingState`, `procesandoId`, botones desactivados |
| Panel del Residente | cargar, reportar SHUT, marcar leídas, ver auditoría | `LoadingState`, estados de envío |
| Panel del Administrador de Conjunto | cargar, editar conjunto, regenerar código, revocar reciclador, invitar | `LoadingState`, `ConfirmModal isConfirming`, `Button isLoading` |
| Panel del Administrador del Sistema | tabla de usuarios, activar/desactivar cuenta, invitar y asignar conjunto, solicitudes pendientes | `LoadingState`, `ConfirmModal isConfirming`, `procesandoId` |
| Perfil | cargar, guardar datos | `LoadingState`, botón desactivado |
| Catálogo y categoría educativa, Directorio, Comunicados, Novedades (Soporte técnico) | cargar | `LoadingState` |
| Comunicados, Novedades, Contenido educativo, Puntos de Acopio (administración) | listar, crear, editar | `LoadingState` y botones con estado de guardado |
| Agenda | cargar, agregar tema, borrar tema | `LoadingState`, `isConfirming`, botón desactivado |
| Auditoría | enviar | texto "Enviando… N%" y botón desactivado (la barra se agregó, sección 2) |

## 2. Lo que faltaba y se agregó

| # | Dónde | Problema | Corrección |
| --- | --- | --- | --- |
| 1 | **Todas las subidas de archivos** (foto de perfil, imagen adjunta de comunicados y novedades, guía de apoyo, fotos de la auditoría) | Solo un círculo, o el porcentaje como texto; la foto de perfil y los adjuntos no mostraban avance | Nuevo componente `ProgressBar` (`role="progressbar"`, porcentaje real con `onUploadProgress`). `subirAdjunto` acepta `onProgress`. |
| 2 | Puntos de Acopio (administración): dar de baja, eliminar, reactivar | Ningún indicador; se podía tocar dos veces | `isConfirming` en las confirmaciones y spinner en "Reactivar" (también en el panel lateral) |
| 3 | Comunicados: eliminar. Contenido educativo: eliminar. Novedades: archivar | Ningún indicador | `isConfirming` en cada confirmación |
| 4 | Agenda: archivar, restaurar y deshacer | Ningún indicador | Botón desactivado, `aria-busy` y spinner |
| 5 | Cerrar sesión | Con mala conexión la petición puede tardar hasta 10 s sin avisar | `isConfirming` en la confirmación |
| 6 | `ConfirmModal` (todas las confirmaciones) | Solo cambiaba el texto | Spinner dentro del botón y `aria-busy` |
| 7 | Registro: lista de localidades | El desplegable quedaba vacío mientras cargaba | Dice "Cargando…" y está desactivado |
| 8 | Buscadores de conjunto (`ConjuntoCombobox`, `ConjuntoComboboxMultiple`) | Solo el texto "Buscando…" | Spinner junto al texto |
| 9 | Panel del Administrador del Sistema: "Totales del sistema" | Mientras llegaban los números se veía un guion "—", que parece un dato vacío | Spinner en cada total hasta que termina la primera petición; si la petición falla se queda el guion (no es "cargando") |

## 3. Un solo estilo

Antes había **7 dibujos distintos** de "cargando": el SVG de `Button`, el de `ProtectedRoute`, un círculo con borde en `VerifyEmailPage`, y el `LoaderCircle` de lucide-react en 4 sitios, cada uno con su propio tamaño y color. Ahora todos usan `components/ui/Spinner.tsx` (`size` sm/md/lg/xl y `tone` accent/current). Cambiar el indicador de toda la app es tocar ese archivo.

## 4. Comprobación en el navegador (red lenta simulada)

| Prueba | Resultado |
| --- | --- |
| Foto de perfil de 228 KB, 3G rápida | La barra avanza 7% → 22% → 36% → 57% → 72% → 86% → 100% en 2,4 s y desaparece. |
| Auditoría con 3 fotos (8,8 MB), 3G rápida | Barra "Subiendo las fotos…" (6% a los 6 s), spinner en el botón "Enviando… 6%". |
| Verificación de sesión con `/users/me` lento (3 s) | Pantalla "Cargando…" con spinner a los 0,25 s. |
| Agenda, archivar un tema, 3G lenta | Botón desactivado, `aria-busy="true"` y spinner a los 0,3 s. |
| Puntos de Acopio, dar de baja, 3G lenta | Botón de confirmar desactivado, `aria-busy="true"` y spinner. |

Pruebas automáticas nuevas: `ProgressBar` y `Spinner`, `ConfirmModal` en curso, `subirAdjunto` (porcentaje), la barra en `ImagenAdjuntaField` y el botón ocupado de la agenda.

## 4.1 Error aparte que se corrigió en esta rama

Al probar la auditoría con red lenta salió que **las fotos no se adjuntaban**: `AuditoriaConjuntoForm.tsx` vaciaba el campo de archivo (`e.target.value = ""`) justo después de leer `e.target.files`, y en Chrome esa lista es "viva" y queda vacía antes de que React la use (hallazgo de `investigacion-conectividad.md`, sección 7). El equipo lo confirmó a mano. Corrección: copiar los archivos a un arreglo **antes** de vaciar el campo. Prueba nueva en `RecicladorDashboard.test.tsx` que imita la lista viva de Chrome (falla sin la corrección y pasa con ella), y comprobación con 3 fotos seguidas en un Chromium real, sin parches.

## 5. Lo que no se cambió, y por qué

- **El tiempo máximo de 10 s de las peticiones** (el issue pide no tocarlo). La foto de perfil, las imágenes adjuntas y la guía de apoyo se cortan a los 10 s: con 3G lenta (≈ 50 KB/s) no alcanza a subirse un archivo de más de ≈ 500 KB. La barra muestra el avance, pero no lo arregla; ver `investigacion-conectividad.md`.
- **Skeletons:** no se usan; el estilo elegido es el círculo.
- **Indicadores que ya existían:** no se volvieron a probar en el navegador (ver "Límite honesto").

## 6. Pendiente

- Probar en el navegador con red lenta las pantallas que ya tenían indicador, si se quiere cerrar el RNF-004.3 con evidencia visual de toda la lista.
- Los tiempos de respuesta del backend (RNF-004.1 y 004.2) siguen sin medir.
