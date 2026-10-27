"""
Módulo: services/auditoria_conjunto_service.py
Descripción: Lógica de negocio de la auditoría del Reciclador al conjunto
             (RQF-009) — validaciones y guardado de la foto de evidencia.
"""
import asyncio
import re
import unicodedata
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import Date, cast, func, select
from sqlalchemy.orm import Session, selectinload

from app.models.administrador_conjunto import AdministradorConjunto
from app.models.administrador_conjunto_asignacion import AdministradorConjuntoAsignacion
from app.models.auditoria_conjunto import AuditoriaConjunto
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.notificacion import Notificacion, NotificacionDestinatario
from app.models.reciclador import Reciclador
from app.models.reciclador_conjunto import RecicladorConjunto
from app.models.residente import Residente
from app.models.rol import RolId
from app.models.unidad import Unidad
from app.models.usuario import Usuario
from app.schemas.auditoria_conjunto import (
    DesempenoConjuntoResponse,
    NivelDesempeno,
    SemanaDesempeno,
    TemaDesempeno,
)
from app.services.agenda_conjunto_service import HUSO_BOGOTA
from app.services.notificaciones_helpers import (
    admins_del_conjunto,
    crear_notificacion,
    reciclador_esta_presente,
    residentes_del_conjunto,
)
from app.utils.imagenes import guardar_imagen_subida
from app.utils.pdf_desempeno import construir_pdf_desempeno

# ¿Qué? Carpeta donde quedan las fotos de evidencia, servida luego como
#       archivos estáticos en /uploads (ver main.py).
# ¿Para qué? Primera vez que el backend guarda archivos subidos por un
#           usuario — antes todo el contenido educativo usaba solo links
#           externos (YouTube, PDFs), nunca un archivo propio.
CARPETA_EVIDENCIAS = Path(__file__).parent.parent / "uploads" / "evidencias-auditoria"


def _obtener_reciclador(db: Session, id_usuario: UUID) -> Reciclador:
    reciclador = db.execute(select(Reciclador).where(Reciclador.id_usuario == id_usuario)).scalar_one_or_none()
    if reciclador is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes un perfil de reciclador.")
    return reciclador


def _verificar_autorizado(db: Session, id_reciclador: UUID, id_conjunto: UUID) -> None:
    # ¿Qué? fecha_revocacion IS NULL — un reciclador al que ya le
    #       revocaron el acceso no debe poder seguir auditando ese
    #       conjunto, aunque alguna vez sí haya estado autorizado.
    autorizado = db.execute(
        select(RecicladorConjunto).where(
            RecicladorConjunto.id_reciclador == id_reciclador,
            RecicladorConjunto.id_conjunto_residencial == id_conjunto,
            RecicladorConjunto.fecha_revocacion.is_(None),
        )
    ).first()
    if autorizado is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No estás autorizado en ese conjunto.",
        )


async def _guardar_evidencia(archivo: UploadFile) -> str:
    """Valida y guarda una foto de evidencia — ver utils/imagenes.py para
    el detalle de la validación (reutilizada también por los adjuntos de
    comunicados/novedades, ver routers/uploads.py)."""
    return await guardar_imagen_subida(archivo, CARPETA_EVIDENCIAS, "/uploads/evidencias-auditoria")


MAXIMO_FOTOS_EVIDENCIA = 3
HORAS_ENTRE_AUDITORIAS = 24


def _ya_audito_recientemente(db: Session, id_reciclador: UUID, id_conjunto: UUID) -> bool:
    """¿Qué? CA-010.3 / RN-002 de RQF-009: un reciclador no puede calificar el
    mismo conjunto dos veces en menos de 24 horas.
    ¿Para qué? Antes de esto, un reciclador podía enviar auditorías
    repetidas del mismo conjunto sin ninguna restricción de tiempo."""
    limite = datetime.now(timezone.utc) - timedelta(hours=HORAS_ENTRE_AUDITORIAS)
    stmt = select(AuditoriaConjunto.id_auditoria).where(
        AuditoriaConjunto.id_reciclador == id_reciclador,
        AuditoriaConjunto.id_conjunto_residencial == id_conjunto,
        AuditoriaConjunto.created_at > limite,
    )
    return db.execute(stmt).first() is not None


async def crear_auditoria(
    db: Session,
    id_usuario_reciclador: UUID,
    id_conjunto_residencial: UUID,
    nivel_desempeno: NivelDesempeno,
    tema_educativo: str,
    descripcion: str | None,
    evidencias: list[UploadFile],
) -> AuditoriaConjunto:
    reciclador = _obtener_reciclador(db, id_usuario_reciclador)
    _verificar_autorizado(db, reciclador.id_reciclador, id_conjunto_residencial)

    # ¿Qué? Control de presencia (mismo concepto que ya se aplica a las
    #       notificaciones del reciclador, ver notificaciones_helpers.py) —
    #       auditar solo tiene sentido con el reciclador físicamente en el
    #       conjunto, no en cualquier momento.
    # ¿Para qué? Antes de esto, un reciclador podía auditar un conjunto sin
    #           haber avisado su llegada — el único candado era el de 24h
    #           de abajo, sin relación con si de verdad estaba ahí.
    if not reciclador_esta_presente(db, id_conjunto_residencial, id_usuario_reciclador):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes avisar tu llegada a este conjunto antes de poder auditarlo.",
        )

    if _ya_audito_recientemente(db, reciclador.id_reciclador, id_conjunto_residencial):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya auditaste este conjunto hace menos de {HORAS_ENTRE_AUDITORIAS} horas.",
        )

    if not (1 <= len(evidencias) <= MAXIMO_FOTOS_EVIDENCIA):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Debes adjuntar entre 1 y {MAXIMO_FOTOS_EVIDENCIA} fotos de evidencia.",
        )

    # ¿Qué? Antes se procesaba una foto a la vez, esperando a que cada una
    #       terminara antes de empezar la siguiente ("for archivo in
    #       evidencias: await ...").
    # ¿Para qué? Con hasta 3 fotos por auditoría, esperar una por una
    #           multiplica por 3 el tiempo total. Con asyncio.gather, las 3
    #           se procesan al mismo tiempo — el tiempo total es el de la
    #           foto más lenta, no la suma de las 3.
    # ¿Impacto? Si CUALQUIER foto falla la validación, se cancela toda la
    #           auditoría igual que antes (ninguna se guarda a medias).
    rutas = await asyncio.gather(*[_guardar_evidencia(archivo) for archivo in evidencias])

    auditoria = AuditoriaConjunto(
        id_reciclador=reciclador.id_reciclador,
        id_conjunto_residencial=id_conjunto_residencial,
        nivel_desempeno=nivel_desempeno,
        tema_educativo=tema_educativo.strip(),
        descripcion=descripcion.strip() if descripcion else None,
        ruta_evidencia=rutas[0],
        ruta_evidencia_2=rutas[1] if len(rutas) > 1 else None,
        ruta_evidencia_3=rutas[2] if len(rutas) > 2 else None,
    )
    db.add(auditoria)
    db.flush()  # ¿Para qué? Necesitamos auditoria.id_auditoria antes de crear la notificación.

    _notificar_auditoria_publicada(db, auditoria)
    _notificar_recomendacion_si_corresponde(db, auditoria)

    db.commit()
    db.refresh(auditoria)
    return auditoria


def _notificar_auditoria_publicada(db: Session, auditoria: AuditoriaConjunto) -> None:
    """
    ¿Qué? Avisa a los residentes y al Admin de Conjunto que hay una
          auditoría nueva — reutiliza el sistema de notificaciones que ya
          existe (mismo patrón que LLEGADA_RECICLADOR, SHUT_LLENO, etc.),
          solo con un tipo nuevo.
    ¿Para qué? El frontend la muestra aparte de las notificaciones
              normales (issue #5: "que no se mezcle con las de siempre"),
              usando `id_referencia` para saber qué auditoría abrir con
              el botón "Ver" sin tener que adivinar por conjunto/fecha.
    ¿Impacto? El Reciclador que la envió nunca recibe esta notificación —
             ni residentes ni Admin de Conjunto lo incluyen como destinatario.
    """
    destinatarios = set(residentes_del_conjunto(db, auditoria.id_conjunto_residencial)) | set(
        admins_del_conjunto(db, auditoria.id_conjunto_residencial)
    )
    if not destinatarios:
        return

    crear_notificacion(
        db,
        tipo="AUDITORIA_PUBLICADA",
        mensaje="El reciclador auditó la separación de residuos de tu conjunto.",
        destinatarios=destinatarios,
        id_conjunto=auditoria.id_conjunto_residencial,
        id_referencia=auditoria.id_auditoria,
    )


# ¿Qué? Niveles de desempeño que disparan una recomendación (ver
#       ORDEN_NIVELES_SELECCIONABLES en fe/src/config/nivelesDesempeno.ts).
_NIVELES_CON_RECOMENDACION = {"REGULAR", "DEFICIENTE"}


def _notificar_recomendacion_si_corresponde(db: Session, auditoria: AuditoriaConjunto) -> None:
    """
    ¿Qué? Issue #4 (RQF-013) — si la calificación fue Regular o Malo, avisa
          a los Residentes del conjunto (no al Admin de Conjunto: solo el
          Residente puede entrar al catálogo educativo, "Aprender") que
          hay contenido educativo recomendado sobre el tema calificado.
    ¿Para qué? "tema_educativo" ya se guarda con el mismo texto que
              "contenido_educativo.modulo_categoria" a propósito (ver
              models/auditoria_conjunto.py) — no hace falta ningún
              algoritmo para encontrar el contenido relacionado, es una
              comparación directa de texto que ya hace el frontend al
              abrir /catalogo-educativo/:categoria.
    ¿Impacto? Un desempeño Bueno no genera esta notificación — no hay nada
              que recomendar si ya se hizo bien. El mensaje se deja corto a
              propósito (sin repetir el tema ni el nivel, ya visibles al
              abrir la recomendación) — decisión del 2026-09-14 para que la
              tarjeta de notificación no se vea con tanto texto.
    """
    if auditoria.nivel_desempeno not in _NIVELES_CON_RECOMENDACION:
        return

    destinatarios = residentes_del_conjunto(db, auditoria.id_conjunto_residencial)
    if not destinatarios:
        return

    crear_notificacion(
        db,
        tipo="CONTENIDO_RECOMENDADO",
        mensaje="El reciclador recomienda contenido educativo para tu conjunto.",
        destinatarios=destinatarios,
        id_conjunto=auditoria.id_conjunto_residencial,
        id_referencia=auditoria.id_auditoria,
    )


def _pertenece_al_conjunto(db: Session, current_user: Usuario, id_conjunto: UUID) -> bool:
    """
    ¿Qué? Un Residente pertenece al conjunto si su unidad está ahí; un
          Admin de Conjunto pertenece si tiene una asignación ACTIVA a ese
          conjunto (RQF-016: un admin ya desvinculado no debe poder ver
          las auditorías del conjunto que dejó).
    """
    if current_user.id_rol == RolId.RESIDENTE:
        stmt = (
            select(Residente.id_residente)
            .join(Unidad, Residente.id_unidad == Unidad.id_unidad)
            .where(Residente.id_usuario == current_user.id_usuario, Unidad.id_conjunto_residencial == id_conjunto)
        )
        return db.execute(stmt).first() is not None

    if current_user.id_rol == RolId.ADMIN_CONJUNTO:
        stmt = select(AdministradorConjuntoAsignacion).where(
            AdministradorConjuntoAsignacion.id_conjunto_residencial == id_conjunto,
            AdministradorConjuntoAsignacion.fecha_desvinculacion.is_(None),
            AdministradorConjuntoAsignacion.id_administrador
            == select(AdministradorConjunto.id_administrador)
            .where(AdministradorConjunto.id_usuario == current_user.id_usuario)
            .scalar_subquery(),
        )
        return db.execute(stmt).first() is not None

    return False


def obtener_por_id(db: Session, current_user: Usuario, id_auditoria: UUID) -> AuditoriaConjunto:
    """
    ¿Qué? El detalle completo de UNA auditoría — lo que abre el botón
          "Ver" de la notificación AUDITORIA_PUBLICADA, o una fila del
          historial (Residente/Admin de Conjunto/Reciclador).
    ¿Impacto? Un Residente o Admin de Conjunto solo puede ver auditorías de
             un conjunto al que de verdad pertenecen. Un Reciclador solo
             puede ver las que ÉL mismo envió — no las de otros
             recicladores autorizados en el mismo conjunto. Sin esto,
             cualquiera con sesión podría ver auditorías ajenas adivinando ids.
    """
    auditoria = db.execute(
        select(AuditoriaConjunto).where(AuditoriaConjunto.id_auditoria == id_auditoria)
    ).scalar_one_or_none()
    if auditoria is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auditoría no encontrada.")

    if current_user.id_rol == RolId.RECICLADOR:
        reciclador = _obtener_reciclador(db, current_user.id_usuario)
        if auditoria.id_reciclador != reciclador.id_reciclador:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No es una auditoría tuya.")
        return auditoria

    if not _pertenece_al_conjunto(db, current_user, auditoria.id_conjunto_residencial):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No perteneces a ese conjunto.")

    return auditoria


def _conjuntos_del_usuario(db: Session, current_user: Usuario) -> list[UUID]:
    """
    ¿Qué? A qué conjunto(s) pertenece quien pregunta — un Residente vive en
          uno solo; un Admin de Conjunto puede administrar varios a la vez.
    ¿Para qué? Que el historial funcione para ambos roles sin que el
              frontend tenga que decirle al backend cuál conjunto — se
              resuelve solo, igual que ya hace `/notificaciones/estado-shut`
              para el Residente.
    """
    if current_user.id_rol == RolId.RESIDENTE:
        stmt = (
            select(Unidad.id_conjunto_residencial)
            .join(Residente, Unidad.id_unidad == Residente.id_unidad)
            .where(Residente.id_usuario == current_user.id_usuario)
        )
        id_conjunto = db.execute(stmt).scalar_one_or_none()
        return [id_conjunto] if id_conjunto is not None else []

    if current_user.id_rol == RolId.ADMIN_CONJUNTO:
        administrador = db.execute(
            select(AdministradorConjunto).where(AdministradorConjunto.id_usuario == current_user.id_usuario)
        ).scalar_one_or_none()
        if administrador is None:
            return []
        return [c.id_conjunto_residencial for c in administrador.conjuntos]

    return []


def _pagina_de_auditorias(
    db: Session, condiciones: list, limit: int, offset: int
) -> tuple[list[AuditoriaConjunto], int]:
    """
    ¿Qué? Una página de auditorías (más recientes primero) y cuántas hay en total
          con esas condiciones.
    ¿Para qué? Lo comparten las listas de auditorías que pueden crecer
              (listar_historial del Residente y listar_mias del Reciclador): la
              pantalla pide de a pocas y muestra "de la X a la Y de Z", en vez de
              un tope fijo que cortaba el resto sin avisar.
    ¿Impacto? Se desempata por orden_interno (contador interno siempre creciente,
              nunca expuesto en la API) además de created_at: dentro de una misma
              transacción, NOW() de Postgres devuelve el mismo valor para varias
              inserciones seguidas, así que created_at solo no basta, y sin un
              orden estable una auditoría podría repetirse o saltarse al cambiar
              de página. selectinload evita 2 consultas extra por auditoría
              (conjunto y reciclador), que _a_response() lee por cada fila.
    """
    total = db.execute(select(func.count()).select_from(AuditoriaConjunto).where(*condiciones)).scalar_one()
    stmt = (
        select(AuditoriaConjunto)
        .where(*condiciones)
        .order_by(AuditoriaConjunto.created_at.desc(), AuditoriaConjunto.orden_interno.desc())
        .options(selectinload(AuditoriaConjunto.conjunto), selectinload(AuditoriaConjunto.reciclador))
        .limit(limit)
        .offset(offset)
    )
    return list(db.execute(stmt).scalars().all()), total


def listar_historial(
    db: Session, current_user: Usuario, limit: int, offset: int
) -> tuple[list[AuditoriaConjunto], int]:
    """
    ¿Qué? Las auditorías de el/los conjunto(s) del usuario en sesión, más recientes
          primero y de a páginas — a diferencia de la notificación
          AUDITORIA_PUBLICADA (que se pierde al marcarla leída), esto queda
          siempre consultable.
    ¿Para qué? Issue #5: un Residente o Admin de Conjunto debe poder volver
              a ver auditorías pasadas, no solo la más reciente que le avisó
              una notificación.
    ¿Impacto? Antes devolvía como máximo las 50 más recientes, sin avisar que
              faltaban las demás. El segundo valor es el total, para que la
              pantalla sepa cuántas páginas hay.
    """
    ids_conjuntos = _conjuntos_del_usuario(db, current_user)
    if not ids_conjuntos:
        return [], 0
    return _pagina_de_auditorias(
        db, [AuditoriaConjunto.id_conjunto_residencial.in_(ids_conjuntos)], limit, offset
    )


SEMANAS_POR_DEFECTO = 8
SEMANAS_PERMITIDAS = (4, 8, 12)

# ¿Qué? Nivel guardado en la BD → campo del schema de desempeño.
_CAMPO_POR_NIVEL = {"BUENA": "bueno", "REGULAR": "regular", "DEFICIENTE": "malo"}


def _resolver_conjunto(db: Session, current_user: Usuario, id_conjunto: UUID | None) -> UUID:
    """
    ¿Qué? Qué conjunto consultar para el desempeño: el pedido (si el usuario
          pertenece a él) o, sin pedir ninguno, el único que tiene.
    ¿Impacto? Conjunto ajeno, Reciclador y Admin del Sistema responden 403
             (no tienen ninguno que resolver). Un Admin de Conjunto con
             varios conjuntos debe elegir: 422, nunca se adivina uno.
    """
    if id_conjunto is not None:
        if not _pertenece_al_conjunto(db, current_user, id_conjunto):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No perteneces a ese conjunto.")
        return id_conjunto

    ids_conjuntos = _conjuntos_del_usuario(db, current_user)
    if not ids_conjuntos:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No perteneces a ningún conjunto.")
    if len(ids_conjuntos) > 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Administras varios conjuntos: indica cuál con id_conjunto.",
        )
    return ids_conjuntos[0]


def _inicio_dia_bogota(dia: date) -> datetime:
    return datetime.combine(dia, time.min, tzinfo=HUSO_BOGOTA)


def desempeno_semanal(
    db: Session, current_user: Usuario, id_conjunto: UUID | None, semanas: int
) -> DesempenoConjuntoResponse:
    """
    ¿Qué? Cuántas auditorías Bueno/Regular/Malo tuvo un conjunto en cada una
          de las últimas `semanas` semanas (la en curso incluida) y por tema.
    ¿Para qué? Las semanas se cortan en hora de Bogotá, de lunes a domingo:
              una auditoría del domingo 9 p. m. ya es lunes en UTC y caería
              en la semana siguiente. Se cuenta en la BD (GROUP BY), así que
              pasadas las 50 auditorías no se pierde ninguna.
    ¿Impacto? Las semanas sin auditorías salen en cero (la barra vacía se
             ve) y la más antigua va primero. El mínimo de datos para
             mostrar la gráfica lo decide la pantalla con `total`.
    """
    id_conjunto = _resolver_conjunto(db, current_user, id_conjunto)

    hoy = datetime.now(HUSO_BOGOTA).date()
    lunes_actual = hoy - timedelta(days=hoy.weekday())
    lunes_inicial = lunes_actual - timedelta(weeks=semanas - 1)
    en_ventana = (
        AuditoriaConjunto.id_conjunto_residencial == id_conjunto,
        AuditoriaConjunto.created_at >= _inicio_dia_bogota(lunes_inicial),
        AuditoriaConjunto.created_at < _inicio_dia_bogota(lunes_actual + timedelta(weeks=1)),
    )

    # ¿Qué? date_trunc('week') en Postgres devuelve el lunes de esa semana.
    # ¿Para qué? Se agrupa por el nombre del label para que Postgres vea la
    #           misma expresión en SELECT y GROUP BY.
    semana_bogota = cast(
        func.date_trunc("week", func.timezone("America/Bogota", AuditoriaConjunto.created_at)), Date
    ).label("semana")
    filas_semana = db.execute(
        select(semana_bogota, AuditoriaConjunto.nivel_desempeno, func.count())
        .where(*en_ventana)
        .group_by(semana_bogota, AuditoriaConjunto.nivel_desempeno)
    ).all()
    filas_tema = db.execute(
        select(AuditoriaConjunto.tema_educativo, AuditoriaConjunto.nivel_desempeno, func.count())
        .where(*en_ventana)
        .group_by(AuditoriaConjunto.tema_educativo, AuditoriaConjunto.nivel_desempeno)
    ).all()

    por_semana = {
        lunes_inicial + timedelta(weeks=i): SemanaDesempeno(lunes=lunes_inicial + timedelta(weeks=i))
        for i in range(semanas)
    }
    por_tema: dict[str, TemaDesempeno] = {}
    total = 0
    for lunes, nivel, cantidad in filas_semana:
        setattr(por_semana[lunes], _CAMPO_POR_NIVEL[nivel], cantidad)
        total += cantidad
    for tema, nivel, cantidad in filas_tema:
        por_tema.setdefault(tema, TemaDesempeno(tema=tema))
        setattr(por_tema[tema], _CAMPO_POR_NIVEL[nivel], cantidad)

    return DesempenoConjuntoResponse(
        id_conjunto_residencial=id_conjunto,
        total=total,
        semanas=list(por_semana.values()),
        temas=sorted(por_tema.values(), key=lambda t: t.tema),
    )


def exportar_pdf_desempeno(
    db: Session, current_user: Usuario, id_conjunto: UUID | None, semanas: int
) -> tuple[bytes, str]:
    """
    ¿Qué? El desempeño semanal del conjunto como PDF (issue #558): los mismos números que
          devuelve desempeno_semanal(), así el PDF siempre coincide con la pantalla.
    ¿Para qué? Llevar la gráfica, la tabla por semana y el ranking de temas a una reunión.
    ¿Impacto? Devuelve (contenido, nombre del archivo). Sin auditorías en el período responde
             422 en vez de entregar un PDF vacío. El ranking de temas usa el mismo orden que
             la pantalla (rankingTemas en fe/src/lib/desempeno.ts): más Regular o Malo, luego
             más auditorías, luego el nombre.
    """
    datos = desempeno_semanal(db, current_user, id_conjunto, semanas)
    if datos.total == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="No hay auditorías en este período para descargar.",
        )
    nombre_conjunto = db.execute(
        select(ConjuntoResidencial.nombre_conjunto).where(
            ConjuntoResidencial.id_conjunto_residencial == datos.id_conjunto_residencial
        )
    ).scalar_one()

    filas_semana = [
        (
            s.lunes.strftime("%d/%m"),
            f"{s.lunes:%d/%m/%Y} al {s.lunes + timedelta(days=6):%d/%m/%Y}",
            s.bueno,
            s.regular,
            s.malo,
        )
        for s in datos.semanas
    ]
    temas = sorted(datos.temas, key=lambda t: (-(t.regular + t.malo), -(t.bueno + t.regular + t.malo), t.tema))
    ahora = datetime.now(HUSO_BOGOTA)
    primero, ultimo = datos.semanas[0].lunes, datos.semanas[-1].lunes + timedelta(days=6)
    contenido = construir_pdf_desempeno(
        nombre_conjunto=nombre_conjunto,
        periodo_texto=f"Últimas {semanas} semanas, del {primero:%d/%m/%Y} al {ultimo:%d/%m/%Y}",
        generado_el=f"{ahora:%d/%m/%Y %H:%M}",
        semanas=filas_semana,
        temas=[(t.tema, t.bueno, t.regular, t.malo) for t in temas],
    )
    ascii_ = unicodedata.normalize("NFKD", nombre_conjunto).encode("ascii", "ignore").decode().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_).strip("-") or "conjunto"
    return contenido, f"desempeno-{slug}-{semanas}semanas-{ahora:%Y-%m-%d}.pdf"


def auditorias_de_semana(
    db: Session, current_user: Usuario, id_conjunto: UUID | None, lunes: date
) -> list[AuditoriaConjunto]:
    """
    ¿Qué? Las auditorías de UNA semana de Bogotá (lunes a domingo) de un
          conjunto, más recientes primero — lo que se abre al tocar una barra.
    ¿Impacto? `lunes` debe ser lunes de verdad (422 si no): así el detalle
             siempre coincide con una barra de desempeno_semanal().
    """
    id_conjunto = _resolver_conjunto(db, current_user, id_conjunto)
    if lunes.weekday() != 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="La fecha debe ser un lunes.")

    desde = _inicio_dia_bogota(lunes)
    stmt = (
        select(AuditoriaConjunto)
        .where(
            AuditoriaConjunto.id_conjunto_residencial == id_conjunto,
            AuditoriaConjunto.created_at >= desde,
            AuditoriaConjunto.created_at < desde + timedelta(days=7),
        )
        .order_by(AuditoriaConjunto.created_at.desc(), AuditoriaConjunto.orden_interno.desc())
        .options(selectinload(AuditoriaConjunto.conjunto), selectinload(AuditoriaConjunto.reciclador))
    )
    return list(db.execute(stmt).scalars().all())


def _contar_avisados(db: Session, ids_auditoria: list[UUID]) -> dict[UUID, int]:
    """¿Qué? Cuántos residentes fueron avisados con "contenido recomendado"
    a raíz de cada auditoría (ver _notificar_recomendacion_si_corresponde) —
    una consulta agrupada, no una por auditoría, para no repetir N veces la
    misma vuelta a la base de datos."""
    if not ids_auditoria:
        return {}
    stmt = (
        select(Notificacion.id_referencia, func.count(NotificacionDestinatario.id_usuario))
        .join(NotificacionDestinatario, NotificacionDestinatario.id_notificacion == Notificacion.id)
        .where(
            Notificacion.tipo == "CONTENIDO_RECOMENDADO",
            Notificacion.id_referencia.in_(ids_auditoria),
        )
        .group_by(Notificacion.id_referencia)
    )
    return dict(db.execute(stmt).all())


def listar_admin(
    db: Session, lunes: date | None, limit: int, offset: int
) -> tuple[list[AuditoriaConjunto], int, dict[UUID, int]]:
    """
    ¿Qué? RQF-009 — el Admin del Sistema ve las auditorías del reciclador
          sin importar a qué conjunto pertenecen, a diferencia de
          listar_historial (acotado al conjunto de quien pregunta).
    ¿Para qué? Con `lunes`, se acota a esa semana completa: desde la
              medianoche de Bogotá de ese lunes hasta la medianoche de Bogotá
              del lunes siguiente (sin exigirlo) — la misma semana que ya usan
              el desempeño del Admin de Conjunto y del Residente
              (desempeno_semanal). Antes se cortaba en UTC: una auditoría del
              domingo a las 9:00 p. m. en Bogotá ya es lunes en UTC y caía en
              la semana siguiente. Sin `lunes`, trae las más recientes de
              cualquier semana — así el catálogo educativo puede armar "a
              qué conjuntos se le recomendó este módulo" sin acotarlo a una
              sola semana.
    ¿Impacto? El tercer valor devuelto es cuántos residentes fueron
              avisados por cada auditoría (ver _contar_avisados) — siempre
              0 para nivel BUENA, nunca un error de datos.
    """
    condiciones = []
    if lunes is not None:
        desde = _inicio_dia_bogota(lunes)
        condiciones.append(AuditoriaConjunto.created_at >= desde)
        condiciones.append(AuditoriaConjunto.created_at < desde + timedelta(days=7))

    total = db.execute(
        select(func.count()).select_from(AuditoriaConjunto).where(*condiciones)
    ).scalar_one()

    stmt = (
        select(AuditoriaConjunto)
        .where(*condiciones)
        .order_by(AuditoriaConjunto.created_at.desc(), AuditoriaConjunto.orden_interno.desc())
        .options(
            selectinload(AuditoriaConjunto.conjunto).selectinload(ConjuntoResidencial.localidad),
            selectinload(AuditoriaConjunto.reciclador),
        )
        .limit(limit)
        .offset(offset)
    )
    auditorias = list(db.execute(stmt).scalars().all())
    avisados_por_auditoria = _contar_avisados(db, [a.id_auditoria for a in auditorias])
    return auditorias, total, avisados_por_auditoria


def listar_mias(
    db: Session, id_usuario_reciclador: UUID, limit: int, offset: int
) -> tuple[list[AuditoriaConjunto], int]:
    """¿Qué? Auditorías ya enviadas por este reciclador, más recientes primero y de a páginas.
    ¿Para qué? Es su historial en el panel. Antes devolvía todas, sin tope, y
              además servía para calcular el aviso "ya puedes auditar de
              nuevo": ese cálculo ahora usa ultimas_por_conjunto, porque con
              páginas la lista ya no trae la última auditoría de cada conjunto."""
    reciclador = _obtener_reciclador(db, id_usuario_reciclador)
    return _pagina_de_auditorias(
        db, [AuditoriaConjunto.id_reciclador == reciclador.id_reciclador], limit, offset
    )


def ultimas_por_conjunto(db: Session, id_usuario_reciclador: UUID) -> list[tuple[UUID, datetime]]:
    """
    ¿Qué? Por cada conjunto que este reciclador ya auditó, la fecha de su última auditoría.
    ¿Para qué? El panel del Reciclador muestra el aviso "este conjunto necesita
              auditoría" cuando la última tiene 7 días o más (cadencia semanal,
              issue #5). Una consulta agrupada devuelve una fila por conjunto
              (no una por auditoría), así que no crece con el historial.
    ¿Impacto? Un conjunto nunca auditado no aparece: la pantalla lo trata como
              "necesita auditoría". Solo cuenta las auditorías de este reciclador.
    """
    reciclador = _obtener_reciclador(db, id_usuario_reciclador)
    filas = db.execute(
        select(AuditoriaConjunto.id_conjunto_residencial, func.max(AuditoriaConjunto.created_at))
        .where(AuditoriaConjunto.id_reciclador == reciclador.id_reciclador)
        .group_by(AuditoriaConjunto.id_conjunto_residencial)
    ).all()
    return [(id_conjunto, ultima) for id_conjunto, ultima in filas]
