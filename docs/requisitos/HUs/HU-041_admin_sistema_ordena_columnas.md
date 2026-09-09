# HU-041 — Admin Sistema ordena las columnas de cada listado

<!--
  ¿Qué? Historia de usuario para las columnas ordenables del panel de
        usuarios del Admin del Sistema — pedido explícito del profesor.
  ¿Para qué? Con miles de usuarios, encontrar algo a simple vista sin poder
             ordenar (por ejemplo, ver primero las cuentas desactivadas)
             es poco práctico.
  ¿Impacto? Sin esto, el único orden posible era el que trajera el backend
            por defecto (alfabético por nombre), sin ninguna forma de
            cambiarlo desde la interfaz.
-->

---

## Identificación

| Campo             | Valor                                                    |
| ------------------ | --------------------------------------------------------- |
| **ID**             | HU-041                                                      |
| **Título**         | Admin Sistema ordena las columnas de cada listado             |
| **Módulo**         | Administración                                               |
| **Prioridad**      | Media                                                         |
| **Estado**         | Implementada                                                  |
| **RF asociados**   | RQF-018                                                      |

---

## Historia

**Como** Administrador del Sistema,
**quiero** poder ordenar cualquiera de las 3 tablas por cualquiera de sus columnas,
**para** encontrar lo que busco más rápido (por ejemplo, agrupar primero las cuentas desactivadas, u ordenar alfabéticamente por correo).

---

## Criterios de aceptación

### CA-041.1 — Clic en un encabezado ordena por esa columna

- **Dado que** estoy viendo cualquiera de las 3 tablas,
- **cuando** hago clic en el encabezado de una columna,
- **entonces** la lista se reordena ascendentemente por esa columna, y una flecha en el encabezado lo confirma visualmente.

### CA-041.2 — Segundo clic invierte el orden

- **Dado que** ya ordené por una columna,
- **cuando** vuelvo a hacer clic en el mismo encabezado,
- **entonces** el orden se invierte a descendente.

### CA-041.3 — Cambiar de pestaña reinicia el orden

- **Dado que** ordené la tabla de Residentes por una columna,
- **cuando** cambio a la pestaña de Recicladores,
- **entonces** esa tabla empieza en su orden por defecto, no arrastra el orden de la pestaña anterior.

### CA-041.4 — Accesible por teclado y lector de pantalla

- **Dado que** un encabezado ordenable recibe el foco del teclado,
- **cuando** lo activo con Enter o lo consulto con un lector de pantalla,
- **entonces** se ordena igual que con clic, y se anuncia si esa columna está ordenada y en qué dirección (`aria-sort`).
