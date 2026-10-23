# HU-047 — Residente, Reciclador o Admin de Conjunto envía una novedad al Admin Sistema

<!--
  ¿Qué? Historia de usuario del envío de novedades al Administrador del
        Sistema (RQF-021), que ya existía en código (commit 513c76d) sin
        documentarse.
  ¿Para qué? Escribir qué debe poder hacer quien envía y qué ve después.
  ¿Impacto? Issue #368. El adjunto de imagen (CA-047.2) para Residente y
            Reciclador quedó resuelto en el issue #369.
-->

---

## Identificación

| Campo             | Valor                                                    |
| ------------------ | --------------------------------------------------------- |
| **ID**             | HU-047                                                      |
| **Título**         | Residente, Reciclador o Admin de Conjunto envía una novedad al Admin Sistema |
| **Módulo**         | Comunicación                                                 |
| **Prioridad**      | Media                                                         |
| **Estado**         | Implementada                                                   |
| **RF asociados**   | RQF-021                                                      |

---

## Historia

**Como** Residente, Reciclador o Administrador de Conjunto,
**quiero** enviarle una consulta de soporte al Administrador del Sistema desde la app, eligiendo un motivo,
**para** contarle un problema o algo que pasó sin tener que buscar otro medio de contacto.

---

## Criterios de aceptación

### CA-047.1 — Enviar una consulta eligiendo un motivo

- **Dado que** inicié sesión como Residente, Reciclador o Admin de Conjunto,
- **cuando** abro Soporte técnico → "Escribir novedad", elijo un motivo de la lista "¿Sobre qué es tu consulta?" y presiono "Enviar consulta",
- **entonces** el sistema la guarda y me muestra "Consulta enviada. El Administrador del Sistema la revisará." No tengo que escribir nada más, ni mi nombre, rol, conjunto ni unidad: el sistema los toma de mi cuenta.

### CA-047.7 — Otros activa el comentario

- **Dado que** ninguno de los motivos describe mi caso,
- **cuando** elijo **Otros**,
- **entonces** se activa el campo "Comentario", que es **obligatorio** (máximo 1000 caracteres contando el prefijo "Otros: "): el botón "Enviar consulta" no se habilita hasta que lo escribo. Con cualquier otro motivo el comentario está bloqueado.

### CA-047.8 — La lista cambia según mi rol

- **Dado que** soy Residente, Reciclador o Admin de Conjunto,
- **cuando** abro el formulario,
- **entonces** veo los motivos propios de mi rol, los comunes a los tres roles y **Otros** al final, sin los motivos de los otros roles.

### CA-047.2 — Imagen opcional

- **Dado que** quiero acompañar la novedad con una foto,
- **cuando** uso el campo "Imagen adjunta (opcional)",
- **entonces** la imagen se sube y queda unida a la novedad.
- **y** solo se aceptan imágenes jpg, png o webp de hasta 5 MB. El enlace guardado debe ser una imagen subida a VerdeApp (`/uploads/adjuntos/<uuid>.jpg|png|webp`); cualquier otro, incluido un enlace `https://` externo, responde 422 (issues #369 y #399).

### CA-047.3 — Admin de Conjunto con varios conjuntos

- **Dado que** soy Admin de Conjunto y administro más de un conjunto,
- **cuando** escribo una novedad,
- **entonces** puedo elegir de cuál conjunto hablo, o "Ninguno en particular". Si administro uno solo, la novedad queda asociada a ese conjunto sin preguntarme.

### CA-047.4 — Ver el historial de novedades y su estado

- **Dado que** ya envié novedades,
- **cuando** abro "Historial de novedades",
- **entonces** veo mis novedades de la más reciente a la más antigua, cada una con su estado ("Enviada", "En revisión" o "Resuelta") y su prioridad ("Prioridad alta", "media" o "baja", que calcula el sistema según el motivo; yo no la elijo).
- **y** si el Administrador del Sistema me respondió, veo la respuesta con su fecha debajo del texto.
- **y** si todavía no envié ninguna, veo "Todavía no has enviado ninguna novedad."
- **y** la lista se muestra de a 10 por página, con la paginación debajo (issue #399).

### CA-047.9 — Aviso cuando cambia mi consulta (issue #520)

- **Dado que** envié una consulta,
- **cuando** el Administrador del Sistema le cambia el estado (por ejemplo, de "Enviada" a "En revisión") o me responde,
- **entonces** recibo una notificación. Si cambia el estado y además responde, recibo un solo aviso (el de la respuesta). Si solo cambia la prioridad, no recibo aviso.

### CA-047.5 — El Administrador del Sistema no envía novedades

- **Dado que** soy el Administrador del Sistema,
- **cuando** intento enviar una novedad (por ejemplo, llamando la API directamente),
- **entonces** el sistema responde 403: yo soy quien las recibe.

### CA-047.6 — Tope de novedades sin revisar

- **Dado que** ya tengo 10 novedades sin resolver ("Enviada" o "En revisión"),
- **cuando** intento enviar otra,
- **entonces** el sistema responde 409 y me muestra "Ya tienes 10 novedades sin revisar. Espera a que el Administrador del Sistema las revise para enviar más."
- **y** apenas el Administrador del Sistema resuelve alguna, puedo volver a enviar (issue #399).

---

## Fuera de alcance (decisión del issue #520)

El Administrador de Conjunto **todavía no gestiona** las consultas de los Residentes y Recicladores de su conjunto: todas las atiende el Administrador del Sistema. Hacer que el Admin de Conjunto las vea, cambie su estado, responda o las escale al Admin del Sistema requiere decidir qué consultas le tocan (los Recicladores no tienen un conjunto guardado en la novedad, RN-003 de RQF-021) y una columna nueva; queda para una tarjeta aparte.
