# Prototipo — Ficha del punto de acopio

**Estado:** borrador del 2026-10-28. Es un documento de diseño: **no se programó nada**. Sirve para elegir cómo se verá la ficha antes de tocar la base de datos o el backend (tarjeta 7 de `tarjetas-despues-de-la-feria.md`; issue N3, pendiente de crear).

**Datos de las ECA usados en los modelos:** los 9 puntos que ya están en el directorio (ver [`fuente-datos-puntos-acopio-eca.md`](fuente-datos-puntos-acopio-eca.md)) y su estado frente al inventario de la UAESP (ver [`investigacion-tipos-puntos-acopio.md`](investigacion-tipos-puntos-acopio.md)).

---

## 1. Qué es cada cosa

Los términos se confunden porque en la calle se usan como si fueran lo mismo. Esto es lo que dicen las fuentes oficiales consultadas (detalle y enlaces en la investigación #460):

| Término | Qué es | Ejemplo | ¿Está en VerdeApp hoy? |
| --- | --- | --- | --- |
| **ECA** (Estación de Clasificación y Aprovechamiento) | Instalación formal, regulada por la UAESP, donde se recibe, pesa, clasifica y almacena material aprovechable. Los recicladores de oficio organizados llevan ahí lo que recogen en sus rutas. Según el registro de la Superservicios, la mayoría de las ECA de Bogotá las operan asociaciones de recicladores. **No está confirmado** el esquema vigente de pago ni si un ciudadano común puede entregar | "ECA Kennedy", "ECA Engativá" | **Sí.** Los 9 puntos del directorio son ECA |
| **Chatarrería / bodega privada de reciclaje** | Negocio privado. En el inventario de la UAESP aparece como "BODEGA", aparte de las ECA. No es una ECA | Un negocio con "CHATARRERIA" o "DEPOSITO" en el nombre | No, y la investigación recomienda **no** incluirlas |
| **Ecopunto** | Contenedor estacionario itinerante (no es un camión) que opera la UAESP, gratuito, para escombros y objetos voluminosos (muebles, colchones, tejas, llantas). Cambia de lugar y cada punto vuelve cada 4 semanas, según un boletín de marzo de 2026; el horario varía entre fuentes y hay que verificarlo. No está confirmado quién lo transporta | Ecopunto de la semana en tu localidad | No. Se muestra como información, no como punto fijo |
| **Centro de Cuidado al Reciclador (CCR)** | Espacio solo para recicladores de oficio, donde separan y organizan su material antes de ir a una ECA | CCR de Kennedy | No. Quedaría para una segunda etapa |
| **Punto de residuos especiales o posconsumo** | Puntos de la Secretaría Distrital de Ambiente para pilas, bombillos, llantas, aceite, medicamentos y aparatos eléctricos | Punto de pilas | No. Se enlaza al visor de la SDA |
| **Punto de acopio** | En VerdeApp es el nombre del módulo (`puntos_acopios`). En la práctica hoy contiene **solo ECA**. En el lenguaje general es cualquier lugar que recoge material | El módulo "Puntos de acopio" | Sí, es el módulo |
| **Punto de reciclaje** | Palabra genérica, **no es un tipo oficial**. Puede referirse a cualquiera de los anteriores | — | No es una categoría |

**En resumen:** una ECA es un tipo de punto de acopio, regulado y vigilado por la UAESP. Una chatarrería es un negocio privado y no es una ECA. "Punto de acopio" y "punto de reciclaje" son nombres generales, no categorías oficiales. "Punto limpio" tampoco tiene una definición oficial en Bogotá en las fuentes consultadas.

---

## 2. Qué datos tenemos y cuáles faltan

| Dato de la ficha | ¿Existe hoy en la base de datos? | De dónde saldría |
| --- | --- | --- |
| Nombre, localidad, dirección | Sí | Ya cargados |
| Teléfono | Sí, pero opcional y **vacío en las 9 ECA** | Ninguna fuente oficial lo publica por ECA. Texto de respaldo con la línea de la UAESP |
| Encargado | Sí, opcional y vacío | Sin fuente |
| Activo / dado de baja | Sí (`activo`) | Ya existe |
| **Latitud y longitud** | **No**: están documentadas en `fuente-datos-puntos-acopio-eca.md` pero no se guardaron | Los 9 pares ya están escritos ahí (dataset de marzo de 2020) |
| **Foto** | **No** | Solo si se sube a VerdeApp, como en las lecciones de "Aprende a reciclar" (no se usan fotos de terceros). Mientras no haya foto, un dibujo por defecto |
| **Estado frente a la UAESP** ("Activa en inventario" o "Por confirmar") | **No** | Del cruce de la investigación #460; se actualiza cuando responda la solicitud a la UAESP (#500) |
| Categoría (ECA, CCR, etc.) | **No** | Pendiente de aclarar por qué se cerró #461 como "NO SE HACE" |

---

## 3. El botón "Cómo llegar"

Abre Google Maps con la ubicación del punto. Se arma sin ninguna clave ni librería, solo con un enlace:

1. **Con coordenadas** (lo preferible): `https://www.google.com/maps/search/?api=1&query=4.702475,-74.100802` (ejemplo: ECA Kennedy).
2. **Sin coordenadas**: se busca por la dirección: `...query=Carrera 84 11A-34, Bogotá, Colombia` (con los espacios codificados).
3. **Sin ninguno de los dos**: el botón no se muestra.

Las coordenadas son de 2020 y varias ECA pudieron reubicarse (Decreto 203 de 2022), así que la ficha debe decir **"Ubicación aproximada"** junto al botón.

---

## 4. Reglas comunes a los tres modelos

- **Estado visible:** una etiqueta junto al nombre. "Activa en inventario" solo para las 2 que coinciden con una ECA activa (Engativá y Puente Aranda 2); el resto, "Por confirmar". Nunca se afirma que una ECA sigue operando si no se confirmó.
- **Teléfono sin dato:** "Sin teléfono publicado. Consulta a la UAESP: 601 3580400". La línea 601 3580400 aparece en el pie del sitio `uaesp.gov.co` (consultado el 2026-10-28), que además indica la extensión 2 para "Atención a recicladores y aprovechamiento". Es la línea general de la UAESP, **no el teléfono de la ECA**.
- **Foto:** si no hay, se muestra un dibujo por defecto (el mismo estilo de los dibujos por categoría de "Aprende a reciclar"), nunca una foto buscada en internet.
- **Quién lo ve:** el Residente en el Directorio general, el Reciclador en "Puntos de acopio" (lectura) y el Admin del Sistema en su gestión (crear, editar y dar de baja). La ficha es la misma en los tres; solo el Admin ve los botones de editar.
- **Modo oscuro, celular y pantalla grande:** los tres se resuelven con las mismas reglas del proyecto (tokens `accent-*` y `night-*`, tamaños en `rem`).

---

## 5. Los tres modelos

### Modelo A — Tarjetas con foto arriba

```text
+----------------------+  +----------------------+  +----------------------+
| [ foto o dibujo ]    |  | [ foto o dibujo ]    |  | [ foto o dibujo ]    |
| ECA Kennedy          |  | ECA Engativá         |  | ECA Mártires         |
| Kennedy · Cra 84...  |  | Engativá · Cl 80C... |  | Mártires · Cl 8...   |
| (Por confirmar)      |  | (Activa en inventario)|  | (Por confirmar)      |
| Sin teléfono publicado|  | Sin teléfono publicado|  | Sin teléfono publicado|
| [Cómo llegar]        |  | [Cómo llegar]        |  | [Cómo llegar]        |
+----------------------+  +----------------------+  +----------------------+
```

- **Cómo funciona:** cuadrícula de tarjetas; cada una trae todo, sin abrir nada.
- **A favor:** la foto se ve de inmediato; se entiende sin explicación; con 9 puntos queda bien.
- **En contra:** ocupa mucho alto; con cientos de puntos (tarjeta 10) se vuelve muy larga; en celular son tarjetas apiladas, una por pantalla.
- **En pantalla de 4K:** muy bien, es el que más aprovecha el ancho.

### Modelo B — Lista compacta con ficha que se abre

```text
[foto] ECA Kennedy           Kennedy · Cra 84 # 11A-34    (Por confirmar)  ^
       +-------------------------------------------------------------+
       | [ foto ]   Sin teléfono publicado. Consulta a la UAESP:     |
       |            601 3580400                                      |
       |            Encargado: sin dato                              |
       |            Ubicación aproximada (dato de 2020)              |
       |            [Cómo llegar]                                    |
       +-------------------------------------------------------------+
[foto] ECA Engativá          Engativá · Cl 80C # 92-44    (Activa)        v
[foto] ECA Mártires          Mártires · Cl 8 # 26-80      (Por confirmar) v
```

- **Cómo funciona:** cada punto es una fila corta con miniatura, nombre, zona y estado; al tocarla se abre su ficha completa debajo.
- **A favor:** la que mejor aguanta muchos puntos y la mejor en celular (es la pantalla del Reciclador, que trabaja en la calle); el estado se ve de un vistazo.
- **En contra:** hay que tocar para ver el teléfono y el botón; la foto grande queda escondida hasta abrir.
- **En pantalla de 4K:** correcta, pero deja el ancho medio vacío; se puede limitar el ancho de la lista.

### Modelo C — Lista a la izquierda y ficha a la derecha

```text
+---------------------+--------------------------------------------+
| > ECA Kennedy       |  [ foto o dibujo ]                         |
|   (Por confirmar)   |  ECA Kennedy                               |
|   ECA Engativá      |  Carrera 84 # 11A-34 · Kennedy             |
|   (Activa)          |  Sin teléfono publicado. Consulta a la     |
|   ECA Mártires      |  UAESP: 601 3580400                        |
|   (Por confirmar)   |  Encargado: sin dato                       |
|   ECA Fontibón      |  [Cómo llegar en Google Maps]              |
+---------------------+--------------------------------------------+
```

- **Cómo funciona:** se elige un punto en la lista y su ficha completa aparece al lado.
- **A favor:** en pantalla grande se ve todo a la vez; es el más claro para el Admin del Sistema, que compara y edita muchos puntos.
- **En contra:** en celular no cabe: cada punto pasaría a una pantalla aparte (dos pantallas en vez de una); es el de más trabajo de programar.
- **En pantalla de 4K:** el mejor aprovechamiento del espacio.

### Comparación

| | A. Tarjetas | B. Lista que se abre | C. Lista y panel |
| --- | --- | --- | --- |
| Celular | Regular (alto) | **Muy bien** | Regular (dos pantallas) |
| Pantalla grande / 4K | **Muy bien** | Bien | **Muy bien** |
| Muchos puntos (tarjeta 10) | Mal | **Muy bien** | Bien |
| Foto visible sin tocar | **Sí** | No | Solo la del seleccionado |
| Trabajo de programar | Bajo | Medio | Alto |
| Rol al que más le sirve | Residente | **Reciclador** | Admin del Sistema |

**Recomendación del autor del borrador:** el **Modelo B** como base, porque el Reciclador usa el celular en la calle y la lista debe aguantar crecer a cientos de puntos. Si el equipo prefiere ver siempre la foto, el Modelo A se puede usar solo en el Directorio del Residente (9 puntos). **La decisión es del equipo.**

---

## 6. Qué cambiaría en el backend para construirlo (tarjeta 7)

Solo para dejarlo escrito; no se hace en esta tarjeta:

- Columnas nuevas en `puntos_acopios`: `latitud`, `longitud` (decimales, opcionales), `foto_url` (opcional) y un estado de verificación (por ejemplo `por_confirmar` / `confirmada`).
- Migración de Alembic con los 9 pares de coordenadas ya documentados.
- Subida de la foto reutilizando `guardar_imagen_subida` (`app/utils/imagenes.py`) en su propia subcarpeta de `be/app/uploads/`; sumar la columna a `COLUMNAS_CON_ADJUNTOS` en `app/limpiar_adjuntos.py`.
- Si se retoma la categoría (#461), una columna `tipo`; hoy no se asume.

## 7. Decisiones pendientes

1. **Modelo elegido** (A, B o C, o uno por rol).
2. **Por qué se cerró #461 como "NO SE HACE"** y si eso cambia las categorías.
3. **Foto:** quién la toma y sube, y si por ahora se usa solo el dibujo por defecto.
4. **Respuesta de la UAESP (#500):** cuando llegue, se actualiza el estado de cada ECA y, si hay contactos reales, el teléfono.

## 8. Enlaces consultados el 2026-10-28

- Página de ECA de la UAESP: `https://www.uaesp.gov.co/content/centros-pesaje-estaciones-clasificacion-y-aprovechamiento-eca`. **Responde "Acceso denegado: no tiene permiso para visitar esta página"** también al abrirla en un navegador común, así que no es solo un bloqueo a herramientas automáticas: la página o su enlace pudieron cambiar. El archivo "ecas actuales.xlsx" que mencionaba un resultado de búsqueda sigue sin poder abrirse.
- Inventario inicial de ECA y bodegas (PDF): `https://www.uaesp.gov.co/sites/default/files/archivos-adjuntos/Listado_Inventario_inicial_ECA_y_Bodegas_PR.pdf`. **Abre bien.** Revisado el 2026-10-28: son 44 páginas, impresas desde la hoja `LISTADO_ECA_BODEGAS_19122022_PUBLICACION 1.xlsx` **el 21 de diciembre de 2022** (fecha de los metadatos del PDF, no escrita en las páginas), es decir, tiene casi 4 años. Columnas: ítem, nombre, tipo (ECA o BODEGA), área en m², latitud, longitud, localidad y funcionamiento (ACTIVA o INACTIVA). **No trae dirección, teléfono ni operador.** Hay filas dudosas (por ejemplo "ECA MAYERLY" figura como BODEGA), así que sirve como lista de candidatas, no como dato confirmado.
- Resolución 137 de 2023: `https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=153864&dt=S`.
- Registro de ECA de la Superservicios en Datos Abiertos (nacional): `https://www.datos.gov.co/Hacienda-y-Cr-dito-P-blico/Superservicios-Registro-de-Estaciones-de-Clasifica/y97c-tfd9/about_data`. Archivo descargado el 2026-10-28 (5.997 filas, 3.841 códigos NUECA únicos en todo el país; la última fecha de certificación del archivo es del 2024-07-30). Para Bogotá hay 1.912 códigos únicos, 1.110 "EN OPERACION" y 802 "INACTIVO", repartidos entre 520 empresas, casi todas asociaciones de recicladores (las que más tienen: Asociación Cooperativa de Recicladores de Bogotá, Asociación de Carreteros Recicladores de Bogotá ACB, entre otras). **No trae dirección, coordenadas ni teléfono**, y varios registros se llaman "CHATARRERIA ..." o "DEPOSITO ...": en este registro "ECA" cubre más cosas que las ECA del inventario de la UAESP. Sirve para saber quién opera y si está en operación, no para ubicar el punto.

---

## 9. Cómo ver el prototipo navegable

Hay una página de prototipo dentro de la app, con las 9 ECA y los 3 modelos (interruptor "A / B / C"), en modo claro y oscuro, celular y pantalla grande:

1. Levantar el frontend (`pnpm dev` en `fe/`) y el backend, y entrar con cualquier cuenta de prueba.
2. Abrir `http://localhost:5173/prototipo/ficha-punto-acopio`.

La ruta solo existe en desarrollo (`import.meta.env.DEV`); el build de producción no la incluye (verificado con `pnpm build`). **El código del prototipo NO está en `develop`: vive en la rama `feat/prototipo-ficha-punto-acopio`, sin PR, hasta que el equipo decida.** Para verlo: `git checkout feat/prototipo-ficha-punto-acopio`. Los archivos son `fe/src/pages/PrototipoFichaPuntoAcopioPage.tsx`, su prueba `fe/src/__tests__/pages/PrototipoFichaPuntoAcopioPage.test.tsx` y la ruta en `fe/src/App.tsx`.
