# HU-032 — Admin Sistema publica una novedad general

<!--
  ¿Qué? Historia de usuario para que el Admin Sistema publique novedades a nivel de toda la plataforma.
  ¿Para qué? Informar cambios, nuevas funciones o temas ambientales a todos los usuarios.
  ¿Impacto? Es el canal oficial de comunicación de VerdeApp con toda su comunidad de usuarios.
-->

---

## Identificación

| Campo             | Valor                                          |
| ------------------ | -----------------------------------------------------|
| **ID**             | HU-032                                                 |
| **Título**         | Admin Sistema publica una novedad general                  |
| **Módulo**         | Comunicación / Sistema                                     |
| **Prioridad**      | Media                                                        |
| **Estado**         | Implementada                                                 |
| **RF asociados**   | RQF-015                                                     |

---

## Historia

**Como** Admin Sistema,
**quiero** publicar una novedad dirigida a todos los usuarios o a grupos específicos de roles,
**para** informar cambios, nuevas funciones o temas ambientales relevantes para toda la plataforma.

---

## Criterios de aceptación

### CA-032.1 — Elegir el alcance

- **Dado que** estoy creando una novedad,
- **cuando** completo el formulario,
- **entonces** debo poder elegir el alcance: todos los usuarios, solo residentes, solo recicladores, o solo Admins de Conjunto.

### CA-032.2 — Enlace opcional

- **Dado que** estoy creando una novedad,
- **cuando** completo el formulario,
- **entonces** debo poder agregar un enlace (URL) a un archivo alojado externamente o a un sitio externo, de forma opcional — el texto sí es obligatorio.

### CA-032.3 — Fecha de expiración

- **Dado que** estoy creando una novedad,
- **cuando** el sistema arma el formulario,
- **entonces** debe sugerirme una fecha de expiración, y debo poder modificarla.

### CA-032.4 — Publicación exitosa

- **Dado que** completé la novedad correctamente,
- **cuando** la publico,
- **entonces** los usuarios del alcance elegido deben recibir una notificación y verla en su sección de novedades.
