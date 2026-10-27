# Investigación — Gráficas del desempeño semanal de un conjunto (auditorías)

<!--
  ¿Qué? Investigación del Issue #437: si conviene mostrar las auditorías de
        un conjunto como gráficas, para quién, cuáles, con qué herramienta
        y dónde ponerlas en la interfaz.
  ¿Para qué? Responder las 6 preguntas del issue con una recomendación
             concreta antes de abrir cualquier tarjeta de implementación, y
             dejar escrito por qué se descartan las otras alternativas.
  ¿Impacto? Sin esto, la primera tarjeta de implementación tendría que
            volver a investigar lo mismo (librería, accesibilidad, dónde
            va, qué pasa con pocos datos) y se corre el riesgo de repetir el
            caso de jspdf: una dependencia agregada sin justificación clara.
-->

**Issue:** [#437](https://github.com/Yilmerher12/proyecto-verdeapp-adso/issues/437)
**Fecha:** 2026-10-21
**Rama:** `docs/investigacion-graficas-auditorias`

---

## Contexto

Cada auditoría que un Reciclador registra en un conjunto (RQF-009, HU-010) guarda el nivel de desempeño (**Bueno, Regular o Malo**), el tema educativo, la fecha, el reciclador, el conjunto y de 1 a 3 fotos. Hoy esos datos se ven solo como listas.

La tarjeta trata del **desempeño semanal del conjunto**: el nivel de una auditoría califica cómo separa los residuos el conjunto, no el trabajo del reciclador (ver [`models/auditoria_conjunto.py`](../../be/app/models/auditoria_conjunto.py): la calificación es "de una sola vía, reciclador → conjunto, y global al conjunto entero"). Esta investigación responde **cómo** mostrarlo. No programa nada ni instala ninguna dependencia — eso queda para las tarjetas de implementación del final.

### Dos datos del issue que ya no son ciertos

- **Niveles.** El issue habla de "Bueno, Regular o Malo", pero el código todavía aceptaba un cuarto valor, `EXCELENTE`, que se había unificado con `BUENA` el 2026-08-27. **Se retiró en esta misma rama** (migración `b1c2d3e4f5a6`, esquemas, frontend, pruebas y documentación) para que las gráficas cuenten exactamente 3 niveles.
- **Frecuencia.** El issue dice "como máximo una auditoría por reciclador, por conjunto, por semana". La regla real tiene dos partes distintas:
  - **24 horas, en el backend.** Si un reciclador intenta auditar el mismo conjunto antes de que pasen 24 horas desde su última auditoría, el servidor responde 400 ("Ya auditaste este conjunto hace menos de 24 horas"). Es un freno contra el spam (RQF-009 RN-002, HU-010 CA-010.3; `HORAS_ENTRE_AUDITORIAS = 24` en `auditoria_conjunto_service.py`).
  - **7 días, en la pantalla del reciclador.** Cuando pasan 7 días o más desde su última auditoría de un conjunto, su panel le sugiere volver a auditarlo (`DIAS_ENTRE_AUDITORIAS = 7` en `RecicladorDashboard.tsx`). No obliga a nada.

  Es decir: un reciclador puede hacer entre 0 y 7 auditorías por semana en un mismo conjunto; la cantidad real la decide él. **La regla ya está decidida y no bloquea las gráficas**: lo que sí hay que decidir es qué hacer cuando hay pocos datos (pregunta 2).

---

## Qué se investigó

- Dónde y cómo se muestran hoy las auditorías, en los 4 roles, y qué límites tiene el endpoint que las entrega.
- Cómo se agrupan las semanas hoy (zona horaria).
- Cumplimiento de [RNF-005](../requisitos/RNFs/RNF-005%20—%20Accesibilidad.md) de la barra semanal que ya existe.
- Cuatro librerías de gráficas para React 19, con versión exacta, licencia y mantenimiento (datos del registro de npm), y el **costo real en el bundle**, medido empaquetando un gráfico de barras apiladas mínimo con cada una (`esbuild` con `--minify`, `react` y `react-dom` excluidos porque la aplicación ya los incluye).
- La decisión previa sobre el desempeño de personas: [`decision-calificacion-residente-reciclador.md`](decision-calificacion-residente-reciclador.md).
- Bocetos interactivos de la página, discutidos con el equipo (ver "Bocetos").

---

## Hallazgos sobre el estado actual

### 1. Dónde se ven hoy las auditorías

| Rol | Dónde | Qué ve |
| --- | --- | --- |
| Admin de Conjunto | Dentro del acordeón de cada conjunto, en [`HistorialAuditoriasSemanal.tsx`](../../fe/src/components/dashboard/HistorialAuditoriasSemanal.tsx) | Una fila por semana: rango de fechas, una barra delgada de tres colores y el total. Al abrir la semana, la lista de auditorías |
| Residente | [`HistorialAuditorias.tsx`](../../fe/src/components/dashboard/HistorialAuditorias.tsx) | Lista plana, más recientes primero |
| Admin del Sistema | "Contenido educativo" ([`AdminContenidoEducativoPage.tsx`](../../fe/src/pages/AdminContenidoEducativoPage.tsx)) | 3 contadores de la semana en curso (Bueno / Regular / Malo) y navegación semana a semana |
| Reciclador | Su panel | Sus propias auditorías, para saber cuándo volver |

El acordeón de cada conjunto ya apila **7 bloques**: NIT con botón Editar, Cobertura, Avisos, Código de acceso, Recicladores autorizados, Desvinculación y, al final, el historial de auditorías. El equipo lo percibe desorganizado (mucha información y poca separación entre partes).

### 2. La barra semanal actual incumple RNF-005.2

RNF-005.2 dice que **ningún estado debe comunicarse únicamente mediante color**: debe acompañarse de texto o un ícono (WCAG 1.4.1). La barra de `HistorialAuditoriasSemanal.tsx` (tres `<div>` vacíos de color verde azulado, ámbar y rojo) no tiene texto, ícono, leyenda ni descripción para lector de pantalla. Una persona con daltonismo puede confundir ámbar y rojo, y un lector de pantalla solo lee el total, no cuántas fueron Buenas, Regulares o Malas. Ese requisito solo se había verificado en el indicador de fortaleza de contraseña.

### 3. El historial entrega máximo 50 auditorías, mezcladas

`GET /api/v1/auditorias-conjunto/historial` ([`listar_historial`](../../be/app/services/auditoria_conjunto_service.py)) devuelve las **50 auditorías más recientes de todos los conjuntos del usuario juntas** (`limit(50)`). El panel del Admin de Conjunto las pide una sola vez y las separa por conjunto en el navegador.

Ejemplo: un Admin con 4 conjuntos y 2 auditorías por semana en cada uno genera 8 por semana; los 50 registros cubren unas 6 semanas. Una gráfica de 12 semanas calculada con esos datos saldría **incompleta, sin ningún mensaje de error**.

### 4. Las semanas se agrupan en UTC pero las fechas se muestran en hora local

El proyecto agrupa por semana en **UTC** (`lunesUTC` en [`dateFormat.ts`](../../fe/src/lib/dateFormat.ts); el parámetro `lunes` de `listar_admin`). UTC es la hora universal en la que el servidor guarda todas las fechas; Bogotá va 5 horas atrás y no cambia de horario durante el año. Pero la fecha de cada auditoría en la lista se muestra con `formatearFechaCreacion`, que usa la **hora del navegador**.

Caso real: un reciclador audita el **domingo 18 oct a las 9:00 p. m.** (hora de Bogotá). En UTC es el **lunes 19 oct a las 2:00 a. m.** La auditoría cae en la fila "19 oct al 25 oct", pero la lista le muestra la fecha "18/10". Aparece dentro de una semana a la que no pertenece según su propia fecha.

Esto importa porque, según el equipo, **los recicladores también trabajan los domingos y de noche**. Las semanas de las gráficas nuevas se deben cortar en **hora de Bogotá** (ver pregunta 5).

---

## Respuesta a las 6 preguntas del issue

### 1. ¿Quién necesita las gráficas y qué decisión toma con ellas?

**Quien más las necesita es el Administrador de Conjunto.** Hoy no puede ver si su conjunto mejora o empeora: cada semana está aislada en su propia fila y hay que abrirla para ver el detalle. Con una gráfica de varias semanas podría decidir, por ejemplo:

- "Llevamos 5 semanas con Regular en 'Separación por colores de bolsa'" → publicar un comunicado de refuerzo o pedir contenido educativo sobre ese tema.
- "Las últimas 3 semanas fueron Buenas" → sostener lo que se está haciendo.

Los otros roles:

- **Residente: la misma gráfica**, como una sección dentro de su panel ("Desempeño de mi conjunto"). Es el mismo componente, **sin selector de conjunto**, porque un residente pertenece a uno solo. Le sirve de motivación; es un beneficio menor.
- **Admin del Sistema: no entra en esta tarjeta.** Ya tiene sus contadores en "Contenido educativo" y su necesidad es distinta (ve todos los conjuntos a la vez). Si más adelante se decide que quiere la gráfica, se reutiliza el mismo componente, quizás modificado.
- **Reciclador: no la necesita.** Es quien genera los datos y ya ve sus auditorías.

### 2. ¿Qué métricas aportan algo con el volumen real de datos?

Cada auditoría es un punto. Un conjunto típico tiene 1 a 3 recicladores autorizados, así que recibiría del orden de **1 a 3 auditorías por semana** (estimación, no medida: la cantidad real depende de cuánto audite cada reciclador, y el sistema no puede obligarlos). En 8 semanas serían unas 8 a 24 auditorías.

| Métrica | ¿Hay datos suficientes? | Decisión |
| --- | --- | --- |
| **Auditorías por semana y nivel** (barras apiladas, varias semanas seguidas) | Sí, si se comparan varias semanas | **Se recomienda** |
| Distribución de una sola semana | No: con 1 o 2 auditorías sale de un solo color (es lo que hace hoy la barra del acordeón) | Descartada como gráfica propia |
| **Por tema** (qué tema recibe más Regular o Malo) | Solo con un período largo: son 5 temas para unas 8 a 24 auditorías, o sea 2 a 5 por tema | **Se recomienda como ranking**, con aviso de que es una pista y no una conclusión |
| Línea con el % de Bueno por semana | No: con 1 a 4 auditorías por semana el porcentaje salta de 100% a 50% o 0% por una sola calificación, y mostraría una caída dramática donde solo cambió una auditoría | Descartada |
| Por reciclador | Ver pregunta 6 | Descartada |

**Qué debe abarcar la gráfica.** Una gráfica que se "reinicia" cada semana tendría 1 o 2 puntos y no se puede dibujar. Por eso la vista abarca **varias semanas, con una barra por semana** (de lunes a domingo): una semana puede tener una sola auditoría, pero las barras juntas muestran el patrón. Aclaración sobre la base de datos: nada se borra cada semana; la tabla `auditorias_conjunto` conserva todo y el "reinicio" semanal es solo el agrupamiento en pantalla.

**Cantidad de semanas y mínimo de datos (propuesta, argumentada):**

- **Período: 8 semanas** por defecto (selector de 4, 8 o 12). Son dos meses: lo bastante largo para ver una tendencia y lo bastante corto para que las 8 barras y sus etiquetas de fecha quepan legibles en el ancho de una pantalla de escritorio y se lean bien en móvil. Con 12 barras ya se aprietan las etiquetas.
- **Mínimo: 4 auditorías dentro del período elegido.** Con menos, cada barra sería una auditoría suelta y no se vería ningún patrón. Es un umbral práctico, no una garantía estadística: 4 puntos no demuestran una tendencia, solo hacen que la gráfica diga algo. Si no se llega al mínimo, se muestra un aviso en vez de una gráfica engañosa y **la lista de auditorías sigue visible debajo**.
- **Aviso:** lo ve quien abre la página (Admin de Conjunto o Residente). Texto propuesto: "Todavía no hay suficientes auditorías para mostrar la gráfica", con una línea de apoyo ("Aparecerá cuando el conjunto tenga al menos 4 auditorías en las últimas 8 semanas. Mientras tanto, mira la lista de abajo."). Sigue el patrón de `EmptyState` que ya usa el proyecto.
- Ambos números son una decisión de producto: se dejan en una sola constante para poder cambiarlos sin tocar el resto, y conviene revisarlos con datos reales una vez haya uso.

### 3. ¿Cómo se haría? Librería nueva o dibujarlas con SVG/CSS

Hoy no hay ninguna librería de gráficas instalada. El equipo prefiere **no reinventar la rueda**, así que la comparación se hizo sobre librerías ya hechas; hacerlas a mano con SVG/CSS queda solo como punto de comparación.

Datos del registro de npm y medidos empaquetando un gráfico de barras apiladas con tooltip y leyenda (versión de oct. 2026). La referencia es el bundle actual de la aplicación: **341 kB** de JavaScript comprimido (un solo archivo, sin división por páginas).

| Librería | Versión | Licencia | Última publicación | Costo medido (comprimido) | Tipo de dibujo | Accesibilidad y modo oscuro |
| --- | --- | --- | --- | --- | --- | --- |
| **Recharts** | 3.10.1 | MIT | 2026-10-13 | **+112 kB** | SVG | Capa de accesibilidad activada por defecto (`accessibilityLayer: true`: navegación con teclado y descripciones); los elementos SVG aceptan clases de Tailwind, así que el modo oscuro y los tokens del proyecto se aplican igual que al resto de la interfaz |
| Chart.js + react-chartjs-2 | 4.5.1 + 5.3.1 | MIT | 2025-10 | +56 kB | **Canvas** (un dibujo de píxeles, sin elementos HTML) | El canvas no es accesible por sí mismo (solo funcionaría la tabla alternativa) y no puede leer variables de CSS: para el modo oscuro habría que leer los colores desde JavaScript y volver a dibujar al cambiar el tema |
| Nivo (`@nivo/bar`) | 0.99.0 | MIT | 2025-05 | +94 kB | SVG | Sin publicaciones nuevas desde mayo de 2025 (hace más de un año); API pensada para configurar por objetos más que por componentes |
| Visx | 4.0.0 | MIT | 2026-06 | no medido (se arman piezas sueltas: forma, escala, ejes) | SVG | Control total, pero hay que construir leyenda, ejes y tooltip a mano: se acerca a "hacerla desde cero" |
| SVG/CSS propio | — | — | — | 0 kB | SVG/HTML | Control total; hay que construir y mantener leyenda, tooltip, teclado y reglas de accesibilidad a mano |

**Recomendación: Recharts** (versión exacta `3.10.1`, a fijar con `==` en `package.json` como pide `restricciones.md`). Razones:

- Es SVG, así que usa los mismos tokens `accent-*` y `night-*` y las clases `dark:` del resto de la aplicación; Chart.js (canvas) obliga a manejar el modo oscuro aparte, y el modo oscuro es obligatorio en este proyecto.
- Trae por defecto navegación con teclado y descripciones para lectores de pantalla, que es lo más difícil de lograr a mano con RNF-005.
- Licencia MIT, con mantenimiento activo (última publicación el 2026-10-13) y React 19 declarado entre las versiones compatibles.
- Su costo es el más alto (+112 kB, un 33% más que el bundle actual). **Se mitiga cargando la página "Desempeño" bajo demanda** (`React.lazy`), de modo que no pesa en la primera carga de nadie que no abra esa pantalla.

**Por qué se descartan las otras:** Chart.js es la más liviana pero su dibujo en canvas empeora la accesibilidad y el modo oscuro (justo lo que el proyecto exige); Nivo no ofrece ventajas sobre Recharts y lleva más de un año sin publicar una versión; Visx y el SVG propio acercan el trabajo a lo que el equipo quiere evitar. Si el peso de Recharts llegara a ser un problema real, Chart.js queda como segunda opción, aceptando el costo en accesibilidad.

**Precedente a respetar:** la librería se instala **dentro de la tarjeta que la usa**, no antes, y `docs/requisitos/restricciones.md` se actualiza en esa misma tarjeta. Es lo que no se hizo con `jspdf`/`jspdf-autotable` (PR #124), que quedaron documentadas y sin usarse. Por eso esta rama **no toca `restricciones.md` todavía**.

### 4. Accesibilidad (RNF-005)

Reglas que debe cumplir **toda gráfica nueva**, además de corregir la barra actual (hallazgo 2):

1. **No depender solo del color (RNF-005.2).** Cada nivel lleva color **e ícono** (los mismos de `nivelesDesempeno.ts`: cara feliz, neutra y triste, de `lucide-react`) **y nombre**, en una leyenda visible; cada tramo de la barra muestra su número.
2. **Tabla equivalente.** Un botón "Ver como tabla" muestra los mismos números en una tabla (semana, Bueno, Regular, Malo, total). Para los temas, una tabla por tema.
3. **Lectores de pantalla.** Cada barra es un botón con descripción completa ("Semana del 19 al 25 oct: 3 Buenas, 1 Regular, 0 Malas. Ver detalle"). La capa de accesibilidad de Recharts cubre las flechas del teclado.
4. **Teclado (RNF-005.5).** Todo lo que se puede tocar (barra, selectores, botón de tabla) se puede usar con Tab y Enter.
5. **Contraste y modo oscuro (RNF-005.4).** Colores de la paleta ya auditada (`docs/gestion-proyecto/auditoria-contraste-paleta-nueva.md`); verificar en claro y oscuro. Texto sobre ámbar en tono oscuro, no blanco.
6. **Sin movimiento forzado (RNF-005.6).** Si la librería anima la entrada de las barras, se desactiva con `prefers-reduced-motion`.
7. **Fechas legibles.** Cada barra indica su rango completo ("14 sep al 20 sep"), nunca un día suelto, para que no se lea como "auditorías de ese día".

### 5. ¿Los cálculos van en el backend o en el frontend?

**En el backend, con un endpoint nuevo que consulta solo lo necesario.** Por el hallazgo 3: el historial actual entrega máximo 50 registros de todos los conjuntos mezclados, así que contar en el navegador deja la gráfica incompleta sin avisar. Con un endpoint que pregunta "conjunto X, últimas 8 semanas", la base de datos cuenta las filas agrupándolas por semana y nivel (`GROUP BY`) y responde siempre 8 filas pequeñas, sin importar si hay 10 o 1000 auditorías.

Diseño propuesto (a refinar en la tarjeta de implementación):

- `GET /api/v1/auditorias-conjunto/desempeno?id_conjunto=<uuid>&semanas=8`
- Respuesta: conteos por semana (`lunes`, `bueno`, `regular`, `malo`), con las **semanas sin auditorías incluidas en cero** (para que la barra vacía se vea), y conteos por tema (`tema`, `bueno`, `regular`, `malo`).
- **Semanas en hora de Bogotá**, no UTC: `date_trunc('week', created_at AT TIME ZONE 'America/Bogota')`. Colombia no tiene horario de verano, así que el desfase es siempre de 5 horas. Un reciclador que audita el domingo a las 9 p. m. queda en la semana de ese domingo, que es lo que dice la fecha que ve.
- La lista de auditorías de una semana (al tocar una barra) se pide aparte, con la misma regla de semana.
- **Permisos:** el mismo criterio de `_pertenece_al_conjunto` ya existente: Residente solo su conjunto, Admin de Conjunto solo sus conjuntos con asignación activa, 403 en cualquier otro caso (incluido el Reciclador y un conjunto ajeno).
- Cuenta `BUENA`, `REGULAR` y `DEFICIENTE`; con `EXCELENTE` retirado ya no hay caso especial.

### 6. ¿Es adecuado mostrar el desempeño de una persona?

La tarjeta no trata de personas, trata del conjunto (ver Contexto). Por eso la conclusión es corta:

- **Las gráficas son del conjunto. No habrá desglose por reciclador.** Un desglose "Bueno / Regular / Malo por reciclador" se leería como una calificación de esa persona, aunque el nivel califique la separación de los residentes, y contradice [`decision-calificacion-residente-reciclador.md`](decision-calificacion-residente-reciclador.md): sin ranking, sin promedio visible y solo hechos objetivos para el Admin de Conjunto (sección 5.1).
- **Quién la hizo sigue visible dentro de "Ver detalle"** de cada auditoría, como hoy (`nombre_reciclador`). El equipo señaló que en un conjunto trabajan varios recicladores (a veces una asociación o una familia), y el administrador necesita saber quién auditó cuando abre el detalle. No aparece en la lista de la semana ni en las gráficas.

---

## Bocetos

> **El diseño no es inmóvil.** Los bocetos son una guía de la intención (qué información, en qué orden y cómo se agrupa), **no un diseño final**. Pueden y deben cambiar al implementar: colores, espaciados, textos y distribución se ajustan sobre la interfaz real, respetando `restricciones.md` (tokens, modo oscuro, `lucide-react`) y RNF-005.

### Ubicación elegida: página propia "Desempeño"

Se evaluaron tres opciones para el Admin de Conjunto:

- **A. Página propia "Desempeño"** — selector de conjunto arriba, la gráfica y la lista de auditorías debajo. **Elegida.** Saca las auditorías del acordeón (de 7 bloques a 6) y le da un solo propósito a la pantalla.
- B. Pestañas dentro de cada conjunto — ordena el acordeón pero sigue habiendo un acordeón por conjunto. Descartada.
- C. Tarjeta resumen en el panel principal con "Ver detalle" a la página de la opción A. No se descarta: puede sumarse después como atajo.

### Página "Desempeño" (Admin de Conjunto)

```
Desempeño                         [ Conjunto Torres del Parque v ]  [ Últimas 8 semanas v ]

[ Auditorías      ] [ Calificadas  ] [ Tema a reforzar        ] [ Última     ]
[ en el período 21] [ Bueno  57%   ] [ Cantidad de basura     ] [ auditoría  ]
[                 ] [ 12 de 21     ] [ generada: 4 de 5 R o M ] [ 20 oct     ]

Auditorías por semana                                         [ Ver como tabla ]
Cada barra es una semana (lunes a domingo). El número dentro de cada color es la
cantidad de auditorías. Toca una barra para ver el detalle.
(cara feliz) Bueno   (cara neutra) Regular   (cara triste) Malo

   ▇     ▇    ▇▇▇   ▇▇▇    ▇▇    ▇▇▇   ▇▇    ▇▇▇▇
  31 ago 7 sep 14 sep 21 sep 28 sep 5 oct 12 oct 19 oct
  al 6   al 13 al 20  al 27  al 4   al 11  al 18  al 25
  sep    sep   sep    sep    oct    oct    oct    oct (en curso)

Temas del período   (ordenados por Regular o Malo; léelo como una pista)
  Cantidad de basura generada            Regular o Malo: 4 de 5   [B1 R3 M1]
  Separación por colores de bolsa        Regular o Malo: 3 de 8   [B5 R3]
  Objetos grandes (muebles, colchones)   Regular o Malo: 2 de 2   [R1 M1]
  Cómo entregar el material              Sin Regular ni Malo (5)  [B5]
  Escombros de obra o remodelación       Sin Regular ni Malo (1)  [B1]

Semana del 19 al 25 oct (en curso) · 4 auditorías
  Separación por colores de bolsa      19 oct   (cara feliz) Bueno    [ Ver detalle ]
  Cómo entregar el material            20 oct   (cara feliz) Bueno    [ Ver detalle ]
  Cantidad de basura generada          20 oct   (cara feliz) Bueno    [ Ver detalle ]
  Objetos grandes (muebles, colchones) 20 oct   (cara neutra) Regular [ Ver detalle ]
```

Notas de diseño: tocar una barra abre abajo la lista de **esa semana** (por defecto, la última); "Ver detalle" abre el modal de auditoría que ya existe (`AuditoriaResultadoModal`), donde sí aparece quién la hizo. Los datos del boceto son de ejemplo (21 auditorías en 8 semanas).

### Aviso cuando hay pocos datos

```
              (ícono de gráfica)
 Todavía no hay suficientes auditorías para mostrar la gráfica
 Aparecerá cuando el conjunto tenga al menos 4 auditorías en las últimas
 8 semanas. Mientras tanto, mira la lista de abajo.
```

### Alternativas para ver los temas

- **1. Ranking de temas (elegida)**, con su **tabla por tema** (alternativa 3) como versión accesible. Es lo que muestra el boceto de arriba.
- 2. Mapa de tema por semana: una cuadrícula de 5 temas por 8 semanas, con la letra e ícono del peor resultado de cada celda. Muestra patrones en el tiempo ("colores de bolsa estuvo en Regular tres semanas seguidas"), pero con 1 a 3 auditorías por semana muchas celdas quedan vacías. **Se deja para cuando haya más datos** (tarjeta futura).
- 3. Tabla por tema: los mismos números del ranking sin barras (columnas Bueno, Regular, Malo y "Regular o Malo: X de N").

### Vista del Residente

La misma gráfica y el mismo ranking en una sección "Desempeño de mi conjunto" dentro de su panel, **sin selector de conjunto**. Mismos avisos, mismo mínimo, misma tabla.

---

## Recomendación

1. **Sí vale la pena**, para el Administrador de Conjunto (principal) y, con el mismo componente, para el Residente. Admin del Sistema queda fuera por ahora.
2. Mostrar **barras apiladas por semana (8 por defecto, mínimo 4 auditorías)** más un **ranking de temas**, ambos con **tabla equivalente**, leyenda con ícono y nombre y descripción para lector de pantalla. Nada de desglose por reciclador.
3. Calcular en el **backend** con un endpoint nuevo, con semanas en **hora de Bogotá**.
4. Usar **Recharts 3.10.1** cargada bajo demanda, instalada dentro de la tarjeta que la use.
5. Ubicarla en una **página propia "Desempeño"** (opción A) y retirar el historial semanal del acordeón del conjunto.
6. Descartar: línea de % (engaña con pocos datos), desglose por reciclador (privacidad), Chart.js/Nivo/Visx/SVG propio (ver pregunta 3) y borrar auditorías para "no sobrecargar" la base de datos (ver "Fuera de alcance").

---

## Tarjetas de implementación que nacerían de esto

> Todas deben decir de forma explícita que **los bocetos de este documento son una guía y no un diseño fijo**: el diseño puede y debe ajustarse al implementar.

| # | Título propuesto | Depende de |
| --- | --- | --- |
| 1 | Backend: endpoint de estadísticas de desempeño por conjunto (conteos por semana, nivel y tema; semanas en hora de Bogotá) | Ninguna |
| 2 | Frontend: página "Desempeño" del Admin de Conjunto — gráfica de 8 semanas, ranking de temas, detalle de la semana, tabla accesible, aviso de pocos datos. Incluye instalar `recharts==3.10.1` con carga bajo demanda y actualizar `restricciones.md` | 1 |
| 3 | Frontend: sección "Desempeño de mi conjunto" en el panel del Residente (mismo componente, sin selector) | 1 y 2 |
| 4 | Retirar el historial semanal del acordeón del conjunto y de `HistorialAuditorias` donde quede duplicado (corrige el incumplimiento de RNF-005.2 de la barra actual) | 2 |
| 5 | Alinear a hora de Bogotá el resumen semanal del Admin del Sistema en "Contenido educativo" (hoy cuenta las semanas en UTC) | Ninguna |
| 6 | **Hecha (issue #558, rama `feat/pdf-desempeno-conjunto`):** descargar el desempeño del conjunto en PDF **con la gráfica**. Las barras son solo rectángulos y texto, así que se pueden dibujar directamente con `fpdf2` (la misma librería de la tarjeta del PDF de la agenda, #480) sin dependencia nueva | 1 y la tarjeta #480 |
| 7 | **Futura:** política de retención de las fotos de evidencia (ver "Fuera de alcance") | Ninguna |
| 8 | **Futura:** mapa de tema por semana, cuando haya más auditorías por conjunto | 2 |

---

## Fuera de alcance de esta investigación

- **¿Borrar auditorías para no sobrecargar la base de datos?** No se recomienda. La fila de una auditoría (nivel, tema, fecha) es diminuta y Postgres maneja miles sin problema; el endpoint propuesto siempre consulta solo las últimas semanas, así que un historial largo no lo vuelve lento. Reiniciar la gráfica por mes tampoco requiere borrar: la pantalla filtra "este mes" o "últimas 8 semanas" y los datos viejos siguen guardados. **Lo que pesa son las fotos:** cada auditoría guarda hasta 3 de máximo 5 MB (hasta 15 MB por auditoría) en `be/app/uploads/evidencias-auditoria/`. Si algún día falta espacio, la salida es una política de retención de las **fotos** (por ejemplo, borrar las de más de 12 meses y conservar la fila y los conteos), con precedente en `limpiar_adjuntos`. Si las fotos pueden mostrar personas, conservarlas o borrarlas puede tener implicaciones legales que **no se investigaron aquí**.
- **El volumen real de auditorías por conjunto no está medido.** Los números de esta investigación (1 a 3 por semana, mínimo de 4, 8 semanas) son estimaciones razonadas; conviene revisarlos con datos de uso real.
- **La carga de la página** se mitiga con carga bajo demanda, pero no se midió en una conexión móvil lenta.

---

## Documentación actualizada en esta rama

- Este documento.
- Retiro del nivel `EXCELENTE`: [RQF-009](../requisitos/RFs/RQF-009%20—%20Semáforo%20de%20Gestión%20de%20Residuos.md), [RQF-013](../requisitos/RFs/RQF-013_recomendacion_contenido_educativo.md), [HU-010](../requisitos/HUs/HU-010_reciclador_califica_semaforo.md) y el [diagrama de clases](../referencia-proyecto/diagramas-UML/diagrama-clases.md).
- `restricciones.md` y el resto de RQF-009 **no se tocaron todavía**: `recharts` se agrega a `restricciones.md` solo cuando la tarjeta 2 realmente la instale (para no repetir el caso de `jspdf`), y las historias de usuario nuevas se escriben cuando el equipo apruebe las tarjetas de arriba.
