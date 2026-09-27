"""
Módulo: routers/contact.py
Descripción: Issue #351 — formulario de contacto de la landing (público, sin sesión).
"""

from fastapi import APIRouter, HTTPException, Request, status

from app.schemas.contact import ContactRequest
from app.schemas.user import MessageResponse
from app.utils.email import send_contact_email
from app.utils.limiter import limiter

router = APIRouter(prefix="/api/v1/contact", tags=["contact"])


# ¿Qué? 3 por minuto por IP.
# ¿Para qué? Es el único endpoint público que manda un correo con texto libre:
#           sin límite, un script llenaría el buzón del equipo de spam.
@router.post("", response_model=MessageResponse)
@limiter.limit("3/minute")
async def send_contact_message(request: Request, body: ContactRequest) -> MessageResponse:
    enviado = await send_contact_email(body.name, str(body.email), body.subject, body.message)
    # ¿Qué? 503 si el correo no salió (servidor de correo caído o sin configurar).
    # ¿Para qué? Antes el formulario decía "enviado" sin enviar nada; ahora el
    #           frontend solo muestra éxito si de verdad llegó al buzón.
    if not enviado:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No pudimos enviar tu mensaje en este momento. Intenta de nuevo más tarde.",
        )
    return MessageResponse(message="Mensaje enviado")
