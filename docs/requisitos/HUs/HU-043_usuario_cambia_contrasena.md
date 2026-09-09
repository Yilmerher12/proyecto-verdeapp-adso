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
