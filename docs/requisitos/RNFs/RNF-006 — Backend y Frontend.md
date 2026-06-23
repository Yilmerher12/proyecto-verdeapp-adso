# RNF-006 — Backend y Frontend

---

## Identificación

| Campo         | Valor                    |
| ------------- | ------------------------ |
| **ID**        | RNF-006                  |
| **Nombre**    | Backend y Frontend       |
| **Categoría** | Arquitectura de Software |
| **Prioridad** | Crítica                  |
| **Estado**    | Implementado          |

---

## Requisitos

### RNF-006.1 — Arquitectura Cliente-Servidor

El sistema debe construirse bajo un modelo de arquitectura distribuida Cliente-Servidor, donde la interfaz de usuario permanezca completamente desacoplada de la lógica de negocio y de la persistencia de datos, estableciendo comunicación mediante una **API RESTful**.

### RNF-006.2 — Stack de Backend

El servidor (Backend) debe desarrollarse utilizando **Python 3.12** junto con el framework **FastAPI**, siendo responsable de:

* Implementación de la lógica de negocio.
* Exposición de endpoints REST.
* Validación de datos mediante esquemas tipados.
* Gestión de autenticación y autorización mediante JWT.
* Integración con la capa de persistencia utilizando SQLAlchemy ORM.
* Procesamiento asíncrono para optimizar rendimiento y escalabilidad.

### RNF-006.3 — Seguridad del Backend

El backend debe implementar mecanismos de seguridad mediante:

* **JWT (JSON Web Tokens)** para autenticación basada en sesiones seguras.
* **bcrypt** para el almacenamiento seguro de contraseñas mediante algoritmos de hash.
* Validaciones de acceso basadas en roles y permisos del sistema.

### RNF-006.4 — Stack de Frontend

El cliente (Frontend) debe desarrollarse utilizando:

* **React** como biblioteca principal para la construcción de interfaces.
* **TypeScript** para tipado estático y reducción de errores en tiempo de ejecución.
* **TailwindCSS** para la implementación de estilos bajo un enfoque Utility-First.
* **pnpm** como gestor de dependencias para optimizar el rendimiento y manejo de paquetes.

### RNF-006.5 — Contenerización e Infraestructura

Los componentes del sistema deben ejecutarse mediante contenedores **Docker** y administrarse mediante **Docker Compose**, garantizando consistencia entre entornos de desarrollo, pruebas y despliegue.

### RNF-006.6 — Distribución del Frontend

La distribución y publicación de los recursos estáticos del frontend debe realizarse mediante **Nginx**, permitiendo una entrega eficiente de contenido y mejor desempeño de la aplicación.

### RNF-006.7 — Servicios de Desarrollo

Durante los entornos de desarrollo y pruebas, el sistema debe utilizar **Mailpit** para la captura y visualización local de correos electrónicos relacionados con procesos como activación de cuentas y recuperación de credenciales.
