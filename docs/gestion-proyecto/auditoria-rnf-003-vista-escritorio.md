# Auditoría RNF-003 — Vista de escritorio (parte 4)

<!--
  ¿Qué? Verificación de RNF-003 a 1280x800 (escritorio), después de que las
        partes 1-3 cubrieran todo el contraste en móvil (375px).
  ¿Para qué? Confirmar que lo ya corregido en móvil sigue válido en
             escritorio, y que no hay desbordamientos ni layouts rotos.
  ¿Impacto? No se encontró ningún bug — este documento deja constancia de
            que el chequeo se hizo, no solo que "no se hizo nada".
-->

**Fecha:** 2026-08-25

## Contraste — no hace falta re-auditar

Se confirmó por código (`grep` de clases `sm:`/`md:`/`lg:`/`xl:` combinadas con color, en todo `fe/src`) que **ningún color de texto o fondo depende del ancho de pantalla** — solo del modo claro/oscuro. Por lo tanto, todo lo corregido en las partes 1, 2 y 3 (auditadas a 375px) sigue siendo válido sin cambios a 1280px.

## Layout / desbordamiento — 0 problemas encontrados

Revisado a 1280x800, sin desbordamiento horizontal en ninguna de estas páginas (varias con sus formularios/modales desplegados):

- Landing, Login, Registro
- Los 4 dashboards (Residente, Reciclador, Admin del Sistema, Admin de Conjunto), con los formularios de invitar administrador, invitar reciclador, editar conjunto y solicitar desvinculación abiertos
- Términos de uso, Política de cookies (tiene una tabla)
- Perfil, Directorio

También se confirmó que el menú lateral de los dashboards cambia correctamente de "apilado arriba del contenido" (como se ve en celular) a "columna fija a la izquierda, contenido a la derecha" en escritorio, sin superposiciones.

## Con esto, RNF-003.3 (contraste) queda verificado también en escritorio.

## Lo que sigue faltando de RNF-003
- RNF-003.1 (responsive real más allá de "no desborda" — proporciones, tamaños de fuente en tablet, etc.) — no se ha probado a fondo en tamaños intermedios (tablet, ~768px).
- RNF-003.2 (compatibilidad Chrome/Firefox/Edge) — no se ha probado en navegadores reales fuera del entorno de pruebas.
- El caso sin explicar del pie de página de `AuthLayout` (parte 1) — pendiente de confirmar visualmente en un navegador real.
