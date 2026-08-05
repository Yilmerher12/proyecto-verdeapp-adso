# RQF-013 — Recomendación de Contenido Educativo por Auditoría

## Identificación

| Campo         | Valor                                            |
| ------------- | ------------------------------------------------ |
| **ID**        | RQF-013                                          |
| **Nombre**    | Recomendación de Contenido Educativo por Auditoría |
| **Módulo**    | Contenido Educativo / Auditoría                  |
| **Prioridad** | Media                                            |
| **Estado**    | Por implementar                                  |
| **Usuarios**  | sistema (proceso automático), residente          |

---

## Descripción

Cuando un reciclador registra la calificación de auditoría de un conjunto y hay categorías con resultado negativo (Separación, Preparación, Presentación o Contaminación), el sistema debe recomendar automáticamente los módulos de contenido educativo relacionados a los residentes de ese conjunto para que puedan mejorar en las áreas donde fallaron.

Este RF extiende el funcionamiento de **RQF-009** (Auditoría de Residuos con Semáforo) y **RQF-010** (Contenido Educativo).

---

## Flujos

### Flujo A — Recomendación automática (Sistema)
1. Al guardar la calificación de auditoría, el sistema detecta qué categorías recibieron calificación negativa (❌).
2. Busca módulos educativos que tengan la misma etiqueta que las categorías fallidas.
3. Marca esos módulos como "Recomendados" para los residentes del conjunto auditado.
4. Si no hay módulos disponibles para una categoría, no genera una recomendación vacía.

### Flujo B — Ver recomendación (Residente)
1. El residente abre la app y ve en su inicio una sección "Te recomendamos leer" si hay contenido recomendado activo.
2. Puede ver los módulos recomendados y abrirlos.
3. Puede marcar un módulo como leído para que deje de aparecer en la sección de recomendaciones.

---

## Reglas de negocio

- RN-001: Una recomendación solo se activa si la calificación fue negativa en al menos una categoría.
- RN-002: Cada categoría de auditoría tiene una etiqueta correspondiente en los módulos educativos (Separación, Preparación, Presentación, Contaminación).
- RN-003: Si no hay módulos con esa etiqueta disponibles, no se muestra la sección de recomendaciones al residente.
- RN-004: Las recomendaciones activas expiran automáticamente a los 30 días o al publicarse nueva auditoría del mismo conjunto.
- RN-005: Un residente puede marcar una recomendación como leída para que no siga apareciendo.

---

## Historias de usuario derivadas

| HU      | Descripción                                              |
| ------- | -------------------------------------------------------- |
| HU-027  | Sistema recomienda contenido según la auditoría          |
| HU-028  | Residente ve el contenido educativo recomendado          |
