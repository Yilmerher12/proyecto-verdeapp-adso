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

> Ver `docs/requisitos/RFs/RF-001_validar_usuario.md` — el límite de intentos por CORREO específico (15 min de bloqueo) ya se implementó también (columnas `intentos_fallidos`/`bloqueado_hasta` en `usuarios`); el rate limiting de este punto es por dirección IP, un control distinto y complementario.

### RNF-001.9 — Evaluación: cookies httpOnly para los tokens de sesión (2026-08-28)

Se evaluó (issue #115 del tablero) cambiar dónde vive el `access_token`/`refresh_token`: hoy viven en `sessionStorage` del navegador y se envían manualmente en el header `Authorization` en cada petición. La alternativa evaluada era guardarlos en una cookie marcada `httpOnly`, que JavaScript no puede leer bajo ninguna circunstancia.

**Decisión: no se implementa por ahora.** Es un cambio de arquitectura, no una corrección de un hueco existente — no hay ningún bug ni vulnerabilidad activa detrás de esta evaluación. Se documenta el análisis para retomarlo si el profesor lo pide explícitamente o si el proyecto continúa después de la entrega.

**Por qué no es un cambio gratis (trade-off central):**

- **Como está ahora** (token en `sessionStorage`): si algún día existiera una vulnerabilidad XSS (inyección de JavaScript malicioso) en el frontend, ese script podría leer el token directamente de `sessionStorage` y robarlo. A cambio, el sistema queda naturalmente protegido contra CSRF (Cross-Site Request Forgery), porque el header `Authorization` nunca se manda solo — un sitio externo no puede forzar al navegador a adjuntarlo.
- **Con cookie `httpOnly`**: un script malicioso ya no podría leer el token (mitiga XSS), pero el navegador empezaría a mandar la cookie automáticamente en cualquier petición al backend, incluidas las disparadas desde un sitio malicioso — eso abre la puerta a CSRF, que hoy no es un riesgo real en esta app. Migrar bien exige agregar protección CSRF (atributo `SameSite`, y probablemente un token CSRF adicional), además de tocar login, refresh, logout, la configuración CORS (`credentials: true`), y quitar el manejo manual del token en el frontend.

**Conclusión**: se cambia un riesgo (XSS) por otro (CSRF) a costa de una migración invasiva, sin evidencia de que exista hoy una vulnerabilidad XSS real en VerdeApp — React escapa el HTML por defecto, lo que ya reduce bastante ese riesgo. Con la fecha de entrega cerca (2026-09-03), se prioriza no introducir un cambio grande y riesgoso en el flujo de login que ya funciona y está bien probado.