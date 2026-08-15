# HU-037 — Sistema restaura el idioma guardado al iniciar sesión

<!--
  ¿Qué? Historia de usuario para que el idioma elegido siga al usuario entre dispositivos.
  ¿Para qué? Que la preferencia de idioma no dependa de un solo navegador o dispositivo.
  ¿Impacto? Sin esto, un usuario tendría que volver a elegir su idioma cada vez que
            inicia sesión desde un computador o teléfono distinto.
-->

---

## Identificación

| Campo             | Valor                                                                  |
| ------------------ | ---------------------------------------------------------------------------|
| **ID**             | HU-037                                                                       |
| **Título**         | Sistema restaura el idioma guardado al iniciar sesión                            |
| **Módulo**         | Internacionalización (i18n)                                                     |
| **Prioridad**      | Media                                                                             |
| **Estado**         | Por implementar                                                                    |
| **RF asociados**   | RQF-017                                                                           |

---

## Historia

**Como** usuario autenticado,
**quiero** que mi idioma preferido se aplique automáticamente al iniciar sesión, sin importar desde qué dispositivo entre,
**para** no tener que volver a elegirlo cada vez.

---

## Criterios de aceptación

### CA-037.1 — Guardar el idioma en la cuenta

- **Dado que** tengo sesión iniciada y cambio el idioma,
- **cuando** el cambio se procesa,
- **entonces** el sistema debe guardar mi preferencia asociada a mi cuenta, no solo en el navegador.

### CA-037.2 — Restaurar al iniciar sesión

- **Dado que** mi cuenta tiene un idioma guardado,
- **cuando** inicio sesión desde cualquier dispositivo o navegador,
- **entonces** la interfaz debe mostrarse en ese idioma, sin importar el idioma que tenía configurado ese navegador antes.

### CA-037.3 — Fallo silencioso si no hay conexión

- **Dado que** cambio de idioma pero la sincronización con el servidor falla (ej. sin conexión),
- **cuando** eso ocurre,
- **entonces** el cambio en pantalla debe mantenerse igual — no debo perder mi elección, solo queda pendiente de guardarse en mi cuenta.

### CA-037.4 — Valor de idioma inválido

- **Dado que** se intenta guardar un idioma distinto a español o inglés,
- **cuando** el backend lo recibe,
- **entonces** debe rechazarlo con un error de validación.
