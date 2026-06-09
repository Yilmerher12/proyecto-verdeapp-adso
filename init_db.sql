-- ========================================================
-- Módulo: init_db.sql
-- Descripción: Inicialización de la base de datos VerdeApp.
-- ¿Para qué? Crear la estructura de tablas y precargar datos maestros obligatorios.
-- ¿Impacto? Permite que el sistema funcione en cualquier máquina con un solo comando Docker.
-- ========================================================

-- ────────────────────────────────────────────────────────
-- 📌 1. TABLAS INDEPENDIENTES (Sin Llaves Foráneas)
-- ────────────────────────────────────────────────────────

-- ¿Qué? Tabla de roles del sistema.
CREATE TABLE IF NOT EXISTS roles (
    id_rol INT PRIMARY KEY,
    tipo_rol VARCHAR(50) UNIQUE NOT NULL
);

-- ¿Qué? Tabla de localidades de Bogotá.
CREATE TABLE IF NOT EXISTS localidades (
    id_localidad SERIAL PRIMARY KEY,
    nombre_localidad VARCHAR(100) NOT NULL
);

-- ¿Qué? Tabla de catálogo de artículos educativos.
CREATE TABLE IF NOT EXISTS contenido_educativo (
    id_contenido SERIAL PRIMARY KEY,
    modulo_categoria VARCHAR(255) NOT NULL,
    titulo_tema VARCHAR(255) NOT NULL,
    cuerpo_texto TEXT NOT NULL,
    fecha_publicacion DATE NOT NULL
);

-- ────────────────────────────────────────────────────────
-- 📌 2. TABLAS CENTRALES DE SEGURIDAD
-- ────────────────────────────────────────────────────────

-- ¿Qué? Tabla central de credenciales de acceso.
-- ¿Impacto? Se incluyó 'is_active' para soportar el borrado lógico del sistema.
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    id_rol INT NOT NULL,
    correo_electronico VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_usuarios_roles FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
);

-- ¿Qué? Tabla de tokens para confirmación de correos electrónicos.
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id VARCHAR(36) PRIMARY KEY,
    id_usuario INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tokens_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- ¿Qué? Tabla de tokens para restablecimiento de contraseñas.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id VARCHAR(36) PRIMARY KEY,
    id_usuario INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_resets_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────
-- 📌 3. INFRAESTRUCTURA Y GEOGRAFÍA
-- ────────────────────────────────────────────────────────

-- ¿Qué? Tabla de conjuntos residenciales asociados a localidades.
CREATE TABLE IF NOT EXISTS conjuntos_residenciales (
    id_conjunto_residencial SERIAL PRIMARY KEY,
    id_localidad INT NOT NULL,
    nombre_conjunto VARCHAR(255) NOT NULL,
    nit VARCHAR(50),
    direccion VARCHAR(255) NOT NULL,
    CONSTRAINT fk_conjuntos_localidades FOREIGN KEY (id_localidad) REFERENCES localidades(id_localidad)
);

-- ¿Qué? Tabla de unidades habitacionales (Torre/Apto) de los conjuntos.
CREATE TABLE IF NOT EXISTS unidades (
    id_unidad SERIAL PRIMARY KEY,
    id_conjunto_residencial INT NOT NULL,
    torre VARCHAR(50) NOT NULL,
    apto VARCHAR(50) NOT NULL,
    CONSTRAINT fk_unidades_conjuntos FOREIGN KEY (id_conjunto_residencial) REFERENCES conjuntos_residenciales(id_conjunto_residencial)
);

-- ¿Qué? Tabla de directorios públicos de reciclaje de la alcaldía.
CREATE TABLE IF NOT EXISTS puntos_acopios (
    id_punto_acopio SERIAL PRIMARY KEY,
    id_localidad INT NOT NULL,
    nombre_encargado VARCHAR(100),
    direccion VARCHAR(255) NOT NULL,
    telefono_contacto VARCHAR(15),
    CONSTRAINT fk_puntos_localidades FOREIGN KEY (id_localidad) REFERENCES localidades(id_localidad)
);

-- ────────────────────────────────────────────────────────
-- 📌 4. PERFILES EXTENDIDOS (Relación 1:1 con Usuarios)
-- ────────────────────────────────────────────────────────

-- ¿Qué? Datos personales de los residentes.
CREATE TABLE IF NOT EXISTS residentes (
    id_residente SERIAL PRIMARY KEY,
    id_usuario INT UNIQUE NOT NULL,
    id_unidad INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100) NOT NULL,
    numero_telefonico VARCHAR(15),
    CONSTRAINT fk_residentes_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    CONSTRAINT fk_residentes_unidades FOREIGN KEY (id_unidad) REFERENCES unidades(id_unidad)
);

-- ¿Qué? Datos personales de los recicladores de oficio.
-- 🛠️ ACTUALIZADO: Inclusión del campo localidad_id para cruce geográfico
CREATE TABLE IF NOT EXISTS recicladores (
    id_reciclador SERIAL PRIMARY KEY,
    id_usuario INT UNIQUE NOT NULL,
    localidad_id INT,
    nombre VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100) NOT NULL,
    asociacion VARCHAR(255),
    CONSTRAINT fk_recicladores_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    CONSTRAINT fk_recicladores_localidades FOREIGN KEY (localidad_id) REFERENCES localidades(id_localidad)
);

-- ────────────────────────────────────────────────────────
-- 📌 5. TABLAS INTERMEDIAS (Muchos a Muchos)
-- ────────────────────────────────────────────────────────

-- ¿Qué? Relación entre los recicladores autorizados y sus conjuntos asignados.
CREATE TABLE IF NOT EXISTS recicladores_conjuntos (
    id_reciclador INT NOT NULL,
    id_conjunto_residencial INT NOT NULL,
    PRIMARY KEY (id_reciclador, id_conjunto_residencial),
    CONSTRAINT fk_intermedia_reciclador FOREIGN KEY (id_reciclador) REFERENCES recicladores(id_reciclador),
    CONSTRAINT fk_intermedia_conjunto FOREIGN KEY (id_conjunto_residencial) REFERENCES conjuntos_residenciales(id_conjunto_residencial)
);

-- ========================================================
-- 📌 6. SEMILLAS (DATA SEEDING)
-- ========================================================

-- ¿Qué? Datos de configuración obligatorios iniciales.
INSERT INTO roles (id_rol, tipo_rol) VALUES 
(1, 'ADMINISTRADOR'), 
(2, 'RESIDENTE'), 
(3, 'RECICLADOR') 
ON CONFLICT DO NOTHING;

INSERT INTO localidades (id_localidad, nombre_localidad) VALUES 
(1, 'Usaquén'), (2, 'Chapinero'), (3, 'Santa Fe'), (4, 'San Cristóbal'), 
(5, 'Usme'), (6, 'Tunjuelito'), (7, 'Bosa'), (8, 'Kennedy'), 
(9, 'Fontibón'), (10, 'Engativá'), (11, 'Suba') 
ON CONFLICT DO NOTHING;


-- Limpiar inserciones previas de infraestructura para pruebas limpias
DELETE FROM unidades;
DELETE FROM conjuntos_residenciales;

-- 1. Usaquén
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion) VALUES 
(1, 'TORRES DE ARANJUEZ', '900123456-1', 'Calle 165 # 7-30'),
(1, 'ALAMEDA DE SANTA BÁRBARA', '900123456-2', 'Carrera 15 # 119-45');

-- 2. Chapinero
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion) VALUES 
(2, 'CONJUNTO RESIDENCIAL EL CASTILLO', '900123456-3', 'Calle 72 # 4-15'),
(2, 'RESERVA DE CHAPINERO', '900123456-4', 'Carrera 13 # 58-20');

-- 3. Santa Fe
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion) VALUES 
(3, 'TORRES DE SAN JUAN', '900123456-5', 'Calle 22 # 3-45'),
(3, 'BALCONES DE SANTA FE', '900123456-6', 'Carrera 6 # 14-10');

-- 4. San Cristóbal
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion) VALUES 
(4, 'PORTAL DE SAN CRISTÓBAL', '900123456-7', 'Calle 11 Sur # 11-25'),
(4, 'MIRADOR DE LOS ALPES', '900123456-8', 'Carrera 8 Altas # 34-12S');

-- 5. Usme
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion) VALUES 
(5, 'QUINTAS DE SOTAVENTO', '900123456-9', 'Calle 81S # 1-40'),
(5, 'VALLES DE USME II', '900123456-10', 'Carrera 14 # 93S-15');

-- 6. Tunjuelito
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion) VALUES 
(6, 'CIUDAD TUNAL - CLUSTER 4', '900123456-11', 'Calle 48B Sur # 24-50'),
(6, 'PORTAL DE TUNJUELITO', '900123456-12', 'Carrera 25 # 52S-05');

-- 7. Bosa
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion) VALUES 
(7, 'PARQUES DE BOGOTÁ - CIPRÉS', '900123456-13', 'Carrera 95A # 73S-10'),
(7, 'RECREO DE LOS ALMENDROS', '900123456-14', 'Calle 71S # 92-05');

-- 8. Kennedy
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion) VALUES 
(8, 'TINTAL PLAZA CONJUNTO 1', '900123456-15', 'Carrera 86 # 6C-10'),
(8, 'PORTAL DE LAS AMÉRICAS', '900123456-16', 'Calle 42S # 80-55');

-- 9. Fontibón
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion) VALUES 
(9, 'ALAMEDA DE FONTIBÓN', '900123456-17', 'Calle 17 # 103-45'),
(9, 'RESERVA DEL TINTAL', '900123456-18', 'Carrera 98 # 22I-10');

-- 10. Engativá
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion) VALUES 
(10, 'CIUDAD BACHUÉ ETAPA II', '900123456-19', 'Calle 90 # 95-20'),
(10, 'ALMENDROS DE ENTRERÍOS', '900123456-20', 'Carrera 110 # 80-45');

-- 11. Suba
INSERT INTO conjuntos_residenciales (id_localidad, nombre_conjunto, nit, direccion) VALUES 
(11, 'CEREZOS DE SUBA', '900123456-21', 'Calle 145 # 91-34'),
(11, 'ALTOS DE CHALETS', '900123456-22', 'Carrera 111A # 130-22');

-- ¿Qué? Superadministrador oficial compartido para el equipo de desarrollo.
-- Contraseña hasheada: AdminVerde2026*
INSERT INTO usuarios (id_rol, correo_electronico, password, is_active) 
VALUES (1, 'admin@verdeapp.com', '$2b$12$xSluyevTDoPhwiydwB3OhetVHh1miUiGivw99ChVJxBGl.zaC6EMW', true) 
ON CONFLICT DO NOTHING;