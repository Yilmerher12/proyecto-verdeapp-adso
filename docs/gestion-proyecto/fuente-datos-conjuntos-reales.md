# Fuente de datos — Conjuntos residenciales

<!--
  ¿Qué? Registro de dónde salieron los conjuntos residenciales reales que
        reemplazaron los 40 inventados en seed_data.sql.
  ¿Para qué? Que cualquiera (compañero, profesor, o nosotros mismos en
             unos meses) pueda verificar que el dato es real, ir a la
             fuente original, y entender qué filtros/decisiones se
             tomaron al importarlo — sin tener que confiar solo en
             nuestra palabra.
  ¿Impacto? Antes los 40 conjuntos eran inventados con NITs de relleno
            secuenciales ("900123456-X"). Ahora son 14,515 conjuntos que
            se pueden corroborar con el servicio de abajo.
-->

**Fecha de consulta:** 2026-08-27

## Una corrección en el camino

La primera versión de esta importación usó el dataset CSV estático
"Conjuntos residenciales y cerrados de Bogotá" (actualizado por última vez
en **marzo de 2023**). Al probarlo, Yilmer buscó su propio conjunto
("Urapán", en Bosa) y no apareció — ese archivo simplemente estaba
desactualizado.

Investigando más a fondo se encontró un dataset **más reciente y más
completo** de la misma entidad (Secretaría Distrital de Gobierno), servido
como capa geográfica (ArcGIS REST) en vez de un CSV estático — y ahí sí
aparece "PARQUES DE BOGOTA URAPAN" en Bosa. Es la fuente que quedó
sembrada en la base de datos.

## Fuente

- **Portal:** Datos Abiertos Bogotá
- **Dataset:** "Propiedad Horizontal.BogotáDC"
- **Página del dataset:** https://datosabiertos.bogota.gov.co/dataset/propiedad-horizontal-bogotadc
- **Entidad publicadora:** Secretaría Distrital de Gobierno
- **Última actualización del dato:** 26 de noviembre de 2025
- **Licencia:** Creative Commons Attribution-NonCommercial 4.0
- **Servicio usado:** capa 0 del servicio ArcGIS REST (consultable con filtros SQL, sin necesidad de descargar el archivo completo):
  `https://mapas.gobiernobogota.gov.co/waserver/rest/services/propiedadhorizontal/MapServer/0/query`
- **Consulta usada:** `where=CATEPROP=1` (solo "PROPIEDAD HORIZONTAL RESIDENCIAL"), paginada de 2,000 en 2,000 registros (`resultOffset`/`resultRecordCount`) hasta traer las 14,518 filas residenciales.

## Por qué este dataset es mejor que el CSV original

| | CSV "Conjuntos residenciales y cerrados" (descartado) | Servicio "Propiedad Horizontal.BogotáDC" (usado) |
|---|---|---|
| Última actualización | Marzo 2023 | Noviembre 2025 |
| Filtro residencial/comercial | Texto libre con +60 valores distintos, hay que adivinar cuáles son vivienda | Campo `CATEPROP` con 3 valores fijos: RESIDENCIAL / COMERCIAL / MIXTA |
| Código de localidad | Nombre en mayúsculas sin tilde (`USAQUEN`), hay que normalizar y mapear a mano | Número 1-20, **exactamente el mismo esquema** que ya usa nuestra tabla `localidades` |
| Conjunto "Urapán" (Bosa) | No aparece | Sí aparece: `PARQUES DE BOGOTA URAPAN`, `CL84SUR#96-20` |

Gracias al campo `CATEPROP`, `seed.py` ya no necesita adivinar qué "tipo de
propiedad" es vivienda (antes era una lista mantenida a mano de ~35
valores) — ese filtro ya viene aplicado desde el origen. Y gracias a que
el código de localidad coincide con el nuestro, tampoco hace falta
normalizar tildes ni mapear nombres.

## Qué se filtró y cómo

Se pidió solo `CATEPROP=1` ("PROPIEDAD HORIZONTAL RESIDENCIAL"), quedaron
afuera `CATEPROP=2` (COMERCIAL) y `CATEPROP=3` (MIXTA). También se
descartaron filas sin nombre, sin dirección o sin código de localidad, y
duplicados exactos (mismo nombre + misma dirección en la misma localidad).

**Resultado:** de 15,234 registros totales del servicio, 14,518 son
residenciales, y **14,515 quedaron sembrados** (3 sin nombre/dirección).

## Qué NO se importó (y por qué)

- **NIT:** el dataset no lo trae. Se dejó en `NULL` en vez de inventar un
  número que se vería tan real como uno de verdad sin serlo — el campo ya
  es editable por el Admin de Conjunto desde su panel, para cuando el
  administrador real quiera completarlo.
- **Nombre de la persona de contacto:** el CSV original (el descartado)
  sí traía esta columna — un dato personal real de alguien que nunca
  autorizó mostrarlo en VerdeApp. No se guardó, ni siquiera en el archivo
  que quedó en el repo. El servicio ArcGIS usado en la versión final ni
  siquiera expone ese campo.
- **Coordenadas/geometría:** el servicio las trae (es una capa geográfica),
  pero no se importaron — la tabla `conjuntos_residenciales` no tiene
  columnas de coordenadas todavía y el directorio no muestra mapa.

## Cobertura por localidad

19 de las 20 localidades de Bogotá quedaron con al menos un conjunto real.
**Sumapaz es la única sin ningún registro** — es la localidad rural de la
ciudad y no tiene conjuntos bajo régimen de propiedad horizontal, así que
es el dato real, no un error ni algo pendiente. El directorio y el
registro público simplemente no muestran opciones para Sumapaz, igual que
ya pasa con las localidades sin ECA en el Directorio de puntos de acopio.

| Localidad | Conjuntos reales |
|---|---:|
| Usaquén | 4,247 |
| Chapinero | 2,860 |
| Suba | 2,446 |
| Teusaquillo | 1,224 |
| Engativá | 716 |
| Kennedy | 576 |
| Fontibón | 521 |
| Santa Fe | 428 |
| Barrios Unidos | 310 |
| Bosa | 264 |
| Puente Aranda | 159 |
| San Cristóbal | 147 |
| Rafael Uribe Uribe | 121 |
| Ciudad Bolívar | 110 |
| La Candelaria | 105 |
| Los Mártires | 99 |
| Antonio Nariño | 82 |
| Usme | 51 |
| Tunjuelito | 49 |
| Sumapaz | 0 |

## Qué se hizo con esto

- Se reemplazaron los 40 conjuntos inventados de `seed_data.sql` por estos
  14,515, sembrados desde Python (`importar_conjuntos_reales` en
  `be/app/seed.py`) en vez de como `INSERT` escritos a mano — ya no caben
  razonablemente en un archivo `.sql`.
- El conjunto de prueba que usan el Admin de Conjunto, el Reciclador y el
  Residente de prueba (antes "TORRES DE ARANJUEZ", inventado) ahora es
  **"AGRUPACION QUINTAS DE ARANJUEZ"**, un conjunto real de Usaquén (se
  verificó que el nombre no se repite en la localidad antes de elegirlo —
  varios nombres del dataset sí se repiten en más de un edificio).
- Esto habilitó (y a la vez requirió) el buscador de conjuntos con
  búsqueda en tiempo real de la rama `feat/buscador-conjuntos` — con
  miles de conjuntos reales por localidad, un `<select>` normal ya no
  alcanzaba.

## Cómo repetir o actualizar esta importación

```bash
# 1. Descargar todas las filas residenciales (paginado, 2000 por página)
curl "https://mapas.gobiernobogota.gov.co/waserver/rest/services/propiedadhorizontal/MapServer/0/query?where=CATEPROP=1&outFields=SNOMBREPRO,DIRINPUT,NOMLOC,TIPOPROP&resultOffset=0&resultRecordCount=2000&f=json"
# (repetir incrementando resultOffset de 2000 en 2000 hasta que "features" venga vacío)

# 2. Guardar como be/app/data/conjuntos_residenciales_bogota.csv con columnas:
#    id_localidad;tipo_propiedad;nombre_conjunto;direccion
#    (id_localidad = campo NOMLOC, ya coincide con nuestra tabla localidades)

# 3. Volver a sembrar
cd be && uv run python -m app.seed
```
