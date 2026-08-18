# HU-036 — Usuario cambia el idioma de la interfaz

<!--
  ¿Qué? Historia de usuario para cambiar el idioma de toda la interfaz.
  ¿Para qué? Que cada persona pueda usar VerdeApp en el idioma que le resulte más cómodo.
  ¿Impacto? Sin esto, todos los usuarios estarían forzados a un solo idioma fijo.
-->

---

## Identificación

| Campo             | Valor                                       |
| ------------------ | --------------------------------------------- |
| **ID**             | HU-036                                          |
| **Título**         | Usuario cambia el idioma de la interfaz             |
| **Módulo**         | Internacionalización (i18n)                          |
| **Prioridad**      | Media                                                  |
| **Estado**         | Implementada                                            |
| **RF asociados**   | RQF-017                                                |

---

## Historia

**Como** usuario de VerdeApp (con o sin sesión iniciada),
**quiero** cambiar el idioma de la interfaz entre español e inglés desde un selector visible,
**para** usar la aplicación en el idioma que me resulte más natural.

---

## Criterios de aceptación

### CA-036.1 — Selector visible

- **Dado que** estoy en cualquier página de la app (pública o autenticada),
- **cuando** reviso la barra de navegación,
- **entonces** debo encontrar un selector con las opciones "Español" y "English".

### CA-036.2 — Cambio inmediato

- **Dado que** el idioma activo es distinto al que selecciono,
- **cuando** hago clic en la opción deseada,
- **entonces** todos los textos de la interfaz cambian de inmediato, sin recargar la página.

### CA-036.3 — Se recuerda en el mismo navegador

- **Dado que** cambié el idioma,
- **cuando** cierro y vuelvo a abrir la página en el mismo navegador,
- **entonces** debe seguir mostrándose en el idioma que elegí.

### CA-036.4 — Cada opción se muestra en su propio idioma

- **Dado que** estoy viendo el selector de idioma,
- **cuando** la interfaz está en español,
- **entonces** las opciones deben leerse "Español" y "English" (nunca traducidas al idioma activo).

### CA-036.5 — Idioma por defecto según el navegador

- **Dado que** entro por primera vez sin ninguna preferencia guardada,
- **cuando** la app carga,
- **entonces** debe detectar el idioma de mi navegador; si no es español ni inglés, debe usar español por defecto.
