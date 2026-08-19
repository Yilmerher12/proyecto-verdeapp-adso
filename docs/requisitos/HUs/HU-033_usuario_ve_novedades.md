# HU-033 — Usuario ve las novedades del sistema según su rol

<!--
  ¿Qué? Historia de usuario para consultar las novedades generales de la plataforma.
  ¿Para qué? Que cualquier usuario se entere de cambios o novedades relevantes para él.
  ¿Impacto? Es la mitad "de lectura" del canal de novedades (HU-032 es la de publicar).
-->

---

## Identificación

| Campo             | Valor                                                    |
| ------------------ | --------------------------------------------------------------|
| **ID**             | HU-033                                                          |
| **Título**         | Usuario ve las novedades del sistema según su rol                    |
| **Módulo**         | Comunicación / Sistema                                              |
| **Prioridad**      | Media                                                                |
| **Estado**         | Por implementar                                                      |
| **RF asociados**   | RQF-015                                                              |

---

## Historia

**Como** residente, reciclador o Admin de Conjunto,
**quiero** ver en una sección de novedades solo las que están dirigidas a mi rol,
**para** enterarme de cambios y noticias relevantes de la plataforma.

---

## Criterios de aceptación

### CA-033.1 — Solo novedades de mi rol

- **Dado que** entro a la sección de novedades,
- **cuando** la lista carga,
- **entonces** solo debo ver las novedades dirigidas a "todos" o específicamente a mi rol.

### CA-033.2 — Orden y expiración

- **Dado que** consulto las novedades,
- **cuando** veo la lista,
- **entonces** deben estar ordenadas de la más reciente a la más antigua, y las expiradas o archivadas no deben aparecer.

### CA-033.3 — Abrir adjuntos

- **Dado que** una novedad tiene un adjunto,
- **cuando** la abro,
- **entonces** debo poder abrir ese adjunto directamente desde ahí.
