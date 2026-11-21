# Uso de Git y GitHub en VerdeApp

<!--
  ¿Qué? Cómo trabaja el equipo con el repositorio (ramas, commits, Pull Requests y CI), con las
        cifras reales de la historia de Git y de GitHub.
  ¿Para qué? Es la evidencia del criterio 12 de la revisión (manejo apropiado del repositorio
            con ramas y commits). Las reglas en sí están en el README y en `CLAUDE.md`; aquí
            se muestra que se cumplen y dónde no.
  ¿Impacto? Las cifras salen de `git` y de `gh` el 21 de noviembre de 2026 (comandos al final).
            Cambian con cada commit; si se vuelven a medir, se actualiza este documento.
-->

| Campo | Valor |
|---|---|
| **Fecha de las cifras** | 21 de noviembre de 2026 |
| **Periodo** | Del 22 de junio al 21 de noviembre de 2026 |
| **Repositorio** | `Yilmerher12/proyecto-verdeapp-adso` (monorepo: `be/`, `fe/`, `e2e/`, `docs/`) |
| **Documentos hermanos** | [Modelo de ramas del README](../../README.md#-modelo-de-ramas-y-commits) · [Arquitectura, diagrama 5](../arquitectura.md#5-del-código-a-la-rama-principal) · [Informes de Scrum](informes-scrum/README.md) |

## 1. Resumen en cifras

| Qué | Cifra |
|---|---|
| Commits en `develop` | 841, de los cuales 446 son cambios reales y 395 son commits de fusión |
| Pull Requests fusionados | 394: 371 hacia `develop`, 4 hacia `stg` y 19 hacia `main` |
| Commits con el formato acordado (Conventional Commits) | 441 de 446 |
| Etiquetas de versión (tags) | 0 (ver la sección 6) |

## 2. Modelo de ramas

Tres ramas permanentes y una rama de trabajo por cada tarjeta:

```text
rama de trabajo  →  develop  →  stg  →  main
 (una por tarea)   integración  verificación   estable
```

- **`develop`:** donde se integra todo. Las ramas de trabajo siempre salen de un `develop` actualizado y nunca se trabaja directo sobre `develop`.
- **`stg`:** solo recibe PR desde `develop`. Ahí se prueba el conjunto completo antes de pasarlo a producción.
- **`main`:** solo recibe PR desde `stg`.
- **Un error hallado en `stg`** se corrige en una rama nueva desde `develop`, nunca directo en `stg`.

Las reglas completas están en el [README](../../README.md#-modelo-de-ramas-y-commits).

## 3. Nombres de rama

El prefijo de la rama dice qué tipo de cambio lleva. Estos son los 371 PR fusionados hacia `develop`, por prefijo:

| Prefijo | Se usa para | PR fusionados |
|---|---|---|
| `feat/` | Funcionalidad nueva | 128 |
| `fix/` | Corregir un error | 107 |
| `docs/` | Solo documentación | 56 |
| `chore/` | Mantenimiento (dependencias, configuración) | 37 |
| `dependabot/` | Actualizaciones automáticas de dependencias | 20 |
| `test/` | Solo pruebas (retos del bootcamp de testing) | 15 |
| `content/`, `refactor/` | Contenido educativo y reorganización | 1 cada una |

Los otros 6 PR son 5 con la rama `main` como origen, que traen `main` de vuelta a `develop` para mantenerlas alineadas, y 1 reversión.

## 4. Mensajes de commit

Siguen [Conventional Commits](https://www.conventionalcommits.org/): `tipo: descripción en español`, y el tipo coincide con el prefijo de la rama.

- **441 de los 446 commits reales cumplen el formato.** Los últimos 300 lo cumplen todos.
- **Los 5 que no lo cumplen:** dos son mensajes que escribe Git solo al revertir y volver a aplicar un cambio (`Revert "..."` y `Reapply "..."`), uno es una fusión de actualización de rama (`merge: ...`) y dos son del primer día del proyecto, el 23 de junio.

Ejemplos reales: `fix: agregar límites de longitud a los formularios de administración`, `feat: reorganizar la página Mi perfil con bloques de igual altura según el rol`, `docs: actualizar diagramas UML de clases y casos de uso` y `test: agregar pruebas de API de puntos de acopio para 401, 422 y 404 (semana 4)`.

## 5. Cómo entra un cambio

1. **Tarjeta.** Cada cambio sale de un issue creado con la plantilla de `.github/ISSUE_TEMPLATE/` (tarea o investigación), con contexto, alcance, criterios de aceptación e importancia, complejidad y tamaño.
2. **Rama.** Se crea desde `develop` con el prefijo que corresponda.
3. **Commits** con el formato de la sección 4.
4. **Pull Request** hacia `develop`, con la plantilla `.github/pull_request_template.md`: qué cambia y por qué, issue relacionado, tipo de cambio, lista de comprobación y cómo probarlo. Los PR del bootcamp de testing usan su propia plantilla. El título va en inglés y la descripción en español.
5. **CI en GitHub Actions** (`.github/workflows/ci.yml`), que corre en cada PR hacia `develop`, `stg` y `main`: backend (`ruff`, `pytest` con cobertura y `pip-audit`) y frontend (`tsc`, `eslint`, `vitest`, `build` y `pnpm audit`).
6. **Fusión.** Solo después de que el CI esté en verde.
7. **Entrega.** `develop` pasa a `stg` y de ahí a `main`, con el mismo CI en cada paso. En `stg` GitHub exige una revisión antes de fusionar.

Otras piezas que cuidan el repositorio:

- **Dependabot** (`.github/dependabot.yml`) abre solo los PR de actualización de dependencias; son los 20 PR de `dependabot/`.
- **`close-prs.yml`** cierra automáticamente un PR abierto desde un fork (una copia hecha por alguien externo) y no ejecuta nunca su código.
- **Reglas de trabajo con IA** en `CLAUDE.md`: una rama por tarjeta, comandos de Git que ejecuta el integrante y no la herramienta, y sin líneas de atribución en commits ni PR.

## 6. Límites de hoy

Son cosas que el equipo reconoce que no están como la documentación las describe:

- **No hay etiquetas de versión.** El README dice que `main` «se etiqueta para cada entrega (ej. `v1.0.0`)», pero hoy el repositorio no tiene ninguna (`git tag` y `gh release list` salen vacíos). Queda como pendiente para la primera entrega.
- **Las protecciones de rama son parciales.** Solo `stg` exige una revisión antes de fusionar. `main` y `develop` no exigen revisión, y ninguna rama obliga a que el CI esté en verde: que el CI deba pasar es un acuerdo del equipo, no algo que GitHub imponga.
- **Pocas revisiones registradas.** Solo 7 de los 394 PR fusionados tienen una revisión registrada en GitHub. Las revisiones del bootcamp de testing se hicieron corriendo y rompiendo el código del compañero, pero no siempre quedaron como revisión en el PR.
- **Ramas ya fusionadas sin borrar.** Quedan ramas remotas de trabajo cuyos PR ya se fusionaron, que se pueden limpiar.
- **El trabajo no se reparte por igual.** Casi todos los commits y los PR son de una sola persona. Cuánto hizo cada integrante, y por qué, está en los [informes semanales](informes-scrum/README.md); el número de commits no mide el aporte.

## 7. Cómo repetir las cifras

Desde la raíz del repositorio, con `git` y `gh` (GitHub CLI) instalados:

```bash
git rev-list --count origin/develop
git rev-list --no-merges --count origin/develop
gh pr list --state merged --limit 1000 --json baseRefName --jq 'group_by(.baseRefName)|map("\(.[0].baseRefName): \(length)")|.[]'
git shortlog -sn --no-merges origin/develop
git tag
```
