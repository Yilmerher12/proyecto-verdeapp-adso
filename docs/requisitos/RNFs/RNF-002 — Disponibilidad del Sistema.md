# RNF-002 — Disponibilidad del Sistema

---

## Identificación

| Campo             | Valor                                                  |
| ----------------- | ------------------------------------------------------ |
| **ID** | RNF-002                                                |
| **Nombre** | Disponibilidad del Sistema                             |
| **Categoría** | Infraestructura / Rendimiento                          |
| **Prioridad** | Alta                                                   |
| **Estado** | Por implementar                                        |

---

## Requisitos

### RNF-002.1 — Uptime (Tiempo de actividad)
El sistema debe garantizar una disponibilidad operativa del **99.9%** (SLA) para asegurar la continuidad del servicio de coordinación entre residentes y recicladores.

### RNF-002.2 — Alojamiento en la nube
La infraestructura tecnológica (backend, frontend y base de datos) debe estar desplegada en un servidor o proveedor de servicios en la nube para asegurar la redundancia y reducir los puntos únicos de fallo físico.

### RNF-002.3 — Recuperación ante desastres
Se deben configurar copias de seguridad (backups) automáticas de la base de datos MySQL de forma periódica para permitir la recuperación de la información en caso de una falla crítica del servidor.

### RNF-002.4 — Manejo de errores de red
El frontend en React debe implementar un manejo de estado adecuado que informe al usuario si el servidor no está disponible temporalmente (ej. "Error de conexión con el servidor"), evitando que la aplicación se congele o muestre pantallas en blanco.