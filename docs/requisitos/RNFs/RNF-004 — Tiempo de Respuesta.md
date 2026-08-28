# RNF-004 — Tiempo de Respuesta

---

## Identificación

| Campo             | Valor                                                  |
| ----------------- | ------------------------------------------------------ |
| **ID** | RNF-004                                                |
| **Nombre** | Tiempo de Respuesta                                    |
| **Categoría** | Rendimiento (Performance)                              |
| **Prioridad** | Alta                                                   |
| **Estado** | Parcial                                                |

---

## Requisitos

### RNF-004.1 — Latencia Máxima de Peticiones
El sistema (conjunto de frontend, red, backend y base de datos) debe procesar y responder a las peticiones del cliente en un tiempo máximo de **2 segundos** bajo condiciones normales de carga.

### RNF-004.2 — Optimización de Consultas (Backend)
Las consultas a la base de datos PostgreSQL a través del backend en FastAPI deben estar indexadas y optimizadas para evitar cuellos de botella, especialmente en la lectura del directorio integral y la validación de conjuntos.

### RNF-004.3 — Feedback Visual (Frontend)
Para cualquier operación que requiera comunicación con el servidor y tome más de 500 milisegundos, el frontend en React debe mostrar un indicador de carga (spinner o skeleton loader) para informar al usuario que su solicitud está en proceso.

> **Nota (2026-08-28)**: implementado y verificado (issue #43). Se revisó toda la app — login, registro, los 4 dashboards, perfil, cambio/recuperación de contraseña, catálogo educativo, comunicados, novedades, formularios de auditoría, invitaciones y desvinculación — y todos esos flujos ya mostraban algún indicador de carga (spinner en `Button.tsx`, texto "Cargando...", botones deshabilitados durante el envío). Se encontró y corrigió un único hueco real: `DirectorioPage.tsx` mostraba brevemente "sin resultados" en vez de un indicador mientras resolvía la localidad del usuario, antes de empezar a cargar el directorio de verdad. Corregido inicializando el estado de carga en `true` desde el primer render.

### RNF-004.1 y RNF-004.2 — Latencia y optimización de consultas

> **Nota (2026-08-28)**: **sin verificar todavía**. Esta sesión solo cubrió el punto 004.3 (feedback visual del frontend). Confirmar que las peticiones responden en menos de 2 segundos, y que las consultas del directorio/validación de conjuntos están indexadas correctamente, requiere una medición real (tiempos de respuesta bajo carga, revisión de índices en Postgres) que no se hizo aquí — queda pendiente como una tarjeta aparte si se quiere cerrar el RNF-004 por completo.