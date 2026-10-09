# HU-040 — Admin Sistema activa o desactiva una cuenta

<!--
  ¿Qué? Historia de usuario para la primera acción real (no solo consulta)
        del panel de usuarios del Admin del Sistema.
  ¿Para qué? El profesor pidió, en la sustentación, que esta vista
             permitiera HACER algo con los usuarios, no solo consultarlos.
  ¿Impacto? Sin esto, no había ninguna forma de bloquear el acceso de un
            usuario problemático sin borrar su cuenta.
-->

---

## Identificación

| Campo             | Valor                                                    |
| ------------------ | --------------------------------------------------------- |
| **ID**             | HU-040                                                      |
| **Título**         | Admin Sistema activa o desactiva una cuenta                  |
| **Módulo**         | Administración                                               |
| **Prioridad**      | Alta                                                          |
| **Estado**         | Implementada                                                  |
| **RF asociados**   | RQF-018                                                      |

---

## Historia

**Como** Administrador del Sistema,
**quiero** activar o desactivar la cuenta de cualquier usuario,
**para** poder bloquear el acceso de alguien sin tener que borrar su cuenta ni sus datos.

---

## Criterios de aceptación

### CA-040.1 — Desactivar una cuenta

- **Dado que** veo un usuario activo en cualquiera de los 3 listados,
- **cuando** presiono "Desactivar" y confirmo,
- **entonces** esa cuenta queda desactivada de inmediato.

### CA-040.2 — Efecto real, no solo visual

- **Dado que** desactivé una cuenta,
- **cuando** esa persona intenta iniciar sesión (o renovar su sesión activa),
- **entonces** el sistema lo rechaza, sin importar que su correo ya estuviera verificado.

### CA-040.3 — Reactivar una cuenta

- **Dado que** veo una cuenta desactivada,
- **cuando** presiono "Activar",
- **entonces** esa persona puede volver a iniciar sesión normalmente.

### CA-040.4 — No puedo desactivarme a mí mismo

- **Dado que** reviso mi propia fila en el listado (si aparezco en él),
- **cuando** busco la opción de desactivar,
- **entonces** no está disponible — el sistema lo rechaza si se intenta directamente por la API.

### CA-040.5 — Motivo opcional al desactivar

- **Dado que** presiono "Desactivar" en una cuenta,
- **cuando** aparece la ventana de confirmación,
- **entonces** puedo escribir un motivo opcional de hasta 200 caracteres (por ejemplo "se mudó de conjunto" o "cuenta duplicada"). Un motivo vacío o solo con espacios se guarda como "sin motivo".

### CA-040.6 — La fecha y el motivo quedan a la vista

- **Dado que** una cuenta está desactivada,
- **cuando** miro la tabla o abro su perfil,
- **entonces** veo desde cuándo está desactivada y el motivo (o "Sin motivo registrado").

### CA-040.7 — Reactivar limpia el registro

- **Dado que** reactivo una cuenta,
- **cuando** se confirma,
- **entonces** no se pide ningún motivo y la fecha y el motivo anteriores se borran, para que un dato viejo no se confunda con una desactivación futura.
