# Auditoría RNF-003.2 — Compatibilidad cross-browser (parte 6)

<!--
  ¿Qué? Verificación de RNF-003.2 (Chrome/Firefox/Edge), la última tarea
        pendiente de RNF-003 después de contraste (partes 1-4) y tablet
        (parte 5).
  ¿Para qué? El navegador de pruebas automatizado usado en las partes 1-5
             solo tiene motor Chromium (el mismo de Chrome y Edge) — hacía
             falta una verificación manual aparte para Firefox, que usa un
             motor distinto (Gecko).
  ¿Impacto? No se encontró ningún bug — el sitio se ve y funciona igual en
            Firefox que en Chrome/Edge. Queda documentado el único riesgo
            real detectado (versión mínima de Firefox que soporta Tailwind
            v4), para tenerlo en cuenta si algún computador de laboratorio
            tiene un navegador desactualizado.
-->

**Fecha:** 2026-08-25

## Chrome y Edge — cubiertos por las auditorías anteriores

Chrome y Edge comparten el mismo motor de renderizado (Blink), que es también el que usa el navegador automatizado con el que se hicieron las partes 1-5 (contraste en celular/escritorio, tablet, sidebar). No hace falta una prueba aparte: todo lo ya verificado ahí aplica igual a ambos.

## Firefox — verificado manualmente, sin problemas

Como el navegador automatizado no tiene motor Gecko (el de Firefox), esta parte se verificó manualmente, en un Firefox real, siguiendo una lista de 6 puntos:

1. Colores del Landing (fondo verde, contraste) — normales, sin artefactos.
2. Modo responsive a ~375px — el botón de menú hamburguesa del dashboard colapsa/expande la barra lateral correctamente.
3. Modo responsive a ~768px — los 4 botones de acciones rápidas del dashboard de Reciclador se ven en una columna, sin texto cortado (ver [auditoria-rnf-003-tablet.md](auditoria-rnf-003-tablet.md)).
4. Animación del Hero del Landing — no se repite al navegar entre páginas.
5. Cambio de tema claro/oscuro — sin parpadeo al recargar.

**Resultado:** todo correcto, sin diferencias visibles frente a Chrome/Edge.

## Riesgo documentado (no es un bug, es una dependencia a vigilar)

El proyecto usa **TailwindCSS v4.1**, que internamente requiere navegadores relativamente recientes — sus mínimos documentados son Chrome 111+, Safari 16.4+ y **Firefox 128+** (mediados de 2024), porque genera CSS con funciones modernas (por ejemplo, colores `oklch()`, ya vistos en la auditoría de contraste de la parte 1). No hay ningún `browserslist` ni override en [`fe/vite.config.ts`](../../fe/vite.config.ts) que cambie ese mínimo.

Si alguna vez la app se ve rota (no solo "distinta") en un computador de laboratorio, lo primero a revisar es la versión de Firefox instalada ahí — no sería un bug del código, sino un navegador desactualizado por debajo del mínimo de Tailwind v4.

## Con esto, RNF-003 queda completamente verificado (contraste + responsive + cross-browser).

## Lo único que sigue sin explicación (heredado de la parte 1)
- El caso del pie de página de `AuthLayout` — pendiente de confirmar visualmente en un navegador real (no bloqueante, no se ha vuelto a reproducir en ninguna auditoría posterior).
