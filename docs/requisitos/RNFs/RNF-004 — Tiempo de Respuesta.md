# RNF-004 — Tiempo de Respuesta

---

## Identificación

| Campo             | Valor                                                  |
| ----------------- | ------------------------------------------------------ |
| **ID** | RNF-004                                                |
| **Nombre** | Tiempo de Respuesta                                    |
| **Categoría** | Rendimiento (Performance)                              |
| **Prioridad** | Alta                                                   |
| **Estado** | Por implementar                                        |

---

## Requisitos

### RNF-004.1 — Latencia Máxima de Peticiones
El sistema (conjunto de frontend, red, backend y base de datos) debe procesar y responder a las peticiones del cliente en un tiempo máximo de **2 segundos** bajo condiciones normales de carga.

### RNF-004.2 — Optimización de Consultas (Backend)
Las consultas a la base de datos MySQL a través de Spring Boot deben estar indexadas y optimizadas para evitar cuellos de botella, especialmente en la lectura del directorio integral y la validación de conjuntos.

### RNF-004.3 — Feedback Visual (Frontend)
Para cualquier operación que requiera comunicación con el servidor y tome más de 500 milisegundos, el frontend en React debe mostrar un indicador de carga (spinner o skeleton loader) para informar al usuario que su solicitud está en proceso.