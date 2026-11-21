# API de VerdeApp

<!--
  ¿Qué? Lista completa de los endpoints del backend: qué hace cada uno y quién puede usarlo.
  ¿Para qué? Es la evidencia de «API documentada» del criterio 11 de la revisión. Swagger
            (`/docs`) muestra lo mismo, pero solo con el backend en modo desarrollo; este
            documento se puede leer sin encender nada.
  ¿Impacto? La tabla se generó leyendo las rutas reales de FastAPI (método, ruta y rol que
            exige cada una), no a mano. Si se agrega, quita o cambia un endpoint, se actualiza
            aquí en la misma rama (ver «Cómo comprobar que está al día»).
-->

| Campo | Valor |
|---|---|
| **Fecha** | 20 de noviembre de 2026 |
| **Endpoints** | 104 en 17 routers: 92 piden sesión, 5 piden un token especial y 7 son públicos |
| **Prefijo** | Todos empiezan por `/api/v1` |
| **Formato** | JSON (los archivos subidos se envían como formulario de archivos) |
| **Documentos hermanos** | [Requisitos funcionales](requisitos/RFs/) (reglas de negocio de cada endpoint) · [Arquitectura](arquitectura.md) · [README del backend](../be/README.md) |

## 1. Cómo se ve la API en vivo

Con el backend en modo desarrollo (`ENVIRONMENT=development`) hay tres direcciones:

| Dirección | Qué es |
|---|---|
| `http://localhost:8000/docs` | Swagger UI: lista todos los endpoints y permite probarlos desde el navegador |
| `http://localhost:8000/redoc` | La misma documentación en otro formato |
| `http://localhost:8000/openapi.json` | El esquema OpenAPI completo, en JSON |

Con `ENVIRONMENT=production` las tres responden 404 a propósito, para no entregar un mapa de la API a quien la ataque. Por eso existe este documento.

## 2. Reglas comunes

- **Sesión.** El token viaja en una cookie `httpOnly` que el navegador adjunta solo: `access_token` (15 minutos) y `refresh_token` (7 días, solo para `/api/v1/auth`). El backend también acepta el encabezado `Authorization: Bearer <token>`, útil para probar con Swagger.
- **Quién puede usarlo.** «Cualquier rol con sesión» quiere decir que la ruta no exige un rol concreto, pero el servicio devuelve solo lo que le corresponde a quien consulta (por ejemplo, los conjuntos de ese Residente). Cuando una ruta sí exige un rol, la columna lo dice.
- **Errores.**

| Código | Cuándo |
|---|---|
| 400 | La petición no cumple una regla de negocio. El campo `detail` dice cuál. |
| 401 | Falta la sesión, el token venció, fue revocado o no es válido. |
| 403 | Hay sesión, pero el rol no puede usar la ruta, o la cuenta está desactivada. |
| 404 | El recurso no existe, o no pertenece a quien lo pide. |
| 422 | Los datos enviados no pasan la validación (un campo falta, es muy largo o tiene mal formato). |
| 429 | Se superó el límite de peticiones (por ejemplo en el inicio de sesión). |

- **Paginación.** Los listados que pueden crecer reciben `limit` y `offset` y responden `{"items": [...], "total": N}`.
- **Límites de peticiones.** Los endpoints sensibles de `auth` y `contact` tienen límite por IP (ver las secciones 14.2 y 14.3 del [README del backend](../be/README.md)). `POST /api/v1/notificaciones/enviar` permite 10 por minuto.
- **Archivos subidos.** Las fotos y los adjuntos se suben con `POST /api/v1/uploads/adjunto` y se leen en `/uploads/...`, que son archivos estáticos y no endpoints de la API.

## 3. Endpoints por router

### Cuenta y sesión: `/api/v1/auth`

8 endpoints.

| Método | Ruta | Quién puede usarlo | Qué hace |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Público | Crea una cuenta de Residente o Reciclador y envía el correo de verificación. |
| POST | `/api/v1/auth/login` | Público | Inicia sesión: valida el correo y la contraseña y entrega las cookies de sesión. |
| POST | `/api/v1/auth/refresh` | Con el refresh token (cookie) | Renueva la sesión con el refresh token. Cada uno sirve una sola vez y la respuesta trae cookies nuevas. |
| POST | `/api/v1/auth/logout` | Cualquier rol con sesión | Cierra la sesión: revoca el access token y el refresh token y borra las cookies. |
| POST | `/api/v1/auth/change-password` | Cualquier rol con sesión | Cambia la contraseña e invalida los tokens anteriores de la cuenta. |
| POST | `/api/v1/auth/forgot-password` | Público | Envía el enlace para recuperar la contraseña. Responde igual exista o no el correo. |
| POST | `/api/v1/auth/reset-password` | Con el token del enlace de recuperación | Cambia la contraseña con el enlace de recuperación. |
| POST | `/api/v1/auth/verify-email` | Con el token del enlace de verificación | Verifica el correo con el enlace que llegó al registrarse. |

### Perfil propio: `/api/v1/users`

4 endpoints.

| Método | Ruta | Quién puede usarlo | Qué hace |
|---|---|---|---|
| GET | `/api/v1/users/me` | Cualquier rol con sesión | Devuelve el perfil de quien tiene la sesión, con los datos de su rol. |
| PUT | `/api/v1/users/me` | Cualquier rol con sesión | Edita el nombre, los apellidos, el teléfono y la asociación del perfil propio. |
| POST | `/api/v1/users/me/foto-perfil` | Cualquier rol con sesión | Sube o reemplaza la foto de perfil. |
| PATCH | `/api/v1/users/me/locale` | Cualquier rol con sesión | Guarda el idioma preferido (español o inglés). |

### Contacto: `/api/v1/contact`

1 endpoint.

| Método | Ruta | Quién puede usarlo | Qué hace |
|---|---|---|---|
| POST | `/api/v1/contact` | Público | Envía el formulario de contacto de la página de inicio al buzón del equipo. |

### Localidades y conjuntos: `/api/v1/geography`

4 endpoints.

| Método | Ruta | Quién puede usarlo | Qué hace |
|---|---|---|---|
| GET | `/api/v1/geography/localidades` | Público | Lista las localidades de Bogotá, para los formularios. |
| GET | `/api/v1/geography/conjuntos/todos` | Admin del Sistema | Lista todos los conjuntos verificados, con un filtro opcional. |
| GET | `/api/v1/geography/conjuntos/sin-administrador` | Admin del Sistema | Lista los conjuntos verificados que todavía no tienen administrador asignado. |
| GET | `/api/v1/geography/conjuntos/{id_localidad}` | Público | Lista los conjuntos de una localidad, para el registro. |

### Administración del sistema: `/api/v1/admin`

5 endpoints.

| Método | Ruta | Quién puede usarlo | Qué hace |
|---|---|---|---|
| PATCH | `/api/v1/admin/usuarios/{correo_electronico}/habilitado` | Admin del Sistema | Activa o desactiva una cuenta, con un motivo opcional. |
| GET | `/api/v1/admin/usuarios/{correo_electronico}` | Admin del Sistema | Perfil de solo lectura de cualquier usuario. |
| GET | `/api/v1/admin/vista-residentes` | Admin del Sistema | Consulta la vista SQL de residentes, creada por una migración de Alembic. |
| GET | `/api/v1/admin/sp-recicladores` | Admin del Sistema | Ejecuta la función de PostgreSQL que lista los recicladores. |
| GET | `/api/v1/admin/administradores-conjunto` | Admin del Sistema | Lista los Administradores de Conjunto con sus conjuntos. |

### Puntos de acopio (Admin del Sistema): `/api/v1/admin/puntos-acopio`

9 endpoints.

| Método | Ruta | Quién puede usarlo | Qué hace |
|---|---|---|---|
| GET | `/api/v1/admin/puntos-acopio` | Admin del Sistema | Lista los puntos de acopio, incluidos los dados de baja, con búsqueda, filtros y paginación. |
| GET | `/api/v1/admin/puntos-acopio/resumen` | Admin del Sistema | Cuenta los puntos por estado y localidad, sin aplicar filtros. |
| POST | `/api/v1/admin/puntos-acopio` | Admin del Sistema | Crea un punto de acopio. |
| PUT | `/api/v1/admin/puntos-acopio/{id_punto_acopio}` | Admin del Sistema | Edita un punto de acopio; el motivo del cambio queda como comentario. |
| DELETE | `/api/v1/admin/puntos-acopio/{id_punto_acopio}` | Admin del Sistema | Da de baja un punto: deja de verse en el directorio, pero no se borra. |
| POST | `/api/v1/admin/puntos-acopio/{id_punto_acopio}/reactivar` | Admin del Sistema | Reactiva un punto dado de baja. |
| DELETE | `/api/v1/admin/puntos-acopio/{id_punto_acopio}/definitivo` | Admin del Sistema | Elimina definitivamente un punto que ya estaba de baja. |
| GET | `/api/v1/admin/puntos-acopio/{id_punto_acopio}/comentarios` | Admin del Sistema | Lista los comentarios del punto. |
| POST | `/api/v1/admin/puntos-acopio/{id_punto_acopio}/comentarios` | Admin del Sistema | Agrega un comentario al punto. |

### Administradores de Conjunto: `/api/v1/admin-conjunto`

7 endpoints.

| Método | Ruta | Quién puede usarlo | Qué hace |
|---|---|---|---|
| POST | `/api/v1/admin-conjunto/invitar` | Admin del Sistema | Envía por correo la invitación para ser Admin de Conjunto. |
| GET | `/api/v1/admin-conjunto/invitacion` | Con el token de la invitación | Consulta una invitación de Admin de Conjunto por su token. La persona invitada todavía no tiene cuenta. |
| POST | `/api/v1/admin-conjunto/aceptar` | Con el token de la invitación | Acepta la invitación: crea la cuenta de Admin de Conjunto y abre su sesión con cookies. |
| GET | `/api/v1/admin-conjunto/solicitudes-desvinculacion` | Admin del Sistema | Lista las solicitudes de desvinculación de conjuntos. |
| POST | `/api/v1/admin-conjunto/solicitudes-desvinculacion/{id_solicitud}/resolver` | Admin del Sistema | Aprueba o rechaza una solicitud de desvinculación. |
| GET | `/api/v1/admin-conjunto/listar` | Admin del Sistema | Busca Administradores de Conjunto. |
| POST | `/api/v1/admin-conjunto/asignar-conjunto-adicional` | Admin del Sistema | Vincula un conjunto más a un Admin de Conjunto. |

### Panel del Admin de Conjunto: `/api/v1/conjunto-panel`

12 endpoints.

| Método | Ruta | Quién puede usarlo | Qué hace |
|---|---|---|---|
| GET | `/api/v1/conjunto-panel/mis-conjuntos` | Admin de Conjunto | Lista los conjuntos que administra quien tiene la sesión. |
| PATCH | `/api/v1/conjunto-panel/mis-conjuntos/{id_conjunto_residencial}` | Admin de Conjunto | Edita el NIT y la cantidad de apartamentos de uno de sus conjuntos. |
| POST | `/api/v1/conjunto-panel/mis-conjuntos/{id_conjunto_residencial}/solicitar-desvinculacion` | Admin de Conjunto | Pide dejar de administrar un conjunto; lo resuelve el Admin del Sistema. |
| POST | `/api/v1/conjunto-panel/mis-conjuntos/{id_conjunto_residencial}/regenerar-codigo-acceso` | Admin de Conjunto | Genera un código de acceso nuevo para un conjunto. |
| GET | `/api/v1/conjunto-panel/mis-conjuntos/{id_conjunto_residencial}/agenda` | Admin de Conjunto | Lista los temas pendientes de la agenda del conjunto. |
| GET | `/api/v1/conjunto-panel/mis-conjuntos/{id_conjunto_residencial}/agenda/archivadas` | Admin de Conjunto | Lista los temas archivados de la agenda, paginados. |
| GET | `/api/v1/conjunto-panel/mis-conjuntos/{id_conjunto_residencial}/agenda/historial/conteo` | Admin de Conjunto | Cuenta cuántos temas traería la descarga con los filtros elegidos. |
| GET | `/api/v1/conjunto-panel/mis-conjuntos/{id_conjunto_residencial}/agenda/historial/csv` | Admin de Conjunto | Descarga el historial de la agenda en CSV. |
| GET | `/api/v1/conjunto-panel/mis-conjuntos/{id_conjunto_residencial}/agenda/historial/pdf` | Admin de Conjunto | Descarga el historial de la agenda en PDF. |
| POST | `/api/v1/conjunto-panel/mis-conjuntos/{id_conjunto_residencial}/agenda` | Admin de Conjunto | Agrega un tema, con una foto opcional, a la agenda del conjunto. |
| PATCH | `/api/v1/conjunto-panel/mis-conjuntos/{id_conjunto_residencial}/agenda/{id_item}` | Admin de Conjunto | Archiva un tema o lo vuelve a dejar pendiente. |
| DELETE | `/api/v1/conjunto-panel/mis-conjuntos/{id_conjunto_residencial}/agenda/{id_item}` | Admin de Conjunto | Borra un tema para siempre. |

### Recicladores en un conjunto: `/api/v1/reciclador-conjunto`

7 endpoints.

| Método | Ruta | Quién puede usarlo | Qué hace |
|---|---|---|---|
| POST | `/api/v1/reciclador-conjunto/invitar` | Admin de Conjunto | Invita a un Reciclador a trabajar en uno de sus conjuntos. |
| GET | `/api/v1/reciclador-conjunto/mi-conjunto/{id_conjunto}/invitaciones` | Admin de Conjunto | Lista las invitaciones enviadas desde un conjunto. |
| GET | `/api/v1/reciclador-conjunto/mi-conjunto/{id_conjunto}/autorizados` | Admin de Conjunto | Lista los recicladores autorizados en un conjunto. |
| GET | `/api/v1/reciclador-conjunto/mis-invitaciones` | Reciclador | Lista las invitaciones que recibió el Reciclador. |
| POST | `/api/v1/reciclador-conjunto/invitaciones/{id_invitacion}/responder` | Reciclador | Acepta o rechaza una invitación. |
| DELETE | `/api/v1/reciclador-conjunto/mi-conjunto/{id_conjunto}/autorizados/{id_reciclador}` | Admin de Conjunto | Revoca el acceso de un Reciclador a un conjunto; queda registrado quién y cuándo. |
| GET | `/api/v1/reciclador-conjunto/mis-conjuntos-autorizados` | Reciclador | Lista los conjuntos donde el Reciclador está autorizado. |

### Directorio: `/api/v1/directorio`

2 endpoints.

| Método | Ruta | Quién puede usarlo | Qué hace |
|---|---|---|---|
| GET | `/api/v1/directorio/recicladores` | Cualquier rol con sesión | Lista los recicladores. A un Residente solo le muestra los de su localidad. |
| GET | `/api/v1/directorio/puntos-acopio` | Cualquier rol con sesión | Lista los puntos de acopio activos, filtrables por localidad. |

### Notificaciones: `/api/v1/notificaciones`

10 endpoints.

| Método | Ruta | Quién puede usarlo | Qué hace |
|---|---|---|---|
| POST | `/api/v1/notificaciones/enviar` | Cualquier rol con sesión | Envía un aviso (SHUT lleno o libre, llegada o fin de la visita del Reciclador). El servicio valida según el rol. |
| GET | `/api/v1/notificaciones/mis-notificaciones` | Cualquier rol con sesión | Lista las notificaciones de quien tiene la sesión. |
| GET | `/api/v1/notificaciones/por-conjunto/{id_conjunto_residencial}` | Cualquier rol con sesión | Lista los avisos de un conjunto del usuario, paginados. |
| GET | `/api/v1/notificaciones/no-leidas-por-conjunto` | Cualquier rol con sesión | Cuenta los avisos sin leer de cada conjunto del usuario. |
| GET | `/api/v1/notificaciones/no-leidas-count` | Cualquier rol con sesión | Cuenta las notificaciones sin leer: el número de la campana. |
| POST | `/api/v1/notificaciones/{id_notificacion}/leer` | Cualquier rol con sesión | Marca una notificación como leída. |
| POST | `/api/v1/notificaciones/marcar-todas-leidas` | Cualquier rol con sesión | Marca todas las notificaciones como leídas. |
| DELETE | `/api/v1/notificaciones/limpiar-leidas` | Cualquier rol con sesión | Quita del listado propio las notificaciones que ya leyó. |
| GET | `/api/v1/notificaciones/estado-shut` | Residente | Para un Residente, indica si el SHUT de su conjunto está lleno. |
| GET | `/api/v1/notificaciones/mi-estado-reciclador` | Reciclador | Para un Reciclador, indica por cada conjunto autorizado si avisó su llegada y cómo está el SHUT. |

### Contenido educativo: `/api/v1/contenido-educativo`

9 endpoints.

| Método | Ruta | Quién puede usarlo | Qué hace |
|---|---|---|---|
| GET | `/api/v1/contenido-educativo` | Cualquier rol con sesión | Lista el catálogo de contenido educativo. |
| GET | `/api/v1/contenido-educativo/vistos` | Residente | Lista las lecciones que el Residente ya vio. |
| POST | `/api/v1/contenido-educativo/vistos` | Residente | Marca lecciones como vistas. |
| GET | `/api/v1/contenido-educativo/{id_contenido}` | Cualquier rol con sesión | Devuelve un módulo educativo. |
| GET | `/api/v1/contenido-educativo/{id_contenido}/envios` | Admin del Sistema | Lista a qué conjuntos se envió un módulo. |
| POST | `/api/v1/contenido-educativo/{id_contenido}/enviar` | Admin del Sistema | Envía un módulo a uno o varios conjuntos. |
| POST | `/api/v1/contenido-educativo` | Admin del Sistema | Crea un módulo educativo. |
| PUT | `/api/v1/contenido-educativo/{id_contenido}` | Admin del Sistema | Edita un módulo educativo. |
| DELETE | `/api/v1/contenido-educativo/{id_contenido}` | Admin del Sistema | Elimina un módulo educativo. |

### Comunicados del conjunto: `/api/v1/comunicados`

5 endpoints.

| Método | Ruta | Quién puede usarlo | Qué hace |
|---|---|---|---|
| POST | `/api/v1/comunicados` | Admin de Conjunto | Publica un comunicado en uno de sus conjuntos. |
| GET | `/api/v1/comunicados/mis-comunicados` | Admin de Conjunto | Lista lo que publicó, para poder editarlo o borrarlo. |
| PATCH | `/api/v1/comunicados/{id_comunicado}` | Admin de Conjunto | Edita el texto, el adjunto, el tipo o la expiración de un comunicado propio. |
| DELETE | `/api/v1/comunicados/{id_comunicado}` | Admin de Conjunto | Elimina un comunicado propio. |
| GET | `/api/v1/comunicados/feed` | Cualquier rol con sesión | Lista los comunicados activos dirigidos al rol y a los conjuntos de quien consulta. |

### Novedades de la plataforma: `/api/v1/novedades`

5 endpoints.

| Método | Ruta | Quién puede usarlo | Qué hace |
|---|---|---|---|
| POST | `/api/v1/novedades` | Admin del Sistema | Publica una novedad para toda la plataforma o para conjuntos concretos. |
| GET | `/api/v1/novedades/todas` | Admin del Sistema | Historial completo de novedades, activas y archivadas, paginado. |
| PATCH | `/api/v1/novedades/{id_novedad}` | Admin del Sistema | Edita el texto, el adjunto o la expiración de una novedad. |
| POST | `/api/v1/novedades/{id_novedad}/archivar` | Admin del Sistema | Archiva una novedad; no se puede reactivar. |
| GET | `/api/v1/novedades/feed` | Cualquier rol con sesión | Lista las novedades activas dirigidas al rol de quien consulta. |

### Novedades enviadas y soporte técnico: `/api/v1/novedades-enviadas`

4 endpoints.

| Método | Ruta | Quién puede usarlo | Qué hace |
|---|---|---|---|
| POST | `/api/v1/novedades-enviadas` | Residente · Reciclador · Admin de Conjunto | Envía una novedad o consulta de soporte al Admin del Sistema. |
| GET | `/api/v1/novedades-enviadas/mias` | Cualquier rol con sesión | Lista las novedades que envió, con su estado y la respuesta si ya la tienen. |
| GET | `/api/v1/novedades-enviadas/soporte` | Admin del Sistema | Bandeja de soporte técnico del Admin del Sistema. |
| PATCH | `/api/v1/novedades-enviadas/soporte/{id_novedad}` | Admin del Sistema | Cambia el estado, la prioridad o la respuesta de una consulta de soporte. |

### Auditorías de conjunto: `/api/v1/auditorias-conjunto`

10 endpoints.

| Método | Ruta | Quién puede usarlo | Qué hace |
|---|---|---|---|
| POST | `/api/v1/auditorias-conjunto` | Reciclador | Registra la auditoría de un conjunto, con fotos de evidencia. |
| GET | `/api/v1/auditorias-conjunto/mias` | Reciclador | Lista las auditorías que hizo el Reciclador. |
| GET | `/api/v1/auditorias-conjunto/mias/ultimas` | Reciclador | Lista las últimas auditorías del Reciclador. |
| GET | `/api/v1/auditorias-conjunto/historial` | Residente · Admin de Conjunto | Historial de auditorías de su conjunto, paginado. |
| GET | `/api/v1/auditorias-conjunto/admin` | Admin del Sistema | Lista las auditorías de todos los conjuntos. |
| GET | `/api/v1/auditorias-conjunto/admin/resumen-semana` | Admin del Sistema | Resumen semanal de las auditorías de todos los conjuntos. |
| GET | `/api/v1/auditorias-conjunto/desempeno` | Residente · Admin de Conjunto | Desempeño semanal del conjunto: conteos por semana y por tema. |
| GET | `/api/v1/auditorias-conjunto/desempeno/semana` | Residente · Admin de Conjunto | Auditorías de una semana concreta, de lunes a domingo en hora de Bogotá. |
| GET | `/api/v1/auditorias-conjunto/desempeno/pdf` | Admin de Conjunto | Descarga el desempeño semanal del conjunto en PDF. |
| GET | `/api/v1/auditorias-conjunto/{id_auditoria}` | Cualquier rol con sesión | Detalle de una auditoría: de su conjunto, o una que envió el propio Reciclador. |

### Archivos subidos: `/api/v1/uploads`

1 endpoint.

| Método | Ruta | Quién puede usarlo | Qué hace |
|---|---|---|---|
| POST | `/api/v1/uploads/adjunto` | Cualquier rol con sesión | Sube una imagen (o PDF, Word y Excel según el rol) y devuelve su ruta. Cuota por usuario. |

### Estado del servidor: `/api/v1/health`

1 endpoint.

| Método | Ruta | Quién puede usarlo | Qué hace |
|---|---|---|---|
| GET | `/api/v1/health` | Público | Responde si el servidor está vivo. |

## 4. Cómo comprobar que está al día

Desde `be/`, este comando cuenta los endpoints del código; el resultado debe ser **104**, igual que arriba:

```bash
uv run python -c "from app.main import app; print(sum(len(m) for m in app.openapi()['paths'].values()))"
```

Si el número cambia, se agregó o se quitó un endpoint y hay que actualizar este documento y la tabla de routers del [README del backend](../be/README.md) (sección 14.3).
