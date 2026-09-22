# RQF-013 — Recomendación de Contenido Educativo por Auditoría

<!--
  ¿Qué? Requisito funcional que conecta el resultado de una auditoría del
        Reciclador (RQF-009) con el catálogo de contenido educativo
        (RQF-004) — cuando la calificación es Regular o Malo, se avisa a
        los Residentes del conjunto que hay contenido recomendado sobre el
        tema calificado.
  ¿Para qué? Que una calificación negativa se traduzca en algo accionable
            para el Residente, no solo en un dato histórico.
  ¿Impacto? Issue #4 — reemplaza el diseño original (categorías múltiples
            por auditoría, expiración a 30 días, "marcar como leído" por
            módulo) por uno más simple, alineado con cómo terminó
            funcionando RQF-009 (un solo nivel de desempeño y un solo tema
            por auditoría).
-->

---

## Identificación

| Campo         | Valor                                              |
| ------------- | --------------------------------------------------- |
| **ID**        | RQF-013                                              |
| **Nombre**    | Recomendación de Contenido Educativo por Auditoría   |
| **Módulo**    | Contenido Educativo / Auditoría                      |
| **Prioridad** | Media                                                |
| **Estado**    | Implementado                                         |
| **Usuarios**  | sistema (proceso automático), residente              |

---

## Descripción

Cuando un Reciclador registra una auditoría (RQF-009) con nivel de desempeño **Regular** o **Malo**, el sistema notifica automáticamente a los Residentes del conjunto auditado que hay contenido educativo recomendado sobre el tema que se calificó. Un desempeño **Bueno** no genera ninguna recomendación — no hay nada que recomendar si ya se hizo bien.

No hace falta ningún algoritmo de inteligencia artificial para "encontrar" el contenido relacionado: `tema_educativo` (el tema que el Reciclador elige al auditar) se guarda con el mismo texto que `modulo_categoria` en el catálogo educativo (RQF-004) a propósito — es una comparación directa de texto, ya la usa la página de una categoría del catálogo (`/catalogo-educativo/:categoria`) para filtrar su contenido.

Este RF extiende **RQF-009** (Auditoría de Residuos con Semáforo) y **RQF-004** (Catálogo Educativo).

---

## Flujos

### Flujo A — Recomendación automática (Sistema)

1. Al guardar una auditoría (`POST /api/v1/auditorias-conjunto`), el sistema revisa el `nivel_desempeno` registrado.
2. Si el nivel es `REGULAR` o `DEFICIENTE`, crea una notificación de tipo `CONTENIDO_RECOMENDADO` dirigida a los Residentes del conjunto auditado, con el `id_referencia` apuntando a la auditoría recién creada.
3. Si el nivel es `BUENA` (o el histórico `EXCELENTE`), no se genera ninguna notificación.
4. El Administrador de Conjunto **no** recibe este tipo de notificación — solo el Residente puede entrar al catálogo educativo ("Aprender"), a diferencia de `AUDITORIA_PUBLICADA` (RQF-009) que sí llega a ambos.

### Flujo B — Ver la recomendación (Residente)

1. El Residente ve la notificación en la sección "Actividad reciente" de su panel, con su propio ícono (🎓) y el mensaje: *"El reciclador calificó "\<tema\>" como Regular/Malo en tu conjunto. Revisa el contenido educativo recomendado."*
2. Al hacer clic sobre la notificación (un solo clic, sin pasos intermedios — ver RN-004), el sistema consulta la auditoría referenciada, toma su `tema_educativo` y navega directo a `/catalogo-educativo/:categoria` con ese tema.
3. El clic también marca la notificación como leída, igual que cualquier otra notificación del panel.

### Flujo C — Envío manual (Admin Sistema)

<!-- ¿Qué? Agregado junto con el rediseño de RQF-010 (pestaña "Módulos" del
     panel de Contenido educativo). ¿Para qué? El Flujo A solo recomienda un
     módulo cuando SU categoría coincidió con el tema calificado Regular/Malo
     en una auditoría — un módulo cuya categoría nunca sale mal calificada
     (o que ni siquiera es auditable, ver RN-005) nunca se recomendaba a
     nadie por ese camino. El panel del Admin ahora muestra "Sin recomendar"
     (RQF-010) para que decida enviar esos módulos a mano y aprovechar más el
     catálogo. ¿Impacto? Segundo camino, además del automático, para que un
     Residente reciba la misma notificación de contenido recomendado. -->

1. El Admin Sistema abre un módulo del catálogo (pestaña "Módulos", RQF-010) y ve a qué conjuntos ya se recomendó (automático o manual).
2. Elige enviarlo a un conjunto específico o a varios a la vez (`POST /api/v1/contenido-educativo/{id}/enviar`).
3. El sistema registra el envío (tabla `contenido_educativo_envios`) y crea, para cada conjunto elegido, una notificación de tipo `CONTENIDO_RECOMENDADO_MANUAL` dirigida a sus Residentes, con `id_referencia` apuntando al módulo (no a una auditoría, porque no hay ninguna de por medio).
4. El Residente ve la notificación igual que en el Flujo B (mismo ícono 🎓 y ubicación en "Actividad reciente"), con el mensaje: *"Hay contenido educativo nuevo recomendado para tu conjunto."* Al hacer clic, navega directo a la categoría del módulo enviado.
5. Si el conjunto elegido no tiene ningún Residente registrado todavía, el envío se guarda igual (para que la lista de "Recomendado a" del módulo quede completa) pero no se crea ninguna notificación — no hay nadie a quien notificar.

---

## Reglas de negocio

- RN-001: Solo un `nivel_desempeno` de `REGULAR` o `DEFICIENTE` dispara la notificación de contenido recomendado. **Implementado.**
- RN-002: Un `nivel_desempeno` de `BUENA` (o el histórico `EXCELENTE`) no genera ninguna recomendación. **Implementado.**
- RN-003: Solo los Residentes del conjunto auditado reciben esta notificación — el Administrador de Conjunto queda fuera, porque no tiene acceso al catálogo educativo (`RoleGuard` de `/catalogo-educativo` en `App.tsx`). **Implementado.**
- RN-004: "Entre menos clics tenga que hacer el usuario, mejor" — un solo clic en la notificación navega directo a la categoría del catálogo educativo correspondiente, sin pasar por un paso intermedio. **Implementado.**
- RN-005: De las categorías del catálogo educativo, solo se ofrecen como `tema_educativo` seleccionable en el formulario de auditoría aquellas que un Reciclador puede calificar observando el cuarto de basuras en una sola visita — "Por qué es importante reciclar" es un tema de conciencia a largo plazo, no un estado físico observable ese día, y se excluye del selector (`CATEGORIAS_NO_AUDITABLES` en `fe/src/config/categoriasEducativas.ts`) aunque sigue existiendo en el catálogo general para que el Residente la lea por su cuenta. La cantidad de basura generada por el conjunto ("Marco distrital y consumo responsable") sí se considera observable comparando una visita con otra (más bolsas que la visita anterior, el SHUT se llena más rápido de lo normal), por eso sí es seleccionable — su nombre corto para el Reciclador es "Cantidad de basura generada" (ajustado el 2026-09-14). **Implementado.**
- RN-006: El envío manual (Flujo C) es independiente del automático — un Admin Sistema puede enviar cualquier módulo a cualquier conjunto en cualquier momento, sin que haya existido una auditoría de por medio. Si un conjunto ya tiene el módulo recomendado automáticamente, ese origen se muestra primero en la lista "Recomendado a" del panel del Admin (RQF-010) — el envío manual no lo duplica ni lo reemplaza. **Implementado.**
- RN-007: Un conjunto sin Residentes registrados puede recibir un envío manual igualmente (queda guardado el registro), pero no genera ninguna notificación — no hay a quién notificar. **Implementado.**

---

## Historias de usuario derivadas

| HU     | Descripción                                             |
| ------ | -------------------------------------------------------- |
| [HU-025](../HUs/HU-025_sistema_recomienda_contenido_por_auditoria.md) | Sistema recomienda contenido según la auditoría |
| [HU-026](../HUs/HU-026_residente_ve_contenido_recomendado.md) | Residente ve el contenido educativo recomendado |
