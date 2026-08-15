# HU-019 — Persona invitada acepta y crea su cuenta de Admin de Conjunto

<!--
  ¿Qué? Historia de usuario para que la persona invitada acepte y cree su cuenta.
  ¿Para qué? Completar el flujo de invitación iniciado en HU-018.
  ¿Impacto? Sin esto, la invitación nunca se convierte en una cuenta real.
-->

---

## Identificación

| Campo             | Valor                                                          |
| ------------------ | ------------------------------------------------------------------|
| **ID**             | HU-019                                                              |
| **Título**         | Persona invitada acepta y crea su cuenta de Admin de Conjunto           |
| **Módulo**         | Administración / Conjuntos                                            |
| **Prioridad**      | Alta                                                                    |
| **Estado**         | Implementada                                                            |
| **RF asociados**   | RQF-012                                                                |

---

## Historia

**Como** persona invitada por correo a ser Admin de Conjunto,
**quiero** consultar la invitación y completar mis datos para crear mi cuenta,
**para** empezar a administrar el o los conjuntos que me asignaron.

---

## Criterios de aceptación

### CA-019.1 — Consultar la invitación sin cuenta

- **Dado que** recibí el enlace de invitación por correo,
- **cuando** lo abro,
- **entonces** debo poder ver a qué conjuntos quedaría vinculado, sin necesidad de iniciar sesión (todavía no tengo cuenta).

### CA-019.2 — Completar datos y contraseña

- **Dado que** estoy en la pantalla de aceptar invitación,
- **cuando** la completo,
- **entonces** debo poder ingresar mis datos personales y definir mi contraseña, con las mismas reglas de fortaleza que el registro normal.

### CA-019.3 — Cuenta creada y sesión iniciada

- **Dado que** completé el formulario correctamente,
- **cuando** confirmo,
- **entonces** mi cuenta debe crearse con el rol Admin de Conjunto, ya vinculada a los conjuntos indicados, y debo quedar con sesión iniciada de inmediato.

### CA-019.4 — Enlace inválido o ya usado

- **Dado que** el enlace de invitación ya expiró o ya fue usado,
- **cuando** intento abrirlo,
- **entonces** debo ver un mensaje indicando que la invitación no es válida.
