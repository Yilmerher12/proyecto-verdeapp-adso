"""
Módulo: schemas/auditoria_conjunto.py
Descripción: Esquemas de validación para la auditoría del Reciclador al
             conjunto (RQF-009).
"""
from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

# ¿Qué? Los 4 niveles de desempeño acordados (issue #5) — escala simple,
#       cada uno con su propio color/ícono en el frontend, pero siempre
#       respaldado por una foto de evidencia (ver AuditoriaConjunto.ruta_evidencia).
NivelDesempeno = Literal["EXCELENTE", "BUENA", "REGULAR", "DEFICIENTE"]


class AuditoriaConjuntoResponse(BaseModel):
    id_auditoria: UUID
    id_conjunto_residencial: UUID
    nombre_conjunto: str
    nivel_desempeno: NivelDesempeno
    tema_educativo: str
    descripcion: Optional[str] = None
    ruta_evidencia: str
    ruta_evidencia_2: Optional[str] = None
    ruta_evidencia_3: Optional[str] = None
    created_at: datetime
    # ¿Qué? Nombre del reciclador que hizo la auditoría.
    # ¿Para qué? Se muestra a los residentes — se decidió explícitamente
    #           (a diferencia del teléfono en el Directorio) que SÍ es
    #           público: es una evaluación hecha en su rol formal, no un
    #           dato de contacto personal.
    nombre_reciclador: str

    model_config = ConfigDict(from_attributes=True)


# ¿Qué? Vista del Admin del Sistema sobre las auditorías (RQF-018) — igual a
#       la de arriba, más cuántos residentes fueron avisados con
#       "contenido recomendado" a raíz de esta auditoría.
# ¿Para qué? avisados es 0 para nivel BUENA (RQF-013: una calificación buena
#           nunca dispara esa notificación) — nunca es un error de datos.
class AuditoriaAdminResponse(AuditoriaConjuntoResponse):
    avisados: int = 0


class AuditoriasAdminListResponse(BaseModel):
    items: list[AuditoriaAdminResponse]
    total: int
