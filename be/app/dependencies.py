"""
Módulo: dependencies.py
Descripción: Dependencias inyectables de FastAPI — funciones reutilizables que se
             inyectan en los endpoints usando Depends().
¿Para qué? Centralizar lógica que se repite en muchos endpoints (obtener sesión de BD,
           obtener usuario autenticado, etc.) para evitar duplicación.
¿Impacto? Sin este módulo, cada endpoint tendría que crear su propia sesión de BD
          y validar el token JWT manualmente, causando código repetido y propenso a errores.
"""

import uuid
from collections.abc import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.token_revocado import TokenRevocado
from app.models.usuario import Usuario
from app.utils.security import decode_token

# ¿Qué? Esquema HTTPBearer que extrae el token JWT del header "Authorization: Bearer <token>".
# ¿Para qué? A diferencia de OAuth2PasswordBearer, HTTPBearer hace que Swagger UI muestre
#            un campo simple de texto para pegar el token directamente — sin formulario
#            de usuario/contraseña que enviaría form-data incompatible con nuestro login JSON.
# ¿Impacto? El flujo en Swagger es: 1) POST /auth/login → copiar access_token,
#           2) clic en Authorize → pegar el token → todos los endpoints protegidos funcionan.
http_bearer = HTTPBearer()


def get_db() -> Generator[Session, None, None]:
    """Provee una sesión de base de datos para cada request.

    ¿Qué? Generador que crea una sesión de BD, la entrega al endpoint, y la cierra al terminar.
    ¿Para qué? Garantizar que cada request tenga su propia sesión aislada y que siempre se cierre correctamente, incluso si ocurre un error.
    ¿Impacto? El patrón try/finally asegura que la conexión se devuelve al pool SIEMPRE. Sin esto, las conexiones se agotarían y la app dejaría de responder.

    Yields:
        Session: Sesión de SQLAlchemy lista para hacer queries.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
    db: Session = Depends(get_db),
) -> Usuario:
    """Obtiene el usuario autenticado a partir del access token JWT.

    ¿Qué? Decodifica el token del header Authorization, extrae el email (sub)
          y busca al usuario en la BD.
    ¿Para qué? Proteger endpoints que requieren autenticación — si el token no es válido
              o el usuario no existe, retorna 401 y el endpoint no se ejecuta.
    ¿Impacto? Esta dependencia es el "guardián" de todos los endpoints protegidos.
              Cualquier endpoint que use Depends(get_current_user) requiere un token válido.

    Args:
        token: Access token JWT extraído automáticamente del header Authorization.
        db: Sesión de base de datos.

    Returns:
        Objeto User del usuario autenticado.

    Raises:
        HTTPException 401: Si el token es inválido, expirado, o el usuario no existe.
        HTTPException 403: Si la cuenta del usuario está desactivada.
    """
    # ¿Qué? Error estándar para credenciales inválidas.
    # ¿Para qué? Reutilizar el mismo error en todos los puntos de fallo de validación.
    # ¿Impacto? El header WWW-Authenticate indica al cliente que debe enviar un Bearer token.
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # ¿Qué? Decodificar y verificar el token JWT.
    # ¿Para qué? Extraer el email del usuario del campo "sub" del payload.
    # ¿Impacto? Si el token expiró, fue manipulado, o tiene firma incorrecta, decode_token
    #           retorna None y se lanza la excepción 401.
    token = credentials.credentials  # HTTPBearer entrega solo el token, sin el prefijo "Bearer "
    payload = decode_token(token)
    if not payload:
        raise credentials_exception

    # ¿Qué? Verificar que el token es de tipo "access" (no "refresh").
    # ¿Para qué? Evitar que un refresh token sea usado para acceder a endpoints protegidos.
    # ¿Impacto? Sin esto, el refresh token (de larga duración) podría usarse como access token,
    #           anulando la seguridad de tener tokens de corta duración.
    if payload.get("type") != "access":
        raise credentials_exception

    # ¿Qué? HU-008/RQF-007 (RN-001): revisar si este token puntual fue
    #       revocado por un logout previo (ver app/models/token_revocado.py).
    # ¿Para qué? Un JWT firmado y sin expirar sigue siendo "válido" para
    #           decode_token — esta es la única forma de que el servidor
    #           rechace un token específico ANTES de su expiración natural.
    # ¿Impacto? Sin esto, cerrar sesión no tendría ningún efecto real en el
    #           servidor: el mismo token seguiría funcionando hasta sus
    #           15 minutos de vida, sin importar que el usuario haya
    #           cerrado sesión.
    jti = payload.get("jti")
    if jti and db.get(TokenRevocado, uuid.UUID(jti)):
        raise credentials_exception

    email: str | None = payload.get("sub")
    if not email:
        raise credentials_exception

    # ¿Qué? Buscar al usuario en la BD por su email.
    # ¿Para qué? Verificar que el usuario sigue existiendo y está activo.
    # ¿Impacto? Si el usuario fue eliminado después de obtener el token, esta verificación
    #           lo detecta y le niega el acceso.
    stmt = select(Usuario).where(Usuario.correo_electronico == email)
    user = db.execute(stmt).scalar_one_or_none()

    if not user:
        raise credentials_exception
    # ¿Qué? Verificar que la cuenta esté activa.
    # ¿Para qué? Un admin podría desactivar una cuenta; si el usuario tiene un token vigente,
    #            esta verificación le niega el acceso.
    # ¿Impacto? Sin esto, cuentas desactivadas mantendrían acceso hasta que expire el token.
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada",
        )

    return user