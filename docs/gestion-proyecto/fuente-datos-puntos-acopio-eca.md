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
- Las 14 localidades sin ECA registrada quedan sin ningún punto de acopio
  en el directorio — es el dato real, no un error ni algo pendiente de
  completar.
- Pendiente (para otra rama): agregar un aviso visible en el Directorio
  explicando esto mismo a quien lo use, con el link de esta fuente.
