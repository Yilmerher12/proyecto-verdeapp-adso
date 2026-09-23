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

### CA-032.5 — Adjuntos y video opcionales

- **Dado que** estoy creando una novedad,
- **cuando** abro "Más opciones" (recogido por defecto, para que un aviso rápido de solo texto siga siendo rápido),
- **entonces** puedo adjuntar una imagen o archivo (subiéndolo o pegando un enlace, igual que la guía de apoyo de Contenido Educativo) y/o un enlace de video de YouTube — ambos opcionales.

### CA-032.6 — Elegir a qué conjuntos les llega

- **Dado que** estoy creando una novedad,
- **cuando** veo el formulario,
- **entonces** encuentro una sección "Conjuntos" siempre visible (no escondida en "Más opciones") donde elijo uno o varios conjuntos con un buscador, o marco "Todos los conjuntos". Solo los usuarios de esos conjuntos que pertenezcan al alcance reciben la notificación y ven la novedad en su feed.

### CA-032.7 — Publicar a todos tiene que ser una decisión

- **Dado que** estoy creando una novedad,
- **cuando** aún no he elegido ningún conjunto ni marcado "Todos los conjuntos",
- **entonces** no puedo publicar (el botón queda bloqueado) y el formulario me dice que elija al menos un conjunto — así un aviso puntual, como una reunión presencial, no sale masivo por descuido. Si marco "Todos los conjuntos", el formulario avisa que es un aviso masivo.

### CA-032.3 — Fecha de expiración

- **Dado que** estoy creando una novedad,
- **cuando** el sistema arma el formulario,
- **entonces** debe sugerirme una fecha de expiración, y debo poder modificarla.

### CA-032.4 — Publicación exitosa

- **Dado que** completé la novedad correctamente,
- **cuando** la publico,
- **entonces** los usuarios del alcance elegido deben recibir una notificación y verla en su sección de novedades.
