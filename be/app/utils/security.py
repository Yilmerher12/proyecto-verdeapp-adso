"""
Módulo: utils/security.py
Descripción: Utilidades de seguridad — hashing de contraseñas y manejo de tokens JWT.
¿Para qué? Proveer funciones reutilizables de seguridad que se usan en todo el sistema de auth:
           hashear contraseñas, verificar contraseñas, crear tokens JWT y decodificar tokens.
¿Impacto? Es la base de la seguridad del sistema. Un error aquí compromete toda la autenticación.
          Si el hashing falla, las contraseñas quedan en texto plano.
          Si los JWT se generan mal, cualquiera podría suplantar usuarios.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import settings
from app.utils.ids import generar_uuid4

# ¿Qué? Issue #312 (CN-008): bcrypt se usa directo y los JWT con PyJWT.
#       Antes: passlib (sin versiones desde 2020, obligaba a quedarse en
#       bcrypt==4.0.1) y python-jose (casi sin mantenimiento, arrastraba
#       ecdsa, con una vulnerabilidad que nunca se va a corregir).
# ¿Para qué? Las librerías de la parte más sensible del sistema (sesiones y
#           contraseñas) deben seguir recibiendo parches de seguridad.
# ¿Impacto? Los hashes ya guardados ($2b$12$...) son formato bcrypt estándar
#           y bcrypt.checkpw los lee igual que passlib; los tokens ya emitidos
#           son JWT HS256 estándar y PyJWT los valida igual. Ni contraseñas ni
#           sesiones existentes se ven afectadas.

# ¿Qué? bcrypt solo usa los primeros 72 bytes de la contraseña; desde
#       bcrypt 5.0 una más larga lanza ValueError en vez de cortarse en
#       silencio. schemas/user.py ya las rechaza al registrar/cambiar; aquí
#       se cubre el login, que no pasa por ese validador.
MAXIMO_BYTES_BCRYPT = 72

# ¿Qué? Un hash bcrypt válido de una contraseña que nadie usa — no corresponde
#       a ninguna cuenta real.
# ¿Para qué? OWASP A07 — mitigar un ataque de temporización (timing attack)
#           en el login. Si el código solo llama a verify_password() cuando
#           el usuario SÍ existe, la rama "usuario no existe" responde casi
#           al instante, mientras que "contraseña incorrecta" tarda lo que
#           tarda bcrypt (decenas de milisegundos). Un atacante puede medir
#           esa diferencia y así descubrir qué correos SÍ están registrados,
#           aunque el mensaje de error sea idéntico en ambos casos.
# ¿Impacto? auth_service.login_user() compara siempre contra un hash real
#           (este, si el usuario no existe) — las dos ramas tardan lo mismo.
DUMMY_PASSWORD_HASH = bcrypt.hashpw(b"no-corresponde-a-ninguna-cuenta-real", bcrypt.gensalt()).decode("utf-8")


def hash_password(password: str) -> str:
    """Hashea una contraseña en texto plano usando bcrypt.

    ¿Qué? Toma una contraseña legible y la convierte en un hash irreversible.
    ¿Para qué? Almacenar la contraseña de forma segura en la base de datos.
              Incluso si la BD es comprometida, las contraseñas no se pueden recuperar.
    ¿Impacto? Si esta función no se usa al registrar/cambiar contraseña, la contraseña
              queda en texto plano = vulnerabilidad CRÍTICA.

    Args:
        password: Contraseña en texto plano ingresada por el usuario.

    Returns:
        Hash bcrypt de la contraseña (~60 caracteres).
    """
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si una contraseña en texto plano coincide con su hash.

    ¿Qué? Compara una contraseña ingresada contra el hash almacenado en la BD.
    ¿Para qué? Validar las credenciales del usuario durante el login y el cambio de contraseña.
    ¿Impacto? Es el mecanismo central de verificación — si falla, nadie puede autenticarse.
              bcrypt internamente aplica el mismo salt del hash original para comparar.

    Args:
        plain_password: Contraseña en texto plano ingresada por el usuario.
        hashed_password: Hash bcrypt almacenado en la base de datos.

    Returns:
        True si la contraseña coincide, False en caso contrario.
    """
    contrasena = plain_password.encode("utf-8")
    if len(contrasena) > MAXIMO_BYTES_BCRYPT:
        return False
    try:
        return bcrypt.checkpw(contrasena, hashed_password.encode("utf-8"))
    except ValueError:
        # ¿Qué? Hash guardado con un formato que bcrypt no reconoce — se
        #       trata como contraseña incorrecta, no como un error 500.
        return False


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Crea un token JWT de acceso (access token).

    ¿Qué? Genera un token JWT firmado con la clave secreta del servidor.
    ¿Para qué? El access token es la "credencial temporal" que el cliente envía
              en cada petición para identificarse (header Authorization: Bearer <token>).
    ¿Impacto? Duración corta (15 min por defecto) limita el daño si el token es robado.
              El token contiene el "sub" (subject = email del usuario) y "exp" (expiración).

    Args:
        data: Diccionario con los datos a incluir en el token (mínimo {"sub": email}).
        expires_delta: Tiempo de vida del token. Si no se especifica, usa el valor de config.

    Returns:
        Token JWT como string codificado.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    # ¿Qué? "exp" es un claim estándar de JWT que indica cuándo expira el token.
    # ¿Para qué? El servidor rechaza automáticamente tokens expirados al decodificar.
    # ¿Impacto? Sin expiración, un token robado sería válido para siempre.
    # ¿Qué? "jti" (JWT ID) es un identificador único para ESTE token puntual.
    # ¿Para qué? HU-008/RQF-007: al cerrar sesión, el servidor necesita poder
    #           señalar "este token específico ya no sirve" sin afectar otros
    #           tokens del mismo usuario (ver app/models/token_revocado.py).
    # ¿Impacto? Sin un identificador propio, no habría forma de invalidar un
    #           JWT antes de su expiración natural — es información que no
    #           existe en ningún otro campo del payload.
    to_encode.update({"exp": expire, "type": "access", "jti": str(generar_uuid4())})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Crea un token JWT de refresco (refresh token).

    ¿Qué? Genera un token JWT de larga duración para obtener nuevos access tokens.
    ¿Para qué? Permitir al usuario mantener su sesión sin re-ingresar credenciales.
              Cuando el access token expira, el cliente envía el refresh token para
              obtener uno nuevo sin pedir email/password de nuevo.
    ¿Impacto? Duración larga (7 días por defecto). Si es robado, el atacante puede
              generar access tokens válidos hasta que el refresh expire.
              Por eso se protege guardándolo en una cookie httpOnly, no en el cuerpo
              de la respuesta ni en sessionStorage del navegador (RNF-001.9, ver
              app/routers/auth.py:_fijar_cookies_de_sesion).

    Args:
        data: Diccionario con los datos a incluir (mínimo {"sub": email}).
        expires_delta: Tiempo de vida. Si no se especifica, usa el valor de config.

    Returns:
        Token JWT de refresco como string.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
    # ¿Qué? "type": "refresh" diferencia este token del access token.
    # ¿Para qué? Evitar que un refresh token sea usado como access token y viceversa.
    # ¿Impacto? Sin esta distinción, un refresh token podría usarse para acceder a endpoints
    #           protegidos, anulando el propósito de tener tokens de corta duración.
    # ¿Qué? "jti" propio, igual que en create_access_token.
    # ¿Para qué? Al cerrar sesión también se revoca el refresh token — sin su
    #           propio jti, alguien con el refresh token viejo podría seguir
    #           pidiendo access tokens nuevos después del logout.
    to_encode.update({"exp": expire, "type": "refresh", "jti": str(generar_uuid4())})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return encoded_jwt


def decode_token(token: str) -> dict | None:
    """Decodifica y verifica un token JWT.

    ¿Qué? Toma un token JWT string, verifica su firma y expiración, y retorna los datos.
    ¿Para qué? Extraer la identidad del usuario (email) de un token recibido en un request.
    ¿Impacto? Si la firma no coincide o el token expiró, retorna None.
              Esto previene el uso de tokens manipulados o caducados.

    Args:
        token: Token JWT como string.

    Returns:
        Diccionario con los datos del token (payload) si es válido, None si no lo es.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return payload
    except jwt.PyJWTError:
        # ¿Qué? PyJWTError captura tokens expirados, mal formados, o con firma inválida.
        # ¿Para qué? Manejar todos los errores de JWT en un solo lugar.
        # ¿Impacto? Retornar None en lugar de lanzar excepción permite al caller
        #           decidir cómo manejar el error (401, redirect a login, etc.).
        return None
