from sqlalchemy import Column, ForeignKey, Index, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base
from app.utils.ids import generar_uuid4


class RecicladorConjunto(Base):
    """
    ¿Qué? Tabla de "parejas": qué Reciclador está autorizado en qué
          Conjunto Residencial, con vigencia temporal (no se borra al
          revocar, queda como historial) — mismo patrón que
          AdministradorConjuntoAsignacion (ver ese archivo).
    ¿Para qué? Antes esta tabla no tenía clase ORM propia ni historial
              (solo (id_reciclador, id_conjunto_residencial) como llave
              compuesta) — revocar el acceso de un reciclador significaba
              borrar la fila sin dejar rastro de que alguna vez estuvo
              autorizado, ni de quién lo revocó, ni cuándo.
    ¿Impacto? Para saber "qué conjuntos trabaja Juan HOY", se filtra por
              id_reciclador y fecha_revocacion IS NULL. Para "quién
              recoge en el Conjunto X hoy", se filtra por
              id_conjunto_residencial y fecha_revocacion IS NULL. Sin ese
              filtro se ve el historial completo, incluyendo vínculos ya
              terminados.
    """
    __tablename__ = "recicladores_conjuntos"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=generar_uuid4)
    id_reciclador = Column(
        UUID(as_uuid=True),
        ForeignKey("recicladores.id_reciclador", ondelete="CASCADE"),
        nullable=False,
    )
    id_conjunto_residencial = Column(
        UUID(as_uuid=True),
        ForeignKey("conjuntos_residenciales.id_conjunto_residencial", ondelete="CASCADE"),
        nullable=False,
    )
    fecha_autorizacion = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # ¿Qué? NULL mientras el vínculo está activo; se llena con la fecha en
    #       que el Admin de Conjunto revocó el acceso.
    # ¿Para qué? "Soft delete" — en vez de borrar la fila al revocar, la
    #           marcamos como terminada. Así queda el historial de qué
    #           reciclador trabajó en qué conjunto y cuándo.
    fecha_revocacion = Column(TIMESTAMP, nullable=True)

    # ¿Qué? Quién revocó el acceso — a diferencia de la desvinculación de
    #       Admin de Conjunto (que pasa por una solicitud/aprobación
    #       aparte, con su propio "resuelta_por"), aquí el Admin de
    #       Conjunto revoca directo, así que este es el único registro de
    #       quién lo hizo.
    revocado_por_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id_usuario"), nullable=True)

    __table_args__ = (
        # ¿Qué? Un reciclador no puede tener dos vínculos ACTIVOS con el
        #       mismo conjunto al mismo tiempo (pero sí puede tener muchos
        #       vínculos históricos ya revocados con ese mismo conjunto,
        #       si se le vuelve a autorizar más adelante). Un índice único
        #       normal no permite esto; un índice único PARCIAL (solo
        #       sobre las filas con fecha_revocacion IS NULL) sí.
        # ¿Para qué? Que la regla la garantice la base de datos, no solo
        #           el código — mismo mecanismo que ux_admin_conjunto_activo.
        Index(
            "ux_reciclador_conjunto_activo",
            "id_reciclador",
            "id_conjunto_residencial",
            unique=True,
            postgresql_where=(fecha_revocacion.is_(None)),
        ),
    )
