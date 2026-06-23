# RNF-005 — Motor Base de Datos

---

## Identificación

| Campo         | Valor                 |
| ------------- | --------------------- |
| **ID**        | RNF-005               |
| **Nombre**    | Motor Base de datos   |
| **Categoría** | Persistencia de Datos |
| **Prioridad** | Crítica               |
| **Estado**    | Implementado       |

---

## Requisitos

### RNF-005.1 — Sistema Gestor de Base de Datos Relacional (RDBMS)

El sistema debe gestionar la persistencia de datos de forma exclusiva mediante el motor de base de datos relacional **PostgreSQL**, garantizando almacenamiento confiable, consistencia transaccional y soporte para relaciones complejas entre entidades del sistema.

### RNF-005.2 — Integridad Referencial

La base de datos debe implementar restricciones estrictas de llaves primarias (PK), llaves foráneas (FK), restricciones UNIQUE y validaciones de integridad referencial, asegurando la correcta relación entre entidades como Residentes, Recicladores, Conjuntos, Alertas SHUT y demás módulos funcionales del sistema.

### RNF-005.3 — Interacción Backend-DB

La comunicación entre el backend y el motor PostgreSQL debe realizarse mediante **SQLAlchemy ORM**, evitando la inyección directa de sentencias SQL siempre que sea posible, con el objetivo de reducir riesgos de seguridad, facilitar el mapeo objeto-relacional (ORM) y mejorar la mantenibilidad del código.

### RNF-005.4 — Control de Versiones del Esquema

La evolución y control de cambios del esquema de base de datos debe gestionarse mediante **Alembic Migrations**, permitiendo mantener consistencia entre ambientes y trazabilidad de modificaciones estructurales sin pérdida de datos.
