# Matriz de Prioridad — VerdeApp

> ⚠️ **Nota sobre la numeración**: esta tabla usa la numeración de la
> planificación temprana del proyecto (HU01–HU11). Después se redactaron en
> detalle como 37 historias independientes en `docs/requisitos/HUs/`, y
> algunas filas de abajo hoy corresponden a varias historias reales a la
> vez (ver columna "Corresponde hoy a"). Se conserva como referencia
> histórica del análisis de prioridad — para el estado real, consultar
> `docs/requisitos/HUs/`.

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

| #  | Historia de Usuario       | Importancia | Complejidad | Prioridad      | Corresponde hoy a |
| -- | ------------------------- | ----------- | ----------- | -------------- | ------------------ |
| 1  | HU01: Inicio de Sesión    | Alta        | Baja        | Must (Alta)    | HU-001              |
| 2  | HU02: Registro de Usuario | Alta        | Media       | Must (Alta)    | HU-002              |
| 3  | HU03: Reporte SHUT Lleno  | Alta        | Alta        | Must (Alta)    | HU-003              |
| 4  | HU04: Catálogo Educativo  | Media       | Baja        | Should (Media) | HU-005              |
| 5  | HU05: Directorio Integral | Media       | Baja        | Should (Media) | HU-006              |
| 6  | HU06: Llegada Reciclador  | Alta        | Alta        | Must (Alta)    | HU-007              |
| 7  | HU07: Cerrar Sesión       | Baja        | Baja        | Could (Baja)   | HU-008              |
| 8  | HU08: Actualizar Perfil   | Media       | Baja        | Should (Media) | HU-009              |
| 9  | HU09: Semáforo Gestión    | Baja        | Baja        | Could (Baja)   | HU-010, HU-011      |
| 10 | HU10: Gestión Educación   | Media       | Media       | Should (Media) | HU-012, HU-013, HU-014 |
| 11 | HU11: Gestión Directorio  | Alta        | Media       | Must (Alta)    | HU-015, HU-016, HU-017 |
