# RNF-005 — Motor Base de datos

---

## Identificación

| Campo             | Valor                                                  |
| ----------------- | ------------------------------------------------------ |
| **ID** | RNF-005                                                |
| **Nombre** | Motor Base de datos                                    |
| **Categoría** | Persistencia de Datos                                  |
| **Prioridad** | Crítica                                                |
| **Estado** | Por implementar                                        |

---

## Requisitos

### RNF-005.1 — Sistema Gestor de Base de Datos Relacional (RDBMS)
El sistema debe gestionar la persistencia de datos de forma exclusiva mediante el motor de base de datos relacional **PostgreSQL**.

### RNF-005.2 — Integridad Referencial
La base de datos debe implementar restricciones de llaves primarias (PK) y foráneas (FK) estrictas, asegurando la correcta relación entre entidades como Residentes, Recicladores, Conjuntos y Alertas de SHUT.

### RNF-005.3 — Interacción Backend-DB
La comunicación entre el backend y el motor MySQL debe realizarse a través de Spring Data JPA (Hibernate), evitando la inyección directa de sentencias SQL para mitigar riesgos de seguridad y facilitar el mapeo objeto-relacional (ORM).