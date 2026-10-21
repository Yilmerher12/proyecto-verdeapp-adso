# HU-049 — Admin de Conjunto descarga el historial de la agenda

<!--
  ¿Qué? Historia de usuario propuesta en la investigación del Issue #438.
  ¿Para qué? Dejar escrito, desde el punto de vista del Admin de Conjunto,
             qué debe poder hacer una vez exista la descarga del
             historial de la agenda.
  ¿Impacto? Issue #438. Se apoya en el archivado de temas (issue #435),
            que ya existe — ver
            docs/gestion-proyecto/investigacion-reporte-historial-agenda.md.
-->

---

## Identificación

| Campo             | Valor                                                    |
| ------------------ | --------------------------------------------------------- |
| **ID**             | HU-049                                                      |
| **Título**         | Admin de Conjunto descarga el historial de la agenda         |
| **Módulo**         | Administración / Conjuntos                                   |
| **Prioridad**      | Baja                                                          |
| **Estado**         | Parcial — CSV implementado (issue #479); PDF por implementar (issue #480) |
| **RF asociados**   | RQF-020                                                      |

---

## Historia

**Como** Administrador de Conjunto,
**quiero** descargar el historial de los temas de la agenda (pendientes y archivados) de un conjunto que administro, en un rango de fechas,
**para** anexarlo al acta del comité sin tener que copiar los temas a mano.

---

## Criterios de aceptación

### CA-049.1 — Descargar el historial en CSV

- **Dado que** administro un conjunto y tiene temas en su agenda,
- **cuando** pido descargar el historial indicando un rango de fechas,
- **entonces** recibo un archivo CSV con los temas de ese rango: texto, estado, fecha de creación, fecha de archivado (si aplica), autor y foto.

> **Implementado (2026-10-21, issue #479)**: botón "Descargar historial" en la Agenda (`/admin-conjunto/agenda`), con estado (todos, por tratar o archivados) y fechas opcionales. Detalles de lo construido:
>
> - **Qué fecha filtra:** un tema archivado entra si su fecha de **archivado** cae en el rango; uno por tratar entra si su fecha de **creación** cae en el rango. Las fechas se leen en **hora de Bogotá** y salen en el archivo como `dd/mm/aaaa` en esa misma hora.
> - **Autor:** nombre y apellidos del administrador (no el correo); vacío si su cuenta ya se borró.
> - **Foto:** enlace completo (`http://.../uploads/...`), no el relativo que guarda la base de datos.
> - **Para Excel en español:** separador `;` y UTF-8 con BOM. Un texto que empieza con `=`, `+`, `-` o `@` se entrega con una comilla simple delante para que Excel no lo calcule como fórmula.
> - **Orden:** del más antiguo al más reciente, como un acta.
> - **Nombre del archivo:** `historial-agenda-<conjunto>-<desde>_<hasta>.csv` (`inicio` y `hoy` si no se eligió fecha), sin datos personales.

### CA-049.2 — Descargar el historial en PDF

- **Dado que** administro un conjunto,
- **cuando** pido el historial en formato PDF,
- **entonces** recibo un documento con la misma información que el CSV, con la foto de evidencia como enlace (no incrustada).

> **Por implementar** (issue #480): reutiliza el mismo filtro, el tope de 500 temas y la validación de conjunto del CSV.

### CA-049.3 — Solo mis conjuntos

- **Dado que** no administro un conjunto,
- **cuando** intento descargar su historial (por ejemplo, llamando la API directamente),
- **entonces** el sistema responde 403 y no genera ningún archivo.

### CA-049.4 — Rango demasiado grande

- **Dado que** pido un historial cuyo rango de fechas supera el límite definido (ver investigación, pregunta 7),
- **cuando** confirmo la descarga,
- **entonces** el sistema responde 400 pidiéndome acotar el rango, en vez de generar un archivo muy grande.

### CA-049.5 — Sin temas en el rango

- **Dado que** el rango de fechas elegido no tiene temas,
- **cuando** pido la descarga,
- **entonces** recibo un archivo válido pero vacío (solo encabezados), no un error.
