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

-- Limpiar inserciones previas de infraestructura para pruebas limpias
DELETE FROM unidades;
DELETE FROM conjuntos_residenciales;

-- 1. Usaquén
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion, verificado) VALUES
(1, 'TORRES DE ARANJUEZ', '900123456-1', 'Calle 165 # 7-30', TRUE),
(1, 'ALAMEDA DE SANTA BÁRBARA', '900123456-2', 'Carrera 15 # 119-45', TRUE);

-- 2. Chapinero
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion, verificado) VALUES
(2, 'CONJUNTO RESIDENCIAL EL CASTILLO', '900123456-3', 'Calle 72 # 4-15', TRUE),
(2, 'RESERVA DE CHAPINERO', '900123456-4', 'Carrera 13 # 58-20', TRUE);

-- 3. Santa Fe
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion, verificado) VALUES
(3, 'TORRES DE SAN JUAN', '900123456-5', 'Calle 22 # 3-45', TRUE),
(3, 'BALCONES DE SANTA FE', '900123456-6', 'Carrera 6 # 14-10', TRUE);

-- 4. San Cristóbal
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion, verificado) VALUES
(4, 'PORTAL DE SAN CRISTÓBAL', '900123456-7', 'Calle 11 Sur # 11-25', TRUE),
(4, 'MIRADOR DE LOS ALPES', '900123456-8', 'Carrera 8 Altas # 34-12S', TRUE);

-- 5. Usme
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion, verificado) VALUES
(5, 'QUINTAS DE SOTAVENTO', '900123456-9', 'Calle 81S # 1-40', TRUE),
(5, 'VALLES DE USME II', '900123456-10', 'Carrera 14 # 93S-15', TRUE);

-- 6. Tunjuelito
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion, verificado) VALUES
(6, 'CIUDAD TUNAL - CLUSTER 4', '900123456-11', 'Calle 48B Sur # 24-50', TRUE),
(6, 'PORTAL DE TUNJUELITO', '900123456-12', 'Carrera 25 # 52S-05', TRUE);

-- 7. Bosa
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion, verificado) VALUES
(7, 'PARQUES DE BOGOTÁ - CIPRÉS', '900123456-13', 'Carrera 95A # 73S-10', TRUE),
(7, 'RECREO DE LOS ALMENDROS', '900123456-14', 'Calle 71S # 92-05', TRUE);

-- 8. Kennedy
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion, verificado) VALUES
(8, 'TINTAL PLAZA CONJUNTO 1', '900123456-15', 'Carrera 86 # 6C-10', TRUE),
(8, 'PORTAL DE LAS AMÉRICAS', '900123456-16', 'Calle 42S # 80-55', TRUE);

-- 9. Fontibón
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion, verificado) VALUES
(9, 'ALAMEDA DE FONTIBÓN', '900123456-17', 'Calle 17 # 103-45', TRUE),
(9, 'RESERVA DEL TINTAL', '900123456-18', 'Carrera 98 # 22I-10', TRUE);

-- 10. Engativá
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion, verificado) VALUES
(10, 'CIUDAD BACHUÉ ETAPA II', '900123456-19', 'Calle 90 # 95-20', TRUE),
(10, 'ALMENDROS DE ENTRERÍOS', '900123456-20', 'Carrera 110 # 80-45', TRUE);

-- 11. Suba
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion, verificado) VALUES
(11, 'CEREZOS DE SUBA', '900123456-21', 'Calle 145 # 91-34', TRUE),
(11, 'ALTOS DE CHALETS', '900123456-22', 'Carrera 111A # 130-22', TRUE);

-- 12. Barrios Unidos
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion, verificado) VALUES
(12, 'TORRES DE LA ESTRADA', '900123456-23', 'Calle 76 # 49-20', TRUE),
(12, 'RESIDENCIAS LOS ALCÁZARES', '900123456-24', 'Carrera 53 # 68-15', TRUE);

-- 13. Teusaquillo
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion, verificado) VALUES
(13, 'CONJUNTO PARQUE SIMÓN BOLÍVAR', '900123456-25', 'Calle 45 # 22-30', TRUE),
(13, 'TORRES DE LA SOLEDAD', '900123456-26', 'Carrera 24 # 39-50', TRUE);

-- 14. Los Mártires
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion, verificado) VALUES
(14, 'RESIDENCIAS SAN FACÓN', '900123456-27', 'Calle 10 # 22-40', TRUE),
(14, 'TORRES DE LA FAVORITA', '900123456-28', 'Carrera 18 # 8-15', TRUE);

-- 15. Antonio Nariño
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion, verificado) VALUES
(15, 'CONJUNTO RESTREPO REAL', '900123456-29', 'Calle 17 Sur # 24-10', TRUE),
(15, 'TORRES DEL TRABAJADOR', '900123456-30', 'Carrera 27 # 18-35S', TRUE);

-- 16. Puente Aranda
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion, verificado) VALUES
(16, 'RESIDENCIAS ZONA INDUSTRIAL', '900123456-31', 'Calle 13 # 50-20', TRUE),
(16, 'TORRES DE LA ALQUERÍA', '900123456-32', 'Carrera 56 # 8-45', TRUE);

-- 17. La Candelaria
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion, verificado) VALUES
(17, 'CONJUNTO CENTRO HISTÓRICO', '900123456-33', 'Calle 12 # 3-25', TRUE),
(17, 'RESIDENCIAS LA CONCORDIA', '900123456-34', 'Carrera 2 # 9-40', TRUE);

-- 18. Rafael Uribe Uribe
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion, verificado) VALUES
(18, 'CONJUNTO QUIROGA CENTRAL', '900123456-35', 'Calle 27 Sur # 16-20', TRUE),
(18, 'TORRES DEL SAN JOSÉ SUR', '900123456-36', 'Carrera 14A # 32S-15', TRUE);

-- 19. Ciudad Bolívar
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion, verificado) VALUES
(19, 'CONJUNTO ARBORIZADORA ALTA', '900123456-37', 'Calle 70 Sur # 18-30', TRUE),
(19, 'TORRES DE SAN FRANCISCO', '900123456-38', 'Carrera 19 # 71S-10', TRUE);

-- 20. Sumapaz
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion, verificado) VALUES
(20, 'CONJUNTO VEREDA SAN JUAN', '900123456-39', 'Vía San Juan Km 3', TRUE),
(20, 'RESIDENCIAS ALTO SUMAPAZ', '900123456-40', 'Vía Nazareth Km 1', TRUE);

-- ¿Qué? Superadministrador oficial compartido para el equipo de desarrollo.
-- Contraseña hasheada: AdminVerde2026*
INSERT INTO usuarios (id_rol, correo_electronico, password, is_active)
VALUES (1, 'admin@verdeapp.com', '$2b$12$xSluyevTDoPhwiydwB3OhetVHh1miUiGivw99ChVJxBGl.zaC6EMW', true)
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 🧪 USUARIOS SEMILLA DE PRUEBA — BORRAR ESTA SECCIÓN COMPLETA CUANDO YA NO
--    SE NECESITEN MÁS PRUEBAS MANUALES (busca el final marcado más abajo).
-- ============================================================================
--
-- ¿Qué? 2 usuarios listos para probar el flujo Reciclador-Conjunto sin tener
--       que registrarse manualmente cada vez que se reinicia la base de datos.
-- ¿Para qué? Evitar repetir registro + verificación de correo + invitación +
--           aceptación a mano en cada prueba durante el desarrollo.
-- ¿Impacto? Ambos usan la MISMA contraseña que el superadmin para simplificar:
--           AdminVerde2026*
--           Ya quedan ACTIVOS (is_active=TRUE) — no hace falta verificar correo.
--           El reciclador YA queda ACEPTADO en el conjunto del admin — no hace
--           falta repetir el flujo de invitar/aceptar para probar el resto
--           de la app (aunque el flujo de invitar SIGUE funcionando igual
--           para probarlo con otros usuarios si se quiere).
--
-- Usuario 1 — Admin de Conjunto de prueba
--   Correo:      admin.conjunto.prueba@verdeapp.com
--   Contraseña:  AdminVerde2026*
--   Administra:  TORRES DE ARANJUEZ (Usaquén, conjunto #1)
--
-- Usuario 2 — Reciclador de prueba
--   Correo:      reciclador.prueba@verdeapp.com
--   Contraseña:  AdminVerde2026*
--   Ya autorizado en: TORRES DE ARANJUEZ (Usaquén, conjunto #1)
--
INSERT INTO usuarios (id_rol, correo_electronico, password, is_active) VALUES
(4, 'admin.conjunto.prueba@verdeapp.com', '$2b$12$xSluyevTDoPhwiydwB3OhetVHh1miUiGivw99ChVJxBGl.zaC6EMW', true),
(3, 'reciclador.prueba@verdeapp.com', '$2b$12$xSluyevTDoPhwiydwB3OhetVHh1miUiGivw99ChVJxBGl.zaC6EMW', true)
ON CONFLICT DO NOTHING;

INSERT INTO administradores_conjunto (id_usuario, nombre, apellidos, numero_telefonico)
SELECT id_usuario, 'ADMIN', 'DE PRUEBA', '3000000000'
FROM usuarios WHERE correo_electronico = 'admin.conjunto.prueba@verdeapp.com'
ON CONFLICT DO NOTHING;

INSERT INTO recicladores (id_usuario, localidad_id, nombre, apellidos, numero_telefonico, asociacion)
SELECT id_usuario, 1, 'RECICLADOR', 'DE PRUEBA', '3000000001', 'INDEPENDIENTE'
FROM usuarios WHERE correo_electronico = 'reciclador.prueba@verdeapp.com'
ON CONFLICT DO NOTHING;

-- ¿Qué? Vincula al Admin de Conjunto de prueba con el conjunto #1
--       (TORRES DE ARANJUEZ, el primero insertado en Usaquén).
INSERT INTO administradores_conjuntos (id_administrador, id_conjunto_residencial)
SELECT ac.id_administrador, 1
FROM administradores_conjunto ac
JOIN usuarios u ON u.id_usuario = ac.id_usuario
WHERE u.correo_electronico = 'admin.conjunto.prueba@verdeapp.com'
ON CONFLICT DO NOTHING;

-- ¿Qué? Vincula directamente al Reciclador de prueba con el conjunto #1,
--       como si ya hubiera aceptado una invitación — listo para probar
--       el resto de la app sin repetir el flujo de invitación cada vez.
INSERT INTO recicladores_conjuntos (id_reciclador, id_conjunto_residencial)
SELECT r.id_reciclador, 1
FROM recicladores r
JOIN usuarios u ON u.id_usuario = r.id_usuario
WHERE u.correo_electronico = 'reciclador.prueba@verdeapp.com'
ON CONFLICT DO NOTHING;
-- Usuario 3 — Residente de prueba
--   Correo:      residente.prueba@verdeapp.com
--   Contraseña:  AdminVerde2026*
--   Conjunto:    TORRES DE ARANJUEZ (mismo que el reciclador de prueba → pueden notificarse)
INSERT INTO usuarios (id_rol, correo_electronico, password, is_active) VALUES
(2, 'residente.prueba@verdeapp.com', '$2b$12$xSluyevTDoPhwiydwB3OhetVHh1miUiGivw99ChVJxBGl.zaC6EMW', true)
ON CONFLICT DO NOTHING;

-- Unidad para el residente de prueba en Torres de Aranjuez
INSERT INTO unidades (id_conjunto_residencial, torre, apto)
SELECT id_conjunto_residencial, 'Torre A', '101'
FROM conjuntos_residenciales
WHERE nombre_conjunto = 'TORRES DE ARANJUEZ'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Perfil del residente de prueba
INSERT INTO residentes (id_usuario, id_unidad, nombre, apellidos, numero_telefonico)
SELECT
    u.id_usuario,
    un.id_unidad,
    'RESIDENTE',
    'DE PRUEBA',
    '3000000002'
FROM usuarios u
CROSS JOIN (
    SELECT un2.id_unidad
    FROM unidades un2
    JOIN conjuntos_residenciales c ON c.id_conjunto_residencial = un2.id_conjunto_residencial
    WHERE c.nombre_conjunto = 'TORRES DE ARANJUEZ'
      AND un2.torre = 'Torre A' AND un2.apto = '101'
    LIMIT 1
) un
WHERE u.correo_electronico = 'residente.prueba@verdeapp.com'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 🧪 FIN DE LA SECCIÓN DE USUARIOS SEMILLA DE PRUEBA — borrar hasta aquí.
-- ============================================================================

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
