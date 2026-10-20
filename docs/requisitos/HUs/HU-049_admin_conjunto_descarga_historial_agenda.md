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
| **Estado**         | Por implementar |
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
- **entonces** recibo un archivo CSV con los temas de ese rango: texto, estado, fecha de creación, fecha de archivado (si aplica) y autor.

### CA-049.2 — Descargar el historial en PDF

- **Dado que** administro un conjunto,
- **cuando** pido el historial en formato PDF,
- **entonces** recibo un documento con la misma información que el CSV, con la foto de evidencia como enlace (no incrustada).

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
