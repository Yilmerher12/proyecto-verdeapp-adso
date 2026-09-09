# HU-039 — Admin Sistema consulta, busca y filtra los usuarios registrados

<!--
  ¿Qué? Historia de usuario para la consulta del panel de "Usuarios
        registrados" del Admin del Sistema — antes solo existía en código.
  ¿Para qué? Es la única pantalla donde se ve el conjunto completo de
             usuarios de los 3 roles con perfil (Residente, Reciclador,
             Administrador de Conjunto), sin importar el conjunto al que
             pertenecen.
  ¿Impacto? Sin esto, el Admin del Sistema no tiene forma de encontrar a
            una persona puntual entre miles de usuarios.
-->

---

## Identificación

| Campo             | Valor                                                    |
| ------------------ | --------------------------------------------------------- |
| **ID**             | HU-039                                                      |
| **Título**         | Admin Sistema consulta, busca y filtra los usuarios registrados |
| **Módulo**         | Administración                                               |
| **Prioridad**      | Alta                                                          |
| **Estado**         | Implementada                                                  |
| **RF asociados**   | RQF-018                                                      |

---

## Historia

**Como** Administrador del Sistema,
**quiero** ver los usuarios registrados de cada rol, con búsqueda y filtro por localidad,
**para** poder encontrar a una persona puntual sin tener que revisar miles de filas a mano.

---

## Criterios de aceptación

### CA-039.1 — 3 listados separados por rol

- **Dado que** entro a la sección "Usuarios registrados",
- **cuando** cambio entre las pestañas Residentes / Recicladores / Administradores de Conjunto,
- **entonces** veo el listado correspondiente a ese rol, cada uno con sus propias columnas.

### CA-039.2 — Búsqueda en tiempo real

- **Dado que** escribo en el buscador,
- **cuando** dejo de escribir por un instante,
- **entonces** la lista se filtra por nombre, apellido o correo, sin necesidad de presionar Enter.

### CA-039.3 — Filtro por localidad

- **Dado que** elijo una localidad del selector,
- **cuando** la lista se actualiza,
- **entonces** solo veo usuarios de esa localidad (o, para Administradores de Conjunto, que administren al menos un conjunto en ella).

### CA-039.4 — Paginación

- **Dado que** hay más de 10 resultados,
- **cuando** reviso el listado,
- **entonces** los veo repartidos en páginas de 10, con controles para avanzar/retroceder.
