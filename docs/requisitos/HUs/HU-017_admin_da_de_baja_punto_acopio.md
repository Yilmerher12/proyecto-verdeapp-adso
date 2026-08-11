# HU-017 — Admin Sistema da de baja un punto de acopio

<!--
  ¿Qué? Historia de usuario para retirar un punto de acopio que ya no está operativo.
  ¿Para qué? Evitar que los residentes vayan a un punto que ya no existe o no funciona.
  ¿Impacto? Mantiene el directorio confiable.
-->

---

## Identificación

| Campo             | Valor                                          |
| ------------------ | -------------------------------------------------|
| **ID**             | HU-017                                              |
| **Título**         | Admin Sistema da de baja un punto de acopio           |
| **Módulo**         | Directorio / Administración                           |
| **Prioridad**      | Alta                                                   |
| **Estado**         | Por implementar                                        |
| **RF asociados**   | RQF-011                                              |

---

## Historia

**Como** Admin Sistema,
**quiero** dar de baja un punto de acopio que ya no está operativo,
**para** que los residentes no lo vean como una opción disponible en el directorio.

---

## Criterios de aceptación

### CA-017.1 — Dar de baja un punto

- **Dado que** estoy en el panel de gestión del directorio,
- **cuando** selecciono un punto de acopio y elijo "Dar de baja",
- **entonces** el sistema debe pedirme confirmación antes de aplicar el cambio.

### CA-017.2 — El punto deja de ser visible

- **Dado que** confirmé dar de baja un punto de acopio,
- **cuando** un residente consulta el directorio,
- **entonces** ese punto ya no debe aparecer entre los resultados.

### CA-017.3 — Acceso exclusivo de administrador

- **Dado que** no tengo el rol admin_sistema,
- **cuando** intento dar de baja un punto de acopio,
- **entonces** el sistema debe negarme el acceso.
