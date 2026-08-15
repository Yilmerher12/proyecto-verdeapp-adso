# HU-003 — Residente reporta SHUT lleno

<!--
  ¿Qué? Historia de usuario para que el residente avise que el cuarto de basuras (SHUT) está lleno.
  ¿Para qué? Que el reciclador sepa que debe pasar a recoger sin necesidad de que alguien lo llame.
  ¿Impacto? Evita que el SHUT se sature y agiliza la recolección.
-->

---

## Identificación

| Campo             | Valor                          |
| ------------------ | ------------------------------ |
| **ID**             | HU-003                          |
| **Título**         | Residente reporta SHUT lleno    |
| **Módulo**         | Notificaciones                  |
| **Prioridad**      | Alta                            |
| **Estado**         | Implementada                    |
| **RF asociados**   | RQF-003                         |

---

## Historia

**Como** residente,
**quiero** reportar que el SHUT de mi conjunto está lleno con un solo botón,
**para** que el reciclador asignado se entere y pase a recogerlo, sin tener que llamarlo.

---

## Criterios de aceptación

### CA-003.1 — Botón visible de reporte

- **Dado que** estoy en mi panel de Residente,
- **cuando** lo veo,
- **entonces** debe haber un botón claramente visible para reportar "SHUT lleno".

### CA-003.2 — No se puede reportar dos veces

- **Dado que** el SHUT de mi conjunto ya está marcado como lleno,
- **cuando** intento reportarlo lleno otra vez,
- **entonces** el sistema no debe permitir un segundo reporte duplicado.

### CA-003.3 — Notificación a los recicladores del conjunto

- **Dado que** reporté el SHUT lleno,
- **cuando** el reporte se procesa,
- **entonces** solo los recicladores vinculados a mi mismo conjunto deben recibir la notificación (no recicladores de otros conjuntos).

### CA-003.4 — Confirmación visual al residente

- **Dado que** reporté el SHUT lleno exitosamente,
- **cuando** el sistema procesa mi reporte,
- **entonces** debo ver una confirmación en pantalla de que se envió.

### CA-003.5 — Reporte anónimo

- **Dado que** un reciclador recibe la notificación de SHUT lleno,
- **cuando** la ve,
- **entonces** no debe poder identificar qué residente específico hizo el reporte.
