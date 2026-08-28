# RNF-005 — Accesibilidad

<!--
  ¿Qué? Este archivo antes se llamaba "Motor Base de Datos" y solo listaba qué
        tecnología usábamos (PostgreSQL, SQLAlchemy, Alembic) — eso no es un
        requisito no funcional real, es una restricción técnica, y ya vive
        documentada en docs/requisitos/restricciones.md. Se reemplaza por una
        categoría real de calidad que el repositorio de referencia sí exige y
        que a nosotros nos faltaba: Accesibilidad.
  ¿Para qué? Que la aplicación sea usable por personas con distintas
             capacidades (visión reducida, uso solo de teclado, lectores de
             pantalla) — no es un "extra", es parte de que el producto sirva
             para toda la comunidad del conjunto residencial.
  ¿Impacto? Sin esto documentado, no hay un criterio claro de qué tan
            accesible debe ser cada pantalla nueva que se construya.
-->

---

## Identificación

| Campo         | Valor                     |
| ------------- | -------------------------- |
| **ID**        | RNF-005                     |
| **Nombre**    | Accesibilidad               |
| **Categoría** | Accesibilidad               |
| **Prioridad** | Media                        |
| **Estado**    | Implementado                  |

---

## Requisitos

### RNF-005.1 — Uso de atributos ARIA en componentes interactivos

Los componentes de formulario e interactivos deben incluir atributos ARIA correctos (`aria-invalid`, `aria-describedby`, `aria-hidden`, `aria-label`, `role`) para que la información de estado (errores, carga, iconos decorativos) sea comprensible para lectores de pantalla. Verificado: 25 archivos del frontend ya usan atributos `aria-*` (formularios de autenticación, indicador de fortaleza de contraseña, menú de navegación).

### RNF-005.2 — No depender solo del color para transmitir información

Ningún estado del sistema (error, éxito, fortaleza de una contraseña) debe comunicarse únicamente mediante color. Debe acompañarse siempre de texto o un ícono (WCAG 1.4.1). Verificado en el indicador de fortaleza de contraseña, que combina color con una etiqueta de texto.

### RNF-005.3 — Estructura semántica de la página

El layout principal debe usar elementos HTML semánticos (`<nav>`, `<main>`, `<header>`) con `aria-label` donde el propósito no sea obvio por el contexto, para que la navegación por landmarks funcione con lectores de pantalla. Verificado en `AppShell.tsx`.

### RNF-005.4 — Contraste de color en modo claro y oscuro

Todo componente nuevo debe mantener un contraste de texto legible tanto en modo claro como en modo oscuro — no basta con que se vea bien en uno de los dos modos.

### RNF-005.5 — Navegación por teclado

Los formularios y modales deben poder usarse completamente sin mouse (tab, enter, escape).

> **Estado real (2026-08-28)**: **Verificado.** La auditoría dedicada ya se hizo — `docs/conceptos/accesibilidad-aria-wcag.md`. `Modal.tsx` ya tenía trampa de foco completa (Tab/Shift+Tab), cierre con Esc y restauración del foco al cerrar. La auditoría encontró y corrigió el único hueco real: las filas de notificación no leída solo respondían al clic del mouse — se les agregó `role="button"`, `tabIndex` y manejo de `Enter`/Espacio.
