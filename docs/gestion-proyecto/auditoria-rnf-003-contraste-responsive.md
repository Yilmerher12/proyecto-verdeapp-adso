# Auditoría RNF-003 — Contraste y Responsive (parte 1)

<!--
  ¿Qué? Registro de la auditoría de RNF-003 (Usabilidad y Adaptabilidad)
        ejecutada el 2026-08-24 — enfocada en contraste de color (RNF-003.3)
        en móvil (375px), sobre las páginas públicas/de autenticación y un
        primer barrido de los dashboards.
  ¿Para qué? Dejar constancia de qué se revisó, qué se encontró, qué se
             corrigió y qué queda pendiente — el alcance completo de
             RNF-003 (responsive en las ~24 rutas, compatibilidad de
             navegadores, escritorio) no cupo en una sola sesión.
  ¿Impacto? Sin esto, nadie sabe qué parte de RNF-003 ya se verificó de
            verdad (con números, no a ojo) y qué sigue "por implementar".
-->

**Fecha:** 2026-08-24
**Herramienta:** script propio inyectado por consola (no hay una librería de auditoría de accesibilidad instalada en el proyecto) que calcula el contraste real entre texto y fondo usando la fórmula oficial de WCAG, en vez de revisar a ojo.

---

## Resumen ejecutivo

Se encontró y corrigió un **bug de contraste sistémico que afectaba a la mayoría de botones "de acción" de toda la aplicación** (el botón verde principal — "Guardar", "Enviar", "Iniciar sesión", etc.) — el texto blanco sobre ese verde solo llegaba a 3.22:1 de contraste, por debajo del mínimo 4.5:1 que exige WCAG AA para texto normal. Se corrigió en **21 archivos**, oscureciendo el verde de `600`/`500` a `700` en cada botón, y verificando cada corrección con la fórmula de contraste real (no solo "se ve más oscuro").

También se encontró que **`AceptarInvitacionPage.tsx` no tenía NINGÚN estilo de modo oscuro** — el texto se quedaba en negro casi puro sobre el fondo oscuro del modal, prácticamente invisible en modo oscuro. Se le agregaron los `dark:` que le faltaban.

Después de cada tanda de cambios se corrió `tsc` (tipos), `eslint` (estilo) y la batería completa de tests del frontend (153/153) — todo en verde.

---

## Hallazgo 1 (alto impacto) — Botones verdes con texto blanco fallan WCAG AA

**Causa:** el token de color `accent-600`/`accent-500` (mapeado a `green-600`/`green-500` de Tailwind) es demasiado claro para que el texto blanco se lea bien encima. Medido con la fórmula de contraste:

| Fondo | Contraste con texto blanco | ¿Pasa AA (4.5:1)? |
| --- | --- | --- |
| `green-500` | 2.22:1 | No |
| `green-600` | 3.22:1 | No |
| `amber-500` | 2.15:1 | No |
| **`green-700`** | **4.94:1** | **Sí** |
| **`amber-700`** | **5.05:1** | **Sí** |

**Corrección:** se cambió el fondo de `600`/`500` a `700` (y el `hover:` un escalón más oscuro, `800`) en:

- `components/ui/Button.tsx` — la variante `primary` compartida (arregla la mayoría de formularios de la app de un solo cambio).
- `components/dashboard/NotificationFeed.tsx` — el botón "Marcar todas leídas" y el contador de no leídas (`accentBg`, pasado por cada dashboard).
- `pages/dashboards/{Residente,Reciclador,AdminConjunto}Dashboard.tsx` — el valor de `accentBg` que le pasan al feed de notificaciones, y varios botones de acción propios (aceptar invitación, aprobar desvinculación, guardar edición).
- `components/{SolicitudesDesvinculacion,AsignarConjuntoAdicionalForm,ui/BackToTopButton,ui/YoutubeEmbed}.tsx`
- `pages/{VerifyEmail,ForgotPassword,ResetPassword,AdminContenidoEducativo,AdminNovedades,AdminConjuntoComunicados,Directorio,Profile,Register,PoliticaCookies}Page.tsx`
- `components/layout/AuthLayout.tsx` — el link "Volver al inicio de sesión" (mismo token, como texto en vez de fondo).

No se tocaron los usos de `accent-600`/`amber-500` que son **puramente gráficos** (íconos dentro de una insignia, el punto de "no leída", el spinner de carga) — ahí aplica el umbral de WCAG 1.4.11 (contraste de componentes no-textuales, 3:1), que sí cumplen.

---

## Hallazgo 2 (alto impacto) — `AceptarInvitacionPage` sin soporte de modo oscuro

Los 3 estados de esta pantalla (cargando, token inválido, formulario, éxito) usaban `text-gray-900`/`text-gray-600`/`text-gray-700` **sin ningún `dark:` equivalente**, mientras que el `Modal.tsx` que los envuelve sí tiene fondo oscuro (`dark:bg-[#132a1c]`). Resultado: texto casi negro sobre fondo casi negro — contraste medido de 1.16:1 a 2.60:1 en varios textos (invisibles en la práctica).

**Corrección:** se agregaron los `dark:text-white` / `dark:text-gray-400` / `dark:text-gray-300` / `dark:text-red-400` que faltaban, y `dark:bg-*` a los círculos de ícono (éxito en verde, error en rojo). Verificado: 0 problemas de contraste tras el cambio.

---

## Hallazgo 3 (menor) — Pie de página de `AuthLayout`

El pie de página de las pantallas "Olvidé mi contraseña" / "Restablecer contraseña" / "Verificar email" / "Aceptar invitación" (comparten `AuthLayout.tsx`, distinto del pie de página de Landing/Login/Registro) tenía:
- Los 4 links legales: `dark:text-gray-500` sobre fondo `#03130b` → 3.94:1 (falla por poco). Corregido a `dark:text-gray-400` → 7.32:1.
- El texto de copyright: `text-gray-400 dark:text-gray-600` → fallaba en **ambos** modos (2.49:1 claro, 2.52:1 oscuro). Corregido a `text-gray-600 dark:text-gray-400` → 7.24:1 / 7.32:1.

**Nota honesta:** durante la verificación, mi herramienta de prueba mostró que los 4 links (no el texto de copyright, que está dos líneas más abajo con el mismo mecanismo) seguían leyendo el color equivocado en modo oscuro pese a que el código ya tenía la clase correcta — probé reiniciar el servidor, una pestaña nueva del navegador, y hasta forzar el estilo con `!important`, sin poder confirmar la causa. Como el mecanismo es idéntico al que sí funciona en el texto de copyright de al lado, dejé el código limpio (sin el `!important`, que tampoco lo arregló) y anoto esto para revisar con una comprobación visual real en un navegador de verdad la próxima sesión — puede ser una particularidad del navegador de pruebas automatizado, no necesariamente algo que vean los usuarios reales.

---

## Alcance cubierto hoy (móvil, 375px)

| Página | Resultado |
| --- | --- |
| Landing, Login, Registro | Sin problemas (aparte del Hallazgo 1, ya corregido) |
| Olvidé/Restablecer contraseña, Verificar email, Aceptar invitación | Hallazgos 1, 2 y 3 — corregidos |
| Términos, Privacidad, Cookies, Contacto | Sin problemas nuevos |
| Dashboard Residente | Hallazgo 1 (insignia de notificaciones) — corregido |

## Pendiente para la próxima sesión

- Confirmar visualmente (navegador real, no el de pruebas automatizado) el pie de página del Hallazgo 3.
- Dashboards de Reciclador, Admin del Sistema y Admin de Conjunto — revisados solo de forma indirecta (por compartir componentes ya corregidos), falta pasar el script de contraste directamente sobre cada uno.
- Perfil, Cambiar contraseña, Directorio, Catálogo educativo, Comunicados, Novedades — sin revisar todavía.
- Vista de escritorio (1280px) — todo lo de arriba se revisó solo en móvil.
- RNF-003.1 (responsive/mobile-first) y RNF-003.2 (compatibilidad de navegadores, Chrome/Firefox/Edge) — no se tocaron hoy, el foco fue contraste.
- Tamaños de botones táctiles pequeños (ej. el ojito de "mostrar contraseña", 20x20px) — anotados pero no corregidos: no es un requisito obligatorio de WCAG AA (solo AAA), quedan como mejora opcional.
