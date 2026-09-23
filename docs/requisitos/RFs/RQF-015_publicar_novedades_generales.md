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

El Admin Sistema puede publicar novedades generales sobre la aplicación, los puntos de acopio o temas ambientales, dirigidas a uno o varios grupos de usuarios de toda la plataforma (no solo de un conjunto). Estas novedades pueden incluir texto y, de forma opcional, un adjunto (imagen o PDF subido, o un enlace a un archivo o sitio externo), un enlace de video de YouTube y, si se quiere, limitarse a **uno o varios conjuntos** en vez de a todos los del alcance elegido. Tienen una fecha de expiración que puede configurarse manualmente o dejar que el sistema la sugiera.

A diferencia de los comunicados de conjunto (RQF-014), las novedades las publica el equipo de VerdeApp para todos sus usuarios o para grupos específicos de roles.

---

## Flujos

### Flujo A — Publicar novedad (Admin Sistema)
1. El Admin Sistema escribe el contenido de la novedad (texto obligatorio).
2. Selecciona el alcance: todos los usuarios, solo residentes, solo recicladores o solo Admins de Conjunto.
3. Elige a qué conjuntos les llega, en una sección "Conjuntos" siempre visible: uno o varios, o "Todos los conjuntos" (aviso masivo, con advertencia) — sin ninguna de las dos no se puede publicar. Opcional, dentro de "Más opciones" (recogido por defecto): subir una imagen/archivo o pegar un enlace, y agregar un enlace de video de YouTube.
4. El sistema sugiere una fecha de expiración que puede modificar.
5. Al publicar, los usuarios del alcance seleccionado — y del conjunto elegido, si se eligió uno — reciben una notificación y ven la novedad en su sección de novedades (con el video incrustado si lo trae).

### Flujo B — Ver novedades (Residente / Reciclador / Admin Conjunto)
1. El usuario abre la sección de novedades en la app.
2. Solo ve las novedades dirigidas a su rol, que aún no han expirado ni sido archivadas y — si la novedad se acotó a uno o varios conjuntos — que pertenezca a alguno de ellos (un Reciclador o Admin de Conjunto puede pertenecer a varios).
3. Las novedades están ordenadas de la más reciente a la más antigua.
4. Puede abrir los adjuntos directamente desde la novedad.

### Flujo C — Editar novedad (Admin Sistema)
1. El Admin Sistema puede ver todas las novedades publicadas y seleccionar una para editar.
2. Puede cambiar el texto, los adjuntos, el video y la fecha de expiración.
3. No puede cambiar el alcance ni el conjunto (destinatarios) después de publicar.
4. Los cambios se reflejan de inmediato en la sección de novedades de los destinatarios.

### Flujo D — Archivar novedad (Admin Sistema / Sistema automático)
1. El Admin Sistema puede archivar manualmente una novedad desde su panel.
2. El sistema archiva automáticamente las novedades cuando llega su fecha de expiración.
3. Las novedades archivadas dejan de aparecer en el feed de los usuarios.
4. El Admin Sistema puede consultar el historial de novedades archivadas, con un interruptor "Ver archivadas" y filtros por alcance y por texto (aplicados en el servidor sobre todo el historial paginado). Las que vencen en 7 días o menos se marcan "Expira en N días".

---

## Reglas de negocio

- RN-001: Solo el Admin Sistema puede publicar, editar o archivar novedades generales.
- RN-002: El texto de la novedad es obligatorio; los adjuntos y links son opcionales.
- RN-003: Las novedades se filtran por rol: cada usuario solo ve lo que le corresponde.
- RN-004: El sistema archiva automáticamente las novedades al llegar su fecha de expiración.
- RN-005: No se pueden reactivar novedades archivadas directamente; se debe crear una nueva.
- RN-006: El Admin Sistema ve el historial completo de novedades, incluyendo las archivadas.
- RN-007: Una novedad SIN conjuntos asociados (tabla `novedades_conjuntos`) significa "todos los conjuntos" (comportamiento original: las novedades ya existentes no cambian). Con uno o varios, la novedad y su notificación solo llegan a los usuarios de esos conjuntos que estén en el alcance por rol. **Implementada.**
- RN-008: Al publicar desde el panel hay que elegir al menos un conjunto o marcar "Todos los conjuntos" explícitamente — el formulario no permite publicar sin decidir, para evitar avisos masivos por descuido (ej. una reunión presencial). La API sigue aceptando una lista vacía como "todos". Esto no reemplaza a los Comunicados (RQF-014): esos los publica el Admin de Conjunto para SU conjunto; una novedad con conjuntos la publica el Admin Sistema. **Implementada.**
- RN-009: Los conjuntos elegidos no se pueden cambiar después de publicar (igual que el alcance). **Implementada.**
- RN-010: Con varios conjuntos se crea una notificación por conjunto, y un Reciclador o Admin de Conjunto que pertenezca a varios de los elegidos la recibe una sola vez. **Implementada.**

---

## Historias de usuario derivadas

| HU      | Descripción                                             |
| ------- | ------------------------------------------------------- |
| [HU-032](../HUs/HU-032_admin_sistema_publica_novedad.md) | Admin Sistema publica una novedad general               |
| [HU-033](../HUs/HU-033_usuario_ve_novedades.md) | Usuario ve las novedades del sistema según su rol       |
| [HU-034](../HUs/HU-034_admin_sistema_edita_novedad.md) | Admin Sistema edita una novedad general                 |
| [HU-035](../HUs/HU-035_admin_sistema_archiva_novedad.md) | Admin Sistema archiva una novedad / sistema la archiva al expirar |
