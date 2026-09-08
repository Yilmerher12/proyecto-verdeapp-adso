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
