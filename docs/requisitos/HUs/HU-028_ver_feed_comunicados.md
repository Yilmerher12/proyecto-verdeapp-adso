# HU-028 — Residente/Reciclador ve el feed de comunicados

<!--
  ¿Qué? Historia de usuario para consultar los comunicados activos del conjunto.
  ¿Para qué? Que residentes y recicladores estén informados de los avisos vigentes.
  ¿Impacto? Es la mitad "de lectura" del canal de comunicación (HU-027 es la de publicar).
-->

---

## Identificación

| Campo             | Valor                                          |
| ------------------ | ---------------------------------------------------|
| **ID**             | HU-028                                               |
| **Título**         | Residente/Reciclador ve el feed de comunicados          |
| **Módulo**         | Comunicación / Conjuntos                                |
| **Prioridad**      | Media                                                     |
| **Estado**         | Por implementar                                           |
| **RF asociados**   | RQF-014                                                  |

---

## Historia

**Como** residente o reciclador,
**quiero** ver los comunicados activos de mi conjunto, ordenados del más reciente al más antiguo,
**para** estar al tanto de avisos importantes.

---

## Criterios de aceptación

### CA-028.1 — Feed ordenado

- **Dado que** entro a la sección de comunicados de mi conjunto,
- **cuando** la página carga,
- **entonces** debo ver los comunicados activos, ordenados del más reciente al más antiguo.

### CA-028.2 — Comunicados urgentes destacados

- **Dado que** hay un comunicado de tipo "Urgente" activo,
- **cuando** veo el feed,
- **entonces** debe aparecer primero, con una etiqueta visual que lo distinga de los demás.

### CA-028.3 — Expiración automática

- **Dado que** un comunicado llegó a su fecha de expiración,
- **cuando** consulto el feed,
- **entonces** ese comunicado ya no debe aparecer.

### CA-028.4 — Solo mi conjunto

- **Dado que** consulto el feed de comunicados,
- **cuando** la lista carga,
- **entonces** solo debo ver comunicados de mi propio conjunto, nunca de otros.
