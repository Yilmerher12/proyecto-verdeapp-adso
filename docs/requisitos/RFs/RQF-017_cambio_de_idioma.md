# RQF-017 — Cambio de Idioma de la Interfaz (i18n)

<!--
  ¿Qué? Requisito funcional que define cómo el usuario cambia el idioma de la interfaz.
  ¿Para qué? Que la app se pueda usar en español o inglés, y que esa preferencia se
             recuerde tanto en el navegador como al iniciar sesión desde otro dispositivo.
  ¿Impacto? Sin la parte de sincronización con el backend, la preferencia de idioma
            solo viviría en un navegador — el usuario tendría que elegirla de nuevo
            cada vez que entra desde un dispositivo distinto.
-->

---

## Identificación

| Campo         | Valor                                |
| ------------- | -------------------------------------- |
| **ID**        | RQF-017                                 |
| **Nombre**    | Cambio de Idioma de la Interfaz (i18n)    |
| **Módulo**    | Internacionalización (i18n)                |
| **Prioridad** | Media                                        |
| **Estado**    | Parcialmente implementado                     |
| **Usuarios**  | residente, reciclador, administrador, admin_conjunto |

---

## Descripción

El sistema debe permitir a cualquier usuario cambiar el idioma de la interfaz entre español e inglés desde un selector visible en la barra de navegación. El cambio se aplica de inmediato, sin recargar la página, y se recuerda de dos formas: en el navegador (para cualquier visitante, con o sin sesión) y, si el usuario está autenticado, también en su cuenta — para que la preferencia lo siga sin importar desde qué dispositivo inicie sesión.

---

## Flujos

### Flujo A — Cambiar el idioma (cualquier usuario, con o sin sesión)
1. El usuario abre el selector de idioma en la barra de navegación.
2. Selecciona "Español" o "English".
3. Todos los textos de la interfaz cambian de inmediato, sin recargar la página.
4. La elección queda guardada en el navegador (`localStorage`), para que se recuerde en la próxima visita desde ese mismo navegador.

### Flujo B — Sincronizar con la cuenta (solo usuario autenticado)
1. Si el usuario tiene sesión activa cuando cambia el idioma, el frontend además envía la preferencia al backend.
2. El backend guarda el idioma elegido en la cuenta del usuario.
3. Si esta sincronización falla (ej. sin conexión), el cambio en pantalla se mantiene igual — el usuario no pierde su elección, solo no queda guardada en su cuenta hasta la próxima vez que cambie de idioma con conexión.

### Flujo C — Restaurar el idioma al iniciar sesión
1. El usuario inicia sesión desde cualquier dispositivo o navegador.
2. El backend responde incluyendo el idioma guardado en su cuenta.
3. El frontend aplica ese idioma de inmediato, sin importar qué idioma tenía configurado ese navegador antes.

---

## Reglas de negocio

- RN-001: El idioma por defecto del sistema es español (`es`).
- RN-002: Solo se soportan dos idiomas: español (`es`) e inglés (`en`) — cualquier otro valor se rechaza.
- RN-003: La preferencia se guarda siempre en el navegador, sin importar si el usuario tiene sesión.
- RN-004: La preferencia solo se sincroniza con el backend cuando el usuario está autenticado.
- RN-005: Al restaurar sesión, el idioma guardado en la cuenta tiene prioridad sobre el que tenía configurado el navegador.
- RN-006: El selector siempre muestra cada opción en su propio idioma ("Español" / "English"), nunca traducidas al idioma activo.

---

## Historias de usuario derivadas

| HU      | Descripción                                                    |
| ------- | ------------------------------------------------------------------|
| [HU-036](../HUs/HU-036_usuario_cambia_idioma_interfaz.md) | Usuario cambia el idioma de la interfaz |
| [HU-037](../HUs/HU-037_sistema_restaura_idioma_al_iniciar_sesion.md) | Sistema restaura el idioma guardado al iniciar sesión |
