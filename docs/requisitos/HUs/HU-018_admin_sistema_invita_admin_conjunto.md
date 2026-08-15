# HU-018 — Admin Sistema invita a un nuevo Admin de Conjunto

<!--
  ¿Qué? Historia de usuario para que el Admin Sistema invite por correo a alguien
        nuevo como Admin de Conjunto.
  ¿Para qué? Es la única forma de que exista un Admin de Conjunto — nadie se
             autoasigna ese rol al registrarse normalmente.
  ¿Impacto? Sin esto, ningún conjunto podría tener administrador.
-->

---

## Identificación

| Campo             | Valor                                            |
| ------------------ | ---------------------------------------------------|
| **ID**             | HU-018                                               |
| **Título**         | Admin Sistema invita a un nuevo Admin de Conjunto        |
| **Módulo**         | Administración / Conjuntos                                |
| **Prioridad**      | Alta                                                        |
| **Estado**         | Implementada                                                |
| **RF asociados**   | RQF-012                                                    |

---

## Historia

**Como** Admin Sistema,
**quiero** invitar por correo electrónico a una persona nueva para que sea Admin de Conjunto de uno o más conjuntos,
**para** que esos conjuntos tengan un administrador vinculado formalmente.

---

## Criterios de aceptación

### CA-018.1 — Formulario de invitación

- **Dado que** estoy en el panel de invitar Admin de Conjunto,
- **cuando** completo el formulario,
- **entonces** debo poder ingresar el correo de la persona y seleccionar uno o más conjuntos para asignarle.

### CA-018.2 — Envío del correo de invitación

- **Dado que** envié la invitación correctamente,
- **cuando** el sistema la procesa,
- **entonces** debe llegar un correo a la persona invitada con un enlace de invitación de un solo uso.

### CA-018.3 — Solo Admin Sistema puede invitar

- **Dado que** no tengo el rol admin_sistema,
- **cuando** intento invitar a un Admin de Conjunto,
- **entonces** el sistema debe negarme el acceso.

### CA-018.4 — Confirmación visual

- **Dado que** envié la invitación exitosamente,
- **cuando** el sistema responde,
- **entonces** debo ver un mensaje confirmando que se envió al correo indicado.
