# Matriz de Prioridad — VerdeApp

## Análisis de la Matriz

**Prioridad Alta:** Historias que bloquean el funcionamiento del sistema (Auth, Alertas críticas, Gestión admin de puntos de acopio).

**Prioridad Media:** Historias de consulta o información (Catálogos, Directorios, Perfil).

**Prioridad Baja:** Funcionalidades de soporte o cierre (Cerrar sesión, Calificaciones).

## Criterios de Complejidad

**Alta:** Lógica de negocio pesada, manejo de notificaciones en tiempo real, concurrencia o integridad referencial estricta.

**Media:** Operaciones CRUD estándar con validaciones de formulario.

**Baja:** Operaciones simples de lectura o formularios de actualización directa.

> Alta Importancia + Baja/Media Complejidad = Prioridad Alta (se programa primero).

## Tabla de Priorización

| #  | Historia de Usuario       | Importancia | Complejidad | Prioridad      |
| -- | ------------------------- | ----------- | ----------- | -------------- |
| 1  | HU01: Inicio de Sesión    | Alta        | Baja        | Must (Alta)    |
| 2  | HU02: Registro de Usuario | Alta        | Media       | Must (Alta)    |
| 3  | HU03: Reporte SHUT Lleno  | Alta        | Alta        | Must (Alta)    |
| 4  | HU04: Catálogo Educativo  | Media       | Baja        | Should (Media) |
| 5  | HU05: Directorio Integral | Media       | Baja        | Should (Media) |
| 6  | HU06: Llegada Reciclador  | Alta        | Alta        | Must (Alta)    |
| 7  | HU07: Cerrar Sesión       | Baja        | Baja        | Could (Baja)   |
| 8  | HU08: Actualizar Perfil   | Media       | Baja        | Should (Media) |
| 9  | HU09: Semáforo Gestión    | Baja        | Baja        | Could (Baja)   |
| 10 | HU10: Gestión Educación   | Media       | Media       | Should (Media) |
| 11 | HU11: Gestión Directorio  | Alta        | Media       | Must (Alta)    |
