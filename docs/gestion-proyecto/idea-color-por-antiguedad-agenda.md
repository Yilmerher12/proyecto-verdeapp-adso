# Idea: teñir de ámbar las notas de la Agenda que llevan mucho tiempo sin tratar

<!--
  ¿Qué? Nota de una idea que quedó pendiente en la revisión del panel del Administrador de Conjunto: que una nota de
        la Agenda cambie de color según cuánto lleva sin tratarse.
  ¿Para qué? Dejar por escrito cómo funcionaría y qué habría que decidir antes, para resolverlo con calma y no por impulso.
  ¿Impacto? Es solo documentación. No se construye nada y NO es una decisión tomada: es una idea con su análisis.
-->

**Fecha:** 2026-11-10
**Rama:** `feat/estandares-tipografia-y-fechas-por-idioma`
**Estado:** idea abierta, sin decisión.
**Relacionado:** issues #632 y #633, `docs/requisitos/RFs/RQF-020_agenda_interna_conjunto.md` y `fe/src/pages/AdminConjuntoAgendaPage.tsx`.

## 1. Cómo es hoy

Todas las notas de "Por tratar" en la Agenda del comité son de **una sola tinta neutra**: gris, igual para todas, sin importar cuándo se crearon. Se decidió así en la revisión del diseño (issue #632) porque un color que no significa nada no se usa: antes cada nota tenía un color según su posición en la lista, y eso confundía (parecía que el color decía algo, y al archivar una nota las demás cambiaban de color).

## 2. La idea

Que el color **sí** signifique algo: una nota que lleva **mucho tiempo** sin tratarse se tiñe de **ámbar**, para que el administrador la vea y no se le quede olvidada antes de la reunión del comité. El ámbar ya es el color de "atención" en la app (por ejemplo, el contador de avisos sin leer); el rojo se reserva para peligro y error.

## 3. Lo que habría que decidir antes de construirla

1. **Cuántos días es "mucho tiempo".** ¿14, 30? Depende de cada cuánto se reúne el comité; un valor fijo puede no servirle a todos los conjuntos.
2. **Cómo marcarla sin depender solo del color.** Hay personas que no distinguen bien los colores, y el color solo no basta (regla de accesibilidad del proyecto). Habría que sumar un texto o un ícono, por ejemplo "Hace 21 días" con el ícono `Clock`.
3. **Dónde se explica.** Una nota ámbar sin explicación confunde. Habría que decir en algún lugar (una línea de ayuda arriba del tablero) qué significa ese color.
4. **Si hay más de un nivel.** ¿Solo ámbar, o también un segundo nivel más urgente? Más niveles piden más reglas y más color; lo más simple es uno solo.
5. **Qué fecha cuenta.** ¿La de creación de la nota o la de la última vez que se devolvió desde "Archivadas"? Una nota restaurada no debería nacer ya ámbar.

## 4. Riesgos

- Es un color decorativo si no se resuelve el punto 2: no se haría sin el texto o el ícono.
- Una Agenda con casi todas las notas en ámbar deja de avisar de nada (el aviso pierde fuerza si todo es de atención).

## 5. Qué haría falta para hacerlo

Un issue propio, con los 5 puntos de arriba decididos, el cálculo de la antigüedad en el frontend (sin cambios de servidor: el dato `created_at` ya llega), pruebas del umbral y la actualización de la regla "Color con significado" de `docs/requisitos/restricciones.md`.
