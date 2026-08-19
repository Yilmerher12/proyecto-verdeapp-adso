from sqlalchemy import Column, Index, Integer, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from app.database import Base


class AdministradorConjuntoAsignacion(Base):
    """
    ¿Qué? Tabla de "parejas": qué Administrador de Conjunto maneja qué
          Conjunto Residencial, con vigencia temporal (no se borra al
          desvincular, queda como historial).
    ¿Para qué? Un administrador puede manejar varios conjuntos (por
              contrato), y un conjunto puede tener más de un administrador
              asignado A LO LARGO DEL TIEMPO (nunca dos al mismo tiempo).
              Esta tabla es la lista de esas combinaciones, pasadas y
              presentes.
    ¿Impacto? Para saber "qué conjuntos administra Juan HOY", se filtra
              por id_administrador y fecha_desvinculacion IS NULL. Para
              saber "quién administra el Conjunto X hoy", se filtra por
              id_conjunto_residencial y fecha_desvinculacion IS NULL. Sin
              ese filtro se ve el historial completo, incluyendo vínculos
              ya terminados (RQF-016 / RN-004).
    """
    __tablename__ = "administradores_conjuntos"

    id_administrador_conjunto = Column(Integer, primary_key=True, index=True)
    id_administrador = Column(
        Integer,
        ForeignKey("administradores_conjunto.id_administrador", ondelete="CASCADE"),
        nullable=False,
    )
    id_conjunto_residencial = Column(
        Integer,
        ForeignKey("conjuntos_residenciales.id_conjunto_residencial", ondelete="CASCADE"),
        nullable=False,
    )
    fecha_asignacion = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # ¿Qué? NULL mientras el vínculo está activo; se llena con la fecha en
    #       que el Admin Sistema aprobó la desvinculación (RQF-016).
    # ¿Para qué? "Soft delete" — en vez de borrar la fila al desvincular,
    #           la marcamos como terminada. Así queda el historial de
    #           quién administró cada conjunto y cuándo (RN-004).
    fecha_desvinculacion = Column(TIMESTAMP, nullable=True)

    __table_args__ = (
        # ¿Qué? Un conjunto no puede tener dos vínculos ACTIVOS al mismo
        #       tiempo (RN-003) — pero sí puede tener muchos vínculos
        #       históricos ya terminados. Un índice único normal no
        #       permite esto (bloquearía la fila histórica); un índice
        #       único PARCIAL (solo sobre las filas con
        #       fecha_desvinculacion IS NULL) sí.
        # ¿Para qué? Que la regla "un admin activo por conjunto" la
        #           garantice la base de datos, no solo el código.
        Index(
            "ux_admin_conjunto_activo",
            "id_conjunto_residencial",
            unique=True,
            postgresql_where=(fecha_desvinculacion.is_(None)),
        ),
    )