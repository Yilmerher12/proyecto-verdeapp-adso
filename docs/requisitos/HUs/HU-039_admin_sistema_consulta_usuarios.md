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
**quiero** ver los usuarios registrados de cada rol, con búsqueda, filtro por conjunto y un botón para ver solo las cuentas inactivas,
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

### CA-039.3 — Filtro por conjunto

- **Dado que** elijo un conjunto en el buscador de conjuntos,
- **cuando** la lista se actualiza,
- **entonces** solo veo usuarios de ese conjunto (para Recicladores, los autorizados hoy en él; para Administradores de Conjunto, los que lo administran hoy).
- El filtro por localidad se quitó de esta pantalla: el buscador de conjunto ya acota el lugar por sí solo. El endpoint conserva el parámetro `localidad_id` por compatibilidad, pero la pantalla no lo usa.

### CA-039.4 — Paginación

- **Dado que** hay más de 8 resultados,
- **cuando** reviso el listado,
- **entonces** los veo repartidos en páginas de 8, con controles para avanzar/retroceder — mismo tamaño de página que usa el resto de listados paginados de la app (`TAMANO_PAGINA` en `AdminDashboard.tsx`/`AdminNovedadesPage.tsx`).

### CA-039.5 — Botón "Inactivos"

- **Dado que** el botón "Inactivos" está apagado,
- **cuando** reviso una pestaña,
- **entonces** veo todas las cuentas, activas e inactivas.
- **Dado que** enciendo el botón "Inactivos" (que muestra cuántas hay en la pestaña),
- **cuando** la lista se actualiza,
- **entonces** solo veo las cuentas desactivadas, y cada pestaña muestra un numerito con sus inactivas. El botón se mantiene encendido al cambiar de pestaña.
- Si no hay cuentas inactivas, la tabla dice "No hay cuentas inactivas en esta pestaña." en vez del mensaje de tabla vacía.

### CA-039.6 — Orden de la pantalla

- **Dado que** entro al panel del Admin del Sistema,
- **cuando** se carga,
- **entonces** primero veo las 3 tarjetas de resumen (Administradores de Conjunto, Solicitudes pendientes, Totales del sistema) y debajo la tabla de "Usuarios registrados", abierta desde el inicio.
