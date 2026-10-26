# Investigación — Tipos de puntos de acopio en Bogotá, qué recibe cada uno y contacto de las ECA

<!--
  ¿Qué? Investigación del Issue #460: qué tipos de lugar existen en Bogotá para
        entregar material reciclable o residuos aprovechables, qué recibe cada
        uno, quién lo opera, y cuál es el contacto real de las 9 ECA que carga
        el directorio.
  ¿Para qué? Que el equipo y el público de la feria no confundan una ECA con un
             Ecopunto o una chatarrería, y que la tarjeta de implementación de
             categorías parta de datos con fuente y no de suposiciones.
  ¿Impacto? Dos hallazgos cambian lo que la aplicación afirma hoy (ver
            "Hallazgos que cambian lo que ya está en la aplicación"). Ningún dato
            de este documento es de memoria: cada uno lleva su fuente y fecha, y
            lo que no se pudo confirmar está marcado como tal.
-->

**Issue:** [#460](https://github.com/Yilmerher12/proyecto-verdeapp-adso/issues/460)
**Fecha de consulta de todas las fuentes:** 2026-10-21
**Rama:** `docs/investigacion-puntos-de-acopio-bogota`

---

## Resumen en cinco líneas

1. Una **ECA** es una instalación formal con requisitos de área y de operación fijados por el POT (Decreto 555 de 2021, art. 199); la UAESP lleva un **inventario oficial** de ECA y de bodegas privadas de reciclaje.
2. Una **chatarrería** no es una ECA: en ese inventario aparece clasificada como **"BODEGA"** (privada), y el Decreto 203 de 2022 ordena trasladar progresivamente su actividad.
3. Un **Ecopunto** es otra cosa: caja gratuita de la UAESP, rotativa por localidad, para **escombros y voluminosos** (muebles, colchones, tejas), no para material reciclable de rutina.
4. **No encontré teléfono propio de ninguna de las 9 ECA** en ninguna fuente oficial. Lo único institucional y vigente de la UAESP es su línea general (ver pregunta 6).
5. **Las "9 ECA" no son todas las de Bogotá**: son las de un dataset de 2020. El inventario oficial lista cientos (ver el primer hallazgo).

---

## Hallazgos que cambian lo que ya está en la aplicación

### Hallazgo 1 — "Bogotá solo tiene ECA en 6 de sus 20 localidades" no se sostiene

El panel "¿Qué es una ECA?" (`infoPuntos.fuenteTexto`, `fe/src/locales/es/translation.json`) dice que Bogotá solo tiene ECA registrada en 6 de 20 localidades. Eso es cierto **solo para el dataset de Datos Abiertos de marzo de 2020** (9 filas), no para la ciudad.

El **Listado de Inventario inicial de ECA y Bodegas Privadas de Reciclaje** publicado por la UAESP ([PDF](https://www.uaesp.gov.co/sites/default/files/archivos-adjuntos/Listado_Inventario_inicial_ECA_y_Bodegas_PR.pdf)) tiene **3.108 establecimientos** (conteo propio sobre el texto del PDF):

| Tipo | Activa | Inactiva |
| --- | ---: | ---: |
| ECA | 762 | 636 |
| Bodega (privada) | 684 | 1.026 |

Con al menos una ECA **activa** hay **18 de las 20 localidades** (no tienen: La Candelaria y Sumapaz). Las más pobladas de ECA activas: Kennedy (169), Bosa (100), Suba (85), Engativá (56), Ciudad Bolívar (56).

> **Límites de este dato:** es el inventario **inicial** (previo a la verificación de la Resolución 137 de 2023) y el PDF no trae fecha. La Resolución 137 de 2023 lo consolida como "inventario final", pero su considerando dice que se identificaron "36" ECA activas mientras su anexo visible llega por lo menos a 218 filas todas "ECA" ([Resolución 137 de 2023](https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=153864&dt=S)). **No pude resolver esa diferencia** (el texto se corta) y no tomo ninguna de las dos cifras como definitiva. Lo que sí es sólido: hay muchas más de 9 ECA registradas por la UAESP.

### Hallazgo 2 — Solo 2 de las 9 ECA del directorio coinciden con una ECA activa del inventario

Cruce por coordenadas (aproximado, a unos 100 m) entre las 9 ECA de [`fuente-datos-puntos-acopio-eca.md`](fuente-datos-puntos-acopio-eca.md) y el inventario inicial:

| ECA del directorio | Qué aparece en el inventario en esas coordenadas |
| --- | --- |
| Engativá | **"ECA ENGATIVA"**, tipo ECA, 1.320 m², **ACTIVA** |
| Puente Aranda 2 | **"ECA4"**, tipo ECA, 1.000 m², **ACTIVA** |
| Usaquén I | "ECA TOBERIN" (ECA, **inactiva**) y una bodega inactiva |
| Fontibón (Montevideo) | "RECICLADORA EL SAR" (ECA, **inactiva**) |
| Mártires | "GUAVIO" (ECA, **inactiva**) y una bodega inactiva |
| Puente Aranda 1 | Solo una bodega inactiva cerca ("MUNDO PRIMAS") |
| Kennedy, Usaquén II, Engativá 2 (Las Ferias) | Sin coincidencia |

**Cómo leerlo:** no significa que esas ECA hayan cerrado. El dataset es de 2020, el inventario de otra fecha, y el Decreto 203 de 2022 obligó a varias a reubicarse. Significa que **hoy no se puede afirmar** que las 9 direcciones sigan operando. Hay que confirmarlo con la UAESP antes de la feria (ver tarjeta 3).

---

## Qué se investigó y con qué límites

**Fuentes usadas (todas consultadas el 2026-10-21):**

- UAESP: inventario inicial de ECA y bodegas (PDF) y Resolución 137 de 2023 (vía SISJUR, Alcaldía de Bogotá).
- Alcaldía de Bogotá (`bogota.gov.co`): notas sobre Ecopuntos, Centros de Cuidado al Reciclador, puntos de recolección de residuos especiales y Decreto 203 de 2022.
- Resoluciones UAESP 119 de 2013 y de 2015 sobre remuneración a recicladores (vistas a través de resultados de búsqueda; ver límites).

**Lo que NO pude hacer y por qué (para que nadie suponga que se hizo):**

| Pendiente | Motivo |
| --- | --- |
| Página oficial de ECA de la UAESP (`uaesp.gov.co/content/centros-pesaje-estaciones-clasificacion-y-aprovechamiento-eca`) | El sitio devolvió **403** a la herramienta de lectura. Solo conozco su existencia por un resultado de búsqueda, que menciona un archivo "ecas actuales.xlsx" que **no pude abrir**. |
| Texto del Decreto 203 de 2022 | El PDF de la Secretaría de Planeación es un **escaneo** sin texto; usé el resumen oficial de la Alcaldía, que es breve. |
| Dataset "Aprovechamiento ECAS" de Datos Abiertos | La URL que cita `fuente-datos-puntos-acopio-eca.md` hoy responde **404**; no pude confirmar su fecha ni si fue actualizado. |
| Conversar con recicladores de oficio o personas de una ECA | **No realizado.** Es lo que el issue pide para validar la teoría; queda como tarea humana del equipo. |
| Cifra de 1.154 ECA en Bogotá (Superservicios, 2021) | Aparece en un resultado de búsqueda sobre una infografía de MinVivienda cuyo PDF no pude leer. **No la uso.** |

---

## Tabla comparativa de tipos de punto

| Tipo | Qué es | Qué recibe | Qué NO recibe | Quién entrega | Quién opera / regula | Fuente |
| --- | --- | --- | --- | --- | --- | --- |
| **ECA** (Estación de Clasificación y Aprovechamiento) | Instalación "técnicamente diseñada" para recibir, clasificar, pesar, compactar y almacenar temporalmente residuos aprovechables. Tres tipos por área del predio: 1 (500–999 m²), 2 (1.000–2.999 m²), 3 (3.000 m² o más). | Residuos aprovechables (papel, cartón, plástico, vidrio, metal) | No confirmado en las fuentes | Recicladores de oficio inscritos reciben pago por kilos pesados en los centros de pesaje (esquema 2013–2015). **Si un ciudadano común puede entregar: no confirmado.** | Inventario y vigilancia: UAESP. Norma de ubicación y área: POT (Decreto 555 de 2021, art. 199) y Decreto 203 de 2022. | [Res. 137/2023](https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=153864&dt=S) (cita el art. 199) |
| **Bodega privada de reciclaje** (incluye lo que se llama chatarrería o depósito de reciclaje) | Establecimiento privado que la UAESP clasifica como "BODEGA" en su inventario, aparte de las ECA. Sus nombres incluyen "CHATARRERIA", "RECICLADORA", "DEPOSITO". | No confirmado con fuente oficial | No confirmado | No confirmado | Privados. El Decreto 203 de 2022 fija el "traslado progresivo de la actividad económica" de estas bodegas. | [Inventario UAESP](https://www.uaesp.gov.co/sites/default/files/archivos-adjuntos/Listado_Inventario_inicial_ECA_y_Bodegas_PR.pdf); [Decreto 203, nota oficial](https://bogota.gov.co/mi-ciudad/gestion-juridica/decreto-203-cumplimiento-de-acuerdos-en-cabildo-abierto-sobre-el-pot) |
| **Ecopunto** | Caja o punto de la UAESP que cambia de localidad cada semana; cada punto vuelve a la misma zona cada 4 semanas. | Escombros, residuos de construcción y demolición, y voluminosos: colchones, madera, muebles, tejas | Residuos especiales de posconsumo, como electrodomésticos | La nota no restringe quién puede llevar | UAESP. Gratuito. Horario: 8:00 a.m. a 12:00 m. o hasta que se llene | [bogota.gov.co, 12-oct-2024](https://bogota.gov.co/en/node/225693); [19-jun-2026](https://bogota.gov.co/mi-ciudad/habitat/ecopuntos-en-bogota-del-22-al-26-de-junio-del-2026-ubicaciones-y-mas) |
| **Centro de Cuidado al Reciclador (CCR)** | Espacio para que el reciclador separe y organice el material recogido antes de seguir su ruta o ir a una ECA. | Material aprovechable: plástico, papel, cartón, metal, vidrio (de recicladores) | No aplica | **Solo recicladores de oficio**; acceso gratuito | UAESP y entidades distritales (que no participan en la venta del material). Hay en Kennedy, Barrios Unidos, Usaquén, Suba y dos sedes de Los Mártires. | [bogota.gov.co, 14-jul-2026](https://bogota.gov.co/mi-ciudad/habitat/conoce-los-centros-de-cuidado-al-reciclador-en-bogota) |
| **Punto de recolección de residuos especiales o posconsumo** | Puntos de la Secretaría Distrital de Ambiente (SDA) para residuos peligrosos o de manejo diferenciado. | Pilas, bombillos, electrodomésticos y aparatos eléctricos, llantas, aceite vegetal, medicamentos de uso humano y animal | Material aprovechable de rutina | Ciudadanos (la nota no restringe) | SDA lista **1.046 puntos** (nota de 2021); se consultan en el Visor Geográfico Ambiental | [bogota.gov.co, 21-abr-2021](https://bogota.gov.co/mi-ciudad/ambiente/donde-puedo-reciclar-los-residuos-peligrosos-en-bogota) |
| **Punto limpio** | **No encontré una definición oficial de este término en Bogotá.** Lo más cercano son los "eco puntos" de la estrategia Juntos Limpiamos Bogotá, cerca de puntos críticos de basuras. | — | — | — | — | Búsquedas sobre "puntos limpios Bogotá": sin resultado oficial |

> **Sobre el Ecopunto y el "punto limpio":** el tema educativo del seed ("Puntos limpios y Ecopuntos") los junta. Con las fuentes consultadas, "punto limpio" no es una categoría oficial distinta; lo prudente es no crearla como categoría propia hasta que alguien la confirme con la UAESP o la SDA.

---

## Respuesta a las 8 preguntas del issue

### 1. ¿Qué tipos de punto existen?

ECA, bodega privada de reciclaje (donde entran las chatarrerías), Ecopunto, Centro de Cuidado al Reciclador (CCR) y punto de recolección de residuos especiales o posconsumo. "Punto limpio" no aparece como tipo oficial en las fuentes consultadas (ver tabla).

### 2. ¿Qué materiales recibe cada tipo y cuáles no?

Ver tabla. **Lo que está confirmado:** Ecopunto (escombros y voluminosos; excluye posconsumo como electrodomésticos), posconsumo (pilas, bombillos, electrodomésticos, llantas, aceite, medicamentos) y CCR (material aprovechable de recicladores). **Lo que no pude confirmar:** qué materiales acepta o rechaza una ECA y una bodega privada.

### 3. ¿Quién puede entregar y qué recibe a cambio?

- **ECA:** las resoluciones UAESP de 2013 a 2015 que encontré describen el pago a los **recicladores de oficio inscritos** por los kilos pesados en los centros de pesaje, con bancarización previa. Son normas **de hace 11 a 13 años**; no pude comprobar que sigan siendo el esquema vigente. **No encontré** si un ciudadano común puede entregar material en una ECA.
- **Ecopunto:** gratuito; las notas consultadas no restringen quién lleva el material.
- **CCR:** solo recicladores de oficio, gratuito.
- **Posconsumo:** las notas consultadas no restringen quién entrega ni hablan de pagos.
- **Bodega privada:** sin fuente oficial. **No afirmo** que "cualquiera vende" ni que se enfoquen en metal; `fuente-datos-puntos-acopio-eca.md` lo dice, pero no lo pude respaldar.

### 4. ¿Quién opera y regula cada tipo?

Ver tabla. En resumen: la UAESP lleva el inventario de ECA y bodegas, opera los Ecopuntos y participa en los CCR; la SDA coordina los puntos posconsumo; la ubicación y el área de ECA y bodegas las fija el POT (Decreto 555 de 2021) y el Decreto 203 de 2022.

### 5. ¿Qué tipos le sirven a cada rol de VerdeApp?

*Este punto es análisis del equipo a partir de la tabla, no un dato de fuente oficial.*

| Rol | Le sirve | Por qué |
| --- | --- | --- |
| **Reciclador** | ECA y CCR | La ECA es el destino de sus rutas y el CCR es un espacio exclusivo para él. |
| **Residente** | Ecopunto y posconsumo | Son los lugares donde un hogar puede entregar sin intermediarios lo que no va en la bolsa blanca (voluminosos, pilas, bombillos, medicamentos). Que pueda llevar material reciclable de rutina a una ECA no está confirmado. |
| **Administrador de Conjunto** | Ecopunto y posconsumo, y la ECA como dato informativo | Puede organizar jornadas de entrega de voluminosos o pilas; la ECA le sirve para saber a dónde llevan el material los recicladores de su conjunto. |

### 6. Contacto de las 9 ECA y qué hacer con las que no se encuentren

**Resultado: no encontré teléfono ni encargado de ninguna de las 9 ECA.** Ni el inventario de la UAESP, ni la Resolución 137 de 2023, ni las notas de la Alcaldía publican datos de contacto por ECA (el inventario trae nombre, tipo, área, coordenadas, localidad y estado).

| ECA del directorio | Teléfono | Encargado | Estado de la búsqueda (2026-10-21) |
| --- | --- | --- | --- |
| ECA Kennedy | No encontrado | No encontrado | Sin coincidencia en el inventario |
| ECA Usaquén I | No encontrado | No encontrado | Coincide con una ECA inactiva |
| ECA Usaquén II | No encontrado | No encontrado | Sin coincidencia en el inventario |
| ECA Engativá | No encontrado | No encontrado | Coincide con una ECA activa |
| ECA Engativá 2 (Las Ferias) | No encontrado | No encontrado | Sin coincidencia en el inventario |
| ECA Fontibón (Montevideo) | No encontrado | No encontrado | Coincide con una ECA inactiva |
| ECA Mártires | No encontrado | No encontrado | Coincide con una ECA inactiva |
| ECA Puente Aranda 1 | No encontrado | No encontrado | Sin ECA en el inventario en ese punto |
| ECA Puente Aranda 2 | No encontrado | No encontrado | Coincide con una ECA activa |

**Único contacto institucional publicado:** la línea general de la UAESP, **601 3580400** ([bogota.gov.co, 18-ene-2022](https://bogota.gov.co/servicios/servicios-del-distrito/cuales-son-los-nuevos-horarios-de-atencion-presencial-de-la-uaesp)). Es un dato **de hace casi 5 años**: debe confirmarse en `uaesp.gov.co` antes de mostrarlo. **No es el teléfono de ninguna ECA**; no debe presentarse como tal.

**Recomendación:**

1. **No volver el teléfono obligatorio todavía.** Hoy el dato real no existe para ninguna de las 9; un campo obligatorio obligaría a inventarlo, que es exactamente lo que el issue prohíbe. Volverlo obligatorio solo cuando exista una fuente.
2. Mostrar un texto fijo ("Sin teléfono publicado; consulta a la UAESP") con la línea de la UAESP **ya verificada**, en vez del actual "Sin teléfono registrado".
3. Que una persona del equipo **pida los contactos a la UAESP por sus canales oficiales** (fuera del alcance de esta tarjeta, que no incluye contactar a nadie) y, de paso, confirme cuáles de las 9 siguen operando.

### 7. Categorías propuestas (lista cerrada) y texto de aclaración

Propuesta para una columna `tipo` del punto, con estos valores y su texto corto (cada uno dice también **qué no es**):

| Valor | Etiqueta | Texto de aclaración |
| --- | --- | --- |
| `ECA` | Estación de Clasificación y Aprovechamiento | Lugar formal donde se pesa y clasifica el material aprovechable que recogen los recicladores de oficio. **No es** un Ecopunto ni una chatarrería. |
| `CCR` | Centro de Cuidado al Reciclador | Espacio gratuito, solo para recicladores de oficio, donde separan y organizan su material antes de llevarlo a una ECA. **No es** un lugar de venta al público. |
| `ECOPUNTO` | Ecopunto | Caja gratuita de la UAESP para escombros y objetos voluminosos (muebles, colchones, tejas). Cambia de localidad cada semana. **No recibe** material reciclable de rutina ni electrodomésticos. |
| `POSCONSUMO` | Punto de residuos especiales | Punto de la Secretaría de Ambiente para pilas, bombillos, llantas, aceite, medicamentos y aparatos eléctricos. **No recibe** papel, cartón, plástico ni vidrio. |
| `BODEGA_PRIVADA` | Bodega privada de reciclaje | Negocio privado, distinto de una ECA y no operado por la UAESP. **Solo si el equipo decide incluirlas** (ver pregunta 8). |

### 8. ¿Qué puntos entran al directorio?

**Recomendación: entran ECA y, más adelante, CCR. Ecopuntos y puntos posconsumo se muestran como información, no como puntos fijos. Las bodegas privadas (chatarrerías) no entran.**

Razones, cada una con su fuente:

| Alternativa | Decisión | Por qué |
| --- | --- | --- |
| **ECA** como punto del directorio | **Sí** | Es el destino real de las rutas del reciclador; la UAESP las inventaría y distingue de las bodegas. |
| **CCR** | **Sí, en una segunda etapa** | Es un tipo de punto estable y exclusivo del reciclador; hoy no hay dirección ni teléfono publicado, así que primero hay que obtenerlos. |
| **Ecopunto** como punto fijo | **No** | Cambian de lugar cada semana (la ubicación no es estable). Mejor un texto con el enlace al cronograma de la UAESP. |
| **Posconsumo** como punto fijo | **No** | La SDA ya los publica en su visor (1.046 en 2021); copiarlos duplicaría un dato que cambia. Mejor enlazar al visor. |
| **Bodega privada / chatarrería** como categoría | **No** | (1) El Decreto 203 de 2022 manda trasladar su actividad: las direcciones son inestables. (2) En el inventario 1.026 de 1.710 bodegas (**60 %**) figuran inactivas. (3) No encontré fuente oficial de qué reciben ni a quién pagan. (4) Anunciar negocios privados en un directorio público es una decisión de producto con riesgo para el proyecto en la feria. |
| **Cargar todas las ECA activas** (cientos) | **No de golpe** | Sin teléfono ni verificación, el volumen crearía datos sin respaldo. Mejor por etapas, empezando por confirmar las 9 actuales. |

---

## Tarjetas de implementación que nacerían de esto

| # | Título propuesto | Depende de |
| --- | --- | --- |
| 1 | **Corregir el texto "solo 6 de 20 localidades" y el panel "¿Qué es una ECA?"** para que no afirme algo que el inventario oficial desmiente (frontend y textos es/en). Es urgente: se ve en la feria. | Ninguna |
| 2 | **Agregar la categoría (`tipo`) a los puntos de acopio**: migración, seed, filtro y textos de aclaración, con la lista de la pregunta 7 | Decisión de las categorías |
| 3 | **Confirmar con la UAESP cuáles de las 9 ECA siguen operando y obtener sus contactos** (tarea humana, canales oficiales) | Ninguna |
| 4 | **Ajustar el campo teléfono** (texto de respaldo con la línea de la UAESP ya verificada; obligatorio solo cuando exista dato real) | Tarjeta 3 |
| 5 | **Guía "¿Dónde llevo cada cosa?"** (ECA, Ecopunto, posconsumo, CCR) con enlaces al cronograma de Ecopuntos y al visor de la SDA | Tarjeta 2 |
| 6 | **Importar las ECA activas del inventario UAESP por etapas**, previa verificación del archivo oficial y de cada fila | Tarjetas 2 y 3 |

---

## Documentación actualizada en esta rama

- Este documento.
- [`fuente-datos-puntos-acopio-eca.md`](fuente-datos-puntos-acopio-eca.md): se agregó la sección "Actualización 2026-10-21" con el inventario oficial, el cruce de las 9 ECA y la búsqueda de contactos; se corrigió la línea de "pendiente" que ya estaba resuelta.
- `RQF-011`, `RQF-005` y las HU-006, HU-015 y HU-016 **no se tocaron**: describen el comportamiento actual (teléfono opcional, sin categorías) y siguen siendo ciertas. Cambian cuando se implementen las tarjetas 2 y 4.
