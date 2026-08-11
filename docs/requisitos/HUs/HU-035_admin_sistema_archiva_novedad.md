# HU-035 — Admin Sistema archiva una novedad / el sistema la archiva al expirar

<!--
  ¿Qué? Historia de usuario para retirar una novedad de circulación, manual o automáticamente.
  ¿Para qué? Mantener la sección de novedades limpia y relevante.
  ¿Impacto? Evita que quede información vieja visible indefinidamente.
-->

---

## Identificación

| Campo             | Valor                                                                |
| ------------------ | -------------------------------------------------------------------------|
| **ID**             | HU-035                                                                      |
| **Título**         | Admin Sistema archiva una novedad / el sistema la archiva al expirar             |
| **Módulo**         | Comunicación / Sistema                                                          |
| **Prioridad**      | Media                                                                            |
| **Estado**         | Por implementar                                                                  |
| **RF asociados**   | RQF-015                                                                         |

---

## Historia

**Como** Admin Sistema,
**quiero** poder archivar manualmente una novedad, o que el sistema la archive automáticamente al expirar,
**para** que deje de mostrarse a los usuarios sin perder el registro histórico.

---

## Criterios de aceptación

### CA-035.1 — Archivar manualmente

- **Dado que** estoy en mi panel de novedades,
- **cuando** selecciono una novedad activa y elijo "Archivar",
- **entonces** debe dejar de aparecer en la sección de novedades de los usuarios.

### CA-035.2 — Archivado automático al expirar

- **Dado que** una novedad llega a su fecha de expiración,
- **cuando** el sistema revisa las fechas,
- **entonces** debe archivarla automáticamente, sin necesidad de que un administrador lo haga a mano.

### CA-035.3 — No se puede reactivar directamente

- **Dado que** una novedad está archivada,
- **cuando** quiero volver a publicarla,
- **entonces** debo crear una novedad nueva — el sistema no permite reactivar directamente una archivada.

### CA-035.4 — Historial visible para el administrador

- **Dado que** soy Admin Sistema,
- **cuando** consulto el historial de novedades,
- **entonces** debo poder ver también las archivadas, no solo las activas.
