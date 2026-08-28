# HU-001 — Inicio de sesión

<!--
  ¿Qué? Historia de usuario que describe el inicio de sesión de un usuario ya registrado.
  ¿Para qué? Formalizar cómo un usuario existente accede a las funcionalidades de su rol.
  ¿Impacto? Sin login, ningún usuario puede usar el resto de la aplicación.
-->

---

## Identificación

| Campo             | Valor            |
| ------------------ | ---------------- |
| **ID**             | HU-001            |
| **Título**         | Inicio de sesión  |
| **Módulo**         | Autenticación     |
| **Prioridad**      | Alta              |
| **Estado**         | Implementada      |
| **RF asociados**   | RQF-001           |

---

## Historia

**Como** usuario ya registrado (residente, reciclador, administrador o admin de conjunto),
**quiero** ingresar mi correo y contraseña,
**para** acceder a las funcionalidades correspondientes a mi rol.

---

## Criterios de aceptación

### CA-001.1 — Formulario de inicio de sesión

- **Dado que** estoy en la página de inicio de sesión,
- **cuando** la veo,
- **entonces** debo encontrar campos para correo electrónico y contraseña, y un botón "Iniciar sesión".

### CA-001.2 — Credenciales correctas

- **Dado que** ingreso un correo y contraseña que coinciden con una cuenta verificada,
- **cuando** envío el formulario,
- **entonces** el sistema me autentica y me redirige al panel correspondiente a mi rol.

### CA-001.3 — Credenciales incorrectas

- **Dado que** ingreso un correo o contraseña que no coinciden,
- **cuando** envío el formulario,
- **entonces** debo ver el mensaje genérico "Credenciales incorrectas", sin que el sistema revele cuál de los dos campos falló.

### CA-001.4 — Cuenta no verificada

- **Dado que** mi cuenta aún no ha sido verificada por correo,
- **cuando** intento iniciar sesión con credenciales correctas,
- **entonces** debo ver un mensaje indicando que debo verificar mi correo antes de poder entrar.

### CA-001.5 — Bloqueo temporal por intentos fallidos

- **Dado que** he fallado 5 veces seguidas al iniciar sesión con el mismo correo,
- **cuando** intento una vez más,
- **entonces** el sistema debe bloquear temporalmente los intentos para ese correo durante 15 minutos.

> **Nota (2026-08-29)**: implementado y probado contra el servidor real — 5 intentos fallidos seguidos bloquean la cuenta 15 minutos, y ni siquiera la contraseña correcta funciona mientras dura el bloqueo. Un login exitoso (antes de llegar a 5 fallos) resetea el contador.

### CA-001.6 — Redirección según el rol

- **Dado que** inicié sesión exitosamente,
- **cuando** el sistema me redirige,
- **entonces** debo llegar al panel específico de mi rol (Residente, Reciclador, Administrador o Admin de Conjunto), no a una pantalla genérica.
