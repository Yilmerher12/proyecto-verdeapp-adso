-- 1. Tablas independientes (Sin Llaves Foráneas)

CREATE TABLE roles (
    id_rol SERIAL PRIMARY KEY,
    tipo_rol VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE localidades (
    id_localidad SERIAL PRIMARY KEY,
    nombre_localidad VARCHAR(100) NOT NULL
);

CREATE TABLE contenido_educativo (
    id_contenido SERIAL PRIMARY KEY,
    modulo_categoria VARCHAR(255) NOT NULL,
    titulo_tema VARCHAR(255) NOT NULL,
    cuerpo_texto TEXT NOT NULL,
    fecha_publicacion DATE NOT NULL
);

-- 2. Tabla central de seguridad (Depende de roles)

CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    id_rol INT NOT NULL,
    correo_electronico VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    CONSTRAINT fk_usuarios_roles FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
);

-- 3. Tablas geográficas y de infraestructura (Dependen de localidades y conjuntos)

CREATE TABLE conjuntos_residenciales (
    id_conjunto_residencial SERIAL PRIMARY KEY,
    id_localidad INT NOT NULL,
    nombre_conjunto VARCHAR(255) NOT NULL,
    nit VARCHAR(50),
    direccion VARCHAR(255) NOT NULL,
    CONSTRAINT fk_conjuntos_localidades FOREIGN KEY (id_localidad) REFERENCES localidades(id_localidad)
);

CREATE TABLE unidades (
    id_unidad SERIAL PRIMARY KEY,
    id_conjunto_residencial INT NOT NULL,
    torre VARCHAR(50) NOT NULL,
    apto VARCHAR(50) NOT NULL,
    CONSTRAINT fk_unidades_conjuntos FOREIGN KEY (id_conjunto_residencial) REFERENCES conjuntos_residenciales(id_conjunto_residencial)
);

CREATE TABLE puntos_acopios (
    id_punto_acopio SERIAL PRIMARY KEY,
    id_localidad INT NOT NULL,
    nombre_encargado VARCHAR(100),
    direccion VARCHAR(255) NOT NULL,
    telefono_contacto VARCHAR(15),
    CONSTRAINT fk_puntos_localidades FOREIGN KEY (id_localidad) REFERENCES localidades(id_localidad)
);

-- 4. Tablas de Perfiles (Dependen de usuarios y unidades)

CREATE TABLE residentes (
    id_residente SERIAL PRIMARY KEY,
    id_usuario INT UNIQUE NOT NULL, -- UNIQUE garantiza la relación 1:1
    id_unidad INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100) NOT NULL,
    numero_telefonico VARCHAR(15),
    CONSTRAINT fk_residentes_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    CONSTRAINT fk_residentes_unidades FOREIGN KEY (id_unidad) REFERENCES unidades(id_unidad)
);

CREATE TABLE recicladores (
    id_reciclador SERIAL PRIMARY KEY,
    id_usuario INT UNIQUE NOT NULL, -- UNIQUE garantiza la relación 1:1
    nombre VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100) NOT NULL,
    asociacion VARCHAR(255),
    CONSTRAINT fk_recicladores_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

-- 5. Tabla Intermedia Muchos a Muchos (Depende de recicladores y conjuntos)

CREATE TABLE recicladores_conjuntos (
    id_reciclador INT NOT NULL,
    id_conjunto_residencial INT NOT NULL,
    PRIMARY KEY (id_reciclador, id_conjunto_residencial), -- Llave primaria compuesta
    CONSTRAINT fk_intermedia_reciclador FOREIGN KEY (id_reciclador) REFERENCES recicladores(id_reciclador),
    CONSTRAINT fk_intermedia_conjunto FOREIGN KEY (id_conjunto_residencial) REFERENCES conjuntos_residenciales(id_conjunto_residencial)
);