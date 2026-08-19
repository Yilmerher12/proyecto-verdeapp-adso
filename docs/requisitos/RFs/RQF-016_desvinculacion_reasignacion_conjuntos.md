# RQF-016 — Desvinculación y Reasignación de Conjuntos

<!--
  ¿Qué? Requisito funcional que define qué pasa cuando un Admin de Conjunto deja de
        administrar un conjunto, y cómo se le asigna un conjunto adicional.
  ¿Para qué? Cubrir el ciclo de vida completo de la relación Admin de Conjunto ↔ conjunto,
             más allá de la vinculación inicial (RQF-012).
  ¿Impacto? Sin esto, no hay una forma ordenada de que un conjunto cambie de administrador
            o de que alguien deje de administrar uno sin quedar en un limbo.
-->

---

## Identificación

| Campo         | Valor                                       |
| ------------- | --------------------------------------------- |
| **ID**        | RQF-016                                        |
| **Nombre**    | Desvinculación y Reasignación de Conjuntos     |
| **Módulo**    | Administración / Conjuntos                      |
| **Prioridad** | Media                                            |
| **Estado**    | Implementada                                     |
| **Usuarios**  | admin_conjunto, admin_sistema                   |

---

## Descripción

El sistema debe permitir que un Administrador de Conjunto solicite su desvinculación de un conjunto que ya no administra, que el Admin Sistema apruebe o rechace esa solicitud, y que el Admin Sistema pueda asignar un conjunto adicional a un Admin de Conjunto que ya existe en la plataforma (sin necesidad de invitarlo de nuevo, ver [RQF-012](RQF-012_gestion_vinculacion_conjuntos.md)).

Este proceso es manual y requiere aprobación humana (Admin Sistema) para evitar que un conjunto quede sin administrador sin aviso previo.

---

## Flujos

### Flujo A — Solicitar desvinculación (Admin Conjunto)
1. El Admin Conjunto ve la lista de conjuntos que administra en su perfil.
2. Selecciona uno y envía una solicitud de desvinculación con motivo opcional.
3. La solicitud queda pendiente hasta que el Admin Sistema la gestione.
4. El Admin Conjunto recibe una notificación cuando se procesa su solicitud.

### Flujo B — Gestionar solicitudes (Admin Sistema)
1. El Admin Sistema ve las solicitudes de desvinculación pendientes en su panel.
2. Puede aprobar o rechazar cada solicitud.
3. Al aprobar, el conjunto se desvincula del Admin Conjunto y ambos reciben notificación.
4. Al rechazar, el Admin Conjunto es notificado con el motivo.

### Flujo C — Asignar conjunto adicional (Admin Sistema)
1. El Admin Sistema busca un Admin Conjunto que ya existe en la plataforma.
2. Selecciona el conjunto a asignar de la lista de conjuntos disponibles sin administrador.
3. El sistema valida que el conjunto no tenga ya otro administrador activo.
4. Al confirmar, el Admin Conjunto recibe una notificación con el nuevo conjunto asignado.

---

## Reglas de negocio

- RN-001: Un Admin Conjunto no puede desvincularse solo; debe solicitarlo al Admin Sistema.
- RN-002: No se puede enviar otra solicitud de desvinculación para el mismo conjunto mientras hay una pendiente.
- RN-003: Un conjunto solo puede tener un administrador activo al mismo tiempo.
- RN-004: El sistema guarda un historial de todas las vinculaciones y desvinculaciones.
- RN-005: Asignar un conjunto adicional a un Admin de Conjunto existente no requiere pasar por el flujo de invitación por correo de RQF-012 — es una acción directa del Admin Sistema.

---

## Historias de usuario derivadas

| HU      | Descripción                                      |
| ------- | ------------------------------------------------ |
| [HU-022](../HUs/HU-022_admin_conjunto_solicita_desvinculacion.md) | Admin Conjunto solicita desvinculación |
| [HU-023](../HUs/HU-023_admin_sistema_gestiona_solicitudes_desvinculacion.md) | Admin Sistema gestiona solicitudes de desvinculación |
| [HU-024](../HUs/HU-024_admin_sistema_asigna_conjunto_adicional.md) | Admin Sistema asigna un conjunto adicional a un Admin de Conjunto existente |
