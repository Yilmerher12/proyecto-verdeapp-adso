# Auditoría de contraste — paleta nueva (RNF-003.3 y RNF-005.4)

<!--
  ¿Qué? Re-medición del contraste de color después del cambio de identidad
        visual (paleta "Páramo Fresco" / "Bosque Andino", tokens night-*,
        colores por rol, tipografía).
  ¿Para qué? Las auditorías anteriores (auditoria-rnf-003-*.md, 2026-08-24/25)
             se hicieron con la paleta vieja: su "verificado" ya no respalda
             los colores actuales. Esta auditoría deja la medición vigente.
  ¿Impacto? Las auditorías anteriores se conservan tal cual como registro
            histórico; esta es la que vale desde 2026-09-27.
-->

**Fecha:** 2026-09-27

## Método

- Medición automática dentro de la app corriendo (`pnpm dev`), con Chrome: para cada par se crea un elemento con **las mismas clases de Tailwind que usan los componentes** (ej. `dark:text-lime-400` sobre `dark:bg-lime-900/30`), se lee el color que el navegador pinta de verdad y se calcula el contraste con la fórmula WCAG 2.1 (`(L1 + 0.05) / (L2 + 0.05)`).
- Las transparencias (ej. `bg-sky-900/30` encima de una tarjeta) se componen sobre su fondo real antes de medir.
- Criterio: **4.5:1** texto normal, **3:1** texto grande (≥ 24 px, o ≥ 18.66 px en negrita) — WCAG 2.1 AA.
- El hero de la landing (texto sobre foto) se midió aparte contra el pixel más claro (percentil 98) de la foto real, porque su fondo no es un color plano.

## Resultados

### Modo claro

| Par | Contraste | Resultado |
| --- | --- | --- |
| Texto principal (`gray-900`) sobre tarjeta | 17.75 | AA |
| Texto secundario (`gray-500`) sobre tarjeta | 4.84 | AA |
| Texto secundario (`gray-500`) sobre fondo de página (`gray-200`) | 4.28 | **Solo texto grande** |
| Texto terciario (`gray-400`) sobre tarjeta | 2.60 | **Falla** |
| `gray-600` sobre tarjeta | 7.56 | AA |
| Enlace `accent-600` / `accent-700` sobre tarjeta | 4.79 / 6.86 | AA |
| Botón primario: blanco sobre `accent-700` | 6.86 | AA |
| Botón peligro: blanco sobre `red-600` | 4.77 | AA |
| Mensaje de éxito: `accent-800` sobre `accent-50` | 8.35 | AA |
| Badges de rol (Administrador / Residente / Reciclador / Admin. conjunto) | 9.90 / 4.81 / 4.92 / 5.49 | AA |
| Sidebar: blanco / ítems (`accent-50/80`) sobre `accent-900` | 11.90 / 7.50 | AA |
| Sidebar: texto del rol (slate / lime / orange / sky) | 8.01 / 7.76 / 6.98 / 7.14 | AA |
| Hero: "App" (`accent-200`) / texto blanco sobre la foto | 3.22 / 4.97 | AA (título = texto grande) |

### Modo oscuro

| Par | Contraste | Resultado |
| --- | --- | --- |
| Texto principal (blanco) sobre `night-card` | 16.39 | AA |
| `gray-300` sobre `night-card` | 11.13 | AA |
| Texto secundario (`gray-400`) sobre `night-card` / `night-page` | 6.30 / 7.16 | AA |
| `gray-500` sobre `night-card` | 3.39 | **Solo texto grande** |
| Campo: `gray-100` sobre `night-field` | 11.78 | AA |
| Enlace `accent-400` sobre `night-card` | 4.89 | AA |
| Botón primario: blanco sobre `accent-700` | 8.82 | AA |
| Mensaje de éxito: `accent-300` sobre `accent-950` | 7.55 | AA |
| Badges de rol (Administrador / Residente / Reciclador / Admin. conjunto) | 6.44 / 9.13 / 6.26 / 6.61 | AA |
| Sidebar: blanco / ítems (`accent-50/80`) sobre `accent-900` | 14.67 / 9.02 | AA |
| Sidebar: texto del rol (slate / lime / orange / sky) | 9.87 / 9.56 / 8.60 / 8.80 | AA |
| Hero: "Verde" (`accent-50`) / "App" (`accent-300`) / texto blanco | 7.30 / 3.56 / 8.04 | AA (título = texto grande) |

**Resumen:** la paleta nueva (verdes, `night-*`, colores por rol, hero) pasa AA en todos sus pares. Los 3 problemas que aparecen son de **grises de Tailwind** que la paleta no cambió.

## Pendientes encontrados (no corregidos en esta auditoría)

1. **`text-gray-400` en texto, modo claro (2.60).** La auditoría del 2026-08-25 lo dio por corregido y dijo que solo quedaba en íconos, pero hoy sigue en texto:
   - Solo `text-gray-400`: `PuntoAcopioForm.tsx:191`, `PuntoAcopioPanel.tsx:216`, `AdminDashboard.tsx:890`, `LandingPage.tsx:549` (enlaces del footer).
   - Pareja invertida `text-gray-400 dark:text-gray-500`, que falla en los dos modos: `AdminContenidoEducativoPage.tsx` (líneas 657, 762, 766, 1059, 1170, 1199, 1287), `AdminNovedadesPage.tsx:665`, `AdminConjuntoDashboard.tsx` (360, 408, 510, 527), `LandingPage.tsx:535`.
   - Corrección esperada: `text-gray-500 dark:text-gray-400`, igual que en la auditoría anterior.
2. **`gray-500` sobre el fondo de página en modo claro (4.28).** Mejoró con la paleta nueva (con el gris anterior daba ~3.9), pero no llega a 4.5 en texto normal que va directo sobre el fondo, fuera de una tarjeta.
3. **`dark:text-gray-500` sobre tarjeta en modo oscuro (3.39).** Mismo caso que el punto 1 (la pareja invertida).

Se dejan para una tarjeta aparte (`fix/`), porque esta auditoría se hizo en una rama de documentación.
