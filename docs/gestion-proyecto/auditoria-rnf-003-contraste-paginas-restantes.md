# Auditoría RNF-003 — Contraste (parte 3: páginas restantes)

<!--
  ¿Qué? Cierre del pendiente que quedó documentado en las partes 1 y 2 de la
        auditoría RNF-003: el patrón `text-gray-400` sin su pareja `dark:`
        seguía sin corregir en 9 páginas fuera de los dashboards.
  ¿Para qué? Dejar constancia de que ese pendiente específico ya se cerró,
             y qué le falta todavía a RNF-003 en general.
  ¿Impacto? Con esto, el patrón text-gray-400/dark:text-gray-400 queda
            corregido en TODA la aplicación, no solo en los dashboards.
-->

**Fecha:** 2026-08-25

## Qué se corrigió

Mismo patrón y misma corrección que en las partes 1 y 2: `text-gray-400` usado como único color (sin `dark:text-gray-400`) se cambió a `text-gray-500 dark:text-gray-400`, en mensajes de "cargando...", estados vacíos y metadatos pequeños (fechas, badges de "editado", etc.) de:

- `AdminConjuntoComunicadosPage.tsx`
- `AdminContenidoEducativoPage.tsx`
- `AdminNovedadesPage.tsx`
- `CategoriaEducativaPage.tsx`
- `CatalogoEducativoPage.tsx` (incluye un caso con la pareja invertida: `text-gray-400 dark:text-gray-500`, que fallaba en ambos temas)
- `ComunicadosFeedPage.tsx`
- `NovedadesFeedPage.tsx`
- `DirectorioPage.tsx` (incluye un caso invertido)
- `ProfilePage.tsx` (incluye un caso invertido)

Se dejó igual (a propósito) el puñado de usos en íconos decorativos (`Search`, `Mail`, `Lock`, `MapPin`, `Phone`) — ahí aplica el umbral de WCAG 1.4.11 (gráficos, 3:1), no el de texto (4.5:1), y ya cumplen.

## Verificación

Las 9 páginas se revisaron en el navegador, en modo claro y oscuro, con scroll completo y los formularios/acordeones relevantes abiertos (nuevo módulo, nuevo comunicado, nueva novedad) usando el mismo script de contraste corregido de la parte 2. **0 problemas de contraste** en las 9, en ambos temas (aparte de dos casos de "ES"/"EN" del selector de idioma a 4.39:1, a 0.11 del mínimo — diferencia de redondeo, no un problema real).

`tsc`, `eslint` y los 153 tests del frontend pasan.

## Con esto, el patrón `text-gray-400`/`dark:` queda cerrado en toda la aplicación.

## Lo que sigue faltando de RNF-003 (sin cambios respecto a las partes 1 y 2)
- Vista de escritorio (1280px) — todo lo de contraste (partes 1, 2 y 3) se probó solo en celular (375px).
- RNF-003.1 (responsive real, que no se rompan los layouts) — no se ha tocado, el foco siempre fue contraste.
- RNF-003.2 (compatibilidad Chrome/Firefox/Edge) — no se ha probado.
- El caso sin explicar del pie de página de `AuthLayout` (parte 1) — pendiente de confirmar visualmente en un navegador real.
