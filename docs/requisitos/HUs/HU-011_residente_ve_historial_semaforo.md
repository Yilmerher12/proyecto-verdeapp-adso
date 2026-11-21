# HU-011 — Residente consulta el historial del semáforo

<!--
  ¿Qué? Historia de usuario para que el residente vea las calificaciones históricas de su conjunto.
  ¿Para qué? Que la comunidad sepa cómo ha ido mejorando (o no) su separación de residuos.
  ¿Impacto? Da visibilidad y motiva la mejora continua.
-->

---

## Identificación

| Campo             | Valor                                            |
| ------------------ | --------------------------------------------------|
| **ID**             | HU-011                                              |
| **Título**         | Residente consulta el historial del semáforo         |
| **Módulo**         | Auditoría / Calificaciones                           |
| **Prioridad**      | Baja (opcional)                                       |
| **Estado**         | Implementada                                          |
| **RF asociados**   | RQF-009                                             |

---

## Historia

**Como** residente,
**quiero** ver el historial de calificaciones del semáforo de mi conjunto,
**para** saber qué tan bien estamos separando los residuos y en qué podemos mejorar.

---

## Criterios de aceptación

### CA-011.1 — Ver historial

- **Dado que** entro a la sección del semáforo de mi conjunto,
- **cuando** la página carga,
- **entonces** debo ver la lista de calificaciones históricas, con fecha, color y observación (si la hay).

### CA-011.2 — Solo lectura

- **Dado que** soy residente,
- **cuando** veo el historial del semáforo,
- **entonces** no debo tener ninguna opción para crear o modificar calificaciones — solo verlas.

### CA-011.3 — Sin historial todavía

- **Dado que** mi conjunto nunca ha sido calificado,
- **cuando** entro a la sección,
- **entonces** debo ver un mensaje indicando que todavía no hay calificaciones registradas.

### CA-011.4 — Muchas calificaciones

- **Dado que** mi conjunto tiene más de 10 calificaciones,
- **cuando** entro a la sección,
- **entonces** veo las 10 más recientes y, debajo, "Mostrando 1–10 de N" con flechas para pasar de página; ninguna calificación se queda fuera de la lista.

> **Actualización (2026-11-03, issue #593)**: el historial ya no es un bloque aparte del panel. Es la pestaña "Todas las auditorías" de la tarjeta "Mi conjunto" (junto a "Semana elegida" y "Por tema"). La lista se pide solo al abrir la pestaña. Con menos de 4 auditorías en el período no hay pestañas: se ve directo este historial completo.

> **Implementado**: antes la lista traía solo las 50 más recientes y cortaba el resto sin avisar. Ahora `GET /auditorias-conjunto/historial` recibe `limit` y `offset` y responde `{items, total}` (ver RQF-009). Con 10 calificaciones o menos no se muestra la barra de páginas.

### CA-011.5 — Detalle de una calificación (issue #556)

- **Dado que** veo una calificación en el historial,
- **cuando** la toco,
- **entonces** se abre su ficha: arriba el veredicto (cara, nivel Bueno, Regular o Malo, y el conjunto), a la izquierda la evidencia en grande con contador y flechas si hay más de una foto (también con el teclado), y a la derecha el tema, las observaciones (con "Ver más" si son largas), el nombre del reciclador y la fecha. Tocar una foto la abre en tamaño completo.
- **y** si la foto ya se borró por el plazo de retención de 6 meses (issue #587), la ficha dice "La foto ya no está disponible" y conserva todo lo demás.
