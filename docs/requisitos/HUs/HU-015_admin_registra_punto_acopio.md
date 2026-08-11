# HU-015 — Admin Sistema registra un nuevo punto de acopio

<!--
  ¿Qué? Historia de usuario para que el Admin Sistema dé de alta un punto de acopio oficial.
  ¿Para qué? Alimentar el directorio que consultan los residentes (HU-006).
  ¿Impacto? Sin esto, el directorio de puntos de acopio nunca crecería.
-->

---

## Identificación

| Campo             | Valor                                             |
| ------------------ | ---------------------------------------------------|
| **ID**             | HU-015                                               |
| **Título**         | Admin Sistema registra un nuevo punto de acopio        |
| **Módulo**         | Directorio / Administración                            |
| **Prioridad**      | Alta                                                    |
| **Estado**         | Por implementar                                         |
| **RF asociados**   | RQF-011                                               |

---

## Historia

**Como** Admin Sistema,
**quiero** registrar un nuevo punto de acopio con nombre, dirección, contacto y localidad,
**para** que los residentes de esa localidad puedan encontrarlo en el directorio.

---

## Criterios de aceptación

### CA-015.1 — Formulario de registro

- **Dado que** estoy en el panel de gestión del directorio,
- **cuando** elijo "Registrar punto de acopio",
- **entonces** debo poder ingresar nombre, dirección, datos de contacto y seleccionar una localidad de una lista.

### CA-015.2 — Localidad obligatoria y válida

- **Dado que** intento guardar un punto de acopio sin seleccionar una localidad válida,
- **cuando** envío el formulario,
- **entonces** el sistema debe rechazarlo con un mensaje de error.

### CA-015.3 — Registro exitoso

- **Dado que** completé el formulario correctamente,
- **cuando** guardo,
- **entonces** el punto de acopio debe aparecer de inmediato en el directorio para los residentes de esa localidad.

### CA-015.4 — Acceso exclusivo de administrador

- **Dado que** no tengo el rol admin_sistema,
- **cuando** intento registrar un punto de acopio,
- **entonces** el sistema debe negarme el acceso.
