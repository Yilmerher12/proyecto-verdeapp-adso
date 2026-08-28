# RNF-003 — Usabilidad y Adaptabilidad

---

## Identificación

| Campo             | Valor                                                  |
| ----------------- | ------------------------------------------------------ |
| **ID** | RNF-003                                                |
| **Nombre** | Usabilidad y Adaptabilidad                             |
| **Categoría** | UX / UI (Experiencia e Interfaz de Usuario)            |
| **Prioridad** | Alta                                                   |
| **Estado** | Implementado                                           |

---

## Requisitos

### RNF-003.1 — Diseño Responsivo (Mobile-First)
El sistema debe contar con un diseño responsivo que garantice la correcta visualización y operatividad en dispositivos móviles (smartphones, tablets) y de escritorio (laptops, PCs). Dada la naturaleza del rol 'Reciclador', la interfaz debe priorizar la experiencia en pantallas pequeñas.

### RNF-003.2 — Compatibilidad de Navegadores
El frontend debe ejecutarse sin errores de renderizado o funcionalidad en las versiones recientes de los navegadores web modernos, soportando explícitamente:
- Google Chrome
- Mozilla Firefox
- Microsoft Edge

### RNF-003.3 — Accesibilidad Básica
La interfaz (construida en React) debe utilizar un contraste de colores adecuado, tamaños de letra legibles en móviles y botones de acción con áreas táctiles suficientemente grandes para evitar toques accidentales.

> **Estado real (2026-08-28)**: **Implementado y verificado**, con auditoría propia documentada en `docs/gestion-proyecto/auditoria-rnf-003-*.md` (6 archivos, 2026-08-24/25): contraste corregido en dashboards y páginas restantes (003.3), responsive verificado en tablet sin problemas de overflow (003.1), y verificado en escritorio (1280px) + cross-browser (Chrome/Edge/Firefox) sin problemas (003.2). El propio cierre de esa auditoría dice textualmente: *"Con esto, RNF-003 queda completamente verificado (contraste + responsive + cross-browser)."* Solo queda un detalle cosmético menor sin confirmar en el footer de `AuthLayout`, no bloqueante.