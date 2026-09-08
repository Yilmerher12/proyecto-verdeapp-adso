# RQF-018 — Gestión de Usuarios (Admin Sistema)

<!--
  ¿Qué? Requisito funcional que documenta la sección "Usuarios registrados"
        del panel del Admin del Sistema — existía en código desde hace
        tiempo (be/app/routers/admin.py) pero nunca se formalizó como
        requisito.
  ¿Para qué? La documentación original del proyecto se escribió antes de
             varias rondas de retroalimentación del profesor (Criterios 6
             y 7: Vista SQL y Procedimiento Almacenado; luego "que la vista
             permita HACER algo, no solo consultar"; luego columnas
             ordenables). Esas funcionalidades se construyeron sin volver
             a actualizar las HUs/RFs — quedaban documentadas solo en
             comentarios de código.
  ¿Impacto? Sin esto, no había ningún requisito trazable que explicara por
            qué existen 2 técnicas de acceso a datos distintas (vista SQL
            y procedimiento almacenado) para 2 listados que, de otro modo,
            se verían iguales.
-->

---

## Identificación

| Campo         | Valor                          |
| ------------- | -------------------------------- |
| **ID**        | RQF-018                          |
| **Nombre**    | Gestión de Usuarios (Admin Sistema) |
| **Módulo**    | Administración                    |
| **Prioridad** | Alta                              |
| **Estado**    | Implementado                      |
| **Usuarios**  | admin_sistema                     |

---

## Descripción

El sistema debe permitir al Admin del Sistema consultar, buscar, filtrar y ordenar los usuarios registrados de cada rol (Residentes, Recicladores, Administradores de Conjunto), y activar o desactivar cualquier cuenta. Es la única pantalla del sistema donde se ve el conjunto completo de usuarios, sin importar a qué conjunto residencial pertenecen.

Cumple además 2 criterios técnicos pedidos explícitamente por el profesor: el listado de Residentes se obtiene mediante una **Vista SQL** (`CREATE VIEW`), y el de Recicladores mediante un **Procedimiento Almacenado** (función PL/pgSQL) — ambos con parámetros reales de búsqueda/filtro/orden/paginación, no solo de exhibición.

---

## Proceso

1. El Admin del Sistema entra a su panel — la sección "Usuarios registrados" es lo primero que ve.
2. Elige una de 3 pestañas: Residentes, Recicladores, Administradores de Conjunto.
3. Puede escribir en el buscador (nombre, apellido o correo) — la búsqueda se aplica automáticamente tras una breve pausa al escribir (sin necesidad de presionar Enter).
4. Puede filtrar por localidad.
5. Puede hacer clic en el encabezado de cualquier columna para ordenar por ella — un clic ordena ascendente, un segundo clic invierte a descendente.
6. Los resultados llegan paginados (10 por página).
7. Puede activar o desactivar la cuenta de cualquier usuario (excepto la propia), con una confirmación previa.

---

## Entradas

| Campo         | Tipo    | Obligatorio | Validaciones                                             |
| ------------- | ------- | ----------- | ---------------------------------------------------------- |
| `search`      | Texto   | No          | Busca por nombre, apellido o correo (coincidencia parcial) |
| `localidad_id`| Número  | No          | Debe existir en el catálogo de localidades                |
| `order_by`    | Texto   | No          | Solo se acepta un valor de una lista blanca por endpoint — cualquier otro se ignora y cae al orden por defecto (por nombre) |
| `order_dir`   | Texto   | No          | `asc` o `desc` — cualquier otro valor se trata como `asc`  |
| `limit`       | Número  | No          | Máximo 100, por defecto 10                                 |
| `offset`      | Número  | No          | Por defecto 0                                              |
| `habilitado`  | Booleano| Sí (al activar/desactivar) | Nunca se puede desactivar la propia cuenta        |

---

## Salidas

| Escenario          | Código HTTP | Respuesta                                                        |
| -------------------- | ----------- | ------------------------------------------------------------------ |
| Consulta exitosa     | 200         | `{"items": [...], "total": N}`                                    |
| Cambio de estado OK  | 200         | `{"correo_electronico": "...", "habilitado": true\|false}`        |
| Intento de auto-desactivación | 400 | `{"detail": "No puedes desactivar tu propia cuenta."}`             |
| Usuario objetivo no existe | 404 | `{"detail": "Usuario no encontrado."}`                             |

---

## Endpoints asociados

| Método | Ruta                                          | Auth requerida | Descripción                                        |
| ------ | ----------------------------------------------- | -------------- | ----------------------------------------------------- |
| GET    | `/api/v1/admin/vista-residentes`                | Sí (Admin Sistema) | Listado de Residentes — Vista SQL, Criterio 6      |
| GET    | `/api/v1/admin/sp-recicladores`                 | Sí (Admin Sistema) | Listado de Recicladores — Procedimiento Almacenado, Criterio 7 |
| GET    | `/api/v1/admin/administradores-conjunto`        | Sí (Admin Sistema) | Listado de Administradores de Conjunto             |
| PATCH  | `/api/v1/admin/usuarios/{correo_electronico}/habilitado` | Sí (Admin Sistema) | Activa o desactiva una cuenta                |

---

## Reglas de negocio

- RN-001: Solo el Admin del Sistema puede acceder a estos 3 listados y a la acción de activar/desactivar cuentas.
- RN-002: Una cuenta desactivada (`habilitado = false`) no puede iniciar sesión ni renovar su token, sin importar si su correo ya estaba verificado (`is_active`).
- RN-003: El Admin del Sistema no puede desactivar su propia cuenta — evita que se bloquee a sí mismo por accidente.
- RN-004: `order_by`/`order_dir` se validan contra una lista blanca de columnas por endpoint antes de usarse en la consulta — nunca se interpola el valor crudo recibido del cliente en el SQL.

---

## Historias de usuario derivadas

| HU      | Descripción                                                    |
| ------- | ----------------------------------------------------------------|
| [HU-039](../HUs/HU-039_admin_sistema_consulta_usuarios.md) | Admin Sistema consulta, busca y filtra los usuarios registrados |
| [HU-040](../HUs/HU-040_admin_sistema_activa_desactiva_cuenta.md) | Admin Sistema activa o desactiva una cuenta |
| [HU-041](../HUs/HU-041_admin_sistema_ordena_columnas.md) | Admin Sistema ordena las columnas de cada listado |
