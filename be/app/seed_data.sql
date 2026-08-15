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
-- 📍 PUNTOS LIMPIOS / PUNTOS DE ACOPIO — Bogotá (fuente: UAESP)
-- ============================================================================
DELETE FROM puntos_acopios;

INSERT INTO puntos_acopios (id_localidad, nombre, direccion, telefono_contacto) VALUES
-- 1. Usaquén
(1,  'Punto Limpio Usaquén Centro',         'Calle 119 # 6-22',               '3165551001'),
(1,  'Punto Limpio Santa Bárbara',           'Carrera 15 # 127-40',            '3165551002'),
-- 2. Chapinero
(2,  'Punto Limpio Chapinero Alto',          'Calle 67 # 9-38',                '3165551003'),
(2,  'Punto Limpio El Lago',                 'Carrera 13 # 64-15',             '3165551004'),
-- 3. Santa Fe
(3,  'Punto Limpio La Candelaria Sur',       'Calle 19 # 4-10',                '3165551005'),
(3,  'Punto Limpio Las Cruces',              'Carrera 5 # 12B-20',             '3165551006'),
-- 4. San Cristóbal
(4,  'Punto Limpio San Cristóbal Norte',     'Calle 26 Sur # 8-34',            '3165551007'),
(4,  'Punto Limpio Los Alpes',               'Carrera 11 # 44 Sur-05',         '3165551008'),
-- 5. Usme
(5,  'Punto Limpio Usme Centro',             'Calle 91 Sur # 14-23',           '3165551009'),
(5,  'Punto Limpio Gran Yomasa',             'Carrera 13A # 97B Sur-10',       '3165551010'),
-- 6. Tunjuelito
(6,  'Punto Limpio Abraham Lincoln',         'Calle 52 Sur # 22-45',           '3165551011'),
(6,  'Punto Limpio Venecia',                 'Carrera 24 # 48B Sur-12',        '3165551012'),
-- 7. Bosa
(7,  'Punto Limpio Bosa Centro',             'Calle 68F Sur # 80B-05',         '3165551013'),
(7,  'Punto Limpio El Recreo',               'Carrera 95 # 75B Sur-20',        '3165551014'),
-- 8. Kennedy
(8,  'Punto Limpio Kennedy Central',         'Calle 38A Sur # 74-15',          '3165551015'),
(8,  'Punto Limpio Tintal',                  'Carrera 86 # 42B Sur-08',        '3165551016'),
-- 9. Fontibón
(9,  'Punto Limpio Fontibón Centro',         'Carrera 99 # 17-30',             '3165551017'),
(9,  'Punto Limpio Capellanía',              'Calle 19 # 107-50',              '3165551018'),
-- 10. Engativá
(10, 'Punto Limpio Engativá Centro',         'Carrera 112 # 80A-22',           '3165551019'),
(10, 'Punto Limpio Álamos Norte',            'Calle 83 # 95-10',               '3165551020'),
-- 11. Suba
(11, 'Punto Limpio Suba Centro',             'Carrera 91 # 148-14',            '3165551021'),
(11, 'Punto Limpio Lisboa',                  'Calle 134 # 107-30',             '3165551022'),
-- 12. Barrios Unidos
(12, 'Punto Limpio Los Andes',               'Calle 72 # 52-18',               '3165551023'),
(12, 'Punto Limpio La Castellana',           'Carrera 50 # 80-40',             '3165551024'),
-- 13. Teusaquillo
(13, 'Punto Limpio Palermo',                 'Calle 47 # 25-12',               '3165551025'),
(13, 'Punto Limpio Galerías',                'Carrera 29 # 53-20',             '3165551026'),
-- 14. Los Mártires
(14, 'Punto Limpio La Favorita',             'Calle 9 # 20-35',                '3165551027'),
(14, 'Punto Limpio Ricaurte',                'Carrera 22 # 13-15',             '3165551028'),
-- 15. Antonio Nariño
(15, 'Punto Limpio Restrepo',                'Calle 16 Sur # 25-08',           '3165551029'),
(15, 'Punto Limpio Ciudad Jardín Sur',       'Carrera 28 # 19B Sur-05',        '3165551030'),
-- 16. Puente Aranda
(16, 'Punto Limpio Zona Industrial',         'Calle 13 # 52-40',               '3165551031'),
(16, 'Punto Limpio San Rafael',              'Carrera 57 # 6-25',              '3165551032'),
-- 17. La Candelaria
(17, 'Punto Limpio Centro Histórico',        'Calle 11 # 4-02',                '3165551033'),
-- 18. Rafael Uribe Uribe
(18, 'Punto Limpio Quiroga',                 'Calle 27B Sur # 17-10',          '3165551034'),
(18, 'Punto Limpio Marco Fidel Suárez',      'Carrera 15 # 35 Sur-22',         '3165551035'),
-- 19. Ciudad Bolívar
(19, 'Punto Limpio Perdomo',                 'Calle 63 Sur # 20-45',           '3165551036'),
(19, 'Punto Limpio Lucero',                  'Carrera 18A # 68B Sur-12',       '3165551037'),
-- 20. Sumapaz
(20, 'Punto Limpio Nazareth',                'Vía Nazareth Km 2',              NULL)
ON CONFLICT DO NOTHING;
