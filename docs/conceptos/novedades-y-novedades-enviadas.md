# Novedades y novedades enviadas: qué son, en qué se diferencian y por qué se archivan

<!--
  ¿Qué? Explicación corta de las dos cosas que en VerdeApp se llaman
        "novedad": las que publica el Admin Sistema (RQF-015, tabla
        `novedades`) y las que le envían los usuarios (RQF-021, tabla
        `novedades_enviadas`). También explica por qué las primeras se
        archivan y qué dice la regla RN-005.
  ¿Para qué? Que alguien nuevo en el equipo entienda la diferencia leyendo
             solo este documento, sin abrir el código.
  ¿Impacto? Issue #522. Es solo documentación: no cambia código ni tablas.
-->

En el código y en las pantallas aparece la palabra "novedad" para dos cosas distintas.
Van en **direcciones contrarias** y viven en **tablas distintas**.

---

## 1. La diferencia en una tabla

| | **Novedad** (`novedades`) | **Novedad enviada** (`novedades_enviadas`) |
| --- | --- | --- |
| Requisito | [RQF-015](../requisitos/RFs/RQF-015_publicar_novedades_generales.md) | [RQF-021](../requisitos/RFs/RQF-021_novedades_enviadas_admin_sistema.md) |
| Quién la crea | Solo el Administrador del Sistema | Residente, Reciclador o Administrador de Conjunto. El Admin Sistema no puede (403) |
| Hacia dónde va | Del Admin Sistema hacia los usuarios | De los usuarios hacia el Admin Sistema |
| Quién la ve | Los usuarios del rol elegido (`alcance`) y, si se eligieron conjuntos, solo los de esos conjuntos | El autor (su historial) y el Admin Sistema (su bandeja) |
| Para qué sirve | Avisar cambios de la app, temas ambientales o avisos generales | Consulta de soporte: contar un problema y recibir respuesta |
| Qué lleva | Texto, adjunto opcional, video de YouTube opcional, fecha de expiración | Motivo, comentario (solo con "Otros"), imagen opcional |
| Ciclo de vida | Activa → archivada. **Sin vuelta atrás** | `NUEVA` → `EN_REVISION` → `RESUELTA`. Una resuelta **sí se puede reabrir** |
| Dónde se guarda | `novedades` (+ `novedades_conjuntos` para los conjuntos elegidos) | `novedades_enviadas` |
| Código del backend | `be/app/routers/novedades.py`, `be/app/services/novedad_service.py` | `be/app/routers/novedades_enviadas.py`, `be/app/services/novedad_enviada_service.py` |
| Pantalla | Admin Sistema: **Crear Novedades** (`AdminNovedadesPage.tsx`). Los demás roles: **Soporte técnico → Avisos del sistema** (`NovedadesFeedPage.tsx`) | Autor: **Soporte técnico → Escribir novedad** y **Historial de novedades** (`NovedadesEnviadas.tsx`). Admin Sistema: **Panel Principal → Solicitudes pendientes → Soporte técnico** (`SoporteTecnico.tsx`) |

La pestaña **Avisos del sistema** (novedades de RQF-015) y las pestañas **Escribir novedad** e **Historial de novedades** (novedades enviadas de RQF-021) comparten la misma página (`/novedades`).
Por eso se confunden. La primera es lo que **recibes**; las otras dos son lo que **envías**.

---

## 2. Un ejemplo de cada una

**Novedad (RQF-015).** El Admin Sistema entra a **Crear Novedades**, escribe "El jueves la app estará en mantenimiento de 2 a 4 a. m.", elige el alcance "Residentes" y deja "Todos los conjuntos".
Al publicar, todos los Residentes reciben una notificación y ven el aviso en **Soporte técnico → Avisos del sistema** hasta que venza o se archive.

**Novedad enviada (RQF-021).** Un Residente entra a **Soporte técnico → Escribir novedad**, elige el motivo "No puedo iniciar sesión o recuperar mi contraseña" y presiona "Enviar consulta".
El sistema calcula la prioridad (Alta) según el motivo y la guarda como `NUEVA`. El Admin Sistema la ve en su bandeja, la pasa a `EN_REVISION` y le responde.
El Residente recibe una notificación y ve la respuesta en **Historial de novedades**.

---

## 3. Por qué se archivan las novedades (RQF-015)

Una novedad **no se borra**: se archiva. Hay dos maneras de llegar a ese estado, y las dos la sacan del feed de los usuarios:

1. **A mano.** El Admin Sistema usa "Archivar". El sistema guarda la fecha en `novedades.fecha_archivado`.
2. **Al vencer.** Cuando llega su `fecha_expiracion`, la novedad cuenta como archivada. No hay ningún proceso en segundo plano: al leer, el código compara `fecha_expiracion` con la hora actual (`_esta_archivada()` en `novedad_service.py`). Por eso `fecha_archivado` queda en `NULL` en estas.

Los motivos:

- **Que el feed muestre solo lo vigente.** Un aviso viejo (por ejemplo, un mantenimiento que ya pasó) no debe seguir apareciendo a los usuarios (HU-035).
- **Conservar el historial.** El Admin Sistema necesita ver todo lo que ha publicado, incluido lo archivado (RN-006, CA-035.4). Si se borrara, ese registro se perdería. En la pantalla se ve con el interruptor "Ver archivadas".
- **El historial solo crece.** Como nada se borra, la lista de `GET /novedades/todas` va paginada y los filtros (alcance, archivadas y búsqueda) se aplican en el servidor.

Las **novedades enviadas no se archivan**. Se **resuelven** (`RESUELTA`), y el Admin Sistema puede reabrirlas. El estado de una consulta de soporte refleja si ya se atendió, no si sigue vigente.

---

## 4. La regla RN-005: una archivada no se reactiva

Está en [RQF-015](../requisitos/RFs/RQF-015_publicar_novedades_generales.md) (RN-005) y en la HU-035 (CA-035.3):

> No se pueden reactivar novedades archivadas directamente; se debe crear una nueva.

En el código significa tres cosas:

- No existe un endpoint para "desarchivar". Solo existe `POST /novedades/{id}/archivar`.
- Archivar una novedad que ya está archivada responde 400 ("Esta novedad ya está archivada.").
- La pantalla del Admin Sistema no muestra el botón de editar en una novedad archivada (`AdminNovedadesPage.tsx`).

Si el Admin Sistema quiere volver a publicar un aviso, crea una **novedad nueva**. Esa novedad nueva genera su propia notificación `NOVEDAD_NUEVA` a los destinatarios.

> **Ojo con el número.** "RN-005" existe en varios requisitos y significa cosas distintas.
> En RQF-015 es "una archivada no se reactiva".
> En RQF-021 es "orden de la bandeja de soporte técnico" (por prioridad y luego la más reciente).
> Al citarla, escribe siempre el requisito: "RN-005 de RQF-015".

---

## 5. Cómo se relacionan con usuarios y conjuntos

```text
USUARIOS (Admin Sistema) ──publica──► NOVEDADES ──dirige──► NOVEDADES_CONJUNTOS ◄──recibe── CONJUNTOS_RESIDENCIALES
USUARIOS (autor)         ──envía────► NOVEDADES_ENVIADAS ◄──menciona (opcional)── CONJUNTOS_RESIDENCIALES
```

- `novedades.id_admin_sistema` apunta al usuario que la publicó.
- `novedades_conjuntos` guarda a qué conjuntos se dirige. **Sin filas, la novedad llega a todos los conjuntos** del alcance elegido; con filas, solo a esos. No se puede cambiar después de publicar, igual que el `alcance` (RN-010 de RQF-015).
- `novedades_enviadas.autor_id` apunta al usuario que la envió y `id_conjunto_residencial` al conjunto de la consulta. Los dos son opcionales y valen `NULL` si se borra la cuenta o el conjunto (por ejemplo, un Reciclador no tiene un solo conjunto).

El detalle de cada columna está en el [diagrama ER](../referencia-proyecto/diagramas-UML/diagrama-er.md).

---

## 6. Otras cosas con nombre parecido (para no confundir)

| Cosa | Quién la publica | A quién va | Requisito |
| --- | --- | --- | --- |
| **Comunicado** | Admin de Conjunto | Residentes y/o recicladores de **su** conjunto | RQF-014 |
| **Novedad** | Admin Sistema | Los usuarios de uno o varios roles de la plataforma | RQF-015 |
| **Novedad enviada** | Residente, Reciclador o Admin de Conjunto | Al Admin Sistema | RQF-021 |
| **Solicitud de desvinculación** | Admin de Conjunto | Al Admin Sistema (se aprueba o se rechaza) | RQF-016 |

La solicitud de desvinculación comparte con las novedades enviadas la bandeja "Solicitudes pendientes" del Admin Sistema, pero en otra pestaña (**Desvinculaciones**), porque es una decisión de sí o no, sin prioridad ni respuesta.
