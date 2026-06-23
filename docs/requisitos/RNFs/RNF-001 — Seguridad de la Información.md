# RNF-001 — Seguridad de la Información

---

## Identificación

| Campo             | Valor                                                  |
| ----------------- | ------------------------------------------------------ |
| **ID** | RNF-001                                                |
| **Nombre** | Seguridad de la Información                            |
| **Categoría** | Seguridad                                              |
| **Prioridad** | Crítica                                                |
| **Estado** | Implementado                                        |

---

## Requisitos

### RNF-001.1 — Hashing de contraseñas
Las contraseñas de los usuarios deben encriptarse en la base de datos utilizando estrictamente el algoritmo de hashing **bcrypt**. Nunca se almacenan en texto plano ni se incluyen en respuestas de la API.

### RNF-001.2 — Tokens JWT
La autenticación debe basarse en tokens JWT (JSON Web Tokens) firmados con algoritmo **HS256**:
- **Access token**: duración de 60 minutos.
- **Refresh token**: duración de 7 días.
- La clave secreta debe tener mínimo 32 caracteres y almacenarse en variable de entorno.

### RNF-001.3 — Prevención de enumeración de usuarios
Los mensajes de error en endpoints de autenticación deben ser genéricos:
- En login: "Credenciales incorrectas" (sin distinguir si el email existe).

### RNF-001.4 — Validación de entradas
Todas las entradas del usuario deben validarse tanto en el frontend como en el backend:
- Frontend: validación con lógica React/TypeScript antes de enviar.
- Backend: validación con esquemas Pydantic en FastAPI para restringir campos no permitidos.

### RNF-001.5 — Protección contra inyección SQL
El sistema debe usar el ORM **SQLAlchemy** para todas las consultas a la base de datos PostgreSQL. No se permite SQL crudo sin parametrizar.

### RNF-001.6 — CORS (Cross-Origin Resource Sharing)
- En desarrollo: permitir únicamente el puerto local de Vite (ej. `http://localhost:5173`).
- En producción: configurar los orígenes específicos del dominio de la aplicación; nunca usar `*`.

### RNF-001.7 — Variables de entorno
Toda información sensible (claves secretas, credenciales de BD) debe almacenarse en archivos `.env` o `application.properties` no versionados en GitHub.