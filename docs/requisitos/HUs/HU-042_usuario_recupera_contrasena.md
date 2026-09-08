# HU-042 — Usuario recupera su contraseña olvidada

<!--
  ¿Qué? Historia de usuario para el flujo de "olvidé mi contraseña" —
        existía en código desde el principio del proyecto, nunca se había
        documentado como HU.
  ¿Para qué? Es la única forma de recuperar el acceso a una cuenta sin
             depender de que un administrador intervenga manualmente.
  ¿Impacto? Sin esto documentado, nadie podía verificar si el
            comportamiento real (mensaje genérico, expiración de 1 hora,
            token de un solo uso) era intencional o un descuido.
-->

---

## Identificación

| Campo             | Valor                                                    |
| ------------------ | --------------------------------------------------------- |
| **ID**             | HU-042                                                      |
| **Título**         | Usuario recupera su contraseña olvidada                       |
| **Módulo**         | Autenticación                                                 |
| **Prioridad**      | Alta                                                           |
| **Estado**         | Implementada                                                   |
| **RF asociados**   | RQF-019                                                        |

---

## Historia

**Como** usuario de cualquier rol,
**quiero** poder recuperar el acceso a mi cuenta si olvidé mi contraseña,
**para** no quedar bloqueado permanentemente fuera de la plataforma.

---

## Criterios de aceptación

### CA-042.1 — Solicitar el enlace de recuperación

- **Dado que** estoy en la pantalla de inicio de sesión,
- **cuando** elijo "¿Olvidaste tu contraseña?" e ingreso mi correo,
- **entonces** recibo un mensaje confirmando que, si el correo está registrado, llegará un enlace.

### CA-042.2 — El mensaje no revela si el correo existe

- **Dado que** ingreso un correo que **no** está registrado,
- **cuando** envío la solicitud,
- **entonces** veo exactamente el mismo mensaje que si sí estuviera registrado — no hay forma de distinguir un caso del otro desde la interfaz.

### CA-042.3 — Definir la nueva contraseña

- **Dado que** abro el enlace recibido por correo, antes de que expire,
- **cuando** ingreso mi nueva contraseña,
- **entonces** mi contraseña queda actualizada y puedo iniciar sesión con ella de inmediato.

### CA-042.4 — El enlace expira y es de un solo uso

- **Dado que** el enlace tiene más de 1 hora, o ya se usó una vez,
- **cuando** intento usarlo de nuevo,
- **entonces** el sistema lo rechaza y me pide solicitar uno nuevo.
