# Los datos de VerdeApp y sus fuentes oficiales

<!-- resumen: De dónde salen los conjuntos, los puntos de acopio y las lecciones de VerdeApp, qué le pedimos a la UAESP, qué respondió y cómo se cuida la calidad, la licencia y los datos personales. -->

## Cómo leer este documento

Los documentos 1 a 5 explicaron qué hace VerdeApp, cómo está construida, cómo se protege, cómo trabajamos y en qué estado está. Este documento abre la segunda serie y explica algo que hace creíble al proyecto: **los datos que usa son reales, y sabemos de dónde salió cada uno.**

Un sistema para coordinar el reciclaje en Bogotá no sirve con conjuntos y puntos de acopio inventados. Por eso gran parte del trabajo del equipo fue buscar las fuentes oficiales, entender sus límites, pedirle aclaraciones a la entidad que emite el dato y dejar todo por escrito. Este documento cuenta esa historia con sus fechas y sus números.

Igual que antes, no supone que conozcas el tema: cada término se explica al aparecer y al final hay un glosario.

Orden del documento:

1. Por qué importan los datos reales.
2. Palabras que necesitas conocer.
3. El mapa de los datos de VerdeApp.
4. Los conjuntos residenciales.
5. Los puntos de acopio (ECA): una historia en cinco etapas.
6. Las peticiones a la UAESP.
7. Las lecciones educativas y sus fuentes.
8. Las reglas del equipo sobre los datos.
9. Cómo se cargan los datos al sistema.
10. Lo que sigue pendiente.

## 1. Por qué importan los datos reales

Cuando empezó el proyecto, la base de datos de desarrollo se llenaba con datos **inventados**: 40 conjuntos con NIT de relleno (`900123456-X`) y 40 puntos de acopio con direcciones imaginarias. Eso sirve para probar que el sistema funciona, pero tiene dos problemas:

1. **No sirve de demostración.** Si un jurado busca su propio conjunto y no aparece, el sistema pierde credibilidad. Esto pasó de verdad: al probar con el conjunto «Urapán», en Bosa, no apareció en la primera fuente que usamos, y hubo que buscar otra más completa (sección 4).
2. **Puede ser engañoso.** Un comentario del código decía «fuente: UAESP» para datos que en realidad eran inventados. Era falso. Una regla que el equipo adoptó es que **ningún dato se presenta como oficial si no se puede comprobar**.

La solución fue reemplazar los datos inventados por datos reales de entidades públicas, con la fuente, la fecha de consulta y la licencia escritas en el repositorio, para que cualquiera pueda comprobarlos sin tener que creernos.

## 2. Palabras que necesitas conocer

- **Dato abierto:** información pública que una entidad del Estado publica para que cualquiera la use. En Bogotá, el portal **Datos Abiertos Bogotá** (`datosabiertos.bogota.gov.co`) reúne los de las entidades del Distrito.
- **Dataset (conjunto de datos):** un archivo o servicio con datos organizados en filas y columnas sobre un tema. Por ejemplo, la lista de todos los conjuntos residenciales de Bogotá.
- **CSV:** un archivo de texto donde cada línea es una fila y las columnas van separadas por un símbolo (coma o punto y coma). Se abre en Excel.
- **Licencia de uso:** las condiciones bajo las que se puede usar un dato. Dos que aparecen aquí: **Creative Commons Atribución 4.0 (CC BY)**, que permite usar el dato citando la fuente, y **Creative Commons Atribución-NoComercial 4.0 (CC BY-NC)**, que además prohíbe el uso comercial.
- **Atribución:** citar de dónde salió un dato. Muchas licencias la exigen.
- **UAESP:** la Unidad Administrativa Especial de Servicios Públicos de Bogotá. Es la entidad del Distrito que gestiona el aseo y el aprovechamiento de residuos, y la que lleva el inventario oficial de los puntos de acopio.
- **Petición, radicado y «Bogotá Te Escucha»:** una **petición** es una solicitud formal que una persona le hace a una entidad pública (en Colombia es un derecho fundamental). Al enviarla por escrito, la entidad le asigna un **radicado**, un número que identifica esa solicitud y sirve para hacerle seguimiento. **Bogotá Te Escucha** es el sistema del Distrito para recibir peticiones, quejas, reclamos y sugerencias (lo que se conoce como **PQRS**).
- **Siembra (seed):** cargar datos iniciales en una base de datos vacía. En VerdeApp lo hace el comando `uv run python -m app.seed`.
- **Calidad de datos:** qué tan completos, consistentes y confiables son los datos. Un dato puede ser oficial y aun así tener problemas (nombres repetidos, direcciones mal escritas).
- **Dato personal:** información que identifica a una persona (nombre, correo, cédula). Está protegida por la **Ley 1581 de 2012**, y su tratamiento exige cuidado.
- **Ley 1712 de 2014:** la ley de transparencia y acceso a la información pública. Obliga a las entidades a dar acceso a la información que producen, con límites cuando hay datos personales.

## 3. El mapa de los datos de VerdeApp

Cinco tipos de datos alimentan el sistema. Los tres primeros vienen de entidades públicas:

| Dato | Cuántos | De dónde sale | Dónde vive en el repositorio |
|---|---|---|---|
| **Localidades** (zonas de Bogotá) | 20 | Esquema oficial de localidades de Bogotá (numeradas del 1 al 20) | `be/app/seed_data.sql` |
| **Conjuntos residenciales** | 14.515 | Datos Abiertos Bogotá, servicio «Propiedad Horizontal», de la Secretaría Distrital de Gobierno | `be/app/data/conjuntos_residenciales_bogota.csv` |
| **Puntos de acopio (ECA)** | 799 | Inventario oficial entregado por la UAESP (Resolución 698 de 2023) | `be/app/data/eca_inventario_uaesp.csv` |
| **Lecciones educativas** | 33 | Normas y guías oficiales, citadas en cada texto | `be/app/data/contenido_educativo.json` |
| **Cuentas de prueba y datos de demostración** | 4 cuentas y 3 conjuntos de demostración | Creados por el equipo | `be/app/seed.py` y `be/app/seed_demo.py` |

## 4. Los conjuntos residenciales

### 4.1 La fuente y una corrección en el camino

La primera versión de la importación usó un archivo CSV llamado «Conjuntos residenciales y cerrados de Bogotá», actualizado por última vez en **marzo de 2023**. Al probarlo, Yilmer buscó su propio conjunto, «Urapán», en Bosa, y no apareció: el archivo estaba desactualizado.

Investigando se encontró un dataset **más reciente y completo** de la misma entidad (la Secretaría Distrital de Gobierno): «Propiedad Horizontal.BogotáDC», actualizado el **26 de noviembre de 2025**. No es un archivo estático sino un **servicio de mapas (ArcGIS REST)** al que se le pueden hacer consultas con filtros, sin descargar todo. Ahí sí aparece «PARQUES DE BOGOTA URAPAN», en Bosa. Esa fue la fuente que quedó.

| | CSV descartado | Servicio usado |
|---|---|---|
| Última actualización | Marzo de 2023 | Noviembre de 2025 |
| Tipo de propiedad | Texto libre con más de 60 valores distintos: había que adivinar cuáles eran vivienda | Un campo (`CATEPROP`) con solo 3 valores: residencial, comercial o mixta |
| Código de localidad | Nombre en mayúsculas sin tilde: había que normalizarlo a mano | Número del 1 al 20, **el mismo esquema** que ya usa la tabla `localidades` |
| Conjunto «Urapán» | No aparece | Sí aparece |

**Licencia:** Creative Commons Atribución-NoComercial 4.0. Se puede usar citando la fuente y sin fines comerciales, que es el caso de un proyecto de formación.

### 4.2 Qué se filtró y cuántos quedaron

Se pidió solo `CATEPROP=1` («propiedad horizontal residencial»). También se descartaron las filas sin nombre, sin dirección o sin código de localidad, y los duplicados exactos (mismo nombre y misma dirección en la misma localidad).

- El servicio tiene **15.234** registros en total.
- **14.518** son residenciales.
- **14.515** quedaron sembrados (3 se descartaron por no tener nombre o dirección).

### 4.3 Qué NO se importó, y por qué

- **El NIT.** El dataset no lo trae. Se dejó vacío en lugar de inventar un número que se vería tan real como uno verdadero. El campo es editable por el administrador del conjunto desde su panel.
- **El nombre de la persona de contacto.** El CSV descartado sí traía esa columna: era un dato personal de alguien que nunca autorizó mostrarlo en VerdeApp. **No se guardó, ni siquiera en el archivo del repositorio.** El servicio que se usó al final ni siquiera lo expone.
- **Las coordenadas.** El servicio las trae (es una capa geográfica), pero no se importaron porque la tabla de conjuntos todavía no tiene columnas para ellas.

### 4.4 Cobertura por localidad

19 de las 20 localidades tienen al menos un conjunto. **Sumapaz es la única sin ninguno:** es la localidad rural de Bogotá y no tiene conjuntos bajo propiedad horizontal. Es el dato real, no un error. Las más grandes:

| Localidad | Conjuntos |
|---|---|
| Usaquén | 4.247 |
| Chapinero | 2.860 |
| Suba | 2.446 |
| Teusaquillo | 1.224 |
| Engativá | 716 |

Tener miles de conjuntos reales por localidad obligó a cambiar un detalle de la pantalla: un menú desplegable normal ya no alcanzaba, y se agregó un **buscador de conjuntos con búsqueda en tiempo real** en el registro.

### 4.5 El conjunto de la demostración

Las cuentas de prueba (Residente, Reciclador y Administrador de Conjunto) apuntan a un conjunto real de Usaquén: **«AGRUPACION QUINTAS DE ARANJUEZ»**. Antes era «TORRES DE ARANJUEZ», inventado. Se comprobó que el nombre no se repitiera en la localidad antes de elegirlo, porque varios nombres del dataset sí se repiten en más de un edificio.

## 5. Los puntos de acopio (ECA): una historia en cinco etapas

Esta es la parte donde más trabajo de investigación hizo el equipo. Se cuenta en etapas porque **lo que sabíamos cambió varias veces**, y cada cambio corrigió algo que la aplicación afirmaba.

### 5.1 Qué es una ECA, y qué no es

Una **ECA** (*Estación de Clasificación y Aprovechamiento*) es un lugar formal, regulado por la UAESP, donde los **recicladores de oficio organizados** (agrupados en asociaciones) llevan el material que recogieron en sus rutas, para que se **pese y se clasifique**. Del peso sale el pago que reciben dentro del esquema público de aseo.

Existen otros lugares que se confunden con una ECA. La investigación del issue #460 los distinguió:

| Tipo | Qué es | Qué recibe | Quién lo opera |
|---|---|---|---|
| **ECA** | Instalación formal para pesar y clasificar material aprovechable | Papel, cartón, plástico, vidrio, metales y otros aprovechables | Organizaciones de recicladores; la UAESP lleva el inventario |
| **Bodega privada** (incluye lo que se llama «chatarrería») | Negocio privado, clasificado aparte en el inventario de la UAESP | Sin fuente oficial que lo confirme | Privados |
| **Ecopunto** | Caja gratuita de la UAESP que cambia de localidad cada semana | Escombros y objetos voluminosos (muebles, colchones, tejas); no material reciclable de rutina | UAESP |
| **Centro de Cuidado al Reciclador (CCR)** | Espacio solo para recicladores de oficio, donde separan y organizan su material | Material aprovechable de los recicladores | UAESP y entidades del Distrito |
| **Punto de residuos especiales (posconsumo)** | Puntos de la Secretaría de Ambiente para residuos peligrosos | Pilas, bombillos, llantas, aceite, medicamentos, aparatos eléctricos | Secretaría Distrital de Ambiente |

**«Punto limpio»** no aparece como tipo oficial en ninguna fuente consultada, así que el equipo decidió no crearlo como categoría propia mientras alguien no lo confirme con la UAESP o la Secretaría de Ambiente.

### 5.2 Etapa 1: 40 puntos inventados

El punto de partida eran 40 puntos de acopio inventados. Un comentario decía «fuente: UAESP», pero era falso. Esa afirmación no se podía comprobar, y fue lo que motivó la búsqueda de datos reales.

### 5.3 Etapa 2 (26 de agosto de 2026): 9 ECA reales de un dataset de 2020

Se buscó en Datos Abiertos Bogotá el dataset «Aprovechamiento ECAS» de la UAESP, cuyo recurso más reciente era de **marzo de 2020**. Traía **9 filas reales** (Kennedy, Usaquén I y II, Engativá y Engativá 2, Fontibón, Mártires, Puente Aranda 1 y 2). El archivo venía con problemas de formato: separador de punto y coma, acentos dañados y coordenadas mal escritas (`4.702.475` en lugar de `4.702475`). Las 9 reemplazaron a las 40 inventadas.

Un efecto visible: solo 6 localidades quedaban con puntos en el directorio. La pantalla decía «Bogotá solo tiene ECA registradas en 6 de 20 localidades». **Eso resultó ser falso** (etapa 3).

### 5.4 Etapa 3 (21 de octubre de 2026, issue #460): el inventario oficial desmiente la pantalla

La investigación encontró el **Listado de Inventario inicial de ECA y Bodegas Privadas de Reciclaje** que publica la UAESP: **3.108 establecimientos**, de los cuales 762 eran ECA activas y 636 inactivas, y 684 bodegas privadas activas y 1.026 inactivas. Había ECA activas en **18 de las 20 localidades**.

Dos hallazgos cambiaron lo que la aplicación afirmaba:

1. **«Solo 6 de 20 localidades» era falso** para la ciudad: solo era cierto para el dataset de 2020. El texto de la pantalla se corrigió.
2. **Solo 2 de las 9 ECA del directorio coincidían con una ECA activa** del inventario. Eso no significa que las otras hayan cerrado (un decreto de 2022 obligó a reubicar a varias), pero **hoy no se podía afirmar que siguieran operando**.

También se halló que ninguna de las 9 tenía teléfono ni encargado en ninguna fuente oficial. El único contacto institucional encontrado era la línea general de la UAESP, que **no se debe presentar como teléfono de una ECA**. Y se anotaron con honestidad los límites de la investigación: páginas oficiales que daban error 403 o 404, normas escaneadas que no se podían leer y una pregunta importante que quedó sin respuesta (si un ciudadano común puede entregar material en una ECA).

El 28 de octubre se afinó: el inventario es de **diciembre de 2022** (según los metadatos del archivo), no trae dirección, teléfono ni operador, y existe además un registro nacional de la Superservicios que dice *quién opera* cada ECA pero no *dónde está*.

**La recomendación de la investigación:** en el directorio entran las ECA (y más adelante los CCR). Los Ecopuntos y los puntos de posconsumo se muestran como información con enlace, porque cambian de lugar o ya los publica otra entidad. Las bodegas privadas no entran, porque su actividad es inestable, el 60 % figura inactiva y no hay fuente oficial sobre qué reciben.

### 5.5 Etapa 4 (10 de noviembre de 2026): la UAESP responde y entrega 799 ECA

Con los hallazgos de la etapa 3 se hicieron **dos peticiones** a la UAESP por Bogotá Te Escucha (radicados 20267000840922 y 20267000856602), pidiendo el listado actualizado con dirección, contacto y operador. La UAESP respondió el **10 de noviembre** con el oficio **20265000341921**, firmado por la Subdirectora de Aprovechamiento, con un Excel anexo.

**Qué entregó:** el inventario vigente de ECA enmarcado en la **Resolución 698 de 2023**: **799 ECA en 18 de las 20 localidades** (no hay ninguna en Chapinero ni en Sumapaz). Cada fila trae número de resolución, organización de recicladores, nombre de la ECA, coordenadas, dirección y localidad.

**Qué NO entregó:** teléfono, horario, estado de funcionamiento ni fecha de corte. El oficio aclara que el horario lo define cada organización y que «vigente» quiere decir *registrada en el acto administrativo*; la UAESP **no afirma que cada ECA esté abierta hoy**. Por eso, en la aplicación se escribe «inventario vigente de la UAESP» y nunca «abierta hoy».

**Calidad de los datos entregados:**

- 259 filas no traen correo (540 sí).
- La organización dice «NO APLICA» en 76 filas y está vacía en 26.
- 27 direcciones traen dos direcciones separadas por un salto de línea.
- 2 pares de coordenadas se repiten.
- Los nombres son muy genéricos: «ECA» aparece 80 veces, «ECA PRINCIPAL» 44 y «ECA 1» 20. **El nombre solo no identifica una ECA: hay que usar la dirección.**

**Qué respondió la UAESP a las preguntas del equipo:**

- **¿Un ciudadano puede llevar material a una ECA?** Sí, cualquier ciudadano puede entregar residuos aprovechables directamente, atendiendo los horarios y condiciones de la organización que la opera. Para un conjunto residencial, la UAESP recomienda que **la administración contacte a una organización de recicladores de oficio** de su localidad, y que frecuencia, horarios y volúmenes se acuerden entre las dos partes.
- **Ecopuntos:** la programación se publica de forma permanente en la página de la UAESP.
- **Actualizaciones:** el inventario cambia por un nuevo acto administrativo; la UAESP sugiere consultarla una vez al año.

**Las 9 ECA de 2020 frente al inventario nuevo:**

| ECA de 2020 | En el inventario nuevo |
|---|---|
| Engativá | Aparece (misma dirección, a 20 m) |
| Puente Aranda 2 | Aparece (misma dirección, a 18 m) |
| Usaquén II | Aparece (misma dirección) |
| Puente Aranda 1 | Dudosa (otra dirección, a 119 m) |
| Kennedy, Usaquén I, Engativá 2, Fontibón y Mártires | No aparecen (la ECA más cercana está entre 258 m y 1.034 m, y es otra) |

La tabla dice «no aparece» y **nunca «cerró»**: una dirección escrita distinto podría esconder alguna. La UAESP dijo que lo que no aparece *no hace parte del inventario vigente*.

**Licencia y atribución.** La UAESP autoriza **usar y citar** la información, con cuatro condiciones: nombrarla como fuente, **no alterar los datos**, cumplir la Ley 1712 de 2014 y las normas de protección de datos personales, y uso **no comercial**. El texto de atribución sugerido es: «Fuente: Unidad Administrativa Especial de Servicios Públicos (UAESP), inventario de Estaciones de Clasificación y Aprovechamiento, Resolución 698 de 2023, entregado en noviembre de 2026.»

**Cómo se cargó (issues #664 y #665):**

- Se creó un **CSV limpio** con las 799 filas. Los datos de la UAESP **no se cambiaron**: solo se quitaron espacios sobrantes, las 27 filas con dos direcciones quedaron con ambas separadas por « / », y «NO APLICA» y las organizaciones vacías quedaron sin organización. Los nombres genéricos se dejaron tal cual; la tabla muestra la organización debajo del nombre para distinguirlos.
- El número de la Resolución 698 se repite en dos casos (el 105 y el 605: dos organizaciones en la misma bodega). Para que cada número sea único, la segunda fila lleva `-2`.
- Los **correos van en un archivo aparte** (`eca_correos_uaesp.csv`) que **no se sube al repositorio**, porque el repositorio es público y algunos son direcciones personales (Gmail, Yahoo). Está en `.gitignore`, como el `.env`, y el equipo se lo pasa por otro medio. Sin ese archivo, el sistema funciona igual, solo sin correos.
- Las 9 ECA de 2020 **ya no se siembran a mano**: tres vienen en el inventario nuevo y las otras seis, según la UAESP, no hacen parte del inventario vigente.
- El aviso del directorio **cita a la UAESP** y aclara que estar en la lista no garantiza que la ECA esté abierta. No lleva enlace, porque ninguno era útil (la página de ECA de la UAESP daba error 403 y Datos Abiertos daba 404), y la licencia exige *nombrar* a la UAESP, no enlazarla.

### 5.6 Etapa 5 (16 de noviembre de 2026): una tercera petición, todavía sin respuesta

Al revisar el Excel apareció la necesidad de aclarar qué es cada fila. Esto se cuenta en la sección 6.

## 6. Las peticiones a la UAESP

### 6.1 Por qué se le pregunta a la UAESP

Una regla del equipo, definida el 16 de noviembre, es que **si un dato oficial tiene dudas, se le pregunta a la entidad que lo emite**. El Excel no dice el tipo de lugar, el estado, el teléfono ni el encargado de cada ECA. Como la UAESP es quien emite el inventario, es la fuente para aclararlo; el equipo no puede decidir por su cuenta qué filas son «de verdad» ECA.

### 6.2 Las tres peticiones

| Petición | Radicado | Qué pedía | Estado |
|---|---|---|---|
| Primera y segunda | 20267000840922 y 20267000856602 | El listado actualizado de ECA, con dirección, contacto y operador | Respondidas por el oficio 20265000341921 del 10 de noviembre de 2026 |
| Tercera | **20267000909842** (enviada el 16 de noviembre de 2026) | Aclarar el inventario de 799 ECA | **Pendiente de respuesta** |

**La tercera petición** tiene 9 preguntas. Los temas principales:

- **Filas con nombre de «chatarrería», «bodega» o «depósito».** En el archivo cargado hay 39 filas con «CHATARRERIA» en el nombre, 14 con «BODEGA» y 2 con «DEPOSITO». La UAESP clasifica las bodegas privadas aparte de las ECA, así que se pregunta si esas filas son realmente ECA del inventario de la Resolución 698.
- **Organización «NO APLICA» o vacía:** 102 filas.
- **Funciones y materiales** que recibe cada ECA.
- **Responsable y contacto** de cada ECA.
- **Estado de funcionamiento y fecha de corte** del inventario.

**Qué se decidió mientras responden:** no se oculta ni se cambia nada en la aplicación. El inventario se muestra tal como se entregó, con el aviso de que estar en la lista no garantiza que esté abierta.

**Cuándo se espera la respuesta:** las anteriores tardaron unos 13 días, así que se espera hacia **finales de noviembre o principios de diciembre de 2026**. Cuando llegue, se anota en `docs/gestion-proyecto/fuente-datos-puntos-acopio-eca.md` y se decide qué hacer con las chatarrerías, depósitos y bodegas: dejarlas, marcarlas con un tipo distinto o quitarlas.

### 6.3 Cómo se cuidan estas peticiones

- **Los oficios de respuesta no se guardan en el repositorio**, porque traen datos personales de quien hizo la petición. Solo se cita su número.
- **El número de verificación del radicado** lo guarda quien hizo la petición, y no se escribe en ningún documento.
- Un dato general para quien quiera citarlo: el derecho de petición está regulado en Colombia por la Ley 1755 de 2015, que fija un plazo general de 15 días hábiles para responder. *Esto no está escrito en los documentos del repositorio; confírmalo antes de citarlo ante los profesores.*

## 7. Las lecciones educativas y sus fuentes

Las 33 lecciones de «Aprende a reciclar» (en 8 categorías) siguen un principio: **cada afirmación lleva fuente, y lo que las fuentes no dicen se escribe como tal.**

### 7.1 Las fuentes

Los textos citan normas y guías oficiales. Las principales:

- **Guía Nacional para la adecuada separación de residuos sólidos** (Ministerio de Ambiente y otras entidades).
- **Decreto 1381 de 2024** (reconoce en exclusividad, por 15 años, a las organizaciones de recicladores de oficio la recuperación de los residuos aprovechables; regula una remuneración por tarifa a la organización, no un pago directo a cada reciclador).
- **Resolución 799 de 2025** y **Resolución 851 de 2022** (residuos de posconsumo).
- **Resolución UAESP 701 de 2013** (a qué hora sacar la bolsa blanca).
- **Resolución 1675 de 2013** (envases de plaguicidas).
- **Guía de posconsumo de la Secretaría Distrital de Ambiente** (abril de 2026).

Los videos que acompañan tres lecciones son de apoyo, no son fuente.

### 7.2 Lo que las fuentes no dicen, y se escribe así

El equipo prefirió reconocer vacíos antes que inventar respuestas. Ejemplos de la investigación:

- **Cómo entregar escombros en cantidad pequeña:** la ruta oficial es el Ecopunto, la recolección a domicilio o un gestor autorizado. Que el reciclador los reciba **no tiene fuente**, así que la aplicación no dice «entrégaselo al reciclador».
- **Los huesos y la carne en la bolsa verde:** la UAESP cuenta las carnes como orgánicos, y la Guía Nacional manda lo cocinado a la bolsa negra si no hay ruta con tratamiento. El módulo explica esa diferencia y ya no nombra los huesos, porque ninguna fuente los menciona.
- **El cobro al reciclador:** el Decreto 1381 solo dice que el aprovechamiento se cobra a todos los usuarios del aseo. Los módulos ya no dicen que el cobro «llega a su organización».
- **La línea 110 (recolección de voluminosos):** algunas notas dicen que tiene costo y otras que es gratuita, así que el módulo dice que se confirme el costo al llamar.

### 7.3 Cómo se amplió el catálogo

El catálogo pasó de 6 lecciones a 28 (issue #519) y luego a **33** (issue #707), y cada texto se reescribió con más profundidad. Además, se reorganizó en ocho categorías, con las lecciones en orden de aprendizaje.

## 8. Las reglas del equipo sobre los datos

De toda esta historia salieron reglas que el equipo aplica:

1. **No inventar datos.** Un dato que no se puede comprobar no se presenta como real. Si no existe, el campo queda vacío (como el NIT o el teléfono).
2. **Cada dato lleva su fuente, su fecha de consulta y su licencia** escritas en el repositorio (`docs/gestion-proyecto/fuente-datos-*.md`).
3. **No alterar los datos de la UAESP.** La licencia lo exige. Solo se limpian espacios y formato.
4. **Los datos personales no se guardan en el repositorio:** ni los nombres de contacto, ni los correos personales, ni los oficios con datos de quien los pidió.
5. **Citar a la entidad** en la aplicación, con las palabras que la licencia pide.
6. **Decir «vigente», no «abierta hoy».** Un dato registrado no es lo mismo que un dato verificado en el terreno.
7. **Si el dato oficial tiene dudas, preguntarle a la entidad que lo emite** y, mientras responde, no esconder ni cambiar nada.
8. **Escribir lo que no se pudo confirmar.** Las investigaciones listan expresamente qué no se pudo hacer y por qué.

## 9. Cómo se cargan los datos al sistema

El comando `uv run python -m app.seed` (desde la carpeta `be/`) carga los datos, en este orden:

1. **Roles y localidades**, desde `seed_data.sql`.
2. **Los conjuntos residenciales reales**, desde el CSV de 14.515 filas.
3. **Los puntos de acopio (ECA)**, desde el CSV de 799 filas (y los correos, si existe el archivo aparte).
4. **Las cuentas de prueba** (solo si `ENVIRONMENT=development`).
5. **Las lecciones educativas**, desde `contenido_educativo.json`.

Se puede correr varias veces sin duplicar nada: cada sección revisa si ya está sembrada. Para presentar el proyecto se agrega `uv run python -m app.seed_demo`, que llena la base con 3 conjuntos de demostración, 8 semanas de auditorías con fotos, comunicados, novedades y solicitudes (documento 1, sección 7).

**Cómo actualizar los conjuntos:** el servicio se vuelve a consultar con la misma petición, paginando de 2.000 en 2.000, y se regenera el CSV. **Cómo actualizar las ECA:** la UAESP actualiza su inventario mediante un nuevo acto administrativo; sugiere consultarla una vez al año.

## 10. Lo que sigue pendiente

- **La respuesta a la tercera petición** (radicado 20267000909842) y lo que se decida con las chatarrerías, depósitos y bodegas.
- **Mostrar las ECA en un mapa** (issue #666). Las 799 ya tienen coordenadas, pero la aplicación no las dibuja.
- **Teléfono y horario de cada ECA:** la UAESP dijo que solo puede darlos cada organización operadora. No es obligatorio para el mapa.
- **Confirmar con recicladores de oficio** (una tarea humana que la investigación dejó sin hacer): qué materiales acepta cada tipo de punto y a quién.
- **Los Centros de Cuidado al Reciclador (CCR)** como segunda etapa del directorio, cuando se consigan sus direcciones.

## Lo que debes saber explicar

Después de leer este documento, deberías poder responder **sin mirar**:

1. ¿De dónde salen los conjuntos residenciales y por qué se cambió de fuente?
2. ¿Qué es una ECA y en qué se diferencia de un Ecopunto, un CCR y una chatarrería?
3. ¿Cómo cambió lo que sabíamos de los puntos de acopio a lo largo del tiempo?
4. ¿Qué entregó la UAESP, qué no entregó y por qué?
5. ¿Cuántas peticiones se hicieron a la UAESP y en qué estado está cada una?
6. ¿Qué condiciones pone la licencia de la UAESP y cómo las cumple el proyecto?
7. ¿Qué datos se decidió no guardar y por qué?

### Preguntas que te pueden hacer

**¿De dónde sacaron los conjuntos y puntos de acopio?**
Los conjuntos, de Datos Abiertos Bogotá (Secretaría de Gobierno, noviembre de 2025): 14.515 conjuntos residenciales. Los puntos de acopio, del inventario oficial que nos entregó la UAESP: 799 ECA, de la Resolución 698 de 2023. Los dos tienen su fuente, fecha y licencia escritas en el repositorio.

**¿Por qué no usaron datos inventados?**
Porque no sirven para una demostración creíble ni se pueden comprobar. Antes teníamos 40 conjuntos y 40 puntos inventados, y un comentario decía «fuente: UAESP» cuando era falso. Eso se corrigió.

**¿Los puntos de acopio están abiertos hoy?**
No lo sabemos, y la aplicación no lo afirma. La UAESP dice que «vigente» significa registrada en el acto administrativo, no que esté abierta. Por eso la pantalla escribe «inventario vigente de la UAESP».

**¿Qué le preguntaron a la UAESP?**
Primero pedimos el listado actualizado con dirección, contacto y operador, y respondieron con 799 ECA. Luego, al revisar el archivo, preguntamos qué son las filas llamadas chatarrería, bodega o depósito, qué significa la organización vacía, qué materiales recibe cada ECA, quién es el responsable y cuál es el estado y la fecha de corte. Esa tercera petición está pendiente.

**¿Pueden usar los datos de la UAESP?**
Sí, con sus condiciones: citar a la UAESP como fuente, no alterar los datos, respetar la Ley 1712 de 2014 y la protección de datos personales, y usarlos sin fines comerciales.

**¿Qué hicieron con los datos personales?**
No guardamos el nombre de contacto de los conjuntos (ni en el repositorio) y los correos de las organizaciones están en un archivo aparte que no se sube a GitHub. Los oficios de la UAESP tampoco se guardan, solo su número.

**¿Qué pasó con el conjunto «Urapán»?**
No aparecía en el primer archivo que usamos (de marzo de 2023). Buscamos una fuente más reciente de la misma entidad, el servicio «Propiedad Horizontal» de noviembre de 2025, y ahí sí está.

**¿De dónde salen las lecciones educativas?**
De normas y guías oficiales (la Guía Nacional de separación de residuos, el Decreto 1381 de 2024, resoluciones de posconsumo y la guía de la Secretaría de Ambiente), citadas en cada texto. Lo que las fuentes no dicen, se escribe como tal.

## Glosario

- **Atribución:** citar de dónde salió un dato.
- **Bodega privada:** negocio privado de reciclaje que la UAESP clasifica aparte de las ECA.
- **CCR (Centro de Cuidado al Reciclador):** espacio solo para recicladores de oficio.
- **Creative Commons (CC BY, CC BY-NC):** licencias que permiten usar un dato citando la fuente (la segunda, sin uso comercial).
- **CSV:** archivo de texto con filas y columnas separadas por un símbolo.
- **Dataset:** conjunto de datos sobre un tema.
- **Dato abierto:** información pública que una entidad publica para que cualquiera la use.
- **Dato personal:** información que identifica a una persona; protegida por la Ley 1581 de 2012.
- **ECA:** Estación de Clasificación y Aprovechamiento; lugar formal donde se pesa y clasifica el material.
- **Ecopunto:** caja de la UAESP para escombros y voluminosos, que cambia de localidad cada semana.
- **Ley 1712 de 2014:** ley de transparencia y acceso a la información pública.
- **Oficio:** documento formal con el que una entidad responde.
- **PQRS:** peticiones, quejas, reclamos y sugerencias.
- **Petición:** solicitud formal a una entidad pública.
- **Posconsumo:** residuos peligrosos o de manejo especial (pilas, bombillos, llantas, medicamentos).
- **Radicado:** número que identifica una petición para hacerle seguimiento.
- **Siembra (seed):** cargar datos iniciales en una base vacía.
- **UAESP:** Unidad Administrativa Especial de Servicios Públicos de Bogotá.
- **Vigente:** registrado en el acto administrativo; no significa «abierto hoy».
