# Accesibilidad Web — ARIA y WCAG en VerdeApp

<!--
  ¿Qué? Documentación pedagógica de accesibilidad web (WCAG 2.1 y ARIA)
        aplicada en VerdeApp, con evidencia real (archivo y línea) de qué
        ya se cumple y qué se corrigió en esta misma auditoría.
  ¿Para qué? Tarjeta #16 del backlog. VerdeApp la usan personas reales de un
             conjunto residencial — un residente mayor con baja visión, o
             alguien que solo navega con teclado, deben poder usarla igual.
  ¿Impacto? No es solo teoría: se auditó todo el frontend (fe/src) y se
            corrigieron 6 huecos reales encontrados en el camino, no solo
            se documentó lo que ya estaba bien.
-->

> **Estándar de referencia**: [WCAG 2.1 — W3C](https://www.w3.org/TR/WCAG21/)
> **Especificación ARIA**: [WAI-ARIA 1.2 — W3C](https://www.w3.org/TR/wai-aria-1.2/)

---

## ¿Qué es la Accesibilidad Web?

Garantiza que **todas las personas** puedan usar VerdeApp, sin importar sus capacidades. Pensando en quién de verdad usa esta app: un Residente mayor que usa el lector de pantalla de su celular, un Reciclador que solo tiene el teléfono y navega con el dedo (no aplica aquí, pero sí quien navega solo con teclado en un computador compartido), o alguien con daltonismo que no puede distinguir el verde/rojo de los niveles de auditoría.

### Los 4 principios WCAG — POUR

| Principio | Descripción | Ejemplo en VerdeApp |
| --- | --- | --- |
| **P**erceptible | La información debe presentarse de forma perceptible | Los niveles de auditoría (Bueno/Regular/Malo) usan color **y** ícono **y** texto, nunca solo color |
| **O**perable | Los componentes deben poder operarse | El Modal atrapa el `Tab`, se cierra con `Esc`; las notificaciones ahora responden a `Enter`/Espacio |
| **U**nderstandable | La información y la interfaz deben ser comprensibles | Cada campo de formulario tiene su `<label>`, los errores se anuncian con `role="alert"` |
| **R**obust | El contenido debe ser interpretable por tecnologías asistivas | `role="dialog"`, `role="radiogroup"`, HTML semántico (`<main>`, `<nav>`) |

> **Objetivo de VerdeApp**: Conformidad **WCAG 2.1 AA**.

---

## ¿Qué es ARIA?

Atributos que añaden semántica que el HTML nativo no puede expresar por sí solo.

```html
<!-- HTML nativo — el navegador ya sabe que esto es un botón -->
<button>Enviar</button>

<!-- ARIA necesario — un grupo de botones de radio hecho a mano -->
<div role="radiogroup" aria-label="Nivel de desempeño">
  <button role="radio" aria-checked="true">Bueno</button>
</div>
```

### Regla de oro: primero HTML semántico

VerdeApp sigue esta regla en casi todo el código: usa `<button>` (nunca `<div onClick>`), `<label htmlFor>`, `<main>`/`<nav>`. ARIA solo entra cuando el HTML nativo no alcanza a describir el comportamiento — como el `role="radiogroup"` del selector de nivel de auditoría, que HTML no tiene forma nativa de expresar con botones estilizados.

---

## Estado de Accesibilidad — Resumen por archivo

| Componente | Nivel | Qué cubre |
| --- | --- | --- |
| `components/ui/Modal.tsx` | ✅ AA+ | `role="dialog"`, `aria-modal`, trampa de foco, `Esc`, restaura el foco al cerrar |
| `components/ui/InputField.tsx` | ✅ AA+ | `label`+`htmlFor`, `aria-invalid`, `aria-describedby`, error con `role="alert"` |
| `components/ui/LanguageSwitcher.tsx` | ✅ AA | `aria-pressed` correcto (el único caso que ya lo tenía bien) |
| `components/ui/PasswordStrengthIndicator.tsx` | ✅ AA | Barras de color con `aria-hidden`, info real en `role="status"` |
| `components/dashboard/NotificationFeed.tsx` | ✅ AA (corregido) | Punto de "no leída" + fila completa, ver corrección #1 y #2 abajo |
| `components/layout/AppShell.tsx` | ✅ AA (corregido) | Badge de notificaciones, ver corrección #3 abajo |
| `components/ui/ThemeToggle.tsx` | ✅ AA (corregido) | `aria-pressed` agregado, ver corrección #4 abajo |
| `components/AuditoriaConjuntoForm.tsx` | ✅ AA (corregido) | `role="radiogroup"`, ver corrección #5 abajo |
| `components/layout/LegalLayout.tsx` | ✅ AA (corregido) | `<nav>` sin `aria-label`, ver corrección #6 abajo |

---

## Lo que ya estaba bien implementado (con evidencia real)

### Modal — `components/ui/Modal.tsx`

Es el componente más completo de accesibilidad de todo el proyecto:

```tsx
<div
  ref={dialogRef}
  role="dialog"
  aria-modal="true"
  aria-label={ariaLabel}
  tabIndex={-1}
>
```

- **Trampa de foco (Tab/Shift+Tab)**: encuentra todos los elementos enfocables del diálogo y hace que el último `Tab` vuelva al primero (y viceversa con `Shift+Tab`) — sin esto, un usuario de teclado podría "escaparse" del modal hacia el contenido de fondo.
- **Cierra con `Esc`**: `if (e.key === "Escape") onClose()`.
- **Restaura el foco al cerrar**: guarda `document.activeElement` antes de abrir, y lo vuelve a enfocar al cerrar — si no, después de cerrar un modal el foco del teclado se pierde en el limbo.
- **Bloquea el scroll del fondo** mientras está abierto.

### Formularios — `components/ui/InputField.tsx`

```tsx
<label htmlFor={name}>{label}</label>
<input
  id={name}
  aria-invalid={!!error}
  aria-describedby={error ? `${name}-error` : undefined}
/>
{error && <p id={`${name}-error`} role="alert">{error}</p>}
```

Un lector de pantalla, al enfocar un campo con error, anuncia: *"correo inválido, editar texto, Correo electrónico, correo inválido — revisa el formato"*. Esto cubre 3 criterios WCAG a la vez: `1.3.1` (relación label-input), `3.3.1` (identificación del error), `4.1.2` (estado del campo).

### Íconos decorativos — patrón consistente en toda la app

Todo ícono puramente decorativo (que no aporta información que el texto de al lado ya no diga) tiene `aria-hidden="true"` — confirmado en `Alert.tsx`, `Button.tsx` (el spinner de carga), `ThemeToggle.tsx`, `ConjuntoCombobox.tsx`, entre otros. Regla práctica del proyecto: si el ícono es el ÚNICO contenido de un botón, ese botón lleva `aria-label`; si el ícono acompaña texto visible, el ícono lleva `aria-hidden`.

---

## Correcciones aplicadas en esta auditoría (2026-08-28)

La auditoría encontró 6 huecos reales. Se corrigieron los 6 en el mismo momento — no quedaron como pendientes documentados.

### 1. Punto de "no leída" sin alternativa textual — `NotificationFeed.tsx`

**Antes**: un punto de color, sin `aria-label` ni texto — la única señal de "esto no está leído" era visual.

**Ahora**: la fila completa (cuando no está leída) lleva un `aria-label` que incluye el mensaje de la notificación, y el punto pasa a `aria-hidden="true"` (la información ya la lleva el `aria-label` de la fila).

### 2. Fila de notificación no operable por teclado — `NotificationFeed.tsx`

**Antes**: `<li onClick={...}>` — un `<li>` no es enfocable ni activable con teclado de forma nativa.

**Ahora**:

```tsx
<li
  onClick={() => !n.leida && onMarkRead(n.id)}
  onKeyDown={(e) => {
    if (!n.leida && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onMarkRead(n.id);
    }
  }}
  role={!n.leida ? "button" : undefined}
  tabIndex={!n.leida ? 0 : undefined}
  aria-label={!n.leida ? `${n.mensaje}. ${t("notificationFeed.markReadHint")}` : undefined}
>
```

Una notificación ya leída (donde el clic no hace nada) se queda como texto plano — no tiene sentido hacerla "enfocable" si no hay ninguna acción disponible.

### 3. Contador de no leídas invisible para lectores de pantalla — `AppShell.tsx`

**Antes**: la campana de notificaciones tenía `aria-label="Notificaciones"` fijo — cuando un elemento tiene `aria-label`, ese texto **reemplaza por completo** cualquier contenido de sus hijos para efectos de accesibilidad. El número dentro del badge (`{noLeidas}`) nunca se anunciaba, aunque un usuario vidente sí lo veía.

**Ahora**: el `aria-label` es dinámico — `"Notificaciones, 3 sin leer"` cuando hay pendientes.

### 4. Toggle de tema sin `aria-pressed` — `ThemeToggle.tsx`

**Antes**: solo `aria-label` (que cambia de texto según el estado). **Ahora**: además `aria-pressed={isDark}`, igual que ya hacía correctamente `LanguageSwitcher.tsx` para el selector ES/EN — mismo patrón de botón de dos estados, ahora aplicado consistentemente en los dos lugares donde existe.

### 5. Selector de nivel de auditoría sin semántica de grupo — `AuditoriaConjuntoForm.tsx`

**Antes**: 3 botones (Bueno/Regular/Malo) donde "cuál está elegido" solo se comunicaba con una clase CSS (un borde de color).

**Ahora**:

```tsx
<div role="radiogroup" aria-label="Nivel de desempeño">
  <button role="radio" aria-checked={seleccionado}>Bueno</button>
  ...
</div>
```

Un lector de pantalla ahora anuncia *"Bueno, botón de radio, seleccionado, 1 de 3"* — antes solo decía *"Bueno, botón"*, sin ninguna pista de que era parte de un grupo de opciones ni de cuál estaba activa.

### 6. `<nav>` sin `aria-label` — `LegalLayout.tsx`

Era el único `<nav>` de la app sin etiquetar — `AppShell.tsx`, `AuthLayout.tsx` y `LandingPage.tsx` ya lo hacían bien. Se agregó `aria-label={t("legal.navAriaLabel")}` por consistencia.

---

## Patrones ARIA de referencia usados en VerdeApp

### Grupo de botones mutuamente excluyentes (radiogroup)

```tsx
<div role="radiogroup" aria-label="...">
  <button role="radio" aria-checked={seleccionado} onClick={...}>...</button>
</div>
```

### Estado de carga / procesando

```tsx
<button aria-busy={enviando} disabled={enviando}>
  {enviando && <Loader2 aria-hidden="true" className="animate-spin" />}
  {enviando ? "Enviando..." : "Enviar"}
</button>
```

### Botón de dos estados (toggle)

```tsx
<button aria-pressed={activo} aria-label={activo ? "Desactivar X" : "Activar X"}>
```

---

## Checklist de Accesibilidad — Para Pull Requests futuros

- [ ] ¿Todo ícono decorativo tiene `aria-hidden="true"`?
- [ ] ¿Todo botón con solo ícono tiene `aria-label`?
- [ ] ¿Todo `<input>` tiene su `<label htmlFor>`?
- [ ] ¿Los mensajes de error usan `role="alert"`?
- [ ] ¿Un elemento con `aria-label` sigue comunicando TODO lo importante que había en su contenido visual (como un contador)?
- [ ] ¿Un elemento clickeable no-nativo (`<div>`, `<li>`) tiene `role`, `tabIndex` y `onKeyDown` para Enter/Espacio?
- [ ] ¿Un grupo de opciones mutuamente excluyentes usa `role="radiogroup"` + `aria-checked`, no solo una clase CSS?
- [ ] ¿Un botón de dos estados usa `aria-pressed`?
- [ ] ¿Los `<nav>` de la página tienen `aria-label` (sobre todo si hay más de uno)?
- [ ] ¿Se puede completar el flujo completo solo con teclado (`Tab`, `Enter`, `Esc`)?

---

## Herramientas de Testing de Accesibilidad

| Herramienta | Tipo | Qué detecta |
| --- | --- | --- |
| [axe DevTools](https://www.deque.com/axe/) | Extensión de navegador | ~57% de problemas automáticamente |
| [WAVE](https://wave.webaim.org/) | Extensión / online | Errores, alertas, estructura |
| Lighthouse (Chrome DevTools) | Integrado en el navegador | Puntaje de accesibilidad |
| NVDA (gratis, Windows) | Lector de pantalla real | El único testing que detecta el resto |

> Las herramientas automáticas detectan una fracción de los problemas reales — de hecho, ninguna de las 6 correcciones de esta auditoría las habría detectado una herramienta automática (todas requieren entender el CONTEXTO: qué información se pierde, qué acción no se puede hacer con teclado). El testing manual y la lectura cuidadosa del código siguen siendo indispensables.

---

## Recursos de Aprendizaje

| Recurso | URL |
| --- | --- |
| WCAG 2.1 Quick Reference | https://www.w3.org/WAI/WCAG21/quickref/ |
| WAI-ARIA Authoring Practices | https://www.w3.org/WAI/ARIA/apg/ |
| A11y Project Checklist | https://www.a11yproject.com/checklist/ |
| MDN ARIA | https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA |

---

> **Conclusión pedagógica**: de los 6 huecos encontrados, ninguno era "no saber cómo hacerlo bien" — el proyecto ya tenía el patrón correcto implementado en OTRO componente casi idéntico (`LanguageSwitcher.tsx` ya usaba `aria-pressed` correctamente; `ThemeToggle.tsx`, un botón de dos estados igual de simple, no lo tenía). La lección real de esta auditoría: cuando un patrón de accesibilidad ya existe en el proyecto, vale la pena revisar si se aplicó en TODOS los lugares donde aplica, no solo en el primero donde se pensó.
