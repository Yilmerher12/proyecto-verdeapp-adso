# Auditoría RNF-003.1 — Responsive en tablet (parte 5)

<!--
  ¿Qué? Verificación de RNF-003.1 a 768x1024 (tablet), el tamaño intermedio
        que las partes 1-4 no habían probado a fondo (solo se había cubierto
        375px de celular y 1280px de escritorio).
  ¿Para qué? Los puntos de quiebre de Tailwind (sm=640, md=768, lg=1024)
             hacen que un mismo componente se vea bien en celular y en
             escritorio, pero mal justo en el rango intermedio — por eso
             hacía falta un chequeo dedicado a tablet.
  ¿Impacto? Se encontró y se corrigió un bug real de recorte de texto en el
            dashboard de Reciclador. El resto de la app se revisó y no
            presentó problemas a este tamaño.
-->

**Fecha:** 2026-08-25

## Bug encontrado y corregido

**Dashboard de Reciclador — botones de acciones rápidas partidos en 2 líneas.**

Los 4 botones ("Llegué al conjunto", "SHUT está lleno", etc.) usaban 3 columnas desde 640px (`sm:grid-cols-3`). A 768px cada botón medía solo 119px de ancho, y el texto no cabía en una línea — se partía en 2, con alturas distintas entre botones (84px vs 64px), dando una vista desordenada.

- **Antes:** `grid grid-cols-1 gap-2 sm:grid-cols-3` → a 768px, 4 botones de 119px, texto partido en 2 líneas.
- **Después:** `grid grid-cols-1 gap-2 lg:grid-cols-3` → los botones se quedan en una sola columna (ancho completo, 374px, una sola línea) hasta que la pantalla es de escritorio real (1024px o más), donde sí hay espacio de sobra (205px por botón, comprobado sin que el texto se parta).
- **Archivo:** [`fe/src/pages/dashboards/RecicladorDashboard.tsx:223`](../../fe/src/pages/dashboards/RecicladorDashboard.tsx)

Verificado en el navegador a 768px (una columna, 44px de alto, sin partir texto) y a 1024px (3 columnas, 44px de alto, sin partir texto).

## Revisado a 768px — sin problemas

- **Landing / Register (fondo):** las tarjetas de "Cómo funciona" y "Nuestros pilares" pasan a 3 columnas de 224px — se ven bien, sin desbordamiento.
- **Registro:** selector de rol (241px por tarjeta), selects de localidad/tipo de unidad (220px y 144px) — todo cabe sin partirse.
- **Catálogo educativo (Residente):** tarjetas de categorías en 2 columnas de 224px — títulos largos se ajustan en 2-3 líneas dentro de la tarjeta (esperado, no es un botón) sin desbordar.
- **Directorio:** tarjetas de reciclador con botones "Llamar"/"WhatsApp" de 88px — el texto cabe en una línea sin partirse.
- **Admin de Conjunto — formulario "Invitar reciclador":** al estar dentro de un modal de ancho fijo, no depende del tamaño de pantalla — se ve igual que en escritorio.
- **Política de cookies (tabla):** la tabla vive dentro de un contenedor con scroll horizontal propio — no se sale de la página completa.
- **Perfil:** su única grilla (`lg:grid-cols-5`) solo se activa en escritorio (1024px+), así que a 768px se ve en una columna, sin problema.
- Sin desbordamiento horizontal de página (`scrollWidth === clientWidth`) en ninguna de las páginas revisadas.

## Con esto, RNF-003.1 queda verificado en tablet.

## Lo que sigue faltando de RNF-003
- RNF-003.2 (compatibilidad Chrome/Firefox/Edge) — no se ha probado en navegadores reales fuera del entorno de pruebas.
- El caso sin explicar del pie de página de `AuthLayout` (parte 1) — pendiente de confirmar visualmente en un navegador real.
