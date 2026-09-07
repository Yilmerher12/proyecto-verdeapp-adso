
"""
Modulo: models/tablas_asociacion.py
Descripcion: Tablas puente (muchos-a-muchos) sin clase ORM propia.
Para que? SQLAlchemy necesita un objeto Table() real en sus metadatos
          para poder resolver secondary="nombre_tabla" en relationship().
          Estas tablas no necesitan su propia clase Python porque no
          se consultan directamente -- solo sirven de puente.
¿Impacto? recicladores_conjuntos ya NO vive aquí — pasó a ser un modelo
          propio (app/models/reciclador_conjunto.py) porque ahora necesita
          historial (fecha_autorizacion/fecha_revocacion), igual que
          administradores_conjuntos. Este archivo queda vacío por ahora,
          listo para la próxima tabla puente que de verdad no necesite
          columnas propias.
"""
