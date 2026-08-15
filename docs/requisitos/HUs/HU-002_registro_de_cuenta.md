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
- **entonces** debo ver un mensaje de error indicando que el correo ya está en uso.

### CA-002.3 — Validación de contraseña

- **Dado que** completo el formulario de registro,
- **cuando** ingreso una contraseña con menos de 8 caracteres, sin mayúscula, sin minúscula o sin número,
- **entonces** debo ver un mensaje describiendo qué requisito falta.

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
