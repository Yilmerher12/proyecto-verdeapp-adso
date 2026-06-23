# Aplicación del Desarrollo Iterativo

Para este proyecto, el desarrollo iterativo permite gestionar la complejidad de las funcionalidades (notificaciones, autenticación, directorios) de forma controlada.

- **Ciclos de trabajo (Sprints):** Se trabaja en ciclos de 1 a 2 semanas. En cada ciclo, el equipo realiza: Planificación, Desarrollo, Pruebas y Revisión.

- **Enfoque de Valor Incremental:** En lugar de construir todo el sistema de una vez, cada iteración entrega una versión funcional (Mínimo Producto Viable - MVP) que permite validar una parte del flujo operativo antes de pasar a la siguiente, reduciendo riesgos técnicos.

- **Refactorización continua:** Gracias al uso de Alembic para la base de datos y la naturaleza modular de React, se puede ajustar el esquema de datos y los componentes de la interfaz según las necesidades detectadas en cada iteración.

| Entrega                          | Foco Funcional                      | Objetivo                                                                                                                        |
| -------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Entrega 1: Núcleo de Identidad   | RQF-001, RQF-002, RQF-007, RQF-008 | Configurar autenticación segura (JWT/bcrypt), registro de usuarios y gestión básica de perfil.                                  |
| Entrega 2: Operación Crítica     | RQF-003, RQF-006, RQF-009          | Implementar la lógica bidireccional de alertas (SHUT y llegada del reciclador) y el semáforo de gestión.                        |
| Entrega 3: Información y Admin   | RQF-004, RQF-005, RQF-010, RQF-011 | Desplegar el catálogo educativo, el directorio de puntos de acopio y los paneles de administración para gestionar estos datos.  |

## Estrategia de Retroalimentación

Para asegurar la mejora continua, se emplean tres mecanismos al finalizar cada entrega:

- **Pruebas de Aceptación (UAT):** Al terminar cada entrega, se presenta el software a un grupo piloto de residentes y recicladores en un entorno de pruebas (Staging). El objetivo es verificar si el flujo de, por ejemplo, "notificación de SHUT" es intuitivo.

- **Encuestas In-App:** Se integra un formulario breve tras realizar acciones clave (como calificar un conjunto en el semáforo), permitiendo al usuario reportar dificultades técnicas o de usabilidad de forma inmediata.

- **Análisis de Logs y Telemetría:** Se monitorean puntos de fricción (ej. abandono en el registro durante la verificación de correo). Si los datos muestran una caída, se realizan ajustes técnicos en la siguiente iteración para optimizar el flujo.
