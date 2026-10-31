# Investigación: de dónde sale el contenido educativo y cómo apoyarse en creadores como "Marce La Recicladora"

<!--
  ¿Qué? Investigación del issue #569: averiguar qué entidades rigen el reciclaje
        y la gestión de residuos en Colombia y en Bogotá, qué normas y guías
        publican, y qué dicen realmente sus textos oficiales.
  ¿Para qué? Antes de escribir módulos nuevos (issue #519) el equipo necesita
             saber de dónde sacar la información y con qué confianza, para
             que quien redacte no tenga que decidir las fuentes a solas.
  ¿Impacto? Esta tarjeta solo investiga: no cambia código, seed ni catálogo.
            Cómo se organizan los módulos (los actuales y los nuevos) se
            decide en otra rama.
-->

**Fecha:** 2026-10-30
**Rama:** `docs/investigacion-contenido-educativo`
**Cómo se investigó:** se abrieron y leyeron las páginas y normas oficiales que se citan en la sección 12 (la mayoría se leyeron completas). Lo que no se pudo leer o confirmar está marcado como tal en cada sección y reunido en la sección 10.

## 1. La pregunta

1. ¿Qué entidades rigen el reciclaje y la gestión de residuos, y qué publican que sirva como fuente confiable para VerdeApp?
2. ¿Qué dicen en concreto las normas y guías sobre los temas que hoy no cubre la aplicación?
3. ¿Se puede apoyar el contenido en videos de creadores como "Marce La Recicladora"?

Lo que se hará con esto (qué módulos escribir, cómo reorganizar los 6 actuales) **no** se decide aquí: va en las tarjetas siguientes (#519 y otras).

## 2. Qué enseña hoy la aplicación

El seed trae **6 módulos**, uno por categoría de auditoría (`be/app/seed.py`, lista `contenido_educativo`):

| Módulo | Tema | Guía oficial enlazada |
| --- | --- | --- |
| Separación en la fuente y código de colores | Bolsa blanca, negra y verde | `bogota.gov.co` (separar según el color de las bolsas) |
| Tipos de residuos y su preparación | Cómo dejar limpio cada material | `bogota.gov.co` (separación y reciclaje desde casa) |
| Puntos limpios y Ecopuntos | Muebles, colchones y escombros | `bogota.gov.co` (cómo funcionan los Ecopuntos) |
| Economía circular y aprovechamiento | Papel del reciclador de oficio | `uaesp.gov.co` (aprovechamiento) |
| Residuos de construcción y demolición | Escombros | `bogota.gov.co` (RCD del IDU) |
| Marco distrital y consumo responsable | Reducir antes de reciclar | `bogota.gov.co` (10 mandamientos cero desechos) |

**Lo que no cubre:** pilas, aparatos electrónicos, bombillas, medicamentos vencidos, aceite de cocina usado, llantas, baterías de vehículos, envases de insecticidas, ropa, ni cómo se aprovechan los residuos orgánicos.

**Tres cosas del seed actual que conviene revisar contra lo leído en esta investigación** (no se corrigen aquí):

- **Módulo 3 (Ecopuntos).** Dice que son "cajas o puntos fijos" que rotan "semana a semana". La nota oficial del 3 de febrero de 2026 dice que cada zona se atiende **aproximadamente cada cuatro semanas** y no define si es un contenedor fijo o móvil. Tampoco dice "semana a semana" para un mismo lugar.
- **Módulo 4 (recicladores).** Cita el Decreto 596 de 2016. Desde el Decreto 1381 de 2024 la exclusividad de las organizaciones de recicladores de oficio dura 15 años y el régimen cambió (sección 4.5).
- **Módulo 2.** Su video (`gYOwmj3-XqQ`) es uno de los 4 que se pasaron como de Marce.

## 3. Quién rige qué

| Entidad | Para qué sirve en este tema | Qué publica que nos sirve |
| --- | --- | --- |
| **Ministerio de Ambiente y Desarrollo Sostenible (MADS)** | Política ambiental nacional, código de colores y programas de posconsumo (residuos que el productor debe recibir de vuelta) | Resolución 2184 de 2019; página de programas posconsumo; resoluciones 851 de 2022, 316 de 2018 y 371 de 2009 |
| **Ministerio de Vivienda, Ciudad y Territorio** | Servicio público de aseo y aprovechamiento; lidera la política nacional de residuos (CONPES 3874) | Decreto 1077 de 2015 y Decreto 1381 de 2024 |
| **ANLA** | Aprueba los sistemas de recolección que montan los productores (RAEE, pilas) y recibe sus informes | Resolución 851 de 2022 la nombra como autoridad que aprueba (arts. 11, 12, 16 a 18) |
| **Superservicios y CRA** | Vigilancia y regulación del servicio de aseo. El Decreto 1381 le da a la Superservicios el registro de las organizaciones de recicladores y a la CRA fijar indicadores | Decreto 1381 de 2024. No se leyeron sus propias páginas |
| **UAESP** (Bogotá) | Aseo y aprovechamiento en la ciudad: Ecopuntos, trabajo con recicladores, código de colores en Bogotá | Resolución UAESP 701 de 2013; nota de Ecopuntos; página de orgánicos; página de colores de bolsa |
| **SDA** (Secretaría Distrital de Ambiente) | Posconsumo en Bogotá: dice dónde entregar cada residuo | Guía de posconsumo del Distrito (13 de abril de 2026), página de medicamentos, 10 mandamientos de cero desechos |
| **Acueducto de Bogotá (EAAB)** | Fuente de la información sobre el aceite usado y su daño al alcantarillado | Nota de aceite de cocina (4 de mayo de 2025) |
| **Alcaldía de Bogotá (`bogota.gov.co`)** | Portal que reúne y explica lo anterior en lenguaje sencillo | Es la fuente que ya usan las 6 lecciones |

**Orden de confianza propuesto:** primero la norma o la página de la entidad que la emite; segundo `bogota.gov.co` como explicación sencilla; tercero medios y blogs, solo para encontrar la fuente primaria, nunca para citarlos.

## 4. Normas leídas en su texto oficial

Para cada norma: qué dice, qué le toca al ciudadano y su vigencia, tal como aparece en el normograma consultado.

### 4.1 Resolución 2184 de 2019 (MADS): código de colores

- **De qué trata en realidad.** Es una resolución sobre todo de **bolsas plásticas**; el código de colores está en el artículo 4. El normograma marca los artículos 1 a 3 (bolsas plásticas) como derogados por el artículo 26 de la Resolución 803 de 2024. El texto de la 803 no nombra esos artículos: deroga la Resolución 668 de 2016 "y sus modificaciones" desde el 7 de julio de 2024 y **exceptúa expresamente el artículo 4 de la 2184**. Es decir, **el código de colores sigue vigente** (confirmado en el texto de la 803).
- **Qué dice el artículo 4.** Verde para orgánicos aprovechables. Blanco para aprovechables: plástico, vidrio, metales, multicapa, papel y cartón. Negro para no aprovechables. No define otros colores ni da ejemplos de residuos.
- **A quién obliga.** A los municipios y distritos, que deben implementar el código dentro de sus programas de aprovechamiento. El articulado no impone una obligación directa al ciudadano.
- **Fechas.** Rige desde el 27 de diciembre de 2019. Los municipios debían implementarlo desde el 1 de enero de 2021. La prórroga hasta el 1 de julio de 2022 (Resolución 1344 de 2020) es solo para las actividades de atención en salud y similares del Decreto 780 de 2016, **no para los hogares**.

### 4.2 Resolución UAESP 701 de 2013: cómo sacar el material reciclable en Bogotá

- Todo usuario o generador en Bogotá debe presentar en el espacio público, para la recolección por la población recicladora de oficio, el material aprovechable **en bolsa blanca**.
- **Horario:** con una antelación no mayor a 3 horas ni menor a 1 hora respecto del horario y frecuencia que fije el operador. No fija horas concretas.
- **Qué va adentro:** debe ajustarse a la lista de la Resolución UAESP 799 de 2012 (no se leyó).
- **Sanciones:** quien incumpla puede incurrir en infracciones del Código de Policía de Bogotá y en comparendo ambiental (Acuerdos 417 de 2009 y 515 de 2012).
- **Conjuntos residenciales:** el texto no tiene una regla específica para ellos; aplica la obligación general a "todo usuario o generador".
- **Vigencia:** la página dice que no incluye análisis de vigencia y no muestra modificaciones. No se pudo confirmar con otra fuente.

### 4.3 Resolución 851 de 2022 (MADS): aparatos electrónicos, pilas y bombillas

- **Qué regula.** La clasificación nacional de aparatos eléctricos y electrónicos (RAEE) y los requisitos de los sistemas de recolección que deben montar los productores, con aprobación de la ANLA.
- **Cubre pilas y acumuladores.** Aparecen como subcategoría 3.11 de la categoría 3.
- **Vigencia:** rige desde el 1 de enero de 2023 y, en su artículo 24, **deroga las Resoluciones 1297 de 2010 (pilas), 1511 de 2010 (bombillas) y 1512 de 2010 (computadores)**, además de la 2246 de 2017. Los anexos no están en la página consultada.
- **Qué le toca al ciudadano.** No hay una obligación general de devolver aparatos. Lo que sí dice: quien compra un aparato nuevo puede entregar el viejo al comercializador (si no lo entrega en ese momento, el comercializador fija un plazo no menor a 30 días); antes de devolver un aparato hay que sacar las pilas si el usuario puede; y el usuario tiene derecho a una constancia de recibo.
- **Importante para el contenido:** la página del MADS sobre posconsumo todavía lista como programas las resoluciones 1297, 1511 y 1512. Esa página está desactualizada frente a la 851.

### 4.4 Resolución 316 de 2018 (MADS): aceite de cocina usado

- **Qué regula.** La gestión del aceite de cocina usado (origen vegetal): inscripción de generadores industriales, comerciales y de servicios y de gestores ante la autoridad ambiental.
- **Qué le toca al hogar.** Recoger el aceite en un envase plástico sellado y entregarlo en puntos limpios, que deben establecer los gestores. A **toda persona** le prohíbe verterlo en fuentes de agua, alcantarillado o suelo, y mezclarlo con otras sustancias.
- **Vigencia:** rige desde su publicación (4 de marzo de 2018) y el texto no muestra modificaciones.
- **No confirmado:** una resolución de la SDA de 2023 (la 2238) aparece solo en prensa.

### 4.5 Decreto 1381 de 2024 (Presidencia y MinVivienda): recicladores de oficio

- **Qué regula.** El aprovechamiento de residuos ordinarios aprovechables dentro del servicio de aseo, que queda en **exclusividad de las organizaciones de recicladores de oficio por 15 años** desde su entrada en vigencia (14 de noviembre de 2024).
- **Qué le toca al ciudadano.** Separar en la fuente según el código de colores de la Resolución 2184; presentar el material aprovechable en andén, unidades de almacenamiento o mobiliario público; no exigir pago alguno a los recicladores por el acceso a esos residuos. El cobro de la actividad va en la factura del aseo.
- **Excluye** los residuos especiales aprovechables: peligrosos, de construcción y demolición, RAEE y los que tienen planes de posconsumo.
- **Conjuntos residenciales:** el texto leído **no los menciona**. No hay regla específica.
- **Vigencia:** deroga el Decreto 1345 de 2021. No se hallaron modificaciones posteriores en el texto.

### 4.6 Resolución 371 de 2009 (MADS): medicamentos vencidos

- **Qué regula.** Los planes que deben presentar fabricantes e importadores de medicamentos para recibirlos vencidos. Establecimientos farmacéuticos, droguerías e IPS participan en la recolección.
- **Qué le toca al ciudadano.** Seguir las instrucciones de manejo de la etiqueta y devolver los medicamentos vencidos al mecanismo que haya establecido el fabricante o importador. A **toda persona** le prohíbe botarlos en rellenos sanitarios, quemarlos o verterlos en agua, alcantarillado o baldíos.
- **Vigencia:** el texto no muestra modificaciones, pero no se verificó en el SUIN ni en el Diario Oficial.

### 4.7 Resolución 799 de 2025 (MADS): baterías de plomo-ácido de vehículos

- **Qué regula.** Los sistemas de recolección y gestión de las baterías usadas de plomo-ácido de autos y motos (BUPA). Rige desde el **1 de enero de 2026** (Diario Oficial 53.196 del 29 de julio de 2025).
- **Vigencia: deroga las Resoluciones 372 de 2009, 503 de 2009, 1738 de 2010 y 361 de 2011** desde esa fecha. Por eso la página del MADS y la guía de la SDA que todavía las citan quedaron atrás. Las baterías de plomo-ácido de otras aplicaciones quedan cubiertas por la Resolución 851 de 2022.
- **Qué le toca al ciudadano (art. 6).** Seguir las instrucciones de manejo; no mezclar la batería con otros residuos ni entregarla a personas no autorizadas; devolverla por los mecanismos del sistema; no desarmarla ni drenar el electrolito; y, si no hay un medio de devolución accesible, entregarla a un gestor autorizado. El comercializador debe aceptar la devolución sin costo (art. 5).
- **Prohibiciones (art. 25).** Entregarla fuera de los sistemas, botarla en rellenos sanitarios, desarmarla o aprovecharla en sitios no autorizados y verter el electrolito en agua, alcantarillado o suelo.
- **No cubre** pilas, llantas, plaguicidas, medicamentos, bombillas, aceite ni envases. No menciona la Resolución 371 de 2009, la 1675 de 2013, la 1326 de 2017, la 1407 de 2018 ni la 316 de 2018, así que **no las deroga**.

### 4.8 Resolución 1675 de 2013 (MADS): envases de plaguicidas

- **Qué regula.** Los planes de devolución de plaguicidas en desuso y sus envases, para usos agrícola, veterinario, doméstico, de salud pública e industrial. Los presentan fabricantes e importadores ante la ANLA.
- **Qué le toca al consumidor (art. 14).** Entregar los residuos en los puntos o jornadas del fabricante, seguir las instrucciones de manejo, separarlos de los demás residuos y hacer el triple lavado e inutilizar los envases cuando proceda (sin destruir las etiquetas). Los envases no hidrosolubles, presurizados o fumígenos no llevan triple lavado.
- **Prohibiciones (art. 17).** Botarlos en rellenos sanitarios o sitios no autorizados, abandonarlos en ríos o espacio público, reutilizarlos como juguetes, utensilios o recipientes de agua, alimentos o medicamentos, y entregarlos a mecanismos distintos a los del fabricante a cambio de dinero.
- **Vigencia:** deroga la Resolución 693 de 2007. La página no muestra modificaciones ni derogatorias.

### 4.9 Resolución 1326 de 2017 (MADS): llantas usadas

- **Qué regula.** Los sistemas de recolección de llantas usadas que deben montar los productores, con prioridad al reencauche y luego al aprovechamiento.
- **Qué le toca al consumidor (art. 18).** Entregar las llantas usadas en los puntos de recolección de los productores, seguir las instrucciones de manejo y acudir al reencauche cuando sea viable. Los montallantas también deben entregarlas en esos puntos (art. 21).
- **Prohibiciones (art. 22).** Abandonar o eliminar llantas, enterrarlas, botarlas en rellenos sanitarios, acumularlas a cielo abierto, dejarlas en el espacio público o quemarlas.
- **Vigencia:** deroga la Resolución 1457 de 2010. La página no muestra modificaciones ni derogatorias.

### 4.10 Resoluciones 1407 de 2018, 1342 de 2020 y 803 de 2024 (MADS): envases y empaques

- **Qué regula la 1407.** La responsabilidad de los productores sobre los residuos de envases y empaques de papel, cartón, plástico, vidrio y metal, con planes ante la ANLA. Excluye los envases de medicamentos, los que sean residuos peligrosos y los de madera o fibras textiles.
- **Qué le toca al consumidor.** Separar bien los residuos de envases y empaques en la fuente y entregarlos en los puntos o mecanismos que establezcan los productores (artículo 16, que la Resolución 1342 de 2020 reemplazó con una redacción parecida).
- **Cómo ha cambiado.** La 1342 de 2020 la modificó en varios puntos. La 803 de 2024 (que desarrolla la Ley 2232 de 2022 sobre productos plásticos de un solo uso) reescribió el ámbito, las definiciones, el contenido del plan y los anexos. La 803 **no** es una norma de bolsas plásticas (solo las menciona en un artículo transitorio).
- **No leído:** las tablas de metas son imágenes y no se pudieron transcribir. El normograma consultado también deja dudas sobre qué versión del artículo 16 está vigente (ver sección 6).

### 4.11 Ley 1259 de 2008: comparendo ambiental

- **Qué regula.** Crea el comparendo ambiental como instrumento de cultura ciudadana para quienes manejen mal los residuos o escombros. Los concejos municipales deben reglamentarlo. En Bogotá lo aplican la Policía, agentes de tránsito, inspectores y corregidores.
- **Vigencia importante:** los artículos 5, 6 y 7 (listado de infracciones y sanciones) y el 12 están **derogados por la Ley 1801 de 2016** (Código Nacional de Seguridad y Convivencia), desde el 29 de enero de 2017. Por eso la ley hoy no trae el catálogo de multas. El normograma consultado no mostró montos, salvo que el art. 10 (vehículos) menciona un salario mínimo.
- **Pendiente:** no se leyó la Ley 1801 de 2016 ni se encontró el texto de los Acuerdos 417 de 2009 y 515 de 2012 (ver sección 10), así que **la app no debe citar montos de multas**.

### 4.12 Normas mencionadas, sin lectura completa

- **Resolución UAESP 799 de 2012** (lista de lo que se considera material reciclable): citada por la 701, pero no apareció en ninguna búsqueda.
- **Resolución 2238 de 2023 (SDA, aceite):** aparece solo en prensa. No se encontró su texto.
- **CONPES 3874 de 2016:** se cita en varias normas leídas como política nacional; no se abrió su texto (es un PDF grande).
- **Ley 2232 de 2022** (productos plásticos de un solo uso): citada en la 803 de 2024; no se leyó.

## 5. A dónde entregar cada residuo en Bogotá (según la SDA)

Fuente principal: la guía de posconsumo de la SDA del **13 de abril de 2026** (la más reciente de las leídas). Cada fila indica el programa y cómo ubicar el punto. Los nombres de los menús son los que usa el visor.

| Residuo | Programa que nombra la guía | Cómo ubicar el punto |
| --- | --- | --- |
| Aparatos eléctricos y electrónicos de hogares | **Ecolecta** (59 puntos fijos, sin costo; no entrega certificados) | Página de puntos Ecolecta de la SDA |
| Computadores y periféricos | **EcoCómputo** | Visor, menú "Computadores y periféricos" |
| Pilas | **Pilas con el ambiente** y **Recopila** | Visor, menú "Puntos posconsumo - Pilas o Acumuladores" |
| Bombillas y luminarias | **Lúmina** | Visor, menú "Puntos posconsumo - Bombillas" |
| Medicamentos de uso humano | **Punto Azul** | Visor y sitio del programa |
| Medicamentos veterinarios | **Aprovet** | Visor, menú "Fármacos o medicamentos vencidos" |
| Envases de insecticidas de uso doméstico | **Cierra el ciclo** | Visor, menú "Puntos posconsumo - Plaguicidas" |
| Baterías de plomo-ácido de autos y motos | **Recoenergy** y **Ecosteps - Clarios Andina**, en talleres, servitecas y almacenes de repuestos. Regidas por la Resolución 799 de 2025 desde 2026 | Se entregan en esos comercios |
| Neveras, lavadoras y otros de línea blanca | **Red verde** | Visor, menú "Electrodomésticos (línea blanca)" |
| Aceite de cocina usado | Puntos habilitados por la SDA | Visor, menú "Puntos Posconsumo - Aceite vegetal usado" |
| Llantas | Solo por empresas autorizadas; la guía no ofrece un punto para el ciudadano | Preguntar a los gestores autorizados |
| Escombros y muebles | **Ecopuntos** de la UAESP | `uaesp.gov.co/ecopuntos` |
| Ropa y zapatos | Contenedores de la SDA | Lista de puntos de la SDA |

**Lo que dicen las páginas sobre cada tema, para tener a mano al redactar:**

- **Aceite (4 de mayo de 2025).** No echarlo al sifón; dejarlo enfriar; pasarlo con un embudo a una botella; llevarla a un punto habilitado. Evita taponar el alcantarillado y contaminar ríos y humedales.
- **Medicamentos (11 de enero de 2021, página antigua).** Son residuos peligrosos: no van en bolsa blanca, negra ni verde, ni se entregan a la empresa de aseo. Se llevan a un punto, con sus envases. **No** se entregan jeringas ni elementos cortopunzantes. La página decía "más de 500" puntos de humano y "más de 30" de veterinario en 2021.
- **Orgánicos (UAESP, 11 de septiembre de 2022).** Orgánicos son los restos de comida crudos o cocinados: frutas, verduras, carnes, líquidos biodegradables, **cáscaras de huevo** y posos de café. Van en bolsa verde. Cerca del 51 % de lo que producen los hogares es orgánico (unas 3.440 toneladas diarias en la ciudad). Hay proyectos piloto en Mochuelo Bajo y Usaquén operados por organizaciones de recicladores. **La página no explica cómo entrega un hogar sus orgánicos:** el piloto recoge de conjuntos y comercios.
- **Ecopuntos (3 de febrero de 2026).** Gratis. Reciben voluminosos (maderas, muebles, colchones, sillas, sofás) y residuos de construcción no peligrosos. **No** reciben llantas ni electrodomésticos. Cada zona se atiende más o menos cada 4 semanas, en 19 localidades; la programación semanal se consulta cada domingo en el micrositio de la UAESP.
- **10 mandamientos de cero desechos (SDA, 31 de marzo de 2026).** Resumen de buenas prácticas: escombros y muebles a Ecopuntos o línea 110; ropa en bolsa limpia a contenedores; aceite en botella cerrada; llantas solo a empresas autorizadas; aparatos y pilas a Ecolecta; jeringas en el recipiente rígido que da el centro de salud; residuos con riesgo biológico en bolsa roja con gestores autorizados.

### 5.1 Cómo preparar y entregar cada residuo (plegable del MADS)

El plegable de programas posconsumo del Ministerio de Ambiente (PDF; los metadatos indican 2014, así que es antiguo) explica cómo entregar cada residuo. Es útil para el "cómo", pero **sus programas deben contrastarse con la sección 4** (por ejemplo, las resoluciones de bombillas, pilas y computadores que menciona están derogadas desde 2023).

| Residuo | Qué incluye | Dónde lo entrega | Cómo prepararlo |
| --- | --- | --- | --- |
| **Medicamentos vencidos** | Envases, empaques, cajas, frascos, ampolletas, medicamentos vencidos y parcialmente consumidos | Contenedores en droguerías o farmacias, almacenes de cadena, supermercados e IPS | Frascos bien cerrados; destruir parcialmente las etiquetas para evitar falsificación; reunirlos en una bolsa resistente fuera del alcance de niños; no mezclarlos con otros residuos; depositarlos uno mismo en el contenedor |
| **Computadores y periféricos** | Portátiles, tabletas, computadores de escritorio, impresoras, escáner, parlantes, cámaras web, discos externos, cargadores, módems y enrutadores | Tiendas especializadas, centros de servicio técnico autorizados o campañas en almacenes de cadena | Guardarlos libres de polvo y humedad; transportarlos en sus empaques originales; **no entregarlos a mecanismos informales, recicladores o fundaciones que no pertenezcan a un programa posconsumo** |
| **Envases de plaguicidas domésticos** | Latas, envases plásticos, aspersores, pastillas y frascos de insecticidas | Contenedores en puntos de venta, almacenes de cadena, instituciones educativas y campañas | Reunirlos en una bolsa resistente, junto con otros envases que hayan estado en contacto; no destruir las latas presurizadas, solo rayar la etiqueta |
| **Bombillas fluorescentes** | Tubulares, compactas (ahorradoras) y de alumbrado público | Almacenes de cadena y tiendas especializadas con contenedores | Guardar el empaque original; si no, usar bolsa plástica resistente y material de amortiguación; evitar golpes |
| **Pilas** | Alcalinas y de zinc-carbón, de botón y recargables | Tiendas, almacenes de cadena o centros comerciales con contenedores | Clasificar por tecnología y tamaño; proteger las terminales para evitar cortocircuito; llevarlas en bolsa plástica, **no en botellas**; las baterías de portátiles se entregan al encargado del establecimiento |
| **Baterías de plomo-ácido** | Las de autos y motos | Talleres, servitecas y almacenes de repuestos con centro de acopio | Bornes aislados, batería bien tapada sin derrame; entregarla a un técnico del sitio; **exigir constancia de recibido** |
| **Llantas** | De vehículos con rin hasta 22.5 (no motos, bicicletas ni fuera de carretera) | Establecimientos del sistema de recolección | Preguntar al proveedor de confianza por el punto autorizado |

## 6. Contradicciones entre fuentes (importante al redactar)

1. **Bolsa negra y orgánicos.** La página de colores de bolsa (Portal Bogotá con información de la UAESP, 7 de febrero de 2026) dice que la negra es para "no aprovechables (orgánicos y residuos que no pueden aprovecharse)" y a la vez que la verde es para orgánicos. La Resolución 2184 y la UAESP en la nota de orgánicos dicen que los orgánicos van en la verde. **Se sigue la norma.**
2. **Página del MADS vs. Resolución 851.** La página del MADS lista como programas la 1297, 1511 y 1512, que la 851 derogó desde 2023. **Se sigue la norma.**
3. **Ecopuntos.** El seed los llama puntos fijos con rotación semanal; la nota oficial habla de visitas cada 4 semanas. Ver sección 2.
4. **Cantidades de puntos.** Cambian según la fecha de la página (500 puntos de medicamentos en 2021; 59 puntos Ecolecta en 2026; más de 800 puntos de residuos eléctricos y electrónicos en una nota de septiembre de 2025). **La app no debe repetir cifras:** debe enviar al visor.
5. **Baterías de plomo-ácido.** El MADS lista la Resolución 372 de 2009 (y la 361 de 2011) como vigente; la Resolución 799 de 2025 las derogó desde el 1 de enero de 2026. **Se sigue la 799.**
6. **Comparendo ambiental.** La Resolución UAESP 701 de 2013 dice que quien incumpla puede recibir comparendo ambiental, pero el catálogo de infracciones de la Ley 1259 de 2008 (arts. 5 a 7) está derogado por la Ley 1801 de 2016. **No se citan montos.**
7. **Artículo 16 de la Resolución 1407 de 2018.** El normograma muestra su texto original sin nota de cambio, pero la Resolución 1342 de 2020 dice que lo reemplaza. Ambas versiones dicen lo mismo en esencia (separar y entregar en los puntos de los productores). **Hay que verificar la versión exacta en el Diario Oficial** antes de citar el artículo.
8. **Plegable del MADS (antiguo).** Menciona programas cuyas resoluciones ya están derogadas. Sirve para el "cómo entregar", no para citar la norma.
9. **Página de la SDA de 2020 sobre separación en casa.** Hablaba de solo dos bolsas y sus listas aparecieron vacías al leerla. Está desactualizada frente al código de tres colores.

## 7. Los videos de Marce La Recicladora

Solo se pudo leer el **título** de cada enlace. YouTube no devolvió descripción, fecha, duración ni nombre del canal, así que esos datos hay que revisarlos viendo cada video.

| Enlace | Título | Tema relacionado |
| --- | --- | --- |
| `wK9ewkUtf6g` | "Manejo de residuos peligrosos!!" | Residuos peligrosos (pilas, medicamentos, etc.) |
| `gYOwmj3-XqQ` | "La guía básica para aprender a reciclar este 2025" | Ya está en el módulo 2 del seed |
| `LMZ6BAj1DF8` | "APRENDA A RECICLAR RE FÁCIL- Marce la Recicladora" | Introducción general a la separación |
| `4jETI2NcdrI` | "¿Cómo se recicla el vidrio? ES IMPRESIONANTE / Marce La Recicladora!" | Preparación del vidrio (módulo 2) |

**Postura propuesta:**

- Enlazar o incrustar el video de YouTube, sin copiar sus textos ni volver a subirlo. El contenido educativo ya tiene un campo de video.
- Usarlo como **apoyo dinámico**, no como la fuente de lo que dice la lección. La información sale de la norma o de la entidad.
- La lección debe servir sin el video: si la creadora lo borra o lo cambia, no se rompe nada.
- Antes de afirmar algo apoyado en un video, contrastarlo con la fuente oficial, sobre todo en lo que cambia por ciudad.
- Los videos no están divididos por tema. Si se usan, conviene enlazar al minuto exacto; hay que revisar si el campo de video de la app acepta ese formato.
- **Contacto:** escribirle a la creadora para avisar o pedir permiso se deja para cuando el proyecto pase a producción. Mientras tanto solo se enlaza.

## 8. Maneras de armar el contenido

| Opción | A favor | En contra |
| --- | --- | --- |
| **A. Solo fuentes oficiales**, redactadas con palabras propias y con enlace | Lo más confiable | Seco; más difícil de leer para un residente |
| **B. Fuentes oficiales + videos de creadores como complemento** | Confiable y ameno; el video se puede quitar sin perder la lección | Hay que revisar cada video y puede cambiar en el futuro |
| **C. Producir videos propios** | Control total | Mucho tiempo y fuera del alcance del equipo |

**Recomendación:** la opción B, que es lo que el equipo planteó: la información sale de fuentes oficiales y los videos solo la hacen más amena.

## 9. Lo que esta investigación deja para otras ramas

Estas tareas **no se hacen aquí**; cada una se abre como tarjeta aparte cuando el equipo decida:

- Reorganizar los 6 módulos actuales y definir qué módulos nacen de cada uno.
- Definir dónde viven los temas que hoy faltan (residuos especiales y orgánicos), porque no coinciden con las 6 categorías de auditoría.
- Corregir lo que hoy dice el seed sobre Ecopuntos y recicladores (sección 2).
- Redactar los módulos nuevos (#519).
- La pantalla "¿Dónde llevo cada cosa?" (tarjeta 9), que puede usar directamente la tabla de la sección 5.

## 10. Límites de esta investigación

- **Videos:** solo se leyeron los títulos. Falta verlos para anotar qué dicen, la fecha y el canal. Eso solo puede hacerlo una persona.
- **Vigencia:** las normas se leyeron en normogramas (Gestor Normativo de la CRA, MinTIC, Cancillería), que son espejos y no el Diario Oficial. No se verificó el texto vigente en el Diario Oficial ni en el SUIN. En especial, el normograma no analiza la vigencia de la Resolución UAESP 701 de 2013, y no muestra cambios a las Resoluciones 371 de 2009, 316 de 2018, 1675 de 2013 y 1326 de 2017 (la ausencia de nota no prueba que sigan sin cambios).
- **No encontradas o sin acceso:** Acuerdo 417 de 2009 y Acuerdo 515 de 2012 del Concejo de Bogotá (el segundo devolvió 403), Resolución UAESP 799 de 2012 y Resolución 2238 de 2023 de la SDA.
- **No leídas:** Ley 1801 de 2016, Ley 2232 de 2022, CONPES 3874 de 2016 y los anexos de las Resoluciones 851 de 2022 y 1407 de 2018. Las tablas de metas de varias resoluciones son imágenes.
- **Superservicios y CRA:** no se leyeron sus propias páginas; su papel se tomó del Decreto 1381 de 2024.
- **Plegable del MADS:** se leyó, pero es antiguo (metadatos de 2014) y el PDF no trae fecha visible ni editorial.
- **Cifras:** las cantidades de puntos de recolección cambian con la fecha de cada página; por eso no se usan en la app.
- **Fechas de las páginas:** una es de 2014 (Ecolecta, ya no sirve para direcciones), otra de 2020 y otras de 2021 y 2022; las de 2026 son las más confiables.

## 11. Decisiones para conversar con el grupo

1. ¿Se adopta la opción B (fuentes oficiales y videos de creadores como apoyo)?
2. ¿Solo se aceptan videos de Marce y de entidades oficiales, o también de otros creadores?
3. ¿Se avisa a la creadora ahora o cuando el proyecto pase a producción?

## 12. Fuentes leídas

**Normas (texto oficial):**

- Resolución 2184 de 2019: https://cancilleria.gov.co/sites/default/files/Normograma/docs/resolucion_minambienteds_2184_2019.htm
- Resolución UAESP 701 de 2013: https://cancilleria.gov.co/sites/default/files/Normograma/docs/resolucion_uaesp_0701_2013.htm
- Resolución 851 de 2022: https://normograma.mintic.gov.co/mintic/compilacion/docs/resolucion_minambienteds_0851_2022.htm
- Resolución 316 de 2018: https://cancilleria.gov.co/sites/default/files/Normograma/docs/resolucion_minambienteds_0316_2018.htm
- Decreto 1381 de 2024: https://normas.cra.gov.co/Gestor/Docs/decreto_1381_2024.htm
- Resolución 371 de 2009: https://normas.cra.gov.co/Gestor/Docs/resolucion_minambientevdt_0371_2009.htm
- Resolución 1297 de 2010 (con nota de derogación): https://normas.cra.gov.co/gestor/docs/resolucion_minambientevdt_1297_2010.htm
- Resolución 799 de 2025 (baterías plomo-ácido): https://normas.cra.gov.co/Gestor/Docs/resolucion_minambienteds_0799_2025.htm
- Resolución 372 de 2009: https://normas.cra.gov.co/Gestor/Docs/resolucion_minambientevdt_0372_2009.htm
- Resolución 361 de 2011: https://normas.cra.gov.co/Gestor/Docs/resolucion_minambientevdt_0361_2011.htm
- Resolución 1675 de 2013: https://normas.cra.gov.co/Gestor/Docs/resolucion_minambienteds_1675_2013.htm
- Resolución 1326 de 2017: https://normas.cra.gov.co/Gestor/Docs/resolucion_minambienteds_1326_2017.htm
- Resolución 1407 de 2018: https://normas.cra.gov.co/Gestor/Docs/resolucion_minambienteds_1407_2018.htm
- Resolución 1342 de 2020: https://normas.cra.gov.co/Gestor/Docs/resolucion_minambienteds_1342_2020.htm
- Resolución 803 de 2024: https://normas.cra.gov.co/Gestor/Docs/resolucion_minambienteds_0803_2024.htm
- Ley 1259 de 2008 (espejo de la CRA, no el Diario Oficial): https://normas.cra.gov.co/Gestor/Docs/ley_1259_2008.htm
- Plegable de posconsumo del MADS (PDF): https://www.minambiente.gov.co/wp-content/uploads/2021/06/PLEGABLE_POSCONSUMO.pdf

**Entidades nacionales:**

- MADS, programas de posconsumo: https://www.minambiente.gov.co/asuntos-ambientales-sectorial-y-urbana/programas-pos-consumos/
- MADS, comunicado del código de colores (27 de diciembre de 2019): https://www.minambiente.gov.co/gobierno-unifica-el-codigo-de-colores-para-la-separacion-de-residuos-en-la-fuente-a-nivel-nacional/
- UAESP, aprovechamiento: https://www.uaesp.gov.co/aprovechamiento-residuos-solidos-bogota

**Bogotá:**

- Guía de posconsumo del Distrito (SDA, 13 de abril de 2026): https://bogota.gov.co/mi-ciudad/ambiente/guia-para-la-gestion-de-residuos-posconsumo-del-distrito-responsable
- Medicamentos (SDA, 11 de enero de 2021): https://bogota.gov.co/mi-ciudad/ambiente/como-y-donde-dejar-residuos-de-medicamentos-y-sus-empaques
- Aceite de cocina usado (4 de mayo de 2025): https://bogota.gov.co/mi-ciudad/habitat/como-disponer-correctamente-el-aceite-de-cocina-usado-en-bogota-2025
- Orgánicos y abono (UAESP, 11 de septiembre de 2022): https://bogota.gov.co/mi-ciudad/habitat/como-se-convierten-los-residuos-organicos-en-abono-en-bogota-video
- 10 mandamientos de cero desechos (SDA, 31 de marzo de 2026): https://bogota.gov.co/mi-ciudad/ambiente/10-mandamientos-para-una-bogota-con-cero-desechos
- Ecopuntos (3 de febrero de 2026): https://bogota.gov.co/mi-ciudad/habitat/como-funcionan-los-ecopunto-en-bogota-y-para-que-sirven
- Colores de bolsa (7 de febrero de 2026): https://bogota.gov.co/mi-ciudad/habitat/asi-puedes-separar-residuos-segun-el-color-de-las-bolsas-en-bogota
- Separación en casa (SDA, 5 de mayo de 2020): https://bogota.gov.co/mi-ciudad/ambiente/como-hacer-separacion-de-residuos-y-reciclar-desde-casa
- Ecolecta (25 de abril de 2014, página muy antigua): https://bogota.gov.co/mi-ciudad/ambiente/ecolecta-una-opcion-para-recoleccion-de-aparatos-electricos-y-electro

**Videos (solo títulos):** https://youtu.be/wK9ewkUtf6g, https://youtu.be/gYOwmj3-XqQ, https://youtu.be/LMZ6BAj1DF8 y https://youtu.be/4jETI2NcdrI
