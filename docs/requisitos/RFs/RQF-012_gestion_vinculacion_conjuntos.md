# RQF-012 — Gestión de Vinculación de Conjuntos

## Identificación

| Campo         | Valor                                    |
| ------------- | ---------------------------------------- |
| **ID**        | RQF-012                                  |
| **Nombre**    | Gestión de Vinculación de Conjuntos      |
| **Módulo**    | Administración / Conjuntos               |
| **Prioridad** | Media                                    |
| **Estado**    | Por implementar                          |
| **Usuarios**  | admin_conjunto, admin_sistema            |

---

## Descripción

El sistema debe permitir que un Administrador de Conjunto pueda solicitar su desvinculación de un conjunto que ya no administra, y que el Admin Sistema pueda gestionar esas solicitudes y también asignar nuevos conjuntos a administradores existentes.

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

### Flujo C — Asignar nuevo conjunto (Admin Sistema)
1. El Admin Sistema busca un Admin Conjunto existente.
2. Selecciona el conjunto a asignar de la lista de conjuntos disponibles.
3. El sistema valida que el conjunto no tenga ya otro administrador activo.
4. Al confirmar, el Admin Conjunto recibe una notificación con el nuevo conjunto asignado.

---

## Reglas de negocio

- RN-001: Un Admin Conjunto no puede desvincularse solo; debe solicitarlo al Admin Sistema.
- RN-002: No se puede enviar otra solicitud de desvinculación para el mismo conjunto mientras hay una pendiente.
- RN-003: Un conjunto solo puede tener un administrador activo al mismo tiempo.
- RN-004: El sistema guarda un historial de todas las vinculaciones y desvinculaciones.

---

## Historias de usuario derivadas

| HU      | Descripción                                      |
| ------- | ------------------------------------------------ |
| HU-024  | Admin Conjunto solicita desvinculación           |
| HU-025  | Admin Sistema gestiona solicitudes               |
| HU-026  | Admin Sistema asigna nuevo conjunto              |
