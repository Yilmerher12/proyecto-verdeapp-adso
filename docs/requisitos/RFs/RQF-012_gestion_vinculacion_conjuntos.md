# RQF-012 — Invitación y Vinculación Inicial de Administradores de Conjunto y Recicladores

<!--
  ¿Qué? Requisito funcional que define cómo se vincula por primera vez a una persona
        con el rol Admin de Conjunto, y cómo un Admin de Conjunto autoriza a un
        reciclador a trabajar en su conjunto.
  ¿Para qué? Documentar el flujo de invitación que realmente está implementado —
             antes este documento describía un flujo distinto (desvinculación y
             reasignación) que nunca se llegó a programar; esa necesidad real
             ahora vive aparte, en RQF-016.
  ¿Impacto? Sin este flujo, no existiría ninguna forma de que alguien se convierta
            en Admin de Conjunto, ni de que un reciclador quede autorizado a
            operar en un conjunto específico.
-->

---

## Identificación

| Campo         | Valor                                                        |
| ------------- | ------------------------------------------------------------- |
| **ID**        | RQF-012                                                        |
| **Nombre**    | Invitación y Vinculación Inicial de Administradores de Conjunto y Recicladores |
| **Módulo**    | Administración / Conjuntos                                     |
| **Prioridad** | Alta                                                            |
| **Estado**    | Implementado                                                    |
| **Usuarios**  | admin_sistema, admin_conjunto, reciclador                       |

---

## Descripción

El sistema debe permitir que el Admin Sistema invite por correo electrónico a una persona nueva para que se convierta en Admin de Conjunto de uno o más conjuntos, y que un Admin de Conjunto invite a un reciclador (ya registrado en la plataforma) a quedar autorizado para operar en su conjunto. Ambos flujos son de invitación con aceptación explícita — nadie queda vinculado sin haberlo confirmado.

Este RF reemplaza la versión anterior de RQF-012, que describía un flujo de desvinculación/reasignación nunca implementado. Esa necesidad sigue siendo válida y ahora vive documentada en [RQF-016](RQF-016_desvinculacion_reasignacion_conjuntos.md).

---

## Flujos

### Flujo A — Admin Sistema invita a un nuevo Admin de Conjunto
1. El Admin Sistema ingresa el correo electrónico de la persona a invitar y selecciona el o los conjuntos que administrará.
2. El sistema envía un correo con un enlace de invitación de un solo uso.
3. La persona invitada, que todavía no tiene cuenta, abre el enlace y consulta la información de la invitación (a qué conjuntos quedaría vinculada) sin necesidad de iniciar sesión.
4. La persona completa sus datos personales y una contraseña, y acepta la invitación.
5. El sistema crea su cuenta con el rol Admin de Conjunto, ya vinculada a los conjuntos indicados, y le entrega sesión iniciada de inmediato.

### Flujo B — Admin de Conjunto invita a un reciclador a su conjunto
1. El Admin de Conjunto ingresa el correo de un reciclador ya registrado en la plataforma y selecciona su conjunto.
2. El sistema registra la invitación como pendiente y el reciclador puede verla en su lista de invitaciones.
3. El reciclador acepta o rechaza la invitación.
4. Si acepta, queda autorizado para operar en ese conjunto (puede reportar llegadas y ver el SHUT, por ejemplo). Si rechaza, la invitación queda cerrada sin autorización.

---

## Reglas de negocio

- RN-001: Solo el Admin Sistema puede invitar a una persona a convertirse en Admin de Conjunto.
- RN-002: Solo un Admin de Conjunto puede invitar recicladores, y únicamente a los conjuntos que él mismo administra.
- RN-003: El enlace de invitación para un nuevo Admin de Conjunto es de un solo uso y expira si no se acepta a tiempo.
- RN-004: Un reciclador solo queda autorizado en un conjunto después de aceptar explícitamente la invitación — nunca de forma automática.

---

## Historias de usuario derivadas

| HU      | Descripción                                                    |
| ------- | ----------------------------------------------------------------|
| [HU-018](../HUs/HU-018_admin_sistema_invita_admin_conjunto.md) | Admin Sistema invita a un nuevo Admin de Conjunto |
| [HU-019](../HUs/HU-019_persona_acepta_invitacion_admin_conjunto.md) | Persona invitada acepta y crea su cuenta de Admin de Conjunto |
| [HU-020](../HUs/HU-020_admin_conjunto_invita_reciclador.md) | Admin de Conjunto invita a un reciclador a su conjunto |
| [HU-021](../HUs/HU-021_reciclador_responde_invitacion.md) | Reciclador acepta o rechaza la invitación a un conjunto |
