# HU-018 — Admin Sistema invita a un nuevo Admin de Conjunto

<!--
  ¿Qué? Historia de usuario para que el Admin Sistema invite por correo a alguien
        nuevo como Admin de Conjunto.
  ¿Para qué? Es la única forma de que exista un Admin de Conjunto — nadie se
             autoasigna ese rol al registrarse normalmente.
  ¿Impacto? Sin esto, ningún conjunto podría tener administrador.
-->

---

## Identificación

| Campo             | Valor                                            |
| ------------------ | ---------------------------------------------------|
| **ID**             | HU-018                                               |
| **Título**         | Admin Sistema invita a un nuevo Admin de Conjunto        |
| **Módulo**         | Administración / Conjuntos                                |
| **Prioridad**      | Alta                                                        |
| **Estado**         | Implementada                                                |
| **RF asociados**   | RQF-012                                                    |

---

## Historia

**Como** Admin Sistema,
**quiero** invitar por correo electrónico a una persona nueva para que sea Admin de Conjunto de uno o más conjuntos,
**para** que esos conjuntos tengan un administrador vinculado formalmente.

---

## Criterios de aceptación

### CA-018.1 — Formulario de invitación

- **Dado que** estoy en el panel de invitar Admin de Conjunto,
- **cuando** completo el formulario,
- **entonces** debo poder ingresar el correo de la persona y seleccionar uno o más conjuntos para asignarle.

### CA-018.2 — Envío del correo de invitación

- **Dado que** envié la invitación correctamente,
- **cuando** el sistema la procesa,
- **entonces** debe llegar un correo a la persona invitada con un enlace de invitación de un solo uso.

### CA-018.3 — Solo Admin Sistema puede invitar

- **Dado que** no tengo el rol admin_sistema,
- **cuando** intento invitar a un Admin de Conjunto,
- **entonces** el sistema debe negarme el acceso.

### CA-018.4 — Confirmación visual

- **Dado que** envié la invitación exitosamente,
- **cuando** el sistema responde,
- **entonces** debo ver un mensaje confirmando que se envió al correo indicado.

### CA-018.4b — Conjuntos que no se pueden invitar (issue #402)

- **Dado que** elijo conjuntos para invitar,
- **cuando** alguno ya tiene un administrador activo, o ya tiene una invitación pendiente para **otra** persona,
- **entonces** el sistema rechaza la invitación con un error 409 que nombra esos conjuntos, en vez de dejar que el choque aparezca recién cuando la persona invitada acepta (RN-003: un conjunto, un solo administrador activo).
- Si un conjunto viene repetido en la misma invitación, se cuenta una sola vez; el máximo es 100 conjuntos por invitación.
- Reenviar la invitación al **mismo** correo sigue permitido (por si se perdió el correo): una invitación pendiente de la misma persona no bloquea.
- Al **aceptar** la invitación, el sistema vuelve a comprobar que ninguno de sus conjuntos tenga ya administrador activo. Si lo tiene, responde 409 con el nombre del conjunto, no crea la cuenta y la invitación queda sin usar (issue #409). Es una red de seguridad: por la API ya no se puede asignar un conjunto con invitación pendiente (HU-024).

### CA-018.5 — Cómo llega una solicitud al Admin Sistema

- **Dado que** una persona eligió "¿Administras un conjunto?" en el registro (CA-002.7) y envió la solicitud,
- **cuando** el mensaje llega al buzón de contacto del equipo (`CONTACT_EMAIL` del backend) con el asunto "Solicitud de cuenta de Administrador de Conjunto",
- **entonces** el equipo le responde por correo pidiendo los documentos, los verifica fuera de la app y, si todo está en orden, usa el formulario de invitación de esta HU con el correo de la persona.
- Los documentos nunca pasan por VerdeApp y se eliminan del correo al terminar la revisión.
- El correo llega con la cabecera `Reply-To` igual al correo de la persona: al presionar "Responder", la respuesta le llega directo a ella, sin copiar su dirección a mano.
- El correo trae un aviso visible: "Dirección de respuesta no verificada: la escribió quien envió el formulario. Confírmala antes de responder con información sensible." (issue #403, hallazgo CN-058). El formulario es público y no comprueba que ese correo sea de quien escribe, así que alguien podría poner el de un tercero y el equipo responderle sin saberlo. El aviso solo advierte al equipo; verificar la dirección de verdad (enviar un código de confirmación antes de aceptar el mensaje) queda pendiente.

> **Nota (2026-10-06)**: antes el correo de contacto solo traía la dirección de la persona dentro del texto ("De: ..."), y "Responder" le escribía a la dirección de la app. Ahora `send_contact_email` (`be/app/utils/email.py`) agrega `Reply-To`; los demás correos de la app (verificación, recuperación, invitaciones) no la llevan.

