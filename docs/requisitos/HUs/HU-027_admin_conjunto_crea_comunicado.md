# HU-027 — Admin Conjunto crea un comunicado del conjunto

<!--
  ¿Qué? Historia de usuario para que el Admin de Conjunto publique un aviso a su comunidad.
  ¿Para qué? Informar cortes de servicio, reuniones, reglas nuevas, etc.
  ¿Impacto? Es el canal oficial de comunicación entre la administración y la comunidad.
-->

---

## Identificación

| Campo             | Valor                                            |
| ------------------ | -----------------------------------------------------|
| **ID**             | HU-027                                                 |
| **Título**         | Admin Conjunto crea un comunicado del conjunto             |
| **Módulo**         | Comunicación / Conjuntos                                  |
| **Prioridad**      | Media                                                       |
| **Estado**         | Implementada                                                |
| **RF asociados**   | RQF-014                                                    |

---

## Historia

**Como** Admin de Conjunto,
**quiero** publicar un comunicado dirigido a los residentes y/o recicladores de mi conjunto,
**para** informarles sobre cortes de servicio, reuniones, reglas nuevas u otros avisos.

---

## Criterios de aceptación

### CA-027.1 — Elegir destinatarios

- **Dado que** estoy creando un comunicado,
- **cuando** completo el formulario,
- **entonces** debo poder elegir si va dirigido solo a residentes, solo a recicladores, o a ambos.

### CA-027.2 — Elegir tipo de comunicado

- **Dado que** estoy creando un comunicado,
- **cuando** completo el formulario,
- **entonces** debo poder elegir su tipo (Informativo, Urgente, Convocatoria, Mantenimiento o Reciclaje).

### CA-027.3 — Fecha de expiración sugerida

- **Dado que** elegí un tipo de comunicado,
- **cuando** el sistema arma el formulario,
- **entonces** debe sugerirme una fecha de expiración según el tipo (ej. 48 horas para Urgente, 30 días para Informativo), y debo poder cambiarla.

### CA-027.4 — Adjuntar enlace (opcional)

- **Dado que** estoy creando un comunicado,
- **cuando** completo el formulario,
- **entonces** debo poder agregar un enlace (URL) a un archivo alojado externamente (imagen, video, PDF, documento de office), de forma opcional — el texto sí es obligatorio.

### CA-027.5 — Publicación exitosa

- **Dado que** completé el comunicado correctamente,
- **cuando** lo publico,
- **entonces** debe aparecer de inmediato en el feed de los destinatarios elegidos.

### CA-027.6 — Solo el conjunto propio

- **Dado que** administro más de un conjunto,
- **cuando** creo un comunicado,
- **entonces** debo poder elegir para cuál de mis conjuntos es, y no debo poder publicar en un conjunto que no administro.
