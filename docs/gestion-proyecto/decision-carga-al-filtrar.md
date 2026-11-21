# Decisión: qué se ve cuando una lista se vuelve a pedir al servidor

<!--
  ¿Qué? Registro de por qué, al filtrar, cambiar de pestaña o de página, las listas de VerdeApp
        conservan sus filas atenuadas con una barra de progreso en vez de reemplazarlas por un
        "Cargando…", y cuándo sí se usa el "Cargando…" completo.
  ¿Para qué? Que quien toque una lista nueva sepa qué componente usar y por qué, sin inventar un
             indicador distinto en cada pantalla.
  ¿Impacto? El código vive en `fe/src/components/ui/ContenidoRecargable.tsx` y en las pantallas que
            lo usan; este documento solo explica la regla.
-->

**Fecha:** 2026-11-06
**Rama:** `feat/base-compartida-modal-y-carga` (issue #615)
**Relacionado:** RNF-004.3 (indicador de carga en toda operación de más de 500 ms) y `auditoria-indicadores-de-carga.md`.

## 1. El problema

Al pulsar una pestaña o un filtro en la tabla de Usuarios registrados, en Soporte técnico o en Novedades, la lista cambiaba de golpe:

1. La tabla borraba todas sus filas y ponía una sola línea con "Cargando…" (en Novedades, el aviso salía arriba y las filas viejas se quedaban debajo, las dos cosas a la vez).
2. Todo lo que había debajo de la tabla subía y volvía a bajar cuando llegaban los datos nuevos.
3. Si el servidor respondía rápido, el "Cargando…" solo se veía medio segundo, como un destello.

El "Cargando…" no es un error: es lo que pide RNF-004.3. El problema es usarlo cuando la pantalla **ya tiene filas** y la persona solo cambió un filtro.

## 2. La regla

| Situación | Qué se muestra |
| --- | --- |
| Primera carga de la lista, sin nada que mostrar todavía | `Esqueleto` (silueta gris de la lista, issue #644; antes un círculo "Cargando…") |
| Recarga con filas ya visibles (filtro, pestaña, página, acción que vuelve a pedir la lista) | Las filas anteriores se quedan **atenuadas y sin clic**, con una **barra de progreso delgada** arriba; al llegar lo nuevo recuperan su opacidad con una transición suave |

El componente `ContenidoRecargable` aplica la regla solo: recibe `cargando` y el mensaje ya traducido, y recuerda internamente si ya hubo una primera carga.

## 3. Por qué cumple RNF-004.3

La barra de progreso es un indicador de carga (el requisito dice "spinner o skeleton"; la barra es el mismo tipo de aviso que ya se usa en las subidas de archivos). Tiene `role="progressbar"` y el texto "Cargando…" para lectores de pantalla, y el contenedor marca `aria-busy` mientras dura la recarga.

## 4. Cómo se hizo (sin librerías nuevas)

- Se reutilizó `ProgressBar` en su modo indeterminado (sin porcentaje), con una opción nueva `compacta` (barra de 4 px y texto solo para lectores de pantalla).
- La atenuación y la transición son clases de Tailwind (`opacity-50`, `transition-opacity`, `pointer-events-none`).
- Con "reducir movimiento" activado, la transición se desactiva (`motion-reduce`) y la barra usa la animación que ya respeta esa preferencia.

## 5. Dónde se aplica

| Pantalla | Qué envuelve |
| --- | --- |
| Usuarios registrados (`AdminDashboard.tsx`) | La tabla y su paginación |
| Soporte técnico (`SoporteTecnico.tsx`) | La lista de solicitudes y su paginación |
| Novedades del administrador (`AdminNovedadesPage.tsx`) | La lista de novedades (se quitó el aviso doble) |

## 6. Lo que no se cambió, y por qué

- **Calificaciones por conjunto.** Su tabla se rescribe en el issue #618 (paginación y filtros en el servidor); el patrón se aplica allí para no hacer trabajo que se tira.
- **El `Spinner` de los botones y el "Cargando…" de la primera carga.** Siguen igual: son la regla para esos casos.
- **Otras listas** (Comunicados, Directorio, Puntos de acopio…). Se pueden pasar a `ContenidoRecargable` cuando se toquen; este cambio se limitó a las tres que mostraban el salto.
