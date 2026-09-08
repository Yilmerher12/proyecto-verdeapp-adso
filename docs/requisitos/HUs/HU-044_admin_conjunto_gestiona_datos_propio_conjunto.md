# HU-044 — Admin de Conjunto edita el NIT y regenera el código de acceso de su conjunto

<!--
  ¿Qué? Historia de usuario para 2 acciones de autogestión que ya existían
        en código (be/app/routers/conjunto_panel.py) pero nunca se habían
        documentado: editar el NIT (issue #180) y regenerar el código de
        acceso.
  ¿Para qué? Ambas ya se guiaban por retroalimentación real (nombre y
             dirección dejaron de ser editables porque vienen verificados
             de un dataset oficial; el código de acceso se agregó para que
             un Residente demuestre que vive en el conjunto al
             registrarse) pero nunca volvieron a plasmarse en una HU.
  ¿Impacto? Sin esto documentado, no había ninguna regla escrita sobre por
            qué el nombre/dirección son de solo lectura, ni sobre qué pasa
            con el código anterior al regenerar uno nuevo.
-->

---

## Identificación

| Campo             | Valor                                                    |
| ------------------ | --------------------------------------------------------- |
| **ID**             | HU-044                                                      |
| **Título**         | Admin de Conjunto edita el NIT y regenera el código de acceso de su conjunto |
| **Módulo**         | Administración / Conjuntos                                   |
| **Prioridad**      | Baja                                                          |
| **Estado**         | Implementada                                                  |
| **RF asociados**   | RQF-012                                                      |

---

## Historia

**Como** Administrador de Conjunto,
**quiero** poder actualizar el NIT de un conjunto que administro y regenerar su código de acceso,
**para** mantener esos 2 datos al día sin depender de que alguien más lo haga por mí.

---

## Criterios de aceptación

### CA-044.1 — Editar el NIT

- **Dado que** administro un conjunto,
- **cuando** edito su NIT desde mi panel,
- **entonces** el cambio se guarda de inmediato.

### CA-044.2 — Nombre y dirección son de solo lectura

- **Dado que** estoy editando los datos de un conjunto,
- **cuando** reviso el formulario,
- **entonces** el nombre y la dirección no se pueden modificar — vienen ya verificados desde el dataset oficial de la Alcaldía de Bogotá.

### CA-044.3 — Regenerar el código de acceso

- **Dado que** administro un conjunto,
- **cuando** presiono "Regenerar código de acceso",
- **entonces** el sistema genera uno nuevo y lo muestra de inmediato.

### CA-044.4 — El código anterior deja de servir

- **Dado que** regeneré el código de acceso,
- **cuando** alguien intenta registrarse como Residente con el código viejo,
- **entonces** el sistema lo rechaza — solo el código más reciente es válido.
