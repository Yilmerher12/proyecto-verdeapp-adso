# HU-045 — Admin Sistema ve el perfil de cualquier usuario

<!--
  ¿Qué? Historia de usuario para la información de solo lectura que se
        despliega desde el kebab de una fila de la tabla de "Usuarios registrados".
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
- **cuando** abro el menú de acciones de una fila (el kebab, los tres puntos del final) y elijo "Ver información",
- **entonces** la fila se despliega hacia abajo con la información de esa persona, sin abrir ningún panel. Si elijo "Ver información" otra vez, se pliega.
- Solo hay una fila desplegada a la vez. Se pliega sola al cambiar de pestaña, de página o de filtro, o al escribir en el buscador.
- Un clic en la fila no abre nada: la información solo se despliega desde el kebab.

### CA-045.2 — Datos según el rol

- **Dado que** desplegué la información de una cuenta,
- **cuando** la reviso,
- **entonces** veo, para todos los roles: nombre, teléfono, correo, si el correo está verificado, idioma, y si la cuenta está bloqueada por intentos fallidos de contraseña. El rol lo da la pestaña y el estado (activo/inactivo) lo da la columna "Estado" de esa misma fila.
- La información se pide al backend al desplegar la fila: mientras llega se ve "Cargando" y, si falla, un aviso de error.
- Además, un Residente muestra conjunto, torre y apartamento; un Reciclador, asociación, conjuntos autorizados y si su contacto es visible en el Directorio; un Administrador de Conjunto, sus conjuntos.

### CA-045.3 — Cuenta desactivada

- **Dado que** la cuenta está desactivada,
- **cuando** despliego su información,
- **entonces** veo un bloque destacado con la fecha y el motivo de la desactivación.

### CA-045.4 — Solo lectura

- **Dado que** abro el kebab de una fila,
- **cuando** busco cambiar los datos de la persona,
- **entonces** no hay forma: el menú no ofrece "Editar datos" (queda para otra tarjeta). El menú ofrece "Ver información" y, aparte y en rojo, "Desactivar" (o "Activar" si la cuenta está inactiva), con el mismo flujo de HU-040. En la propia cuenta del Admin solo aparece "Ver información".
- La información nunca incluye la contraseña ni ningún token.
