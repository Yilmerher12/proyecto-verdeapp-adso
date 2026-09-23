# HU-043 — Usuario cambia su contraseña estando autenticado

<!--
  ¿Qué? Historia de usuario para el cambio de contraseña desde el perfil,
        sabiendo la contraseña actual — existía en código desde el
        principio del proyecto, nunca se había documentado como HU.
  ¿Para qué? Es distinto de "recuperar contraseña olvidada" (HU-042): aquí
             el usuario ya tiene sesión activa y solo quiere actualizarla
             por buena práctica de seguridad, no porque la haya olvidado.
  ¿Impacto? RQF-008 (Actualizar Perfil) excluye explícitamente este flujo
            de su propio alcance, pero nunca decía dónde vivía en
            realidad.
-->

---

## Identificación

| Campo             | Valor                                                    |
| ------------------ | --------------------------------------------------------- |
| **ID**             | HU-043                                                      |
| **Título**         | Usuario cambia su contraseña estando autenticado               |
| **Módulo**         | Autenticación                                                 |
| **Prioridad**      | Media                                                          |
| **Estado**         | Implementada                                                   |
| **RF asociados**   | RQF-019                                                        |

---

## Historia

**Como** usuario de cualquier rol, con sesión iniciada,
**quiero** poder cambiar mi contraseña ingresando la actual y la nueva,
**para** actualizarla por seguridad sin tener que cerrar sesión ni pasar por el flujo de recuperación.

---

## Criterios de aceptación

### CA-043.1 — Cambiar la contraseña exitosamente

- **Dado que** tengo sesión iniciada,
- **cuando** ingreso correctamente mi contraseña actual y una nueva válida,
- **entonces** mi contraseña queda actualizada de inmediato.

### CA-043.2 — Contraseña actual incorrecta

- **Dado que** ingreso mal mi contraseña actual,
- **cuando** envío el formulario,
- **entonces** el sistema rechaza el cambio y mi contraseña sigue siendo la de antes.

### CA-043.3 — Siempre exige la contraseña actual

- **Dado que** tengo una sesión activa y válida,
- **cuando** intento cambiar mi contraseña,
- **entonces** el sistema me pide la contraseña actual de todas formas — tener sesión iniciada no es suficiente por sí solo.

### CA-043.4 — Se cierran mis otras sesiones, pero no la actual

- **Dado que** tengo sesión iniciada en más de un navegador o dispositivo,
- **cuando** cambio mi contraseña desde uno de ellos,
- **entonces** todas las demás sesiones quedan cerradas de inmediato, y yo sigo con sesión iniciada en el navegador desde el que hice el cambio (issue #308).

### CA-043.5 — Ver en vivo qué le falta a la contraseña nueva

- **Dado que** estoy escribiendo la contraseña nueva,
- **cuando** voy tecleando,
- **entonces** veo marcados los requisitos que ya cumplo (8+ caracteres, mayúscula, minúscula, número) y un mensaje que indica si la confirmación ya coincide con la nueva.

### CA-043.6 — Guardar solo con el formulario válido

- **Dado que** falta la contraseña actual, la nueva no cumple los requisitos o la confirmación no coincide,
- **cuando** miro el botón "Guardar",
- **entonces** está deshabilitado y dice "Completa el formulario".

### CA-043.7 — Recuperar la contraseña si no recuerdo la actual

- **Dado que** no recuerdo mi contraseña actual,
- **cuando** pulso "Recupérala por correo",
- **entonces** paso al flujo de recuperación por correo (HU-042).
