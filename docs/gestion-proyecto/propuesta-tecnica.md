# Propuesta Técnica — VerdeApp

## 1. Descripción General de la Solución

El proyecto VerdeApp surge como respuesta a la deficiente gestión de residuos en los conjuntos residenciales de Bogotá. Actualmente, la falta de comunicación entre residentes y recicladores genera ineficiencia en la recolección y desinformación sobre el reciclaje. La solución propuesta es una plataforma web que automatiza alertas de llenado de SHUT y notificaciones de llegada del reciclador, integrando un catálogo educativo que promueve la clasificación correcta en la fuente.

## 2. Objetivos del Proyecto

**Objetivo General:** Desarrollar un sistema de información web para automatizar la gestión de residuos y la educación ambiental en conjuntos residenciales.

**Objetivos Específicos:**
1. Diseñar el modelo relacional de base de datos para la gestión de usuarios, roles y conjuntos.
2. Construir una API robusta y asíncrona mediante FastAPI para la gestión de alertas y usuarios.
3. Implementar pruebas unitarias y funcionales para asegurar la estabilidad del sistema antes del despliegue.

## 3. Alcance Detallado (Matriz de Delimitación)

| Incluye (15 Funcionalidades)               | Exclusiones (8 explícitas)                         |
| ------------------------------------------ | -------------------------------------------------- |
| 1. Registro de usuario con validación.     | 1. No incluye App móvil nativa (iOS/Android).      |
| 2. Autenticación por roles (JWT).          | 2. No incluye pasarela de pagos.                   |
| 3. Edición de perfil de usuario.           | 3. No incluye chat privado en tiempo real.         |
| 4. Notificación visual de SHUT lleno.      | 4. No incluye integración con sistemas de cámaras. |
| 5. Notificación de llegada del reciclador. | 5. No incluye hardware de sensores IoT.            |
| 6. Visualización de catálogo educativo.    | 6. No incluye gestión de nómina de recicladores.   |
| 7. Buscador de puntos de acopio.           | 7. No incluye generación de reportes financieros.  |
| 8. Filtro de búsqueda por localidad.       | 8. No incluye traducción a otros idiomas.          |
| 9. Dashboard para Administrador.           | —                                                  |
| 10. Gestión de contenidos educativos.      | —                                                  |
| 11. Gestión de directorios de acopio.      | —                                                  |
| 12. Historial de reportes de residuos.     | —                                                  |
| 13. Sistema de calificación (Semáforo).    | —                                                  |
| 14. Recuperación de contraseña.            | —                                                  |
| 15. Cierre de sesión seguro.               | —                                                  |

## 4. Cronograma de Ejecución (4 Semanas)

| Fase                     | Semana 1 | Semana 2 | Semana 3 | Semana 4 | Entregable                              |
| ------------------------ | -------- | -------- | -------- | -------- | --------------------------------------- |
| Requerimientos y Diseño  | X        |          |          |          | Documento de requerimientos y diseño    |
| Desarrollo - Núcleo      |          | X        |          |          | Base de datos y servicios API iniciales |
| Desarrollo - Integración |          |          | X        |          | Interfaz web integrada                  |
| Pruebas y Despliegue     |          |          |          | X        | Enlace web funcional                    |

## 5. Presupuesto (Tabla Consolidada)

| Concepto        | Detalle Técnico                                   |     Valor (COP) |
| --------------- | ------------------------------------------------- | --------------: |
| Mano de Obra    | 4 desarrolladores (160 h c/u)                     |     $12.000.000 |
| Infraestructura | Hosting Render/VPS + Base de Datos PostgreSQL     |        $600.000 |
| Licencias       | Figma Pro + Jira                                  |        $500.000 |
| Servicios       | Dominio .com + Certificado SSL                    |        $150.000 |
| Imprevistos     | Fondo de contingencia (10%)                       |      $1.325.000 |
| **TOTAL**       |                                                   | **$14.575.000** |

## 6. Fichas Técnicas de Arquitectura

| Componente    | Característica       | Valor Técnico                 | Propósito                              |
| ------------- | -------------------- | ----------------------------- | -------------------------------------- |
| Frontend      | Framework / Lenguaje | React 18.x / TypeScript       | Interfaz interactiva y moderna.        |
| Backend       | Framework / Lenguaje | FastAPI 0.110.x / Python 3.12 | API de alto rendimiento.               |
| Base de Datos | Motor / Tipo         | PostgreSQL                    | Integridad y persistencia de datos.    |
| Comunicación  | Protocolo            | REST (JSON)                   | Intercambio de datos cliente-servidor. |
| Despliegue    | Hosting              | Docker / Render (Cloud)       | Puesta en marcha web.                  |
| Persistencia  | ORM                  | SQLAlchemy                    | Consultas seguras a la base de datos.  |
