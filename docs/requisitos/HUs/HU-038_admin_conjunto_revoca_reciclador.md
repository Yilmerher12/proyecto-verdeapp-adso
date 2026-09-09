# HU-038 — Admin de Conjunto revoca el acceso de un reciclador

<!--
  ¿Qué? Historia de usuario para que el Admin de Conjunto termine la
        autorización de un reciclador que ya no trabaja con su conjunto.
  ¿Para qué? Antes no existía ninguna forma de hacer esto — solo invitar,
            aceptar/rechazar y listar. Refleja en la app lo que ya se
            acuerda de forma informal fuera de ella.
  ¿Impacto? Sin esto, un reciclador que dejó de trabajar con un conjunto
            seguía autorizado para siempre (podía auditar, reportar
            llegadas, etc.) sin ninguna forma de revertirlo.
-->

---

## Identificación

| Campo             | Valor                                                    |
| ------------------ | ---------------------------------------------------------|
| **ID**             | HU-038                                                      |
| **Título**         | Admin de Conjunto revoca el acceso de un reciclador           |
| **Módulo**         | Administración / Conjuntos                                   |
| **Prioridad**      | Media                                                         |
| **Estado**         | Implementado                                                  |
| **RF asociados**   | RQF-012                                                      |

---

## Historia

**Como** Admin de Conjunto,
**quiero** revocar el acceso de un reciclador que ya está autorizado en mi conjunto,
**para** que deje de poder recoger material o auditar mi conjunto cuando ya no trabaje conmigo.

---

## Criterios de aceptación

### CA-038.1 — Revocar directo, sin solicitud

- **Dado que** tengo un reciclador autorizado en uno de mis conjuntos,
- **cuando** elijo revocar su acceso y confirmo,
- **entonces** el sistema lo aplica de inmediato — a diferencia de RQF-016 (desvinculación de Admin de Conjunto), esto no pasa por una solicitud/aprobación aparte.

### CA-038.2 — El reciclador ya no está autorizado

- **Dado que** revoqué el acceso de un reciclador,
- **cuando** ese reciclador intenta auditar, reportar una llegada o ver contenido exclusivo de ese conjunto,
- **entonces** el sistema lo rechaza como si nunca hubiera estado autorizado.

### CA-038.3 — Se conserva el historial

- **Dado que** revoqué el acceso de un reciclador,
- **cuando** reviso el registro internamente,
- **entonces** el vínculo no se borra — queda marcado como revocado, con fecha y quién lo revocó.

### CA-038.4 — El reciclador es notificado

- **Dado que** se revocó mi acceso a un conjunto,
- **cuando** reviso mis notificaciones,
- **entonces** veo un aviso de que ya no estoy autorizado ahí.

### CA-038.5 — Se puede volver a autorizar

- **Dado que** un reciclador fue revocado de un conjunto,
- **cuando** el Admin de Conjunto lo invita de nuevo y él acepta,
- **entonces** queda autorizado otra vez, sin que el historial anterior se lo impida.
