# HU-053 — Residente ve el desempeño semanal de su conjunto

<!--
  ¿Qué? Historia de usuario de la sección "Desempeño de mi conjunto" del panel del
        Residente (issue #488).
  ¿Para qué? Dejar escrito cómo un Residente ve, semana a semana, cómo va la
             separación de residuos de su conjunto, igual que el Admin de Conjunto
             (HU-052) pero sin elegir conjunto ni período.
  ¿Impacto? Reutiliza el panel de HU-052 (`PanelDesempeno`) sin código nuevo de
            gráfica. La lista de auditorías de HU-011 se mantiene debajo. Nota: el
            issue #488 la llamaba HU-051, pero ese número y el 052 ya estaban usados;
            esta es HU-053.
-->

---

## Identificación

| Campo             | Valor                                                              |
| ------------------ | ------------------------------------------------------------------- |
| **ID**             | HU-053                                                              |
| **Título**         | Residente ve el desempeño semanal de su conjunto                     |
| **Módulo**         | Auditoría / Calificaciones                                           |
| **Prioridad**      | Baja                                                                  |
| **Estado**         | Implementada                                                         |
| **RF asociados**   | RQF-009                                                              |

---

## Historia

**Como** Residente,
**quiero** ver en mi panel, semana a semana, cuántas auditorías de mi conjunto salieron Bueno, Regular y Malo, y en qué temas falla,
**para** saber si mi conjunto mejora y motivarme a separar mejor.

---

## Criterios de aceptación

### CA-053.1 — La sección en mi panel

- **Dado que** inicié sesión como Residente,
- **cuando** abro mi panel principal,
- **entonces** veo la sección "Desempeño de mi conjunto", arriba de la lista de auditorías, con la gráfica de las últimas 8 semanas de mi conjunto.
- **y** no hay selector de conjunto ni de período: un Residente pertenece a un solo conjunto y el período es fijo (8 semanas).

### CA-053.2 — Lo mismo que ve el Admin de Conjunto

- **Dado que** abro la sección,
- **cuando** miro su contenido,
- **entonces** veo lo mismo que describe HU-052: las cuatro tarjetas de resumen, la gráfica semanal con su leyenda, las auditorías de la semana que toco ("Ver detalle" abre el detalle de la auditoría), el ranking "Temas del período" y "Ver como tabla".
- **y** se cumple RNF-005 igual: leyenda con ícono y nombre, cada semana es un botón que se usa con teclado, tabla alternativa y sin animaciones.

### CA-053.3 — Solo mi conjunto

- **Dado que** el panel pide el desempeño sin indicar un conjunto,
- **cuando** responde el servidor,
- **entonces** solo recibo el de mi conjunto: el servidor lo resuelve por mi unidad. Pedir el desempeño de otro conjunto responde 403.

### CA-053.4 — Pocos datos

- **Dado que** mi conjunto tiene menos de 4 auditorías en las últimas 8 semanas,
- **cuando** abro el panel,
- **entonces** en lugar de la gráfica veo "Todavía no hay suficientes auditorías para mostrar la gráfica", y la lista de auditorías del período sigue visible.

### CA-053.5 — Si falla, el panel sigue

- **Dado que** falla la carga del desempeño,
- **cuando** abro el panel,
- **entonces** esa sección muestra "No se pudo cargar el desempeño." y el resto del panel (reporte del SHUT, notificaciones, historial) sigue funcionando.

---

## Fuera de alcance

- Cambiar la lista de auditorías que ya ve (HU-011): se mantiene debajo de la sección.
- Desglose por reciclador: las gráficas son del conjunto, nunca de una persona.
- Cualquier cosa del Admin de Conjunto o del Administrador del Sistema.
