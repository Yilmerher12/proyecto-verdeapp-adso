# RNF-002 — Disponibilidad del Sistema

---

## Identificación

| Campo             | Valor                                                  |
| ----------------- | ------------------------------------------------------ |
| **ID** | RNF-002                                                |
| **Nombre** | Disponibilidad del Sistema                             |
| **Categoría** | Infraestructura / Rendimiento                          |
| **Prioridad** | Alta                                                   |
| **Estado** | Parcial                                                |

---

## Requisitos

### RNF-002.1 — Uptime (Tiempo de actividad)
El sistema debe garantizar una disponibilidad operativa del **99.9%** (SLA) para asegurar la continuidad del servicio de coordinación entre residentes y recicladores.

### RNF-002.2 — Alojamiento en la nube
La infraestructura tecnológica (backend, frontend y base de datos) debe estar desplegada en un servidor o proveedor de servicios en la nube para asegurar la redundancia y reducir los puntos únicos de fallo físico.

### RNF-002.3 — Recuperación ante desastres
Se deben configurar copias de seguridad (backups) automáticas de la base de datos PostgreSQL de forma periódica para permitir la recuperación de la información en caso de una falla crítica del servidor.

### RNF-002.4 — Manejo de errores de red
El frontend en React debe implementar un manejo de estado adecuado que informe al usuario si el servidor no está disponible temporalmente (ej. "Error de conexión con el servidor"), evitando que la aplicación se congele o muestre pantallas en blanco.

> **Estado real (2026-08-28)**: **Implementado.** `fe/src/components/ui/ServerErrorBanner.tsx` + `fe/src/lib/serverStatusEvents.ts` + los interceptores de `fe/src/api/axios.ts` cubren exactamente esto. Los otros 3 sub-requisitos (002.1 SLA medido, 002.2 despliegue en la nube, 002.3 backups automáticos) siguen sin implementar — el proyecto hoy solo corre localmente con `docker-compose.yml` (con healthcheck de Postgres y `restart: unless-stopped`, pero sin monitoreo de uptime, sin nube, y sin backups programados). Por eso el Estado general de este RNF es "Parcial", no "Por implementar" ni "Implementado".

> **Actualización (issue #378, 2026-10-05):** el banner de arriba cubre los errores de red, pero no los errores al dibujar una pantalla (ej. una fecha inválida que llega del backend). Esos desmontaban toda la app y dejaban la página en blanco (hallazgo CN-043 del informe de seguridad Cyber Neo). Ahora `fe/src/components/ErrorBoundary.tsx` los atrapa y muestra una pantalla de recuperación (`ErrorFallback.tsx`, en ES/EN) con botones para recargar la página o volver al panel principal. Va en dos lugares: dentro de `AppShell`, alrededor de cada página, para que el menú lateral siga funcionando y el error se limpie al navegar a otra opción; y en `App.tsx`, alrededor de todas las rutas, para las páginas públicas y para un error del propio `AppShell`. El detalle técnico del error solo queda en la consola del navegador, no se le muestra al usuario.