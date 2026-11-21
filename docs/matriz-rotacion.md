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
| Yilmer Hernández Camargo (@Yilmerher12) | E2E ([#467](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/467)) | E2E ([#586](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/586)) | Front: ProfilePage ([#637](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/637)) | | | | | | |
| Yordan Castro Guerrero (@yordancastrog7-pixel) | E2E | API ([#609](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/609)) | Front: LoginPage ([#614](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/614)) | | | | | | |
| Juan Carlos Barajas (@Juanbarajas90) | E2E | BD ([#592](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/592)) | Front: AceptarInvitacionPage ([#638](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/638), hecho por Yilmer) | | | | | | |
| José Guerrero (@josperaes-dotcom) | E2E | Front | Front: InvitarAdminConjuntoForm ([#631](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/631), hecho por Yordan) | | | | | | |

## Cobertura semanal

Anota la cobertura real al cerrar cada semana. El umbral de la semana siguiente es el mayor entre el piso del plan y este valor, redondeado hacia abajo. Se configura en `fe/vite.config.ts` (`thresholds`) y en `be/pyproject.toml` (`fail_under`).

| Semana | Frontend (% líneas) | Backend (% líneas) | Umbral configurado para la semana siguiente |
|---|---|---|---|
| S1 (línea base, 6 de octubre de 2026) | 78.2 | 96.69 | Frontend 78 · Backend 96 |
| S2 (cierre, 3 de noviembre de 2026) | 86.4 | 97.17 | Frontend 86 · Backend 96 (sin cambio) |
| S3 (cierre, 10 de noviembre de 2026) | 89.36 | 97.24 | Frontend 89 · Backend 97 |

> La línea base ya supera el piso del 80% del bootcamp en el backend: el proyecto venía con pruebas de API contra la BD real (`be/app/tests/`) y de componentes React (`fe/src/__tests__/`). Lo que no tenía era E2E (carpeta `e2e/`, creada en S1).

> **Cierre de S2 (3 de noviembre de 2026):** el frontend subió de 78.2 a 86.4 % de líneas (sentencias 84.9, ramas 82.9 y funciones 81.2). El umbral de `fe/vite.config.ts` pasó de 78 / 76 / 72 / 70 a 86 / 84 / 82 / 81 (líneas, sentencias, ramas, funciones), redondeado hacia abajo. El backend no se midió en esa rama; se midió después sobre `develop` (3 de noviembre de 2026) y dio 97.17 % de líneas con 915 pruebas en verde. El umbral de `be/pyproject.toml` (96) no cambió: se actualiza en el PR de cierre de la S3.

> **Cierre de S3 (10 de noviembre de 2026):** medido sobre `develop` (commit `df5be42`) con todos los PR de la semana fusionados. Frontend: 89.36 % de líneas (sentencias 87.62, ramas 84.7 y funciones 83.14) con 1062 pruebas en verde. Backend: 97.24 % de líneas con 981 pruebas en verde. Los umbrales pasaron en el PR [#639](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/639) a 89 / 87 / 84 / 83 en `fe/vite.config.ts` y a 97 en `be/pyproject.toml`.

### Retos sugeridos para la capa Front

Páginas y archivos del frontend con menos cobertura de líneas al cierre de S2 (con más de 15 líneas). Son buenos retos para quien tenga la capa **Front** en una semana de la rotación, porque tienen flujos reales por probar:

| Archivo | Líneas cubiertas | Qué falta probar |
|---|---|---|
| `src/pages/ProfilePage.tsx` | 67.4 % | Subida de foto (tipo inválido, más de 5 MB, éxito y error del servidor), cancelar la edición, teléfono inválido (7 a 10 dígitos), error al guardar y banner de éxito, campos del Reciclador (asociación y permiso para mostrar el teléfono en el Directorio) y que el Admin del Sistema no vea "Editar" |
| `src/pages/LoginPage.tsx` | 69.2 % | Ver las líneas sin cubrir en el reporte de pnpm test |
| `src/pages/AdminConjuntoComunicadosPage.tsx` | 64.1 % | Ver las líneas sin cubrir en el reporte de pnpm test |
| `src/pages/AceptarInvitacionPage.tsx` | 61.2 % | Ver las líneas sin cubrir en el reporte de pnpm test |
| `src/components/InvitarAdminConjuntoForm.tsx` | 52.3 % | Ver las líneas sin cubrir en el reporte de pnpm test |
| `src/api/auth.ts` | 13.6 % | Ver las líneas sin cubrir en el reporte de pnpm test |

## Registro de vocero aleatorio

El vocero escribe su respuesta **antes** de que el instructor llegue a la mesa; el instructor la verifica con una pregunta corta y anota el resultado.

| Semana | Vocero | Capa preguntada | Respuesta escrita | Resultado (Alto / Medio / Bajo) |
|---|---|---|---|---|
| S1 | | | | |
