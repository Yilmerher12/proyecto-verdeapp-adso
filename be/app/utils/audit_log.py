"""
Módulo: utils/audit_log.py
Descripción: Registro estructurado de eventos de seguridad (login, cambios de
             contraseña, accesos denegados).
¿Para qué? OWASP A09 — Security Logging and Monitoring Failures. Antes de este
           módulo, VerdeApp no registraba NINGÚN evento de seguridad: ni
           intentos de login fallidos, ni cambios de contraseña, ni accesos
           denegados por rol. Sin esos registros, un ataque en curso (por
           ejemplo, alguien probando contraseñas contra una cuenta) no deja
           ningún rastro que revisar después.
¿Impacto? Los eventos se registran en JSON estructurado (una línea por
          evento) — un formato que herramientas como Elasticsearch o
          Datadog pueden indexar y sobre el cual armar alertas ("avisar si
          hay más de 20 login_failed desde la misma IP en 5 minutos"). El
          correo se redacta parcialmente para no dejar el email completo de
          un usuario en un archivo de log.
"""
import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger("verdeapp.audit")


def redactar_correo(correo: str) -> str:
    """¿Qué? "residente@correo.com" -> "re***@correo.com".
    ¿Para qué? Un log es suficiente para diagnosticar sin exponer el correo
    completo de alguien si el archivo de logs llega a filtrarse."""
    usuario, _, dominio = correo.partition("@")
    if not dominio:
        return "***"
    visible = usuario[:2]
    return f"{visible}***@{dominio}"


def _registrar(evento: str, **datos) -> None:
    entrada = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": evento,
        **datos,
    }
    # ¿Qué? default=str convierte a texto lo que JSON no conoce (los UUID
    #       de log_accion_admin); sin esto json.dumps lanza TypeError.
    logger.info(json.dumps(entrada, ensure_ascii=False, default=str))


def log_login_exitoso(correo: str) -> None:
    _registrar("login_success", email=redactar_correo(correo))


def log_login_fallido(correo: str, motivo: str) -> None:
    _registrar("login_failed", email=redactar_correo(correo), reason=motivo)


def log_password_cambiada(correo: str) -> None:
    _registrar("password_changed", email=redactar_correo(correo))


def log_acceso_denegado(correo: str, endpoint: str, motivo: str) -> None:
    _registrar("access_denied", email=redactar_correo(correo), endpoint=endpoint, reason=motivo)


def log_accion_admin(correo_admin: str, accion: str, **detalles) -> None:
    """Registra una acción de administración: quién, qué acción y sobre qué.

    ¿Qué? Issue #376 (CN-012): desactivar cuentas, invitar o revocar,
          resolver solicitudes, regenerar el código de acceso, etc. Antes
          ninguna dejaba rastro.
    ¿Para qué? Poder responder después "¿quién desactivó esta cuenta?" o
              "¿quién cambió el código de este conjunto, y cuándo?".
    ¿Impacto? Una sola función para todas las acciones, con el nombre de la
              acción como dato: todas escriben la misma forma de línea
              (event "admin_action"). Quien la llama nunca debe pasar
              contraseñas, tokens, el código de acceso ni textos libres
              (motivos), y los correos los pasa ya redactados.
    """
    _registrar("admin_action", admin=redactar_correo(correo_admin), action=accion, **detalles)
