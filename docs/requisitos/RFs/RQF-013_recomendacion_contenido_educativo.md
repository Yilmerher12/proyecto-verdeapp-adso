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

---

## Reglas de negocio

- RN-001: Solo un `nivel_desempeno` de `REGULAR` o `DEFICIENTE` dispara la notificación de contenido recomendado. **Implementado.**
- RN-002: Un `nivel_desempeno` de `BUENA` (o el histórico `EXCELENTE`) no genera ninguna recomendación. **Implementado.**
- RN-003: Solo los Residentes del conjunto auditado reciben esta notificación — el Administrador de Conjunto queda fuera, porque no tiene acceso al catálogo educativo (`RoleGuard` de `/catalogo-educativo` en `App.tsx`). **Implementado.**
- RN-004: "Entre menos clics tenga que hacer el usuario, mejor" — un solo clic en la notificación navega directo a la categoría del catálogo educativo correspondiente, sin pasar por un paso intermedio. **Implementado.**
- RN-005: De las categorías del catálogo educativo, solo se ofrecen como `tema_educativo` seleccionable en el formulario de auditoría aquellas que un Reciclador puede calificar observando el cuarto de basuras en una sola visita — "Por qué es importante reciclar" es un tema de conciencia a largo plazo, no un estado físico observable ese día, y se excluye del selector (`CATEGORIAS_NO_AUDITABLES` en `fe/src/config/categoriasEducativas.ts`) aunque sigue existiendo en el catálogo general para que el Residente la lea por su cuenta. La cantidad de basura generada por el conjunto ("Marco distrital y consumo responsable") sí se considera observable comparando una visita con otra (más bolsas que la visita anterior, el SHUT se llena más rápido de lo normal), por eso sí es seleccionable — su nombre corto para el Reciclador es "Cantidad de basura generada" (ajustado el 2026-09-14). **Implementado.**

---

## Historias de usuario derivadas

| HU     | Descripción                                             |
| ------ | -------------------------------------------------------- |
| [HU-025](../HUs/HU-025_sistema_recomienda_contenido_por_auditoria.md) | Sistema recomienda contenido según la auditoría |
| [HU-026](../HUs/HU-026_residente_ve_contenido_recomendado.md) | Residente ve el contenido educativo recomendado |
