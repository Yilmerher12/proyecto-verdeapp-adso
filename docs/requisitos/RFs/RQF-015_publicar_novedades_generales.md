# RQF-015 — Publicar Novedades Generales

## Identificación

| Campo         | Valor                                           |
| ------------- | ----------------------------------------------- |
| **ID**        | RQF-015                                         |
| **Nombre**    | Publicar Novedades Generales                    |
| **Módulo**    | Comunicación / Sistema                          |
| **Prioridad** | Media                                           |
| **Estado**    | Implementada                                     |
| **Usuarios**  | admin_sistema, residente, reciclador, admin_conjunto |

---

## Descripción

El Admin Sistema puede publicar novedades generales sobre la aplicación, los puntos de acopio o temas ambientales, dirigidas a uno o varios grupos de usuarios de toda la plataforma (no solo de un conjunto). Estas novedades pueden incluir texto y, de forma opcional, un enlace (URL) a un archivo alojado externamente (imagen, PDF, Word, Excel) o a un sitio externo, y tienen una fecha de expiración que puede configurarse manualmente o dejar que el sistema la sugiera.

A diferencia de los comunicados de conjunto (RQF-014), las novedades las publica el equipo de VerdeApp para todos sus usuarios o para grupos específicos de roles.

---

## Flujos

### Flujo A — Publicar novedad (Admin Sistema)
1. El Admin Sistema escribe el contenido de la novedad (texto obligatorio).
2. Selecciona el alcance: todos los usuarios, solo residentes, solo recicladores o solo Admins de Conjunto.
3. Puede agregar un enlace (URL) a un archivo alojado externamente o a un sitio externo.
4. El sistema sugiere una fecha de expiración que puede modificar.
5. Al publicar, los usuarios del alcance seleccionado reciben una notificación y ven la novedad en su sección de novedades.

### Flujo B — Ver novedades (Residente / Reciclador / Admin Conjunto)
1. El usuario abre la sección de novedades en la app.
2. Solo ve las novedades dirigidas a su rol y que aún no han expirado ni sido archivadas.
3. Las novedades están ordenadas de la más reciente a la más antigua.
4. Puede abrir los adjuntos directamente desde la novedad.

### Flujo C — Editar novedad (Admin Sistema)
1. El Admin Sistema puede ver todas las novedades publicadas y seleccionar una para editar.
2. Puede cambiar el texto, los adjuntos y la fecha de expiración.
3. No puede cambiar el alcance (destinatarios) después de publicar.
4. Los cambios se reflejan de inmediato en la sección de novedades de los destinatarios.

### Flujo D — Archivar novedad (Admin Sistema / Sistema automático)
1. El Admin Sistema puede archivar manualmente una novedad desde su panel.
2. El sistema archiva automáticamente las novedades cuando llega su fecha de expiración.
3. Las novedades archivadas dejan de aparecer en el feed de los usuarios.
4. El Admin Sistema puede consultar el historial de novedades archivadas.

---

## Reglas de negocio

- RN-001: Solo el Admin Sistema puede publicar, editar o archivar novedades generales.
- RN-002: El texto de la novedad es obligatorio; los adjuntos y links son opcionales.
- RN-003: Las novedades se filtran por rol: cada usuario solo ve lo que le corresponde.
- RN-004: El sistema archiva automáticamente las novedades al llegar su fecha de expiración.
- RN-005: No se pueden reactivar novedades archivadas directamente; se debe crear una nueva.
- RN-006: El Admin Sistema ve el historial completo de novedades, incluyendo las archivadas.

---

## Historias de usuario derivadas

| HU      | Descripción                                             |
| ------- | ------------------------------------------------------- |
| [HU-032](../HUs/HU-032_admin_sistema_publica_novedad.md) | Admin Sistema publica una novedad general               |
| [HU-033](../HUs/HU-033_usuario_ve_novedades.md) | Usuario ve las novedades del sistema según su rol       |
| [HU-034](../HUs/HU-034_admin_sistema_edita_novedad.md) | Admin Sistema edita una novedad general                 |
| [HU-035](../HUs/HU-035_admin_sistema_archiva_novedad.md) | Admin Sistema archiva una novedad / sistema la archiva al expirar |
