# Fuente de datos — Puntos de acopio (ECA)

<!--
  ¿Qué? Registro de dónde salieron los 9 puntos de acopio reales que
        reemplazaron los 40 inventados en seed_data.sql.
  ¿Para qué? Que cualquiera (compañero, profesor, o nosotros mismos en
             unos meses) pueda verificar que el dato es real, ir a la
             fuente original, y entender por qué solo hay 6 localidades
             cubiertas — sin tener que confiar solo en nuestra palabra.
  ¿Impacto? Antes el comentario del seed decía "fuente: UAESP" y era
            mentira — estos 9 sí se pueden corroborar con el link de abajo.
-->

**Fecha de consulta:** 2026-08-26

## ¿Qué son las ECA?

**ECA = Estación de Clasificación y Aprovechamiento.** Es el lugar formal,
regulado por la UAESP (Unidad Administrativa Especial de Servicios
Públicos de Bogotá), donde los **recicladores de oficio organizados**
(agrupados en asociaciones, como la "ASOREC BOGOTA" de nuestros datos de
prueba) llevan el material que recogieron en sus rutas por conjuntos
residenciales y negocios, para que se **pese y clasifique**. De ese peso
sale el pago que reciben dentro del esquema público de aseo de la ciudad.

No es lo mismo que una chatarrería (negocio privado e informal, enfocado
sobre todo en metal, donde cualquiera vende) ni que los "Ecopuntos" de la
UAESP (esos son para escombros de construcción y muebles viejos, un
programa completamente distinto). Las ECA son el destino real de las
rutas de un reciclador de oficio — el concepto que corresponde a VerdeApp.

## Fuente

- **Portal:** Datos Abiertos Bogotá (UAESP)
- **Dataset:** "Aprovechamiento ECAS. Bogotá D.C"
- **Página del dataset:** https://datosabiertos.bogota.gov.co/dataset/data_set_aprovechamiento_ecas
- **Archivo descargado:** `ecas.csv` (recurso "MARZO 2020", el más reciente disponible)
- **URL directa de descarga:** https://datosabiertos.bogota.gov.co/dataset/dbe40fff-eaf9-4229-a183-e1fffe152455/resource/a7d5afed-3dd1-4af8-a47f-8ffc2ab8e699/download/ecas.csv
- **Licencia:** Creative Commons Attribution 4.0

## Datos crudos (tal cual se descargaron)

El CSV original viene con `;` como separador, codificación con acentos
rotos, y las coordenadas con formato inconsistente (puntos como separador
de miles en vez de coma decimal). Estas son las 9 filas de datos reales
(de un archivo con ~30 filas vacías al final):

| Nombre de la Bodega       | Localidad      | Dirección                    | Latitud    | Longitud    |
|----------------------------|----------------|-------------------------------|------------|-------------|
| Kennedy                    | Kennedy        | Carrera 84 Número 11A - 34    | 4.702475   | -74.100802  |
| Usaquen I                  | Usaquén        | Carrera 21 Número 164-82      | 4.746127   | -74.044330  |
| Usaquen II                 | Usaquén        | Carrera 18 Número 164-32      | 4.745570   | -74.041019  |
| Engativa                   | Engativa       | Calle 80c Número 92-44        | 4.706658   | -74.105517  |
| Engativa 2 (Las Ferias)    | Engativa       | Carrera 69k Número 79-49      | 4.688751   | -74.083777  |
| Fontibón (Montevideo)      | Fontibón       | Calle 17 a Número 69F-26      | 4.648038   | -74.124241  |
| Mártires                   | Mártires       | Calle 8 Número 26-80          | 4.606673   | -74.093227  |
| Puente Aranda 1            | Puente aranda  | Carrera 36 Número 19-53       | 4.623344   | -74.092813  |
| Puente Aranda 2            | Puente aranda  | Carrera 65B Número 17-80      | 4.638516   | -74.113242  |

Las coordenadas de latitud/longitud están arriba ya corregidas (el archivo
original las traía como `4.702.475`, con el punto de miles mal puesto en
vez de la coma decimal). **No se guardaron en la base de datos** — la
tabla `puntos_acopios` no tiene columnas de coordenadas todavía, y el
directorio no muestra mapa, solo texto. Quedan aquí documentadas por si en
el futuro se agrega un mapa.

## Qué se hizo con esto

- Se reemplazaron los 40 registros inventados de `seed_data.sql` por estos
  9, mapeados a su `id_localidad` real (ver `docs/gestion-proyecto/` o la
  tabla `localidades` para la numeración).
- Las 14 localidades sin ECA en este dataset quedan sin ningún punto de
  acopio en el directorio. No significa que no tengan ECA: es lo que
  trae el dataset de 2020 (ver la actualización de abajo).
- El aviso visible en el Directorio ya existe (panel "¿Qué es una ECA?",
  `infoPuntos` en `fe/src/locales/{es,en}/translation.json`). Desde el
  issue #499 aclara que los puntos son los de este dataset de marzo de 2020
  y no todas las ECA de la ciudad, y su enlace "Ver fuente" lleva al
  inventario de la UAESP (el enlace al dataset de Datos Abiertos daba 404).

---

## Actualización 2026-10-21 (issue #460)

> Análisis completo, fuentes y límites en
> [`investigacion-tipos-puntos-acopio.md`](investigacion-tipos-puntos-acopio.md).

**Este dataset no es el universo de ECA de Bogotá.** La UAESP publica un
*Listado de Inventario inicial de ECA y Bodegas Privadas de Reciclaje*
([PDF](https://www.uaesp.gov.co/sites/default/files/archivos-adjuntos/Listado_Inventario_inicial_ECA_y_Bodegas_PR.pdf))
con 3.108 establecimientos, de los cuales 762 son ECA activas y 636 ECA
inactivas, y 684 bodegas privadas activas y 1.026 inactivas (conteo propio
sobre el texto del PDF, sin fecha de publicación). Hay ECA activas en 18 de las
20 localidades. Las 9 filas de arriba son solo las que traía este dataset de
marzo de 2020.

**Estado de las 9 ECA frente a ese inventario** (cruce por coordenadas, a unos
100 m de aproximación): Engativá y Puente Aranda 2 coinciden con una ECA
**activa**; Usaquén I, Fontibón y Mártires coinciden con una ECA **inactiva**;
Kennedy, Usaquén II, Engativá 2 y Puente Aranda 1 no tienen coincidencia. No
significa que hayan cerrado (el Decreto 203 de 2022 obligó a reubicar a varias):
significa que no se puede afirmar hoy que sigan operando.

**Contacto: no encontrado** para ninguna de las 9. El inventario trae nombre,
tipo, área, coordenadas, localidad y estado, pero ningún teléfono ni encargado.
El único contacto institucional hallado es la línea general de la UAESP,
601 3580400 ([bogota.gov.co, 18-ene-2022](https://bogota.gov.co/servicios/servicios-del-distrito/cuales-son-los-nuevos-horarios-de-atencion-presencial-de-la-uaesp)),
que debe confirmarse antes de mostrarse y no es el teléfono de ninguna ECA.

**Enlaces que dejaron de funcionar o no se pudieron leer (2026-10-21):** la
página del dataset de Datos Abiertos (arriba) responde 404; la página de ECA de
la UAESP responde 403 a la herramienta de lectura.

---

## Actualización 2026-10-28 (prototipo de la ficha)

Detalle en [`prototipo-ficha-punto-acopio.md`](prototipo-ficha-punto-acopio.md).

- **El inventario de la UAESP sí tiene fecha:** el PDF se imprimió el 21 de
  diciembre de 2022 (metadatos). Son 44 páginas con ítem, nombre, tipo, área,
  latitud, longitud, localidad y funcionamiento; **sin dirección, teléfono ni operador**.
- **La página de ECA de la UAESP** (`.../content/centros-pesaje-estaciones-clasificacion-y-aprovechamiento-eca`)
  responde "Acceso denegado" también en un navegador común, no solo a la herramienta de lectura.
- **Registro de ECA de la Superservicios** (Datos Abiertos, `datos.gov.co`, código `y97c-tfd9`):
  nacional, sin dirección ni coordenadas, con la empresa que opera cada ECA y su estado
  (para Bogotá, 1.110 en operación y 802 inactivas, de 520 empresas, casi todas asociaciones de recicladores).
  Sirve para saber quién opera, no para ubicar el punto.
- **Línea de la UAESP confirmada** en el pie de `uaesp.gov.co`: 601 3580400 (extensión 2, atención a recicladores y aprovechamiento).
- **Siguiente paso:** una petición a la UAESP (Bogotá Te Escucha) pidiendo el listado actualizado
  con dirección, contacto y operador; hasta que responda, las 9 ECA siguen "por confirmar".
  **Hecho:** la UAESP respondió el 2026-11-10, ver la actualización de abajo.

---

## Actualización 2026-11-13 (respuesta de la UAESP, issue #500)

<!--
  ¿Qué? Registro de lo que respondió la UAESP a las dos peticiones (radicados
        20267000840922 y 20267000856602) y de lo que NO entregó.
  ¿Para qué? Que el equipo sepa qué dato es oficial, cuál falta y bajo qué
             condiciones se puede usar, antes de cargar las ECA (#664).
  ¿Impacto? Reemplaza "por confirmar" por un cruce documentado de las 9 ECA y
            deja escrita la licencia de uso. No cambia código ni base de datos.
-->

**Oficio:** radicado UAESP 20265000341921, del 2026-11-10, firmado por la Subdirectora
de Aprovechamiento. Responde a los radicados 20267000856602 y 20267000840922. Trae un
anexo, el Excel "Inventario 698 ECA". El oficio trae datos personales de quien hizo la
petición, así que **no se guarda en el repositorio**: solo se cita su número.

### Qué entregó

- **Inventario de ECA** enmarcado en la **Resolución 698 de 2023**, vigente a la fecha
  del oficio. Un Excel con **799 ECA** en 18 de las 20 localidades (no hay ninguna en
  Chapinero ni en Sumapaz). Columnas: número en la Resolución 698, organización de
  recicladores, nombre de la ECA, latitud, longitud, dirección parametrizada,
  localidad y correo de contacto.
- **Todas las filas tienen** coordenadas, dirección y localidad. El correo falta en
  259 filas. La organización dice "NO APLICA" en 76 y está vacía en 26.
- **Calidad de los datos:** 27 direcciones traen dos direcciones separadas por salto de
  línea, 2 pares de coordenadas se repiten y los nombres son muy genéricos ("ECA" 80
  veces, "ECA PRINCIPAL" 44, "ECA 1" 20). El nombre solo no identifica una ECA: hay que
  usar la dirección.
- **Material que reciben:** papel, cartón, plástico, vidrio, metales, envases multicapa,
  textiles y demás materiales aprovechables.

### Qué NO entregó

El Excel **no trae** teléfono, horario, estado de funcionamiento ni fecha de corte. El
oficio dice que el horario lo define cada organización operadora y que el inventario es
"la información disponible en la entidad". **"Vigente" quiere decir registrada en el
acto administrativo; la UAESP no afirma que cada ECA esté abierta hoy.** En la app se
escribe "inventario vigente de la UAESP", nunca "abierta hoy". Teléfono y horario solo
puede darlos cada organización operadora.

### Las 9 ECA de 2020 frente al inventario nuevo

La UAESP no dio el estado de cada una: pidió cruzarlas con el Excel y dijo que lo que
no aparece **no hace parte del inventario vigente** ni registra estado de
funcionamiento. El cruce se hizo por dirección y por distancia entre coordenadas.

| ECA de 2020 | En el inventario nuevo | Cómo se comparó |
| --- | --- | --- |
| Engativá | **Aparece**, "ECA ENGATIVÁ", Calle 80 C # 92 - 44 | Misma dirección, a 20 m |
| Puente Aranda 2 | **Aparece**, "ECA4", Carrera 65 B # 17 - 80 | Misma dirección, a 18 m |
| Usaquén II | **Aparece**, "ECA PRINCIPAL" de la asociación MyM Universal, Carrera 18 # 164 - 32 | Misma dirección |
| Puente Aranda 1 | **Dudosa**: "ECA CENTRO 2", Calle 19 B # 35 - 64 | Otra dirección, a 119 m |
| Kennedy | **No aparece** | La ECA más cercana está a 702 m y es otra |
| Usaquén I | **No aparece** | La más cercana está a 258 m y es otra |
| Engativá 2 (Las Ferias) | **No aparece** | La más cercana está a 268 m y es otra |
| Fontibón (Montevideo) | **No aparece** | La más cercana está a 1.034 m |
| Mártires | **No aparece** | La más cercana está a 397 m y es otra |

Una dirección escrita distinto podría esconder alguna de las que no aparecen. Por eso
la tabla dice "no aparece", no "cerró". El cruce de 2022 (en el apartado de arriba) daba
otro resultado porque usaba el inventario inicial, que es de diciembre de 2022.

### Preguntas que respondió

- **¿Un ciudadano puede llevar material a una ECA?** Sí, cualquier ciudadano puede
  entregar residuos aprovechables directamente, atendiendo los horarios, protocolos y
  condiciones de la organización que la opera. Para un conjunto residencial, la UAESP
  recomienda que la administración contacte a una organización de recicladores de
  oficio (por localidad o área de influencia); frecuencia, horarios y volúmenes se
  acuerdan entre la organización y el conjunto.
- **Ecopuntos:** la programación se publica de forma permanente en
  https://www.uaesp.gov.co/ecopuntos. El oficio solo da ese enlace, no un conjunto de
  datos abiertos.
- **Canal de actualización:** el inventario cambia por un nuevo acto administrativo.
  Consultar a uaesp@uaesp.gov.co, preferiblemente una vez al año.

### Licencia y atribución

La UAESP autoriza **usar y citar** la información pública entregada, con estas
condiciones:

- Nombrar expresamente a la UAESP como fuente.
- No alterar los datos: se conserva su contenido, contexto y finalidad.
- Cumplir la Ley 1712 de 2014 y las normas de protección de datos personales. Los
  correos del Excel son de organizaciones, y su uso se limita a lo que el proyecto
  necesita.
- Uso no comercial. La autorización no cede derechos sobre la base de datos.

Texto de atribución sugerido: "Fuente: Unidad Administrativa Especial de Servicios
Públicos (UAESP), inventario de Estaciones de Clasificación y Aprovechamiento,
Resolución 698 de 2023, entregado en noviembre de 2026."

### Teléfono y contacto

La UAESP no tiene teléfono ni encargado por ECA. La única vía de contacto es el correo
de cada organización (540 de las 799 filas lo traen). Si el equipo quiere teléfono y
horario, hay que pedirlos a las organizaciones; no es obligatorio para las tarjetas
#664, #665 y #666. La línea general de la UAESP (601 3580400, extensión 2) sigue siendo
el texto de respaldo y no es el teléfono de ninguna ECA.

### Cómo se cargó (issue #664)

- **CSV limpio** en `be/app/data/eca_inventario_uaesp.csv` (799 filas, sin correos). Los datos de la UAESP **no se cambiaron**: solo se quitaron espacios sobrantes, "NO APLICA" y las organizaciones vacías pasaron a "sin organización", y las 27 filas con dos direcciones quedaron con las dos separadas por " / ". Los nombres genéricos ("ECA", "ECA PRINCIPAL") se dejaron tal cual; la tabla muestra la organización debajo del nombre para distinguirlos.
- **Número de la Resolución 698 repetido:** el 105 y el 605 aparecen cada uno en dos filas (dos organizaciones en la misma bodega, con las mismas coordenadas). Para que `numero_resolucion` sea único, la segunda fila lleva `-2` (`105-2` y `605-2`).
- **Correos en un archivo aparte:** 540 de las 799 filas tienen correo. Van en `be/app/data/eca_correos_uaesp.csv`, que **no se sube al repositorio** porque es público y algunos son direcciones personales (Gmail, Yahoo); está en `.gitignore`, como el `.env`, y el equipo se lo pasa por otro medio. Sin ese archivo el seed funciona igual, sin correos.
- **Las 9 ECA de 2020** ya no se siembran a mano: tres (Engativá, Puente Aranda 2 y Usaquén II) vienen en el inventario nuevo y las otras seis la UAESP dice que no son parte del inventario vigente.
- **Atribución en la app:** el texto "Fuente: UAESP..." de la sección de licencia se agrega al aviso del directorio en #665.

### Qué sigue

- #664 (esta tarjeta): cargar las ECA del Excel a la base de datos y paginar el directorio.
- #665: cambiar el aviso del directorio con esta fuente y la confirmación de entrega.
- #666: mostrar las ECA en un mapa.
