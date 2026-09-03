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

-- ¿Qué? Superadministrador oficial — sembrado desde Python (sembrar_datos_uuid en seed.py).
-- ¿Para qué? usuarios.id_usuario ahora es UUIDv4, generado en Python — un
--           INSERT estático en este .sql no puede generarlo, así que este
--           INSERT se movió junto con los demás que necesitan un UUID nuevo
--           por fila.
-- Contraseña hasheada: AdminVerde2026*


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
-- ¿Qué? Los 9 puntos de acopio reales se siembran desde Python (mismo
--       motivo que el superadmin: puntos_acopios.id_punto_acopio ahora es
--       UUIDv4, generado en Python, no en este .sql estático).
DELETE FROM puntos_acopios;

-- ¿Qué? Los 6 módulos de contenido educativo real se siembran desde Python
--       (mismo motivo: contenido_educativo.id_contenido ahora es UUIDv4,
--       generado en Python, no en este .sql estático).
