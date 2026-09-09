# RQF-019 — Recuperación y Cambio de Contraseña

<!--
  ¿Qué? Requisito funcional que documenta los 3 endpoints de contraseña
        que ya existían en código (be/app/routers/auth.py) desde el
        principio del proyecto, pero nunca se formalizaron como requisito
        propio — RQF-008 (Actualizar Perfil) incluso aclara en su propia
        regla de negocio (RN-001) que la contraseña "debe ser manejada por
        endpoints separados", sin decir cuáles ni documentarlos.
  ¿Para qué? Cerrar ese vacío: recuperar una contraseña olvidada y
             cambiarla estando autenticado son flujos completos, con sus
             propias reglas de seguridad, que merecen su propio requisito.
  ¿Impacto? Sin esto, alguien que audite el proyecto por sus HUs/RFs nunca
            se enteraría de que estos 3 endpoints existen ni de cómo deben
            comportarse.
-->

---

## Identificación

| Campo         | Valor                                    |
| ------------- | ------------------------------------------ |
| **ID**        | RQF-019                                    |
| **Nombre**    | Recuperación y Cambio de Contraseña         |
| **Módulo**    | Autenticación                               |
| **Prioridad** | Alta                                        |
| **Estado**    | Implementado                                |
| **Usuarios**  | residente, reciclador, admin_conjunto, admin_sistema |

---

## Descripción

El sistema debe permitir a cualquier usuario recuperar el acceso a su cuenta si olvidó su contraseña (sin estar autenticado, vía correo electrónico), y cambiar su contraseña estando autenticado (sabiendo la actual). Ambos flujos son independientes del de "Actualizar Perfil" (RQF-008), que explícitamente los excluye.

---

## Proceso

### Flujo A — Recuperar contraseña olvidada

1. El usuario, desde la pantalla de login, pide "¿Olvidaste tu contraseña?" e ingresa su correo.
2. El sistema genera un token de un solo uso y envía un correo con el enlace de recuperación — **siempre** responde el mismo mensaje genérico, exista o no una cuenta con ese correo (RN-002).
3. El usuario abre el enlace (antes de que expire) e ingresa su nueva contraseña.
4. El sistema valida el token, actualiza la contraseña (con hash bcrypt) y marca el token como usado.

### Flujo B — Cambiar contraseña estando autenticado

1. El usuario, desde su perfil, ingresa su contraseña actual y la nueva.
2. El sistema verifica que la contraseña actual sea correcta.
3. Si es correcta, actualiza la contraseña; si no, rechaza el cambio sin aplicarlo.

---

## Entradas

| Campo               | Tipo   | Obligatorio | Validaciones                                                    |
| -------------------- | ------ | ----------- | ------------------------------------------------------------------ |
| `email`              | Texto  | Sí (Flujo A, paso 1) | Formato de correo válido                                  |
| `token`               | Texto  | Sí (Flujo A, paso 3) | Debe existir, no estar usado, y no haber expirado (1 hora) |
| `nueva_contraseña`    | Texto  | Sí (ambos flujos) | Mínimo 8 caracteres                                            |
| `contraseña_actual`   | Texto  | Sí (Flujo B) | Debe coincidir con el hash almacenado                          |

---

## Salidas

| Escenario                        | Código HTTP | Respuesta                                                                 |
| ---------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| Solicitud de recuperación (siempre)| 200         | `{"message": "Si el email está registrado, recibirás un enlace de recuperación"}` |
| Contraseña restablecida            | 200         | `{"message": "Contraseña restablecida exitosamente"}`                       |
| Token inválido/expirado/usado      | 400         | `{"detail": "..."}`                                                          |
| Contraseña actual incorrecta (Flujo B) | 400     | `{"detail": "La contraseña actual ingresada es incorrecta."}`               |

---

## Endpoints asociados

| Método | Ruta                             | Auth requerida | Descripción                                  |
| ------ | ---------------------------------- | -------------- | ----------------------------------------------- |
| POST   | `/api/v1/auth/forgot-password`     | No             | Inicia la recuperación, envía el correo         |
| POST   | `/api/v1/auth/reset-password`      | No             | Aplica la nueva contraseña con el token recibido |
| POST   | `/api/v1/auth/change-password`     | Sí             | Cambia la contraseña sabiendo la actual         |

---

## Reglas de negocio

- RN-001: La contraseña se hashea siempre con bcrypt (`hash_password()`/`verify_password()` de `app/utils/security.py`) — nunca se compara ni se guarda en texto plano.
- RN-002: `forgot-password` responde el mismo mensaje genérico exista o no una cuenta con ese correo — evita que alguien use este endpoint para descubrir qué correos están registrados (RNF-001.3).
- RN-003: El token de recuperación tiene una validez de 1 hora y es de un solo uso — se marca `used = true` al aplicarse, y un segundo intento con el mismo token se rechaza.
- RN-004: `change-password` (estando autenticado) siempre exige la contraseña actual — nunca se puede cambiar solo con la sesión activa, sin volver a demostrar que se conoce la contraseña vigente.

---

## Historias de usuario derivadas

| HU      | Descripción                                                    |
| ------- | ----------------------------------------------------------------|
| [HU-042](../HUs/HU-042_usuario_recupera_contrasena.md) | Usuario recupera su contraseña olvidada |
| [HU-043](../HUs/HU-043_usuario_cambia_contrasena.md) | Usuario cambia su contraseña estando autenticado |
