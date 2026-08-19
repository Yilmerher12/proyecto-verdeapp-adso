"""
Módulo: tests/conftest.py
Descripción: Fixtures compartidos para todos los tests del backend de VerdeApp.
¿Para qué? Configurar una base de datos de testing aislada, un cliente HTTP de pruebas
           y datos de prueba reutilizables (Usuario, Residente, Reciclador, Conjunto
           Residencial verificado) que se comparten entre todos los archivos de test.
¿Impacto? Sin estos fixtures, cada test tendría que configurar su propia BD y cliente,
          causando código repetido, tests lentos y riesgo de contaminar datos entre tests.
          La BD de testing se crea y destruye en cada sesión de pytest, garantizando
          que los tests NUNCA afecten la BD de desarrollo.
"""

import uuid
from collections.abc import Generator
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.dependencies import get_db
from app.main import app
from app.models.usuario import Usuario
from app.models.residente import Residente
from app.models.reciclador import Reciclador
from app.models.rol import RolId
from app.models.localidad import Localidad
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.unidad import Unidad
from app.models.password_reset_token import PasswordResetToken
from app.models.email_verification_token import EmailVerificationToken
from app.models.administrador_conjunto import AdministradorConjunto
from app.models.administrador_conjunto_asignacion import AdministradorConjuntoAsignacion
from app.models.punto_acopio import PuntoAcopio
from app.utils.security import create_access_token, hash_password

# ────────────────────────────
# 🗄️ Configuración de BD de testing
# ────────────────────────────

# ¿Qué? URL de una base de datos SEPARADA, exclusiva para tests.
# ¿Para qué? Evitar que pytest borre/recree tablas en la base de datos
#           REAL de desarrollo (verdeapp_db), donde viven los conjuntos,
#           residentes y vistas SQL reales.
# ¿Impacto? Esta BD de test se puede borrar y recrear sin ningún riesgo.
TEST_DATABASE_URL = "postgresql://verde_user:verde_password@localhost:5433/verdeapp_test_db"

test_engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)

TestSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
)


# ────────────────────────────
# 📦 Fixtures de base de datos
# ────────────────────────────


@pytest.fixture(scope="session", autouse=True)
def setup_database() -> Generator[None, None, None]:
    """Crea las tablas, siembra los roles obligatorios, y limpia al final.

    ¿Qué? Además de crear la estructura de tablas, este fixture inserta
          las 4 filas de la tabla "roles" que el esquema real exige
          como referencia obligatoria (FK) en la tabla "usuarios".
    ¿Para qué? La BD de desarrollo siembra estos roles vía app/seed.py
              (be/app/seed_data.sql) al levantar Docker — pero la BD de
              TEST se crea limpia en cada sesión de pytest, solo con la
              estructura. Sin esta siembra, cualquier fixture que cree
              un Usuario con id_rol=2 (o cualquier rol) falla con
              ForeignKeyViolation.
    ¿Impacto? Se siembran los mismos 4 roles que existen en
              be/app/seed_data.sql, para que el comportamiento de test
              coincida con el real.
    """
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    with TestSessionLocal(bind=test_engine.connect()) as seed_session:
        from app.models.rol import Role, RolId

        roles_seed = [
            Role(id_rol=RolId.ADMIN_SISTEMA, tipo_rol="ADMINISTRADOR"),
            Role(id_rol=RolId.RESIDENTE, tipo_rol="RESIDENTE"),
            Role(id_rol=RolId.RECICLADOR, tipo_rol="RECICLADOR"),
            Role(id_rol=RolId.ADMIN_CONJUNTO, tipo_rol="ADMIN_CONJUNTO"),
        ]
        seed_session.add_all(roles_seed)
        seed_session.commit()

    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture()
def db() -> Generator[Session, None, None]:
    """Provee una sesión de BD aislada para cada test con rollback automático."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestSessionLocal(bind=connection)

    nested = connection.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def end_savepoint(session: Session, transaction_state: object) -> None:
        nonlocal nested
        if not nested.is_active:
            nested = connection.begin_nested()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


# ────────────────────────────
# 🌐 Fixture del cliente HTTP
# ────────────────────────────


@pytest.fixture()
def client(db: Session) -> Generator[TestClient, None, None]:
    """Provee un cliente HTTP de testing que usa la sesión de BD aislada."""

    def override_get_db() -> Generator[Session, None, None]:
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ────────────────────────────
# 🚦 Fixture de rate limiter
# ────────────────────────────


@pytest.fixture(scope="session", autouse=True)
def disable_rate_limiter_for_tests() -> Generator[None, None, None]:
    """Desactiva el rate limiter por completo durante toda la sesión de tests.

    ¿Qué? El límite de "10 intentos de login por minuto" es una
          protección de seguridad real para producción (evitar fuerza
          bruta). En una suite de tests que hace decenas de logins en
          pocos segundos, ese límite se agota artificialmente y genera
          falsos negativos (429) que no reflejan ningún problema real
          del código.
    ¿Para qué? La instancia real del limiter vive en app/utils/limiter.py
              como la variable "limiter" (no en app.state.limiter, que
              nunca se registra en main.py). Se importa esa instancia
              directamente y se apaga su bandera "enabled".
    ¿Impacto? Esto NO afecta el comportamiento de la app en producción
              — solo aplica durante pytest. El rate limiting real sigue
              intacto y protegiendo /login, /register, /forgot-password
              cuando la app corre normalmente fuera de los tests.
    """
    from app.utils.limiter import limiter as real_limiter

    real_limiter.enabled = False
    yield
    real_limiter.enabled = True


# ────────────────────────────
# 🗺️ Fixtures de datos geográficos (requisito para registrar un Residente)
# ────────────────────────────

TEST_USER_EMAIL = "residente.test@verdeapp.com"
TEST_USER_NOMBRE = "TEST"
TEST_USER_APELLIDOS = "USER"
TEST_USER_PASSWORD = "TestPass123"
UNVERIFIED_USER_EMAIL = "sinverificar@verdeapp.com"


@pytest.fixture()
def localidad_test(db: Session) -> Localidad:
    """Crea una Localidad de prueba (requisito para crear un Conjunto Residencial)."""
    localidad = Localidad(nombre_localidad="Usaquén")
    db.add(localidad)
    db.commit()
    db.refresh(localidad)
    return localidad


@pytest.fixture()
def conjunto_verificado(db: Session, localidad_test: Localidad) -> ConjuntoResidencial:
    """Crea un Conjunto Residencial ya VERIFICADO."""
    conjunto = ConjuntoResidencial(
        id_localidad=localidad_test.id_localidad,
        nombre_conjunto="TORRES DE PRUEBA",
        nit="900000000-0",
        direccion="Calle 100 # 10-10",
        verificado=True,
    )
    db.add(conjunto)
    db.commit()
    db.refresh(conjunto)
    return conjunto


@pytest.fixture()
def conjunto_verificado_sin_admin(db: Session, localidad_test: Localidad) -> ConjuntoResidencial:
    """Crea un segundo Conjunto Residencial VERIFICADO, sin ningún administrador asignado (RQF-016)."""
    conjunto = ConjuntoResidencial(
        id_localidad=localidad_test.id_localidad,
        nombre_conjunto="RESERVA DE PRUEBA",
        nit="900000000-1",
        direccion="Carrera 50 # 20-20",
        verificado=True,
    )
    db.add(conjunto)
    db.commit()
    db.refresh(conjunto)
    return conjunto


@pytest.fixture()
def conjunto_no_verificado(db: Session, localidad_test: Localidad) -> ConjuntoResidencial:
    """Crea un Conjunto Residencial SIN verificar (verificado=False)."""
    conjunto = ConjuntoResidencial(
        id_localidad=localidad_test.id_localidad,
        nombre_conjunto="CONJUNTO SIN VERIFICAR",
        direccion="Calle 200 # 20-20",
        verificado=False,
    )
    db.add(conjunto)
    db.commit()
    db.refresh(conjunto)
    return conjunto


# ────────────────────────────
# 👤 Fixtures de usuarios de prueba (por rol)
# ────────────────────────────


@pytest.fixture()
def test_user(db: Session, conjunto_verificado: ConjuntoResidencial) -> Usuario:
    """Crea un Usuario Residente de prueba, activo y con su perfil completo."""
    usuario = Usuario(
        correo_electronico=TEST_USER_EMAIL,
        id_rol=RolId.RESIDENTE,
        password=hash_password(TEST_USER_PASSWORD),
        is_active=True,
    )
    db.add(usuario)
    db.flush()

    unidad = Unidad(
        id_conjunto_residencial=conjunto_verificado.id_conjunto_residencial,
        torre="TORRE 1",
        apto="101",
    )
    db.add(unidad)
    db.flush()

    residente = Residente(
        id_usuario=usuario.id_usuario,
        id_unidad=unidad.id_unidad,
        nombre=TEST_USER_NOMBRE,
        apellidos=TEST_USER_APELLIDOS,
        numero_telefonico="3000000000",
    )
    db.add(residente)
    db.commit()
    db.refresh(usuario)
    return usuario


@pytest.fixture()
def auth_headers(test_user: Usuario) -> dict[str, str]:
    """Genera headers de autenticación con un access token válido para test_user."""
    access_token = create_access_token(data={
        "sub": test_user.correo_electronico,
        "role_id": test_user.id_rol,
        "first_name": TEST_USER_NOMBRE,
        "last_name": TEST_USER_APELLIDOS,
    })
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture()
def unverified_user(db: Session, conjunto_verificado: ConjuntoResidencial) -> Usuario:
    """Crea un Usuario Residente SIN verificar (is_active=False)."""
    usuario = Usuario(
        correo_electronico=UNVERIFIED_USER_EMAIL,
        id_rol=RolId.RESIDENTE,
        password=hash_password(TEST_USER_PASSWORD),
        is_active=False,
    )
    db.add(usuario)
    db.flush()

    unidad = Unidad(
        id_conjunto_residencial=conjunto_verificado.id_conjunto_residencial,
        torre="TORRE 2",
        apto="202",
    )
    db.add(unidad)
    db.flush()

    residente = Residente(
        id_usuario=usuario.id_usuario,
        id_unidad=unidad.id_unidad,
        nombre="SIN",
        apellidos="VERIFICAR",
        numero_telefonico="3000000001",
    )
    db.add(residente)
    db.commit()
    db.refresh(usuario)
    return usuario


# ────────────────────────────
# 🔑 Fixtures de tokens de recuperación de contraseña
# ────────────────────────────


@pytest.fixture()
def expired_reset_token(db: Session, test_user: Usuario) -> str:
    """Crea un token de reset de contraseña ya expirado."""
    token = str(uuid.uuid4())
    token_record = PasswordResetToken(
        id=str(uuid.uuid4()),
        id_usuario=test_user.id_usuario,
        token=token,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
    )
    db.add(token_record)
    db.commit()
    return token


@pytest.fixture()
def used_reset_token(db: Session, test_user: Usuario) -> str:
    """Crea un token de reset de contraseña ya utilizado."""
    token = str(uuid.uuid4())
    token_record = PasswordResetToken(
        id=str(uuid.uuid4()),
        id_usuario=test_user.id_usuario,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        used=True,
    )
    db.add(token_record)
    db.commit()
    return token


@pytest.fixture()
def valid_reset_token(db: Session, test_user: Usuario) -> str:
    """Crea un token de reset de contraseña válido (no expirado, no usado)."""
    token = str(uuid.uuid4())
    token_record = PasswordResetToken(
        id=str(uuid.uuid4()),
        id_usuario=test_user.id_usuario,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(token_record)
    db.commit()
    return token


# ────────────────────────────
# 📧 Fixtures de verificación de email
# ────────────────────────────


@pytest.fixture()
def valid_verification_token(db: Session, unverified_user: Usuario) -> str:
    """Crea un token de verificación de email válido para el usuario no verificado."""
    token = str(uuid.uuid4())
    token_record = EmailVerificationToken(
        id=str(uuid.uuid4()),
        id_usuario=unverified_user.id_usuario,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(token_record)
    db.commit()
    return token


@pytest.fixture()
def expired_verification_token(db: Session, unverified_user: Usuario) -> str:
    """Crea un token de verificación de email ya expirado."""
    token = str(uuid.uuid4())
    token_record = EmailVerificationToken(
        id=str(uuid.uuid4()),
        id_usuario=unverified_user.id_usuario,
        token=token,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
    )
    db.add(token_record)
    db.commit()
    return token


@pytest.fixture()
def used_verification_token(db: Session, unverified_user: Usuario) -> str:
    """Crea un token de verificación de email ya utilizado."""
    token = str(uuid.uuid4())
    token_record = EmailVerificationToken(
        id=str(uuid.uuid4()),
        id_usuario=unverified_user.id_usuario,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        used=True,
    )
    db.add(token_record)
    db.commit()
    return token


# ────────────────────────────
# 👤 Fixtures de usuarios de prueba (Reciclador, Admin del Sistema, Admin de Conjunto)
# ────────────────────────────
# Estos tres roles no tenían ningún fixture antes porque solo existían las pruebas
# de auth/login (que solo usan Residente). Los agregamos aquí para poder probar
# los routers de admin, admin_conjunto, conjunto_panel, reciclador_conjunto,
# directorio y notificaciones, que necesitan un usuario autenticado de cada rol.

RECICLADOR_EMAIL = "reciclador.test@verdeapp.com"
RECICLADOR_NOMBRE = "RECI"
RECICLADOR_APELLIDOS = "CLADOR"

ADMIN_SISTEMA_EMAIL = "admin.test@verdeapp.com"

ADMIN_CONJUNTO_EMAIL = "adminconjunto.test@verdeapp.com"
ADMIN_CONJUNTO_NOMBRE = "ADMIN"
ADMIN_CONJUNTO_APELLIDOS = "CONJUNTO"


@pytest.fixture()
def reciclador_test(db: Session, localidad_test: Localidad) -> Usuario:
    """Crea un Usuario Reciclador de prueba, activo y con su perfil completo."""
    usuario = Usuario(
        correo_electronico=RECICLADOR_EMAIL,
        id_rol=RolId.RECICLADOR,
        password=hash_password(TEST_USER_PASSWORD),
        is_active=True,
    )
    db.add(usuario)
    db.flush()

    reciclador = Reciclador(
        id_usuario=usuario.id_usuario,
        localidad_id=localidad_test.id_localidad,
        nombre=RECICLADOR_NOMBRE,
        apellidos=RECICLADOR_APELLIDOS,
        numero_telefonico="3000000002",
    )
    db.add(reciclador)
    db.commit()
    db.refresh(usuario)
    return usuario


@pytest.fixture()
def reciclador_auth_headers(reciclador_test: Usuario) -> dict[str, str]:
    """Headers de autenticación válidos para el reciclador de prueba."""
    access_token = create_access_token(data={
        "sub": reciclador_test.correo_electronico,
        "role_id": reciclador_test.id_rol,
        "first_name": RECICLADOR_NOMBRE,
        "last_name": RECICLADOR_APELLIDOS,
    })
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture()
def admin_sistema_test(db: Session) -> Usuario:
    """Crea un Usuario Administrador del Sistema — este rol no tiene tabla de perfil propia."""
    usuario = Usuario(
        correo_electronico=ADMIN_SISTEMA_EMAIL,
        id_rol=RolId.ADMIN_SISTEMA,
        password=hash_password(TEST_USER_PASSWORD),
        is_active=True,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@pytest.fixture()
def admin_sistema_auth_headers(admin_sistema_test: Usuario) -> dict[str, str]:
    """Headers de autenticación válidos para el administrador del sistema de prueba."""
    access_token = create_access_token(data={
        "sub": admin_sistema_test.correo_electronico,
        "role_id": admin_sistema_test.id_rol,
    })
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture()
def admin_conjunto_test(db: Session, conjunto_verificado: ConjuntoResidencial) -> AdministradorConjunto:
    """Crea un Administrador de Conjunto ya asignado a `conjunto_verificado`."""
    usuario = Usuario(
        correo_electronico=ADMIN_CONJUNTO_EMAIL,
        id_rol=RolId.ADMIN_CONJUNTO,
        password=hash_password(TEST_USER_PASSWORD),
        is_active=True,
    )
    db.add(usuario)
    db.flush()

    administrador = AdministradorConjunto(
        id_usuario=usuario.id_usuario,
        nombre=ADMIN_CONJUNTO_NOMBRE,
        apellidos=ADMIN_CONJUNTO_APELLIDOS,
        numero_telefonico="3000000003",
    )
    db.add(administrador)
    db.flush()

    asignacion = AdministradorConjuntoAsignacion(
        id_administrador=administrador.id_administrador,
        id_conjunto_residencial=conjunto_verificado.id_conjunto_residencial,
    )
    db.add(asignacion)
    db.commit()
    db.refresh(administrador)
    return administrador


@pytest.fixture()
def admin_conjunto_auth_headers(admin_conjunto_test: AdministradorConjunto) -> dict[str, str]:
    """Headers de autenticación válidos para el administrador de conjunto de prueba."""
    usuario = admin_conjunto_test.usuario
    access_token = create_access_token(data={
        "sub": usuario.correo_electronico,
        "role_id": usuario.id_rol,
        "first_name": ADMIN_CONJUNTO_NOMBRE,
        "last_name": ADMIN_CONJUNTO_APELLIDOS,
    })
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture()
def punto_acopio_test(db: Session, localidad_test: Localidad) -> PuntoAcopio:
    """Crea un Punto de Acopio de prueba en la misma localidad de `localidad_test`."""
    punto = PuntoAcopio(
        id_localidad=localidad_test.id_localidad,
        nombre="PUNTO DE PRUEBA",
        nombre_encargado="ENCARGADO PRUEBA",
        direccion="Calle 50 # 5-50",
        telefono_contacto="3000000004",
    )
    db.add(punto)
    db.commit()
    db.refresh(punto)
    return punto