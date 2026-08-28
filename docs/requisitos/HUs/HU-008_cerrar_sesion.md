# HU-008 — Cerrar sesión

<!--
  ¿Qué? Historia de usuario que describe el cierre de sesión con confirmación.
  ¿Para qué? Evitar cierres accidentales y proteger la cuenta si el dispositivo es compartido.
  ¿Impacto? Seguridad básica de cualquier sistema con sesiones.
-->

---

## Identificación

| Campo             | Valor           |
| ------------------ | ---------------- |
| **ID**             | HU-008            |
| **Título**         | Cerrar sesión     |
| **Módulo**         | Autenticación     |
| **Prioridad**      | Alta              |
| **Estado**         | Parcial           |
| **RF asociados**   | RQF-007           |

---

## Historia

**Como** usuario autenticado (de cualquier rol),
**quiero** cerrar mi sesión de forma segura y con confirmación,
**para** proteger mi cuenta, especialmente si uso un dispositivo compartido.

---

## Criterios de aceptación

### CA-008.1 — Botón de cerrar sesión visible

- **Dado que** estoy autenticado,
- **cuando** reviso el menú lateral,
- **entonces** debo encontrar la opción "Cerrar sesión".

### CA-008.2 — Modal de confirmación

- **Dado que** presiono "Cerrar sesión",
- **cuando** el sistema responde,
- **entonces** debe mostrarme un modal preguntando si estoy seguro, con opciones de confirmar o cancelar.

### CA-008.3 — Cancelar el cierre de sesión

- **Dado que** el modal de confirmación está abierto,
- **cuando** presiono "Cancelar",
- **entonces** el modal se cierra y mi sesión continúa activa sin cambios.

### CA-008.4 — Confirmar el cierre de sesión

- **Dado que** el modal de confirmación está abierto,
- **cuando** confirmo,
- **entonces** mis tokens de sesión se eliminan del navegador y soy redirigido fuera de las páginas protegidas.

### CA-008.5 — Token inválido tras cerrar sesión

- **Dado que** ya cerré sesión,
- **cuando** cualquier intento intenta reusar el mismo token anterior,
- **entonces** el sistema debe rechazarlo.

> **Nota (2026-08-28)**: este criterio **no está implementado**. Cerrar sesión hoy es 100% del lado del cliente (`AuthContext.tsx` borra el token del navegador y redirige) — no existe ningún endpoint de logout en el backend, así que un token JWT robado (o guardado antes de cerrar sesión) sigue siendo válido hasta que expire naturalmente (15 minutos para el `access_token`). CA-008.1 a CA-008.4 sí funcionan correctamente. Cerrarlo del todo requiere una lista de tokens invalidados (o acortar aún más la expiración) — no implementado todavía.
