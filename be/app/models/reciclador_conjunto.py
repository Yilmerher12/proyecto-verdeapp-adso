from sqlalchemy import Column, Integer, ForeignKey
from app.database import Base

class RecicladorConjunto(Base):
    __tablename__ = "recicladores_conjuntos"

    id_reciclador = Column(Integer, ForeignKey("recicladores.id_reciclador"), primary_key=True)
    id_conjunto_residencial = Column(Integer, ForeignKey("conjuntos_residenciales.id_conjunto_residencial"), primary_key=True)