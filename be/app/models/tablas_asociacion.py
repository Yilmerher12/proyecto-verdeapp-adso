
"""
Modulo: models/tablas_asociacion.py
Descripcion: Tablas puente (muchos-a-muchos) sin clase ORM propia.
Para que? SQLAlchemy necesita un objeto Table() real en sus metadatos
          para poder resolver secondary="nombre_tabla" en relationship().
          Estas tablas no necesitan su propia clase Python porque no
          se consultan directamente -- solo sirven de puente.
"""
 
from sqlalchemy import Table, Column, Integer, ForeignKey
from app.database import Base
 
recicladores_conjuntos = Table(
    "recicladores_conjuntos",
    Base.metadata,
    Column("id_reciclador", Integer, ForeignKey("recicladores.id_reciclador"), primary_key=True),
    Column("id_conjunto_residencial", Integer, ForeignKey("conjuntos_residenciales.id_conjunto_residencial"), primary_key=True),
)