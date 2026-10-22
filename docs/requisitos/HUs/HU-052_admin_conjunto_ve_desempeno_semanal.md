# HU-052 — Admin de Conjunto ve el desempeño semanal de su conjunto

<!--
  ¿Qué? Historia de usuario de la página "Desempeño" del Admin de Conjunto
        (issue #487).
  ¿Para qué? Dejar escrito cómo un Admin de Conjunto ve, semana a semana, si la
             separación de residuos de su conjunto mejora o empeora y en qué temas falla.
  ¿Impacto? Reemplaza la barra semanal que vivía dentro del acordeón de cada
            conjunto (UTC, solo las últimas 50 auditorías de todos los conjuntos
            mezcladas). Se apoya en los endpoints de desempeño del issue #486
            (RQF-009). Nota: el issue #487 la llamaba HU-050, pero ese número ya
            lo usa "Admin de Conjunto ve los avisos de cada uno de sus conjuntos";
            esta es HU-052.
-->

---

## Identificación

| Campo             | Valor                                                              |
| ------------------ | ------------------------------------------------------------------- |
| **ID**             | HU-052                                                              |
| **Título**         | Admin de Conjunto ve el desempeño semanal de su conjunto             |
| **Módulo**         | Auditoría / Calificaciones                                           |
| **Prioridad**      | Baja                                                                  |
| **Estado**         | Implementada                                                         |
| **RF asociados**   | RQF-009                                                              |

---

## Historia

**Como** Administrador de Conjunto,
**quiero** ver en una página, semana a semana, cuántas auditorías de mi conjunto salieron Bueno, Regular y Malo, y en qué temas falla,
**para** saber si mi conjunto mejora o empeora y decidir qué reforzar con los residentes.

---

## Criterios de aceptación

### CA-052.1 — La página "Desempeño"

- **Dado que** inicié sesión como Administrador de Conjunto,
- **cuando** abro "Desempeño" en el menú lateral (`/admin-conjunto/desempeno`),
- **entonces** veo la gráfica de las últimas 8 semanas de mi conjunto. Puedo cambiar el período a 4 o 12 semanas, y si administro varios conjuntos, elegir cuál ver (una pestaña por conjunto).
- **y** arriba hay cuatro tarjetas: auditorías del período, porcentaje calificado Bueno, tema a reforzar y fecha de la última auditoría.

### CA-052.2 — La gráfica semanal

- **Dado que** el período tiene al menos 4 auditorías,
- **cuando** miro la gráfica,
- **entonces** cada barra es una semana (de lunes a domingo, en hora de Bogotá) con la cantidad de auditorías Bueno, Regular y Malo escrita dentro de su color. Debajo de cada barra está el rango de fechas ("14 sept al 20 sept") y la semana en curso dice "en curso".
- **y** las semanas sin auditorías aparecen vacías, para ver los huecos.
- **y** en celular la gráfica se desplaza hacia un lado y abre en lo más reciente.

### CA-052.3 — El detalle de una semana

- **Dado que** veo la gráfica,
- **cuando** toco una barra (o su rótulo),
- **entonces** debajo aparece la lista de auditorías de esa semana: tema, fecha y nivel con ícono y nombre, con un botón "Ver detalle" que abre el detalle de la auditoría (fotos, descripción y quién la hizo).
- **y** al entrar viene abierta la semana más reciente que tenga auditorías.

### CA-052.4 — Temas del período

- **Dado que** veo la gráfica,
- **cuando** miro "Temas del período",
- **entonces** cada tema muestra "Regular o Malo: X de N" (o "Sin Regular ni Malo (N)"), con el que más Regular o Malo arriba, y un aviso de que con pocos datos es una pista y no una conclusión.
- **y** puedo verlo como tabla, con las cifras por nivel.

### CA-052.5 — Pocos datos

- **Dado que** el período tiene menos de 4 auditorías,
- **cuando** abro la página,
- **entonces** en lugar de la gráfica y del ranking veo "Todavía no hay suficientes auditorías para mostrar la gráfica", y debajo la lista de las auditorías del período.
- **y** el mínimo (4) y los períodos (4, 8, 12 semanas; 8 por defecto) viven en un solo lugar: `fe/src/config/desempeno.ts`.

### CA-052.6 — Accesible sin depender del color (RNF-005)

- **Dado que** uso lector de pantalla, teclado o no distingo los colores,
- **cuando** uso la página,
- **entonces** la leyenda trae color, ícono (carita) y nombre de cada nivel; cada barra es un botón con su descripción completa ("Semana del 19 al 25 oct: Bueno 3, Regular 1, Malo 0") que se activa con Tab y Enter o Espacio; y "Ver como tabla" muestra los mismos números.
- **y** la gráfica no tiene animación, así que no hay movimiento que apagar con "reducir movimiento".

### CA-052.7 — El historial salió del acordeón

- **Dado que** abro uno de mis conjuntos en el panel principal,
- **cuando** miro su contenido,
- **entonces** ya no aparece el historial semanal: vive en la página "Desempeño".

---

## Fuera de alcance

- Desglose por reciclador: las gráficas son del conjunto, nunca de una persona.
- Vista para el Administrador del Sistema, PDF con la gráfica, mapa de tema por semana y líneas de tendencia con porcentajes.
- La sección del Residente (HU siguiente, issue #488): reutiliza los componentes de esta página.
