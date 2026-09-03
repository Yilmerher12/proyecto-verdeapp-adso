from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, and_
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.administrador_conjunto_asignacion import AdministradorConjuntoAsignacion
from app.utils.ids import generar_uuid4


def _secondaryjoin_administradores_activos():
    """
    ¿Qué? Condición para unir administradores_conjuntos con
          administradores_conjunto, solo para vínculos activos.
    ¿Para qué? El import de AdministradorConjunto va DENTRO de la función
              (no arriba del archivo) porque ese módulo importa este
              archivo — importarlo arriba crearía un ciclo de imports.
              Como esta función solo se ejecuta cuando SQLAlchemy termina
              de configurar todos los mappers (después de que ambos
              módulos ya cargaron por completo), el import diferido es
              seguro.
    """
    from app.models.administrador_conjunto import AdministradorConjunto

    return and_(
        AdministradorConjuntoAsignacion.id_administrador == AdministradorConjunto.id_administrador,
        AdministradorConjuntoAsignacion.fecha_desvinculacion.is_(None),
    )


class ConjuntoResidencial(Base):
    __tablename__ = "conjuntos_residenciales"

    id_conjunto_residencial = Column(UUID(as_uuid=True), primary_key=True, index=True, default=generar_uuid4)
    # ¿Qué? id_localidad sigue siendo Integer a propósito — `localidades`
    #       es un catálogo fijo de 20 filas (las localidades de Bogotá),
    #       acoplado además al dataset externo del gobierno distrital que
    #       trae esos mismos números 1-20 de fábrica en el CSV de conjuntos
    #       reales. Migrarlo exigiría un mapeo manual para 14,515 filas sin
    #       ningún beneficio real de seguridad (esos números ya son públicos).
    id_localidad = Column(Integer, ForeignKey("localidades.id_localidad"), nullable=False)
    nombre_conjunto = Column(String(255), nullable=False)
    nit = Column(String(50), nullable=True)
    direccion = Column(String(255), nullable=False)

    verificado = Column(Boolean, nullable=False, default=False)

    verificado_por_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id_usuario"), nullable=True)

    # Puentes
    localidad = relationship("Localidad", back_populates="conjuntos")
    unidades = relationship("Unidad", back_populates="conjunto")
    verificado_por = relationship("Usuario", foreign_keys=[verificado_por_id])

    # Puente de Muchos a Muchos con la tabla intermedia de recicladores
    recicladores = relationship("Reciclador", secondary="recicladores_conjuntos", back_populates="conjuntos")

    # ¿Qué? Puente a los administradores ACTIVOS de este conjunto (excluye
    #       a quien ya se desvinculó — RQF-016), simétrico a
    #       AdministradorConjunto.conjuntos.
    # ¿Para qué? El "secondaryjoin" se resuelve con una función (no un
    #           import directo) porque AdministradorConjunto ya importa
    #           este archivo — un import directo aquí crearía un ciclo.
    administradores = relationship(
        "AdministradorConjunto",
        secondary=AdministradorConjuntoAsignacion.__table__,
        primaryjoin=lambda: (
            ConjuntoResidencial.id_conjunto_residencial
            == AdministradorConjuntoAsignacion.id_conjunto_residencial
        ),
        secondaryjoin=_secondaryjoin_administradores_activos,
        back_populates="conjuntos",
        viewonly=True,
    )