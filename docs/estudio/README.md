# Documentos de estudio de VerdeApp

<!--
  ¿Qué? Once documentos y un anexo que explican VerdeApp desde cero (qué es, cómo funciona, cómo se protege y
        se prueba, cómo trabajamos, en qué estado está, de dónde salen sus datos, qué estándares sigue y cómo
        correrla), escritos para que los cuatro integrantes estudien y puedan explicar el proyecto ante los
        profesores.
  ¿Para qué? Reemplazan al guion único de la feria (más de 2000 líneas, borrado el 20 de noviembre de 2026),
            dividido por tema, con explicaciones paso a paso y sin dar nada por sabido.
  ¿Impacto? El texto vive en Markdown (se edita y se revisa en git) y los PDF se generan con un solo comando.
            Si cambia el proyecto (cifras, versiones, reglas), se edita el `.md` y se regenera el PDF.
-->

## Serie 1: el proyecto (documentos 1 a 5)

| # | Documento | De qué trata |
|---|---|---|
| 1 | [El proyecto](1-el-proyecto.md) | Qué problema resuelve, los 4 roles paso a paso, qué hace y qué no hace, y la demostración |
| 2 | [Cómo funciona por dentro](2-como-funciona.md) | Las tres capas, el recorrido de una petición, el backend, el frontend, la base de datos y las tecnologías |
| 3 | [Seguridad y calidad](3-seguridad-y-calidad.md) | Las defensas contra ataques, las pruebas, la cobertura, la integración continua y los defectos |
| 4 | [Cómo trabajamos](4-como-trabajamos.md) | Scrum, tarjetas y estimación, informes semanales, Git y GitHub, y el reparto del trabajo |
| 5 | [Estado y mejoras](5-estado-y-mejoras.md) | Despliegue, deuda técnica, límites honestos y qué haríamos con más tiempo |

## Serie 2: datos, estándares y apoyo (documentos 6 a 11 y anexo)

| # | Documento | De qué trata |
|---|---|---|
| 6 | [Los datos y las fuentes oficiales](6-datos-y-fuentes.md) | De dónde salen los conjuntos, las ECA y las lecciones; las peticiones a la UAESP; licencias y datos personales |
| 7 | [Estándares y convenciones](7-estandares-y-convenciones.md) | UUID, fechas, API, accesibilidad (WCAG), estándares visuales, código y proceso, leyes y cómo se hacen cumplir |
| 8 | [Investigaciones y decisiones](8-investigaciones-y-decisiones.md) | Qué se preguntó, qué se halló y qué se decidió en cada investigación y decisión del proyecto |
| 9 | [El frontend: pantallas, navegación y diseño](9-frontend-pantallas-y-diseno.md) | Mapa de pantallas, rutas y menú por rol, piezas reutilizables, estados de carga, vacío y error, colores, idioma y principios de UX |
| 10 | [Diagramas y modelo de datos](10-diagramas-y-modelo-de-datos.md) | Casos de uso, modelo entidad-relación, modelo relacional y diagrama de clases, explicados desde cero |
| 11 | [Guía para correr y mostrar el proyecto](11-guia-para-correr-y-mostrar.md) | Instalación, Método A y B, cuentas de prueba, pruebas, preparación de la demo, reinicio desde cero y solución de problemas |
| Anexo | [Mapa de evidencias y simulacro de preguntas](12-anexo-evidencias-y-simulacro.md) | Dónde está la evidencia de cada criterio de la revisión, una ruta de estudio de tres días, 48 preguntas con respuesta, cifras clave y lo que falta actualizar |

Cada documento explica los términos técnicos al aparecer y termina con un glosario, preguntas de repaso y preguntas que pueden hacer los profesores.

**Por dónde empezar:** el anexo trae una ruta de estudio de tres días. Si tienes poco tiempo, lee primero el 1, el 2 y el 11.

## Cómo regenerar los PDF

Los PDF se generan a partir de los `.md` con el diseño de VerdeApp. Se necesita Node 22 o superior, `pnpm` y Microsoft Edge o Google Chrome instalado.

La primera vez, desde `docs/estudio/herramientas/`:

```bash
pnpm install
```

Para generar todos los PDF:

```bash
pnpm pdf
```

Para generar solo uno (el nombre, sin `.md`):

```bash
pnpm pdf 3-seguridad-y-calidad
```

Si el equipo no tiene Edge ni Chrome en la ruta habitual, se indica el navegador con la variable `CHROME_PATH`.

## Qué datos cambian y hay que revisar

Estas cifras salen del repositorio el día en que se escribió cada documento (26 de noviembre de 2026) y cambian con el trabajo:

- Número de pruebas y cobertura (documento 3): las agrega el bootcamp de testing cada semana.
- Pull Requests, issues, commits y reparto por integrante (documentos 1 y 4).
- Versiones de las dependencias (documento 2): manda `be/pyproject.toml` y `fe/package.json`.
- Estado de la deuda técnica y de los issues abiertos (documento 5).
- La paleta de colores, que está en revisión (documentos 7 y 9).
- La respuesta de la UAESP a la tercera petición (documento 6).

Cada documento indica dónde se comprueba cada cifra, y la parte 5 del anexo lista lo que falta actualizar.
