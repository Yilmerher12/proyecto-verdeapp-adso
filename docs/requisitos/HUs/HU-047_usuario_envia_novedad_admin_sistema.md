# HU-047 — Residente, Reciclador o Admin de Conjunto envía una novedad al Admin Sistema

<!--
  ¿Qué? Historia de usuario del envío de novedades al Administrador del
        Sistema (RQF-021), que ya existía en código (commit 513c76d) sin
        documentarse.
  ¿Para qué? Escribir qué debe poder hacer quien envía y qué ve después.
  ¿Impacto? Issue #368. Queda en Parcial por el adjunto de imagen
            (CA-047.2), que se corrige en el issue #369.
-->

---

## Identificación

| Campo             | Valor                                                    |
| ------------------ | --------------------------------------------------------- |
| **ID**             | HU-047                                                      |
| **Título**         | Residente, Reciclador o Admin de Conjunto envía una novedad al Admin Sistema |
| **Módulo**         | Comunicación                                                 |
| **Prioridad**      | Media                                                         |
| **Estado**         | Parcial                                                       |
| **RF asociados**   | RQF-021                                                      |

---

## Historia

**Como** Residente, Reciclador o Administrador de Conjunto,
**quiero** escribirle una novedad al Administrador del Sistema desde la app,
**para** contarle un problema o algo que pasó sin tener que buscar otro medio de contacto.

---

## Criterios de aceptación

### CA-047.1 — Enviar una novedad

- **Dado que** inicié sesión como Residente, Reciclador o Admin de Conjunto,
- **cuando** abro Novedades → "Escribir novedad", escribo el texto (máximo 1000 caracteres) y presiono "Enviar novedad",
- **entonces** el sistema la guarda y me muestra "Novedad enviada. El Administrador del Sistema la revisará." No tengo que escribir mi nombre, rol, conjunto ni unidad: el sistema los toma de mi cuenta.

### CA-047.2 — Imagen opcional (pendiente para Residente y Reciclador)

- **Dado que** quiero acompañar la novedad con una foto,
- **cuando** uso el campo "Imagen adjunta (opcional)",
- **entonces** la imagen se sube y queda unida a la novedad.
- **Estado actual:** solo funciona para el Admin de Conjunto. Al Residente y al Reciclador el servidor les responde 403 al subir la imagen, porque el endpoint de subida solo admite a los administradores. Se corrige en el issue #369.

### CA-047.3 — Admin de Conjunto con varios conjuntos

- **Dado que** soy Admin de Conjunto y administro más de un conjunto,
- **cuando** escribo una novedad,
- **entonces** puedo elegir de cuál conjunto hablo, o "Ninguno en particular". Si administro uno solo, la novedad queda asociada a ese conjunto sin preguntarme.

### CA-047.4 — Ver mis envíos y su estado

- **Dado que** ya envié novedades,
- **cuando** abro "Mis envíos",
- **entonces** veo mis novedades de la más reciente a la más antigua, cada una con su estado: "Enviada" o "Vista por el Admin del Sistema".
- **y** si todavía no envié ninguna, veo "Todavía no has enviado ninguna novedad."

### CA-047.5 — El Administrador del Sistema no envía novedades

- **Dado que** soy el Administrador del Sistema,
- **cuando** intento enviar una novedad (por ejemplo, llamando la API directamente),
- **entonces** el sistema responde 403: yo soy quien las recibe.
