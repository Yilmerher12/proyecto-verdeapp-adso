-- ========================================================
-- Módulo: seed_data.sql
-- Descripción: Datos de prueba para desarrollo (roles, localidades, conjuntos
--              de ejemplo, usuarios de prueba, puntos de acopio).
-- ¿Para qué? Antes este archivo vivía en la raíz del repo como init_db.sql y
--            también CREABA las tablas — Postgres lo ejecutaba solo al crear
--            su volumen, compitiendo con Alembic y rompiendo cualquier clon
--            nuevo del proyecto ("relation ... already exists"). Ahora este
--            archivo SOLO tiene datos (INSERT/DELETE), nunca CREATE TABLE ni
--            ALTER TABLE — la estructura de la BD es responsabilidad única
--            de Alembic (be/alembic/versions/).
-- ¿Impacto? Lo ejecuta be/app/seed.py, después de "alembic upgrade head" y
--           antes de arrancar el servidor. Ver seed.py para el detalle de
--           por qué es seguro correrlo más de una vez.
-- ========================================================

-- ¿Qué? Datos de configuración obligatorios iniciales.
-- ¿Impacto? La columna real de la tabla "roles" es "tipo_rol", no "nombre_rol".
INSERT INTO roles (id_rol, tipo_rol) VALUES
(1, 'ADMINISTRADOR'),
(2, 'RESIDENTE'),
(3, 'RECICLADOR'),
(4, 'ADMIN_CONJUNTO')
ON CONFLICT DO NOTHING;

INSERT INTO localidades (id_localidad, nombre_localidad) VALUES
(1,  'Usaquén'),
(2,  'Chapinero'),
(3,  'Santa Fe'),
(4,  'San Cristóbal'),
(5,  'Usme'),
(6,  'Tunjuelito'),
(7,  'Bosa'),
(8,  'Kennedy'),
(9,  'Fontibón'),
(10, 'Engativá'),
(11, 'Suba'),
(12, 'Barrios Unidos'),
(13, 'Teusaquillo'),
(14, 'Los Mártires'),
(15, 'Antonio Nariño'),
(16, 'Puente Aranda'),
(17, 'La Candelaria'),
(18, 'Rafael Uribe Uribe'),
(19, 'Ciudad Bolívar'),
(20, 'Sumapaz')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 🏘️ CONJUNTOS RESIDENCIALES — sembrados desde Python, no desde este archivo
-- ============================================================================
-- ¿Qué? Antes había 40 conjuntos inventados aquí mismo (2 por localidad,
--       NITs secuenciales de relleno "900123456-X"). Ahora vienen del
--       dataset real "Conjuntos Residenciales y Cerrados de Bogotá"
--       (Secretaría Distrital de Gobierno) — ver
--       docs/gestion-proyecto/fuente-datos-conjuntos-reales.md.
-- ¿Para qué? Son más de 10,000 filas reales — ya no caben razonablemente
--           como INSERT escritos a mano en un .sql. `seed.py` las lee
--           directamente del CSV en app/data/ y las siembra por código
--           (ver `importar_conjuntos_reales` en seed.py), justo después de
--           que este archivo cree roles y localidades.
-- ¿Impacto? Si buscas los conjuntos aquí y no los encuentras, es porque
--           ahora viven en app/data/conjuntos_residenciales_bogota.csv,
--           no en este .sql.

-- ¿Qué? Superadministrador oficial compartido para el equipo de desarrollo.
-- Contraseña hasheada: AdminVerde2026*
INSERT INTO usuarios (id_rol, correo_electronico, password, is_active)
VALUES (1, 'admin@verdeapp.com', '$2b$12$xSluyevTDoPhwiydwB3OhetVHh1miUiGivw99ChVJxBGl.zaC6EMW', true)
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 🧪 USUARIOS SEMILLA DE PRUEBA (Admin de Conjunto, Reciclador, Residente)
-- ============================================================================
-- ¿Qué? Se movieron a Python (`sembrar_usuarios_prueba` en seed.py).
-- ¿Para qué? Ahora que los conjuntos vienen del CSV real, estos 3 usuarios
--           necesitan buscar el id del conjunto de prueba (CONJUNTO_DE_PRUEBA
--           en seed.py) DESPUÉS de importarlo — algo que un .sql estático
--           ejecutado de una sola vez ya no puede hacer con un nombre real
--           que solo se conoce en tiempo de ejecución.
-- ¿Impacto? Misma contraseña de siempre (AdminVerde2026*) y mismo
--           comportamiento — solo cambió DÓNDE vive el código, no qué hace.

-- ============================================================================
-- 📍 PUNTOS DE ACOPIO — Estaciones de Clasificación y Aprovechamiento (ECA)
-- ============================================================================
-- ¿Qué? Antes esta tabla tenía 40 puntos completamente inventados (2 por
--       cada una de las 20 localidades, con teléfonos ficticios secuenciales
--       "316555100X") pese a que el comentario decía "fuente: UAESP" — esa
--       fuente nunca existió, era solo un dato de relleno.
-- ¿Para qué? Estos 9 SÍ son reales: vienen del dataset "Aprovechamiento
--           ECAS" de Datos Abiertos Bogotá (UAESP), la lista oficial de
--           Estaciones de Clasificación y Aprovechamiento — el lugar donde
--           los recicladores de oficio organizados pesan y clasifican lo
--           que recogen en sus rutas. Fuente completa, con la fila cruda
--           tal cual se descargó, en:
--           docs/gestion-proyecto/fuente-datos-puntos-acopio-eca.md
-- ¿Impacto? Bogotá solo tiene ECAs registradas en 6 de sus 20 localidades
--           (Kennedy, Usaquén, Engativá, Fontibón, Mártires, Puente Aranda)
--           — las otras 14 quedan sin ningún punto en el directorio. Es
--           correcto que se vea así: es la realidad, no un dato faltante.
DELETE FROM puntos_acopios;

INSERT INTO puntos_acopios (id_localidad, nombre, direccion) VALUES
-- 8. Kennedy
(8,  'ECA Kennedy',                        'Carrera 84 # 11A-34'),
-- 1. Usaquén
(1,  'ECA Usaquén I',                      'Carrera 21 # 164-82'),
(1,  'ECA Usaquén II',                     'Carrera 18 # 164-32'),
-- 10. Engativá
(10, 'ECA Engativá',                       'Calle 80C # 92-44'),
(10, 'ECA Engativá 2 (Las Ferias)',        'Carrera 69K # 79-49'),
-- 9. Fontibón
(9,  'ECA Fontibón (Montevideo)',          'Calle 17A # 69F-26'),
-- 14. Los Mártires
(14, 'ECA Mártires',                       'Calle 8 # 26-80'),
-- 16. Puente Aranda
(16, 'ECA Puente Aranda 1',                'Carrera 36 # 19-53'),
(16, 'ECA Puente Aranda 2',                'Carrera 65B # 17-80')
ON CONFLICT DO NOTHING;

-- ¿Qué? Contenido educativo real (RQF-004/RQF-010) — módulos de borrador,
--       uno por cada categoría ya definida en fe/src/config/categoriasEducativas.ts,
--       con datos verificados contra fuentes oficiales (Alcaldía de Bogotá,
--       UAESP, Secretaría Distrital de Ambiente).
-- ¿Para qué? Sin esto, cualquier clon nuevo del proyecto (ej. para la
--           sustentación) arranca con el catálogo educativo vacío, porque
--           antes ese contenido solo se había creado a mano desde el panel
--           de administración, sin quedar guardado en ningún lado.
-- ¿Impacto? Son borradores de buena calidad, no la versión final — cualquier
--           Administrador del Sistema puede editarlos o reemplazarlos desde
--           el panel de Contenido Educativo cuando se tenga contenido propio.
INSERT INTO contenido_educativo (modulo_categoria, titulo_tema, cuerpo_texto, fecha_publicacion, url_video, url_guia) VALUES
(
    'Separación en la fuente y código de colores',
    'Código de colores para la separación en la fuente',
    'En Bogotá la separación de residuos en la fuente se hace con tres colores de bolsa, unificados a nivel nacional por el Ministerio de Ambiente y Desarrollo Sostenible y aplicados en la ciudad por la UAESP.

Bolsa blanca: material aprovechable, limpio y seco. Aquí van el papel, el cartón, el plástico, el vidrio, el metal y las latas de aluminio.

Bolsa negra: residuos ordinarios que ya no se pueden aprovechar, como residuos de comida muy contaminados, papel higiénico, pañales, servilletas usadas y barrido de la casa.

Bolsa verde: residuos orgánicos aprovechables, como cáscaras, restos de comida, semillas y huesos.

La regla de oro es simple: si el material está limpio y seco, casi siempre es aprovechable y va en la bolsa blanca. Si está mojado, sucio o mezclado con comida, ya no sirve para reciclar. Separar bien en el hogar es el primer paso de toda la cadena de reciclaje: si las bolsas llegan mezcladas, el reciclador de oficio tiene que volver a separar el material a mano, perdiendo tiempo y calidad en el proceso.',
    '2026-08-15',
    'https://www.youtube.com/watch?v=Jxzw1xyxE2s',
    'https://bogota.gov.co/mi-ciudad/habitat/asi-puedes-separar-residuos-segun-el-color-de-las-bolsas-en-bogota'
),
(
    'Tipos de residuos y su preparación',
    'Cómo preparar cada material antes de entregarlo para reciclaje',
    'No basta con poner el material en la bolsa correcta: cómo se prepara cada residuo también afecta si de verdad se puede aprovechar.

Papel y cartón: deben estar secos y sin residuos de comida o grasa (por ejemplo, una caja de pizza grasosa no sirve). Es buena práctica aplanar las cajas para que ocupen menos espacio.

Plástico: enjuagar brevemente los envases para quitar restos de líquido o comida, y aplanar las botellas. No es necesario quitar las etiquetas.

Vidrio: enjuagar los frascos y envases. Hay que manejarlo con cuidado para evitar que se rompa y se vuelva un riesgo para quien recoge el material.

Metal y latas: enjuagar y, si es posible, aplastar las latas para ahorrar espacio en la bolsa.

Un residuo mal preparado (sucio, mojado o mezclado con orgánicos) puede contaminar todo el contenido de la bolsa blanca y hacer que el material que sí estaba bien separado termine descartado como basura ordinaria.',
    '2026-08-16',
    NULL,
    'https://bogota.gov.co/mi-ciudad/ambiente/como-hacer-separacion-de-residuos-y-reciclar-desde-casa'
),
(
    'Puntos limpios y Ecopuntos',
    'Ecopuntos: qué son y cómo usarlos para muebles, colchones y escombros',
    'Los Ecopuntos son cajas o puntos fijos que dispone la UAESP en distintos barrios de la ciudad, de forma rotativa semana a semana, para que los residentes entreguen de manera gratuita elementos voluminosos que NO caben en la recolección normal de basuras.

Qué se puede llevar: muebles viejos, colchones, tejas y escombros o material de obra en pequeñas cantidades.

Qué NO se puede llevar: llantas ni electrodomésticos — estos tienen puntos de recolección aparte, especializados en residuos eléctricos y electrónicos (RAEE).

Usar los Ecopuntos evita que estos elementos terminen abandonados en andenes, parques o rondas de quebradas, que es uno de los problemas más visibles de la gestión de residuos en la ciudad. La ubicación de los Ecopuntos cambia cada semana según la localidad, así que conviene revisar el cronograma vigente antes de sacar el material.',
    '2026-08-17',
    NULL,
    'https://bogota.gov.co/mi-ciudad/habitat/como-funcionan-los-ecopunto-en-bogota-y-para-que-sirven'
),
(
    'Economía circular y aprovechamiento',
    'Economía circular en Bogotá: el papel del reciclador de oficio',
    'La economía circular busca que un material se mantenga en uso el mayor tiempo posible, en lugar de terminar en un relleno sanitario después de un solo uso. En Bogotá, esa cadena depende directamente del trabajo del reciclador de oficio.

Los recicladores de oficio son quienes recogen, transportan y comercializan el material aprovechable que los hogares separan. Desde 2016 (Decreto Nacional 596), su actividad está reconocida y remunerada como un servicio público — no es informalidad, es parte formal del sistema de aseo de la ciudad.

Bogotá cuenta con miles de recicladores de oficio organizados, y buena parte del material aprovechable de la ciudad se recupera gracias a su trabajo directo con los hogares. Por eso VerdeApp conecta a cada conjunto residencial con un reciclador autorizado: entregarle el material limpio y bien separado, en el horario acordado, es la forma más directa de que ese material sí vuelva a la economía en lugar de convertirse en basura.',
    '2026-08-18',
    NULL,
    'https://www.uaesp.gov.co/aprovechamiento-residuos-solidos-bogota'
),
(
    'Residuos de construcción y demolición',
    'Manejo adecuado de escombros y residuos de construcción (RCD)',
    'Los Residuos de Construcción y Demolición (RCD) son el material que sobra de obras, remodelaciones o reparaciones dentro del conjunto: escombros, restos de baldosa, cemento, ladrillo, tejas rotas, entre otros.

Estos residuos NO se deben mezclar con las bolsas blanca, negra o verde de la recolección domiciliaria normal, ni acumularse en zonas comunes, andenes o antejardines — además del riesgo de accidentes, es una infracción que puede generar comparendos ambientales.

Para volúmenes pequeños, la ciudad dispone de los Ecopuntos (ver el módulo correspondiente). Para volúmenes más grandes, propios de una obra, se debe contratar a un gestor autorizado de RCD, que se encarga de transportarlos hasta una escombrera legal.

Como Administrador de Conjunto, vale la pena informar a los residentes con anticipación cuando se planee una obra o remodelación, para coordinar dónde y cómo se va a disponer el material sobrante antes de que se convierta en un problema para todo el conjunto.',
    '2026-08-19',
    NULL,
    'https://www.ambientebogota.gov.co/preguntas-frecuentes-rcd'
),
(
    'Marco distrital y consumo responsable',
    'Consumo responsable: reducir antes de reciclar',
    'Reciclar bien es importante, pero el primer paso de una buena gestión de residuos es generar menos basura desde el principio. Bogotá produce miles de toneladas de residuos cada día, y solo una parte relativamente pequeña se recupera — reducir el consumo innecesario tiene tanto impacto como separar correctamente.

Algunas prácticas de consumo responsable que promueve la Alcaldía de Bogotá:

Reducir antes que reciclar: preferir productos con menos empaque, evitar los desechables de un solo uso y comprar solo lo necesario.

Reutilizar lo que ya se tiene: usar termos y botellas recargables en lugar de comprar agua embotellada, dar una segunda vida a envases y recipientes antes de descartarlos.

Conocer al reciclador del sector: entregarle directamente el material aprovechable, en el día y horario en que pasa, es más eficiente que dejarlo mezclado con la basura ordinaria.

Estos hábitos, multiplicados por todos los hogares de un conjunto residencial, hacen una diferencia real en cuánto material termina en un relleno sanitario en lugar de volver a ser útil.',
    '2026-08-19',
    NULL,
    'https://bogota.gov.co/mi-ciudad/ambiente/10-mandamientos-para-una-bogota-con-cero-desechos'
)
ON CONFLICT DO NOTHING;
