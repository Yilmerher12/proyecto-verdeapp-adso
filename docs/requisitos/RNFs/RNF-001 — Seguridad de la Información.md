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

> **Nota (2026-08-28)**: la duración real del `access_token` es de **15 minutos**, no 60 — un valor más estricto que el documentado aquí, no un incumplimiento. El resto (HS256, refresh de 7 días, `SECRET_KEY` con mínimo de 32 caracteres validado al arrancar) coincide exactamente con `be/app/config.py`.

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

### RNF-001.8 — Controles agregados en la auditoría OWASP (2026-08-28)

Una auditoría completa contra el OWASP Top 10 (documentada en `docs/conceptos/owasp-top-10.md`) encontró y corrigió 3 controles que faltaban, no cubiertos por los puntos 001.1-001.7 de arriba:

- **Rate limiting realmente conectado**: existía el límite de intentos de login/registro (`slowapi`) pero nunca se había registrado con FastAPI — superarlo no daba una respuesta 429 real. Corregido y verificado contra el servidor real.
- **Cabeceras de seguridad HTTP**: no existía ninguna (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`). Agregadas a toda respuesta.
- **Mitigación de ataque de temporización en el login**: corregido con un hash señuelo (`DUMMY_PASSWORD_HASH`) para que "usuario no existe" y "contraseña incorrecta" tarden lo mismo.
- **Registro de auditoría de seguridad**: no existía ningún log de eventos de seguridad (logins fallidos, cambios de contraseña). Se creó `be/app/utils/audit_log.py` y se conectó en login y cambio de contraseña.

> Ver `docs/requisitos/RFs/RF-001_validar_usuario.md` — el límite de intentos por CORREO específico (15 min de bloqueo) sigue sin implementar; el rate limiting agregado aquí es por dirección IP, un control distinto.