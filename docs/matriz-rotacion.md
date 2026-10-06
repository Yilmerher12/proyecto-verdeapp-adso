# Matriz de rotación de capas

> Plantilla del [Bootcamp Testing ADSO](https://github.com/ergrato-dev/bc-testing-adso) (`plantillas/matriz-rotacion.md`). Se llena al inicio de cada semana.

**Grupo**: VerdeApp · **Ficha**: 3228970 · **Stack**: React + FastAPI + PostgreSQL

Capas: **Front** (React) · **API** (backend) · **BD** (integración) · **E2E** (Playwright)

Reglas:

- Cada semana cambias de capa. No repites capa hasta haber pasado por las cuatro.
- En la columna escribe la capa y, al cerrar la semana, el enlace a tu PR de tests.
- Quien revisa tu PR debe haber trabajado en otra capa esa semana.

| Integrante (usuario GitHub) | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 |
|---|---|---|---|---|---|---|---|---|---|
| Yilmer Hernández Camargo (@Yilmerher12) | E2E | | | | | | | | |
| Yordan Castro Guerrero (@yordancastrog7-pixel) | E2E | | | | | | | | |
| Juan Carlos Barajas (@Juanbarajas90) | E2E | | | | | | | | |
| José Guerrero (@josperaes-dotcom) | E2E | | | | | | | | |

## Cobertura semanal

Anota la cobertura real al cerrar cada semana. El umbral de la semana siguiente es el mayor entre el piso del plan y este valor, redondeado hacia abajo. Se configura en `fe/vite.config.ts` (`thresholds`) y en `be/pyproject.toml` (`fail_under`).

| Semana | Frontend (% líneas) | Backend (% líneas) | Umbral configurado para la semana siguiente |
|---|---|---|---|
| S1 (línea base, 6 de octubre de 2026) | 78.2 | 96.69 | Frontend 78 · Backend 96 |

> La línea base ya supera el piso del 80% del bootcamp en el backend: el proyecto venía con pruebas de API contra la BD real (`be/app/tests/`) y de componentes React (`fe/src/__tests__/`). Lo que no tenía era E2E (carpeta `e2e/`, creada en S1).

## Registro de vocero aleatorio

El vocero escribe su respuesta **antes** de que el instructor llegue a la mesa; el instructor la verifica con una pregunta corta y anota el resultado.

| Semana | Vocero | Capa preguntada | Respuesta escrita | Resultado (Alto / Medio / Bajo) |
|---|---|---|---|---|
| S1 | | | | |
