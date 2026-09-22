# HU-045 — Admin Sistema ve el perfil de cualquier usuario

<!--
  ¿Qué? Historia de usuario para el perfil de solo lectura que se abre desde
        una fila de la tabla de "Usuarios registrados".
  ¿Para qué? La tabla solo muestra unas pocas columnas por rol. Para decidir
             si desactivar una cuenta (o entender por qué está desactivada)
             el Admin del Sistema necesita ver el resto de los datos de esa
             persona sin salir de la tabla.
  ¿Impacto? Es de SOLO LECTURA a propósito: editar los datos de otra
            persona necesita un registro de quién cambió qué, y eso queda
            para una tarjeta aparte.
-->

---

## Identificación

| Campo             | Valor                                                    |
| ------------------ | --------------------------------------------------------- |
| **ID**             | HU-045                                                      |
| **Título**         | Admin Sistema ve el perfil de cualquier usuario               |
| **Módulo**         | Administración                                               |
| **Prioridad**      | Media                                                         |
| **Estado**         | Implementada                                                  |
| **RF asociados**   | RQF-018                                                      |

---

## Historia

**Como** Administrador del Sistema,
**quiero** abrir el perfil de cualquier usuario desde la tabla,
**para** ver todos sus datos sin salir de la pantalla donde lo encontré.

---

## Criterios de aceptación

### CA-045.1 — Abrir el perfil

- **Dado que** veo la tabla de usuarios (de cualquiera de las 3 pestañas),
- **cuando** hago clic en el nombre o en cualquier parte de la fila (excepto el botón de Activar/Desactivar),
- **entonces** se abre un panel lateral con el perfil de esa persona. Se cierra con la X, con Esc o haciendo clic afuera.

### CA-045.2 — Datos según el rol

- **Dado que** abrí un perfil,
- **cuando** lo reviso,
- **entonces** veo, para todos los roles: rol, estado (activo/inactivo), nombre, teléfono, correo, si el correo está verificado, idioma, y si la cuenta está bloqueada por intentos fallidos de contraseña.
- Además, un Residente muestra conjunto, torre y apartamento; un Reciclador, asociación, conjuntos autorizados y si su contacto es visible en el Directorio; un Administrador de Conjunto, sus conjuntos.

### CA-045.3 — Cuenta desactivada

- **Dado que** la cuenta está desactivada,
- **cuando** abro su perfil,
- **entonces** veo un bloque destacado con la fecha y el motivo de la desactivación.

### CA-045.4 — Solo lectura

- **Dado que** estoy en el perfil,
- **cuando** busco cambiar los datos de la persona,
- **entonces** no hay forma: el botón "Editar datos" aparece deshabilitado ("próximamente"). Lo único que se puede hacer es activar o desactivar la cuenta (con el mismo flujo de HU-040).
- El perfil nunca incluye la contraseña ni ningún token.
