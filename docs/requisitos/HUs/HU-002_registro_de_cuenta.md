# HU-002 — Registro de cuenta

<!--
  ¿Qué? Historia de usuario que describe el registro de un nuevo usuario en el sistema.
  ¿Para qué? Formalizar la necesidad del usuario de crear una cuenta para acceder al sistema.
  ¿Impacto? Es la puerta de entrada al sistema — sin registro, no hay usuarios nuevos.
-->

---

## Identificación

| Campo             | Valor              |
| ------------------ | ------------------ |
| **ID**             | HU-002              |
| **Título**         | Registro de cuenta  |
| **Módulo**         | Autenticación       |
| **Prioridad**      | Alta                |
| **Estado**         | Implementada        |
| **RF asociados**   | RQF-002             |

---

## Historia

**Como** residente o reciclador nuevo,
**quiero** crear una cuenta indicando mi rol, mis datos personales, correo y contraseña,
**para** poder acceder a las funcionalidades de VerdeApp que le corresponden a mi rol.

---

## Criterios de aceptación

### CA-002.1 — Formulario de registro según el rol

- **Dado que** estoy en la página de registro,
- **cuando** elijo el rol "Residente" o "Reciclador",
- **entonces** el formulario debe mostrar los campos adicionales propios de ese rol (ubicación y unidad para Residente; localidad de trabajo para Reciclador).

### CA-002.2 — Correo obligatorio y único

- **Dado que** completo el formulario de registro,
- **cuando** ingreso un correo que ya está registrado en el sistema,
- **entonces** no se crea una cuenta nueva, la pantalla muestra la misma confirmación de "revisa tu correo" que un registro nuevo, y al correo le llega un aviso de que ya tiene una cuenta, con enlaces para iniciar sesión o recuperar la contraseña.

> **Nota (2026-10-05, issue #373 — CN-026)**: antes este criterio pedía mostrar "el correo ya está en uso" en pantalla. Se cambió porque ese mensaje dejaba a cualquiera averiguar qué correos tienen cuenta en VerdeApp. El dueño real se entera igual, por el correo de aviso.

### CA-002.3 — Validación de contraseña

- **Dado que** completo el formulario de registro,
- **cuando** ingreso una contraseña con menos de 8 caracteres, sin mayúscula, sin minúscula o sin número,
- **entonces** debo ver un mensaje describiendo qué requisito falta.

### CA-002.3b — Datos personales y de la unidad con formato real

- **Dado que** completo el formulario de registro,
- **cuando** escribo números o símbolos en mi nombre o apellidos, un apartamento o torre de más de 10 caracteres, o un código de acceso que no tiene 6 letras o números,
- **entonces** veo el error debajo de ese campo al salir de él, el formulario no me deja escribir más del máximo permitido, y el botón de registro sigue deshabilitado hasta corregirlo.

### CA-002.4 — Confirmación de correo y de contraseña

- **Dado que** completo el formulario de registro,
- **cuando** el correo o la contraseña no coinciden con su respectivo campo de confirmación,
- **entonces** debo ver el mensaje "no coinciden" en el campo correspondiente, y no puedo pegar texto en los campos de confirmación (debo escribirlos a mano).

### CA-002.5 — Registro exitoso con verificación por correo

- **Dado que** completé todos los campos correctamente y acepté los términos y la política de privacidad,
- **cuando** envío el formulario,
- **entonces** mi cuenta se crea y se me muestra un mensaje indicando que debo revisar mi correo para verificarla.

### CA-002.6 — Bloqueo de inicio de sesión hasta verificar

- **Dado que** me registré pero no he hecho clic en el enlace de verificación,
- **cuando** intento iniciar sesión,
- **entonces** el sistema me lo impide y me indica que debo verificar mi correo primero.

### CA-002.7 — Opción para administradores de conjunto

- **Dado que** estoy en la página de registro y administro un conjunto,
- **cuando** elijo la opción "¿Administras un conjunto?" (tercera opción del selector de rol),
- **entonces** el formulario se reemplaza por instrucciones para pedir la cuenta: los pasos, los documentos que acreditan el cargo (certificado de existencia y representación legal de la Alcaldía Local, cédula, acta de nombramiento, contrato y, si es una empresa, certificado de Cámara de Comercio) y un botón "Solicitar acceso" que abre el formulario de contacto con el asunto y una plantilla del mensaje ya escritos.
- La pantalla **no muestra ningún correo** y la app **no recibe ni guarda documentos**: los documentos se piden después por correo y se eliminan tras la revisión (ver HU-018 y la Política de Privacidad, sección 2).
- Las 3 opciones del selector son botones: se pueden alcanzar con Tab y elegir con Enter.

> **Nota (2026-10-06)**: antes un Administrador de Conjunto que llegaba al registro no tenía cómo saber que su cuenta se crea por invitación ni a quién pedirla.

