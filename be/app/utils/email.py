"""
Módulo: utils/email.py
Descripción: Utilidades para el envío de emails transaccionales.
¿Para qué? Proveer funciones reutilizables para:
           1. Verificación de email al registrarse (nuevo usuario).
           2. Recuperación de contraseña (enlace de reset).
           3. Invitación de Administrador de Conjunto (crea cuenta nueva).
           4. Invitación de Reciclador a un Conjunto (usuario ya existente).
           5. Mensaje del formulario de contacto al buzón del equipo (#351).
¿Impacto? Sin este módulo, los flujos de verificación, recuperación e
          invitación no pueden notificar al usuario.

Backend de email — orden de prioridad:
  1. SMTP_HOST configurado → usa smtplib (stdlib) — ideal para Mailpit en desarrollo.
  2. RESEND_API_KEY configurado → usa la API de Resend.
  3. Ninguno → simula en logs (el enlace aparece en consola, solo con ENVIRONMENT=development).

Mailpit — probar emails localmente sin cuenta ni dominio:
  Con Docker Compose: el servicio mailpit arranca automáticamente junto al backend.
  Web UI: http://localhost:8025 — todos los emails enviados aparecen ahí en tiempo real.
"""

import asyncio
import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from html import escape
from email.mime.text import MIMEText

import resend

from app.config import settings
from app.utils.audit_log import redactar_correo

logger = logging.getLogger(__name__)


def _send_email_sync(params: resend.Emails.SendParams) -> None:
    """Ejecuta el envío de email de forma síncrona usando el SDK de Resend."""
    resend.api_key = settings.RESEND_API_KEY
    resend.Emails.send(params)


def _send_email_smtp(to_email: str, subject: str, html: str, reply_to: str | None = None) -> None:
    """Envía un email usando un servidor SMTP con la biblioteca estándar de Python."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.RESEND_FROM_NAME} <{settings.RESEND_FROM_EMAIL}>"
    msg["To"] = to_email
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        if settings.SMTP_USERNAME:
            # ¿Qué? Issue #309 (CN-023): cifra la conexión antes de mandar
            #       usuario y contraseña del servidor de correo.
            # ¿Para qué? Sin esto, con un servidor SMTP real, la contraseña
            #           del correo y los enlaces de recuperación viajaban en
            #           texto plano por la red.
            # ¿Impacto? Solo cuando hay SMTP_USERNAME: Mailpit (desarrollo)
            #           no tiene usuario ni soporta STARTTLS, y sigue igual.
            server.starttls(context=ssl.create_default_context())
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(msg)


async def _enviar(
    email: str,
    subject: str,
    html: str,
    tipo: str,
    enlace: str | None = None,
    reply_to: str | None = None,
) -> bool:
    """Envía un correo por SMTP, por Resend o, si no hay ninguno, solo lo registra.

    Devuelve True solo si el correo salió de verdad (issue #351: el contacto
    no puede decir "enviado" si no fue así). Los demás llamadores lo ignoran.

    ¿Qué? Issue #309 — antes, cada una de las 4 funciones send_*_email
          copiaba este mismo bloque (12 lugares que escribían en el log).
    ¿Para qué? CN-011: el enlace lleva un token de un solo uso (restablecer
              contraseña, aceptar una invitación de admin). Registrarlo en
              el log fuera de desarrollo le permite a cualquiera que lea los
              logs tomar el control de otra cuenta. Con un solo lugar, esa
              regla no se puede olvidar en una de las copias.
    ¿Impacto? En development todo sigue igual: el enlace completo sale en
              consola si el envío falla o no hay backend de correo (el
              equipo lo usa para probar sin Mailpit). En production solo
              queda "falló el envío a ye***@gmail.com", sin enlace.

    ¿Qué? reply_to agrega la cabecera Reply-To: al presionar "Responder",
          el programa de correo le escribe a esa dirección y no a la de la
          app (From). Solo la usa el formulario de contacto.
    """
    es_desarrollo = settings.ENVIRONMENT == "development"
    destinatario = email if es_desarrollo else redactar_correo(email)

    try:
        if settings.SMTP_HOST:
            await asyncio.to_thread(_send_email_smtp, email, subject, html, reply_to)
            via = "SMTP"
        elif settings.RESEND_API_KEY:
            params: resend.Emails.SendParams = {
                "from": f"{settings.RESEND_FROM_NAME} <{settings.RESEND_FROM_EMAIL}>",
                "to": [email],
                "subject": subject,
                "html": html,
            }
            if reply_to:
                params["reply_to"] = reply_to
            await asyncio.to_thread(_send_email_sync, params)
            via = "Resend"
        else:
            via = None
    except Exception as exc:
        logger.error("Falló el envío de %s a %s: %s", tipo, destinatario, exc)
        via = None
    else:
        if via:
            logger.info("Correo de %s enviado vía %s a %s", tipo, via, destinatario)
            return True
        logger.warning("No hay backend de correo configurado — %s para %s no se envió", tipo, destinatario)

    # ¿Qué? Sin emojis en estos mensajes a propósito.
    # ¿Para qué? La consola de Windows usa la codificación cp1252, que no
    #           tiene emojis: cada línea con uno imprimía un "Logging error"
    #           de 50 líneas al correr uvicorn en consola.
    if es_desarrollo and enlace:
        logger.info("\n%s\nENLACE (%s) para %s:\n   %s\n%s", "=" * 60, tipo, email, enlace, "=" * 60)
    return False


async def send_verification_email(email: str, token: str) -> None:
    """Envía el email de verificación de cuenta al nuevo usuario."""
    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    subject = "VerdeApp — Verifica tu cuenta"
    html_content = f"""
    <html>
    <body style="font-family: system-ui, -apple-system, sans-serif;
                 max-width: 600px; margin: 0 auto; padding: 24px; color: #111827;">
        <h2 style="color: #15803d; margin-bottom: 8px;">
            Verifica tu cuenta — VerdeApp
        </h2>
        <p style="color: #374151;">
            ¡Bienvenido a VerdeApp! Para activar tu cuenta y poder iniciar sesión,
            haz clic en el botón de abajo.
        </p>
        <p style="color: #6b7280; font-size: 14px;">
            El enlace es válido por <strong>24 horas</strong>.
        </p>
        <p style="margin: 32px 0;">
            <a href="{verification_url}"
               style="background-color: #15803d; color: white; padding: 12px 28px;
                      text-decoration: none; border-radius: 6px; font-weight: 500;
                      font-size: 15px;">
                Verificar mi cuenta
            </a>
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #6b7280; font-size: 13px;">
            Si no creaste esta cuenta, puedes ignorar este email sin problema.<br><br>
            Si el botón no funciona, copia este enlace en tu navegador:<br>
            <a href="{verification_url}" style="color: #15803d;">{verification_url}</a>
        </p>
    </body>
    </html>
    """

    await _enviar(email, subject, html_content, "verificación de cuenta", verification_url)


async def send_password_reset_email(email: str, token: str) -> None:
    """Envía el email con el enlace de recuperación de contraseña."""
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    subject = "VerdeApp — Recuperación de contraseña"
    html_content = f"""
    <html>
    <body style="font-family: system-ui, -apple-system, sans-serif;
                 max-width: 600px; margin: 0 auto; padding: 24px; color: #111827;">
        <h2 style="color: #15803d; margin-bottom: 8px;">
            Recuperación de contraseña — VerdeApp
        </h2>
        <p style="color: #374151;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta.
        </p>
        <p style="color: #6b7280; font-size: 14px;">
            El enlace es válido por <strong>1 hora</strong>.
            Si no lo solicitaste, ignora este email.
        </p>
        <p style="margin: 32px 0;">
            <a href="{reset_url}"
               style="background-color: #15803d; color: white; padding: 12px 28px;
                      text-decoration: none; border-radius: 6px; font-weight: 500;
                      font-size: 15px;">
                Restablecer contraseña
            </a>
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #6b7280; font-size: 13px;">
            Si el botón no funciona, copia este enlace en tu navegador:<br>
            <a href="{reset_url}" style="color: #15803d;">{reset_url}</a>
        </p>
    </body>
    </html>
    """

    await _enviar(email, subject, html_content, "recuperación de contraseña", reset_url)


async def send_duplicate_registration_email(email: str) -> None:
    """Avisa al dueño de un correo que alguien intentó registrarse con él.

    ¿Qué? Issue #373 (CN-026): /register ya no responde "el correo ya está
          registrado" — responde igual que un registro nuevo. Este correo
          es la única forma de que el dueño real se entere.
    ¿Para qué? Si fue él (olvidó que ya tenía cuenta), el correo le dice
              cómo entrar; si no fue él, sabe que alguien usó su correo.
    ¿Impacto? No lleva token: solo enlaces a /login y /forgot-password.
    """
    login_url = f"{settings.FRONTEND_URL}/login"
    forgot_url = f"{settings.FRONTEND_URL}/forgot-password"
    subject = "VerdeApp — Intento de registro con tu correo"
    html_content = f"""
    <html>
    <body style="font-family: system-ui, -apple-system, sans-serif;
                 max-width: 600px; margin: 0 auto; padding: 24px; color: #111827;">
        <h2 style="color: #15803d; margin-bottom: 8px;">
            Ya tienes una cuenta en VerdeApp
        </h2>
        <p style="color: #374151;">
            Alguien intentó crear una cuenta nueva con este correo, pero ya
            tiene una cuenta registrada. No se creó ninguna cuenta nueva.
        </p>
        <p style="color: #374151;">
            Si fuiste tú, puedes <a href="{login_url}" style="color: #15803d;">iniciar sesión</a>
            o, si no recuerdas tu contraseña,
            <a href="{forgot_url}" style="color: #15803d;">restablecerla</a>.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #6b7280; font-size: 13px;">
            Si no fuiste tú, puedes ignorar este email: tu cuenta sigue igual.
        </p>
    </body>
    </html>
    """

    await _enviar(email, subject, html_content, "aviso de registro duplicado")


async def send_admin_conjunto_invitation_email(email: str, token: str) -> None:
    """Envía el email de invitación para crear una cuenta de Administrador de Conjunto."""
    invitation_url = f"{settings.FRONTEND_URL}/aceptar-invitacion?token={token}"
    subject = "VerdeApp — Invitación para administrar tu conjunto residencial"
    html_content = f"""
    <html>
    <body style="font-family: system-ui, -apple-system, sans-serif;
                 max-width: 600px; margin: 0 auto; padding: 24px; color: #111827;">
        <h2 style="color: #15803d; margin-bottom: 8px;">
            Has sido invitado a VerdeApp
        </h2>
        <p style="color: #374151;">
            Te han invitado a administrar tu conjunto residencial en VerdeApp,
            la plataforma de gestión de reciclaje para conjuntos de Bogotá.
        </p>
        <p style="color: #374151;">
            Para crear tu cuenta, definir tu propia contraseña y completar tus
            datos, haz clic en el botón de abajo.
        </p>
        <p style="color: #6b7280; font-size: 14px;">
            El enlace es válido por <strong>48 horas</strong>.
        </p>
        <p style="margin: 32px 0;">
            <a href="{invitation_url}"
               style="background-color: #15803d; color: white; padding: 12px 28px;
                      text-decoration: none; border-radius: 6px; font-weight: 500;
                      font-size: 15px;">
                Crear mi cuenta de administrador
            </a>
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #6b7280; font-size: 13px;">
            Si no esperabas esta invitación, puedes ignorar este email sin problema.<br><br>
            Si el botón no funciona, copia este enlace en tu navegador:<br>
            <a href="{invitation_url}" style="color: #15803d;">{invitation_url}</a>
        </p>
    </body>
    </html>
    """

    await _enviar(email, subject, html_content, "invitación de Administrador de Conjunto", invitation_url)


async def send_reciclador_conjunto_invitation_email(email: str, nombre_conjunto: str) -> None:
    """Notifica a un Reciclador que un Admin de Conjunto lo invitó a trabajar en su conjunto.

    ¿Qué? A diferencia de las otras invitaciones, este correo NO lleva un
          token en la URL — el Reciclador ya tiene cuenta, así que solo
          necesita iniciar sesión y ver sus invitaciones pendientes desde
          su propio dashboard (sección "Mis Invitaciones").
    ¿Para qué? Avisar al reciclador que tiene una solicitud de autorización
              esperando su respuesta (aceptar/rechazar), sin necesitar un
              flujo de creación de cuenta como en las otras invitaciones.
    """
    login_url = f"{settings.FRONTEND_URL}/login"
    subject = f"VerdeApp — Te invitaron a trabajar en {nombre_conjunto}"
    html_content = f"""
    <html>
    <body style="font-family: system-ui, -apple-system, sans-serif;
                 max-width: 600px; margin: 0 auto; padding: 24px; color: #111827;">
        <h2 style="color: #15803d; margin-bottom: 8px;">
            Nueva invitación en VerdeApp
        </h2>
        <p style="color: #374151;">
            El administrador del conjunto <strong>{nombre_conjunto}</strong> te ha
            invitado a trabajar como reciclador autorizado en su conjunto residencial.
        </p>
        <p style="color: #6b7280; font-size: 14px;">
            Inicia sesión en VerdeApp y revisa la sección "Mis Invitaciones"
            en tu panel para aceptar o rechazar.
        </p>
        <p style="margin: 32px 0;">
            <a href="{login_url}"
               style="background-color: #15803d; color: white; padding: 12px 28px;
                      text-decoration: none; border-radius: 6px; font-weight: 500;
                      font-size: 15px;">
                Ver mi invitación
            </a>
        </p>
    </body>
    </html>
    """

    await _enviar(email, subject, html_content, f"invitación de reciclador a {nombre_conjunto}")


async def send_contact_email(name: str, email: str, subject: str, message: str) -> bool:
    """Reenvía un mensaje del formulario de contacto al buzón del equipo.

    ¿Qué? Issue #351 — a diferencia de los otros correos, el contenido lo
          escribe un visitante anónimo, así que todo pasa por escape().
    ¿Para qué? Sin escapar, alguien podría meter HTML (un enlace falso, una
              imagen de rastreo) que el equipo vería como parte del correo.
    ¿Impacto? Devuelve si el correo salió: el router responde 503 si no.
    """
    cuerpo = escape(message).replace("\n", "<br>")
    html_content = f"""
    <html>
    <body style="font-family: system-ui, -apple-system, sans-serif;
                 max-width: 600px; margin: 0 auto; padding: 24px; color: #111827;">
        <h2 style="color: #15803d; margin-bottom: 8px;">Nuevo mensaje de contacto</h2>
        <p style="color: #374151;"><strong>De:</strong> {escape(name)} &lt;{escape(email)}&gt;</p>
        <p style="color: #92400e; background: #fef3c7; padding: 8px 12px; border-radius: 8px;">
            <strong>Dirección de respuesta no verificada:</strong> la escribió quien envió el formulario.
            Confírmala antes de responder con información sensible.
        </p>
        <p style="color: #374151;"><strong>Asunto:</strong> {escape(subject)}</p>
        <p style="color: #374151;">{cuerpo}</p>
    </body>
    </html>
    """

    # ¿Qué? Reply-To con el correo de quien escribió.
    # ¿Para qué? Que el equipo responda con "Responder" (ej. para pedirle los
    #           documentos a un Administrador de Conjunto, HU-018 CA-018.5) sin
    #           copiar la dirección a mano y arriesgarse a un error de tipeo.
    # ¿Impacto? Sin riesgo de inyectar cabeceras: el schema valida email como
    #           EmailStr, que no admite saltos de línea.
    #           Issue #403 (CN-058): el formulario es público y no verifica que ese
    #           correo sea de quien escribe; el aviso del cuerpo se lo recuerda al
    #           equipo. Verificarlo de verdad (enviar un código a esa dirección)
    #           queda pendiente.
    return await _enviar(
        settings.CONTACT_EMAIL, f"VerdeApp — Contacto: {subject}", html_content, "contacto", reply_to=email
    )
