# 📘 Diagrama de Clases - VerdeApp

## Descripción General

Este documento describe la estructura de clases del sistema **VerdeApp**, identificando atributos, métodos y relaciones entre las entidades principales del dominio.

---

# 📊 Diagrama de Clases

```mermaid
classDiagram

class Roles {
    +int id_rol
    +string tipo_rol

    +getIdRol()
    +getTipoRol()
    +setIdRol()
    +setTipoRol()
}

class Usuarios {
    +int id_usuario
    +int id_rol
    +string correo_electronico
    +string password

    +getIdUsuario()
    +getIdRol()
    +getCorreoElectronico()
    +getPassword()

    +setIdUsuario()
    +setIdRol()
    +setCorreoElectronico()
    +setPassword()

    +registrarUsuario()
    +validarCredenciales()
    +cerrarSesion()
    +encriptarPassword()
}

class Residentes {
    +int id_residente
    +int id_usuario
    +int id_unidad
    +string nombre
    +string apellido_materno
    +string apellido_paterno
    +string numero_telefonico

    +getIdResidente()
    +getIdUsuario()
    +getIdUnidad()
    +getNombreResidente()
    +getApellidoMaterno()
    +getApellidoPaterno()
    +getNumeroTelefonico()

    +setIdResidente()
    +setIdUsuario()
    +setIdUnidad()
    +setNombreResidente()
    +setApellidoMaterno()
    +setApellidoPaterno()
    +setNumeroTelefonico()

    +actualizarPerfil()
}

class Recicladores {
    +int id_reciclador
    +int id_usuario
    +int id_localidad
    +string nombre
    +string apellido_materno
    +string apellido_paterno
    +string asociacion

    +getIdReciclador()
    +getIdUsuario()
    +getIdLocalidad()
    +getNombreReciclador()
    +getApellidoMaterno()
    +getApellidoPaterno()

    +setIdReciclador()
    +setIdUsuario()
    +setIdLocalidad()

    +enviarNotificacionLlegada()
    +enviarNotificacionCapacidadMaxima()
    +actualizarPerfil()
}

class Localidades {
    +int id_localidad
    +string nombre_localidad

    +getNombreLocalidad()
    +setIdLocalidad()
    +setNombreLocalidad()
}

class ConjuntosResidenciales {
    +int id_conjunto_residencial
    +int id_localidad
    +string nombre_conjunto
    +string nit
    +string direccion

    +getIdConjuntoResidencial()
    +getNombreConjunto()
    +getNitConjunto()
    +getDireccionConjunto()

    +setNombreConjunto()
    +setNitConjunto()
    +setDireccionConjunto()
}

class Unidades {
    +int id_unidad
    +int id_conjunto_residencial
    +string torre
    +string apto

    +getIdUnidad()
    +getTorreUnidad()
    +getAptoUnidad()

    +setTorreUnidad()
    +setAptoUnidad()
}

class PuntoAcopios {
    +int id_punto_acopio
    +int id_localidad
    +string nombre_encargado
    +string nombre_punto_acopio
    +string direccion
    +string datos_contacto

    +getIdPuntoAcopio()
    +getNombrePuntoAcopio()
    +getDireccionPuntoAcopio()
    +getDatosContacto()

    +setNombrePuntoAcopio()
    +setDireccionPuntoAcopio()
    +setDatosContacto()
}

class ContenidoEducativo {
    +int id_contenido
    +string modulo_categoria
    +string titulo_tema
    +text cuerpo_texto
    +date fecha_publicacion

    +getIdContenido()
    +getModuloCategoria()
    +getTituloTema()
    +getFechaPublicacion()
    +getCuerpoTexto()

    +setModuloCategoria()
    +setTituloTema()
    +setCuerpoTexto()
    +setFechaPublicacion()
}

Roles "1" --> "*" Usuarios
Usuarios "1" --> "1" Residentes
Usuarios "1" --> "1" Recicladores

Localidades "1" --> "*" ConjuntosResidenciales
Localidades "1" --> "*" PuntoAcopios

ConjuntosResidenciales "1" --> "*" Unidades
Unidades "1" --> "*" Residentes

Localidades "1" --> "*" Recicladores
```

---

# 📋 Descripción de Clases

## Roles

Representa los tipos de usuario disponibles en la plataforma.

### Responsabilidades

* Identificar permisos del usuario.
* Clasificar usuarios según su función dentro del sistema.

---

## Usuarios

Gestiona la autenticación y acceso a la plataforma.

### Responsabilidades

* Registro de usuarios.
* Inicio de sesión.
* Validación de credenciales.
* Cierre de sesión.
* Gestión de contraseñas.

---

## Residentes

Representa los habitantes de los conjuntos residenciales.

### Responsabilidades

* Consultar información del sistema.
* Reportar novedades.
* Actualizar datos personales.

---

## Recicladores

Representa los recicladores vinculados al sistema.

### Responsabilidades

* Recibir alertas.
* Notificar llegada a conjuntos.
* Gestionar su perfil.

---

## Localidades

Representa las localidades registradas en el sistema.

### Responsabilidades

* Organizar geográficamente conjuntos residenciales.
* Organizar puntos de acopio.
* Asociar recicladores a una zona determinada.

---

## ConjuntosResidenciales

Representa los conjuntos registrados en la plataforma.

### Responsabilidades

* Agrupar unidades residenciales.
* Mantener información institucional.

---

## Unidades

Representa apartamentos o unidades habitacionales.

### Responsabilidades

* Asociar residentes a un conjunto residencial.

---

## PuntoAcopios

Representa los puntos autorizados para entrega de material reciclable.

### Responsabilidades

* Registrar ubicación.
* Registrar encargado.
* Mantener datos de contacto.

---

## ContenidoEducativo

Representa los módulos educativos publicados en la plataforma.

### Responsabilidades

* Gestionar contenido informativo.
* Almacenar publicaciones educativas.

---

# 🔗 Relaciones Entre Clases

| Clase Origen           | Clase Destino          | Relación |
| ---------------------- | ---------------------- | -------- |
| Roles                  | Usuarios               | 1 : N    |
| Usuarios               | Residentes             | 1 : 1    |
| Usuarios               | Recicladores           | 1 : 1    |
| Localidades            | ConjuntosResidenciales | 1 : N    |
| Localidades            | PuntoAcopios           | 1 : N    |
| Localidades            | Recicladores           | 1 : N    |
| ConjuntosResidenciales | Unidades               | 1 : N    |
| Unidades               | Residentes             | 1 : N    |

---

# 📌 Observaciones

* El modelo sigue una estructura orientada a objetos alineada con la base de datos del proyecto.
* La clase `Usuarios` centraliza los procesos de autenticación.
* Las clases `Residentes` y `Recicladores` representan perfiles especializados asociados a un usuario.
* La clase `ContenidoEducativo` funciona como entidad independiente para la gestión de publicaciones.
* Las relaciones mantienen coherencia con el modelo entidad-relación definido para VerdeApp.
