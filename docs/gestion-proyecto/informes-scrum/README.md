# Informes semanales del Scrum Master

Cada semana un integrante del equipo hace de **Scrum Master**. Los roles rotan entre los cuatro integrantes. Al cierre de la semana, esa persona escribe un informe con lo que hizo cada compañero y se lo presenta al profesor.

## Para qué sirve

- Dejar por escrito quién trabajó en qué tarjeta o historia de usuario (HU), y cómo le fue.
- Que el profesor vea el avance real de cada integrante, no solo el resultado final.
- Tener un historial semana a semana de bloqueos y decisiones.

## Cómo se crea un informe

1. Copiar [`_plantilla.md`](_plantilla.md) en esta misma carpeta.
2. Nombrar la copia `semana-NN_nombre.md`, donde `NN` es el número de la semana con dos dígitos y `nombre` es el Scrum Master de esa semana (por ejemplo `semana-02_yilmer.md`).
3. Llenar cada sección. Los datos objetivos (rama, PR, archivos tocados) salen del repositorio con `git log` y `gh pr list`. Los bloqueos y cómo se sintió cada persona se le preguntan al compañero durante la semana.

## Qué se reporta

Cualquier tarjeta del tablero, no solo las HU. Hoy las 48 HU de `docs/requisitos/HUs/` están implementadas, así que el trabajo de la semana suele ser de otro tipo: diseño, pruebas, seguridad, mantenimiento. Cada tarjeta se identifica con su tipo: `HU`, `diseño`, `tests`, `seguridad` o `chore`.

Una tarjeta que no se puede trabajar todavía (por ejemplo, espera un diseño que otro integrante no terminó) se anota como **bloqueada**, con el motivo.
