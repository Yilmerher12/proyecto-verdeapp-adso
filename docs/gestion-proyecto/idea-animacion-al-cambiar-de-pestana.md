# Idea: una animación al cambiar de pestaña

<!--
  ¿Qué? Nota de una idea que quedó pendiente en la revisión de las páginas del Administrador de Conjunto: que el contenido
        no cambie de golpe al pasar de una pestaña a otra.
  ¿Para qué? Dejar por escrito qué se vio, qué habría que decidir y qué cuidar, para resolverlo con calma y de forma
             igual en toda la app, no página por página.
  ¿Impacto? Es solo documentación. No se construye nada y NO es una decisión tomada: es una idea con su análisis.
-->

**Fecha:** 2026-11-10
**Rama:** `feat/estandares-tipografia-y-fechas-por-idioma`
**Estado:** decisión tomada el 2026-11-11 en el issue #643 (rama `feat/estandar-movimiento`). Se eligió el desvanecimiento solo, con duración rápida de 150 ms y normal de 200 ms, el componente `PanelPestana` para las pestañas y `AppShell` para las páginas. La regla quedó escrita en `docs/requisitos/restricciones.md` ("Movimiento"). Lo de abajo es el análisis que llevó a la decisión.
**Relacionado:** issues #632 y #633, `fe/src/components/ui/Pestanas.tsx` y `fe/src/index.css` (ya existe `animate-fade-in`, usada por el panel del Admin de Conjunto).

## 1. Qué se vio

Al revisar con el equipo las páginas con pestañas (Comunicados, Agenda, Desempeño, Soporte técnico), se notó que el contenido **cambia de golpe**: al pulsar otra pestaña, lo de abajo desaparece y aparece lo nuevo en el mismo instante, y a veces la altura de la tarjeta salta. Se sintió "abrupto" y poco cuidado.

## 2. La idea

Que el contenido nuevo aparezca con una transición corta (un desvanecimiento de unos 150–200 ms), la **misma en toda la app**.

## 3. Lo que habría que decidir antes

1. **Una sola animación para todos los lugares con pestañas**, no una distinta por página. Lo más natural es ponerla en el componente `Pestanas` o en un contenedor de panel compartido, y no en cada página.
2. **Qué hacer con el salto de altura.** Un desvanecimiento no arregla que la tarjeta cambie de alto; habría que ver si se reserva un alto mínimo o se anima la altura (más complejo).
3. **Cuál es la duración justa.** Demasiado corta no se nota; demasiado larga hace sentir lenta la app.

## 4. Lo que hay que cuidar

- **"Reducir movimiento":** las animaciones del proyecto ya solo corren dentro de `prefers-reduced-motion: no-preference` (ver la regla de animación de íconos en `restricciones.md`). Esta debe seguir el mismo criterio.
- **Pruebas:** que no hagan fallar las pruebas existentes ni las vuelvan lentas (en las pruebas la animación se desactiva).
- **Contenido que carga:** si el contenido de una pestaña viene del servidor, la animación no debe empezar y luego repetirse cuando llegan los datos.

## 5. Qué haría falta para hacerlo

Un issue propio, con las tres decisiones de arriba tomadas, el cambio en un solo componente compartido, y la actualización de la regla de animación de `docs/requisitos/restricciones.md`.
