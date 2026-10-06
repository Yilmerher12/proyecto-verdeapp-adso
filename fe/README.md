# Frontend — VerdeApp

> Documentación técnica del frontend de VerdeApp.
> Cada sección explica **qué se implementó**, **por qué se tomó esa decisión** y **qué impacto tiene**.

> **Actualizado (2026-10-06):** este documento nació de una plantilla educativa
> (login, registro y un único dashboard). Se revisó sección por sección contra el
> código real: rutas por rol, `AppShell`, sesión con cookies `httpOnly`,
> componentes compartidos y tests. Si encuentras algo que ya no coincide con el
> código, corrígelo en la misma rama que lo cambió.

---

## Tabla de Contenidos

1. [Prerrequisitos](#1-prerrequisitos)
2. [Estructura del Frontend](#2-estructura-del-frontend)
3. [Instalación con pnpm](#3-instalación-con-pnpm)
4. [Variables de Entorno](#4-variables-de-entorno)
5. [Configuración Base](#5-configuración-base)
6. [Estilos Globales – TailwindCSS + Tema](#6-estilos-globales--tailwindcss--tema)
7. [Punto de Entrada – `main.tsx`](#7-punto-de-entrada--maintsx)
8. [Enrutamiento – `App.tsx`](#8-enrutamiento--apptsx)
9. [Tipos TypeScript – `types/auth.ts`](#9-tipos-typescript--typesauthts)
10. [Capa API – Axios](#10-capa-api--axios)
11. [Contexto de Autenticación](#11-contexto-de-autenticación)
12. [Hook `useAuth`](#12-hook-useauth)
13. [Componentes UI Base](#13-componentes-ui-base)
14. [Componentes compartidos y patrones del proyecto](#14-componentes-compartidos-y-patrones-del-proyecto)
15. [Layouts y Rutas Protegidas](#15-layouts-y-rutas-protegidas)
16. [Páginas](#16-páginas)
17. [Tests – Vitest + Testing Library](#17-tests--vitest--testing-library)
18. [Comandos del Día a Día](#18-comandos-del-día-a-día)
19. [Glosario Rápido](#19-glosario-rápido)

---

## 1. Prerrequisitos

El frontend de VerdeApp requiere las siguientes herramientas instaladas:

| Herramienta | Versión mínima | Verificar con    |
| ----------- | -------------- | ---------------- |
| Node.js     | 22 LTS         | `node --version` |
| pnpm        | 11.0.9 (exacta, fijada en `package.json` → `packageManager`) | `pnpm --version` |

> **¿Por qué esas versiones?** Son las mismas que usan el `Dockerfile` (`node:22-alpine`) y el CI (`.github/workflows/ci.yml`). Con otra versión de pnpm el `pnpm-lock.yaml` puede cambiar solo al instalar, y el CI (`pnpm install --frozen-lockfile`) falla.

> 🖥️ **En Windows** — Se recomienda usar **PowerShell** para los comandos de este proyecto.

### ¿Por qué pnpm y no npm?

`pnpm` (Performant NPM) instala paquetes de forma eficiente:

- A diferencia de `npm`, los paquetes se guardan en un almacén central y se **enlazan** al proyecto.
- Esto reduce el espacio en disco y acelera las instalaciones.
- En este proyecto usamos `pnpm` **siempre**. Si ves instrucciones con `npm install`, tradúcelas a `pnpm install`.

```bash
# Activar pnpm con Corepack (viene incluido en Node 22) en la versión exacta del proyecto:
corepack enable
corepack prepare pnpm@11.0.9 --activate

# Verificar instalación:
pnpm --version
```

> **Convención del proyecto:** No se usa `npm install`, `npm run`, `yarn` ni `npx` directamente.
> Siempre se usa el equivalente `pnpm`:
>
> | Comando npm     | Equivalente pnpm     |
> | --------------- | -------------------- |
> | `npm install`   | `pnpm install`       |
> | `npm run dev`   | `pnpm dev`           |
> | `npm test`      | `pnpm test`          |
> | `npx some-tool` | `pnpm dlx some-tool` |

---

## 2. Estructura del Frontend

```
fe/
├── index.html                  ← HTML base: favicon, fuentes (Inter + Outfit) y tema inicial
├── package.json                ← Dependencias y scripts
├── vite.config.ts              ← Vite + plugins + Vitest
├── public/
│   ├── logos/                  ← Logo en SVG: logo, logo-white, logo-mark, logo-mark-white, favicon
│   └── landing/                ← Fotos de fondo del hero (≤ 1920 px, comprimidas)
└── src/
    ├── main.tsx                ← Punto de entrada: monta React en el DOM
    ├── App.tsx                 ← Rutas (públicas, legales y protegidas por rol)
    ├── index.css               ← Tailwind + tema: paleta, tokens night-*, escala icon-*, animaciones
    ├── i18n.ts                 ← Configuración de react-i18next
    ├── locales/{es,en}/        ← Textos de la interfaz (un translation.json por idioma)
    │
    ├── types/                  ← Tipos compartidos (auth.ts: roles, usuario)
    ├── api/                    ← axios.ts (instancia + interceptores) y auth.ts
    ├── lib/                    ← Un cliente Axios por recurso (*Api.ts), fechas, eventos entre componentes
    ├── context/                ← AuthContext (sesión del usuario)
    ├── hooks/                  ← useAuth, usePaginacion, usePolling, useScrollReveal…
    ├── config/                 ← Configuración visual centralizada:
    │   ├── roleTheme.ts        ←   ícono y colores de cada rol
    │   ├── nivelesDesempeno.ts ←   caritas y colores del semáforo de auditoría
    │   └── categoriasEducativas.ts ← ícono de cada categoría del catálogo
    │
    ├── components/
    │   ├── ui/                 ← Reutilizables: Button, InputField, Alert, Modal, ConfirmModal,
    │   │                         EmptyState, BrandLogo, Paginacion, ThemeToggle, LanguageSwitcher…
    │   ├── layout/             ← AppShell (sidebar + contenido con sesión), AuthLayout, LegalLayout
    │   ├── dashboard/          ← Piezas de los paneles: notificaciones, auditorías
    │   └── *.tsx               ← Formularios y paneles de dominio (puntos de acopio, invitaciones…)
    │
    ├── pages/                  ← Una página por ruta (landing, login, registro, directorio…)
    │   └── dashboards/         ← Panel de cada rol: Residente, Reciclador, AdminConjunto, Admin
    │
    └── __tests__/              ← Tests (Vitest), en la misma estructura que src/
```

### ¿Por qué esta estructura?

Cada carpeta tiene una única responsabilidad:

- **`types/`** — Los contratos de datos. Definen qué forma tienen los objetos. Nada más.
- **`api/`** — La comunicación HTTP. Sabe de la API, ignora la UI.
- **`context/` + `hooks/`** — El estado global. Sabe de los datos, ignora cómo se renderizan.
- **`components/`** — Los bloques visuales. Saben de la UI, reciben datos como props.
- **`pages/`** — La orquestación. Combina hooks + componentes para cada pantalla.

Esto se conoce como **Separation of Concerns** (separación de responsabilidades): cada módulo tiene un solo motivo para cambiar.

---

## 3. Instalación con pnpm

### Paso 1 — Ir a la carpeta del frontend

```bash
cd fe
```

### Paso 2 — Instalar dependencias

```bash
pnpm install
```

Esto lee `package.json` e instala todo en `node_modules/`, usando `pnpm-lock.yaml` para versiones exactas.

### Paso 3 — Arrancar el servidor de desarrollo

```bash
pnpm dev
```

Vite arrancará en `http://localhost:5173`.

> **¿Qué es Vite?** Es el bundler (empaquetador) del proyecto. En desarrollo sirve los archivos
> de forma ultrarrápida aprovechando ES Modules nativos del navegador. En producción genera
> archivos optimizados (minificados, tree-shaken) listos para un hosting.

---

## 4. Variables de Entorno

### ¿Por qué variables de entorno?

En este proyecto el frontend necesita saber la URL del backend. Esa URL cambia entre
desarrollo (`http://localhost:8000`) y producción (`https://api.mi-empresa.com`).
Si la URL estuviera hardcodeada en el código, habría que modificar el código fuente
para cada entorno. Las variables de entorno resuelven eso.

### Prefijo `VITE_`

Vite expone al código frontend **solo** las variables que empiezan con `VITE_`.
Otras variables del archivo `.env` quedan invisibles al navegador (por seguridad).

```bash
# ¿Cómo se usa en el código?
import.meta.env.VITE_API_URL
```

### Crear el archivo `.env`

```bash
# fe/.env  (NO versionar este archivo en git)
VITE_API_URL=http://localhost:8000
```

El proyecto ya tiene un `.env.example` como plantilla:

```bash
# fe/.env.example
VITE_API_URL=http://localhost:8000
```

> **Regla de seguridad:** El archivo `.env` está en `.gitignore` y **nunca** se sube al
> repositorio. `.env.example` sí se versiona — sirve para que cualquier colaborador sepa
> qué variables configurar sin ver los valores reales.

Tres detalles que suelen confundir:

1. **Vite lee el `.env` solo al arrancar.** Si cambias un valor, detén `pnpm dev` y vuelve a correrlo.
2. **Las variables `VITE_` quedan escritas dentro del JavaScript** que descarga el navegador al hacer el build. Cualquiera puede leerlas, así que **nunca** van ahí contraseñas ni claves.
3. **En Docker se fijan al construir la imagen**, no al levantar el contenedor: por eso `fe/Dockerfile` declara `ARG VITE_API_URL`. Una variable `VITE_` nueva necesita su propio `ARG` + `ENV` en el Dockerfile.

---

## 5. Configuración Base

### `vite.config.ts` — Bundler y tests

```typescript
/**
 * Archivo: vite.config.ts
 * Descripción: Configuración de Vite — plugins, alias de paths y configuración de Vitest.
 * ¿Para qué? Decirle a Vite cómo procesar el proyecto y cómo ejecutar los tests.
 * ¿Impacto? Sin esta configuración Vite no sabría transformar JSX, TypeScript ni TailwindCSS.
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    react(), // Transforma JSX/TSX y activa Fast Refresh (recarga sin perder estado)
    tailwindcss(), // Integra TailwindCSS v4 directamente como plugin de Vite
  ],
  resolve: {
    alias: {
      // Alias @/ apunta a src/ — evita imports relativos como ../../../components/Button
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: false, // No abrir el navegador automáticamente
  },
  test: {
    globals: true, // it/describe/expect sin importar
    environment: "jsdom", // Simula el DOM del navegador
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/__tests__/setup.ts", "src/main.tsx", "src/vite-env.d.ts", "src/types/**"],
    },
  },
});
```

**Puntos clave:**

1. **`globals: true` + `"types": ["vitest/globals", ...]` en `tsconfig.app.json`** — Vitest deja
   `describe`, `it`, `expect` y `vi` disponibles en cada test sin importarlos, y TypeScript conoce
   sus tipos gracias a esa entrada de `types`.

2. **Alias `@/`** — En lugar de escribir `"../../../components/ui/Button"`, se escribe
   `"@/components/ui/Button"`. Más legible y resistente a reorganizaciones de carpetas.

3. **`environment: "jsdom"`** — Los tests de React necesitan simular un navegador.
   `jsdom` es una implementación de las APIs del navegador en Node.js (donde corren los tests).

### `tsconfig.app.json` — TypeScript estricto

```json
{
  "compilerOptions": {
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"],
    "strict": true, // Activa las reglas estrictas (noImplicitAny, strictNullChecks, etc.)
    "noUnusedLocals": true, // Variable declarada y nunca usada = error
    "noUnusedParameters": true, // Parámetro nunca usado = error
    "noFallthroughCasesInSwitch": true, // Un case sin break que "cae" al siguiente = error
    "paths": {
      "@/*": ["./src/*"] // Mismo alias que en vite.config.ts
    }
  }
}
```

> **¿Por qué `"strict": true`?** En modo estricto, TypeScript se convierte en un aliado que
> detecta errores antes de que lleguen al navegador. Por ejemplo, no permitirá usar una variable
> que podría ser `null` sin verificarla antes. Al principio parece molesto, a largo plazo evita
> bugs de producción.

---

## 6. Estilos Globales – TailwindCSS + Tema

### `src/index.css`

```css
/**
 * Archivo: index.css
 * Descripción: Estilos globales de la aplicación.
 * ¿Para qué? Cargar TailwindCSS y definir variables del tema personalizado.
 * ¿Impacto? Sin este archivo, ninguna clase utilitaria de Tailwind funcionaría.
 */

@import "tailwindcss";

@theme {
  /* Fuentes (solo sans-serif): Inter para el texto, Outfit para los títulos */
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-display: "Outfit", ui-sans-serif, system-ui, -apple-system, sans-serif;

  /* Color de marca: los componentes usan accent-*, que apunta a green-*.
     La escala green-* se redefine con la paleta "Páramo Fresco" (claro)
     y "Bosque Andino" (oscuro) en :root y .dark, más abajo en el archivo. */
  --color-accent-600: var(--color-green-600); /* …y así del 50 al 950 */

  /* Superficies del modo oscuro: siempre con dark:, ej. dark:bg-night-card */
  --color-night-base: #050f0a;  /* fondo raíz */
  --color-night-page: #0a1510;  /* fondo de los paneles */
  --color-night-card: #12231a;  /* tarjetas */
  --color-night-panel: #0f2018; /* modales, barras fijas */
  --color-night-inset: #0c1a12; /* zonas hundidas */
  --color-night-field: #1a3324; /* campos de formulario */
  --color-night-line: #23392b;  /* bordes */
  --color-night-hover: #23392b; /* hover */
}

/* Escala de íconos: la única forma de dar tamaño a un ícono de lucide */
@utility icon-sm { @apply size-3.5; }  /* 14px: dentro de texto pequeño */
@utility icon-md { @apply size-4; }    /* 16px: botones y campos */
@utility icon-lg { @apply size-5; }    /* 20px: sidebar, mensajes */
@utility icon-xl { @apply size-8; }    /* 32px: destacado */
@utility icon-deco { @apply size-20; } /* 80px: decorativo */

@layer base {
  /* h1-h3 usan la fuente de títulos sin tener que ponerla en cada página */
  h1,
  h2,
  h3 {
    font-family: theme(--font-display);
  }
}

@layer base {
  /* Borde por defecto en modo claro */
  *,
  *::before,
  *::after {
    border-color: theme(--color-gray-200);
  }

  html {
    font-family: theme(--font-sans);
    -webkit-font-smoothing: antialiased; /* Mejora legibilidad en macOS */
    -moz-osx-font-smoothing: grayscale;
  }

  /* Color de fondo y texto según tema (claro / oscuro) */
  body {
    @apply bg-gray-50 text-gray-900 dark:bg-night-base dark:text-gray-100;
    @apply min-h-screen antialiased;
    @apply transition-colors duration-200; /* Transición suave al cambiar tema */
    margin: 0;
  }

  /* Bordes más oscuros en modo oscuro */
  .dark *,
  .dark *::before,
  .dark *::after {
    border-color: theme(--color-gray-700);
  }
}
```

### TailwindCSS v4 — diferencias clave respecto a v3

TailwindCSS v4 cambió la forma de integrarse con bundlers:

| Característica     | v3                                                           | v4                               |
| ------------------ | ------------------------------------------------------------ | -------------------------------- |
| Importación        | `@tailwind base; @tailwind components; @tailwind utilities;` | `@import "tailwindcss";`         |
| Configuración tema | `tailwind.config.js`                                         | `@theme` en el CSS               |
| Plugin de Vite     | Postcss separado                                             | `@tailwindcss/vite` (automático) |
| Archivo config     | Obligatorio                                                  | Opcional (todo en CSS)           |

> En v4 ya **no existe** `tailwind.config.js`. Toda la personalización del tema va en el
> bloque `@theme` dentro del archivo CSS.

### Fuentes Inter y Outfit — carga desde Google Fonts

La fuente se declara en el CSS pero debe **cargarse** desde Google Fonts. En `index.html`:

```html
<!-- Preconexa con los servidores de Google (reduce latencia DNS) -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- Inter (texto) en 5 grosores y Outfit (títulos) en 4 -->
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap"
  rel="stylesheet"
/>
```

> **`display=swap`** hace que el texto sea visible inmediatamente con una fuente del sistema
> mientras las fuentes cargan en segundo plano. Sin esto, habría un "flash" de texto invisible.

### Dark Mode

El tema oscuro funciona con la clase CSS `dark` en el elemento `<html>`:

```html
<html class="dark"> <!-- Tema oscuro activo -->
<html>              <!-- Tema claro (sin clase) -->
```

TailwindCSS genera variantes `dark:` que aplican cuando esa clase está presente.
Dos piezas gestionan esa clase:

- **Script en línea de `index.html`** — la aplica antes de que cargue React (primero `localStorage`, si no hay nada, la preferencia del sistema operativo). Sin él, la página se veía en claro una fracción de segundo y luego saltaba a oscuro.
- **`ThemeToggle`** — el botón sol/luna que la cambia y guarda la elección (ver sección 13).

Regla del proyecto: el modo oscuro es obligatorio desde el primer commit, y sus superficies usan los tokens `night-*`, nunca un hex a mano (`docs/requisitos/restricciones.md`).

---

## 7. Punto de Entrada – `main.tsx`

```typescript
/**
 * Archivo: main.tsx
 * Descripción: Punto de entrada de la aplicación React.
 * ¿Para qué? Monta el árbol de componentes React en el elemento #root del DOM.
 * ¿Impacto? Sin este archivo, React no se inicializaría y la pantalla quedaría en blanco.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";   // Carga TailwindCSS y estilos globales
import "./i18n";        // Inicializa i18next ANTES de que se renderice cualquier componente
import App from "./App";

// ¿Qué? Obtiene el div#root de index.html y crea la raíz React.
// ¿Para qué? createRoot() es la API moderna (React 18+) para renderizar.
// ¿Impacto? La exclamación (!) le dice a TypeScript "confío en que este elemento existe".
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

### El `index.html` que referencia `main.tsx`

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/logos/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- Carga de las fuentes Inter y Outfit desde Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <title>VerdeApp</title>
    <!-- Script en línea que aplica la clase "dark" antes del primer pintado (ver "Dark Mode") -->
  </head>
  <body>
    <div id="root"></div>
    <!-- Vite transforma este script en tiempo de desarrollo -->
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

> **¿Por qué un solo `<div id="root">`?** React toma control completo de ese elemento.
> Todo lo que el usuario ve es generado por el árbol de componentes React, no por HTML estático.

### `StrictMode` — ¿para qué sirve?

`StrictMode` es una herramienta de desarrollo (no afecta producción) que:

- Renderiza los componentes **dos veces** para detectar efectos secundarios inesperados.
- Advierte sobre el uso de APIs obsoletas de React.
- Ayuda a preparar el código para futuras versiones de React.

> Si en desarrollo ves que `useEffect` se ejecuta dos veces, es `StrictMode` en acción — es
> intencional y señal de que tu código funciona correctamente.

---

## 8. Enrutamiento – `App.tsx`

`App.tsx` envuelve toda la app en 3 piezas y luego define las rutas:

```tsx
<BrowserRouter>             {/* Navegación basada en la URL */}
  <AuthProvider>            {/* Sesión del usuario para toda la app (sección 11) */}
    <ServerErrorBanner />   {/* Aviso global si el backend no responde */}
    <ErrorBoundary>         {/* Si un componente falla, muestra ErrorFallback en vez de pantalla en blanco */}
      <Routes>…</Routes>
    </ErrorBoundary>
  </AuthProvider>
</BrowserRouter>
```

### Tres tipos de rutas

| Tipo | Rutas | Cómo se protegen |
| ---- | ----- | ---------------- |
| **Públicas** | `/` (landing), `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/aceptar-invitacion` | No se protegen |
| **Modales sobre la landing** | `/terminos-de-uso`, `/privacidad`, `/politica-cookies`, `/contacto` | No se protegen. Cada una pinta la landing de fondo y su contenido en un `<Modal>` |
| **Con sesión** | Paneles por rol, perfil, directorio, catálogo, comunicados, novedades… | `ProtectedRoute` (hay sesión) + `RoleGuard` (el rol puede entrar) + `AppShell` (sidebar) |

Ejemplo real de una ruta con sesión:

```tsx
<Route
  path="/admin-conjunto/comunicados"
  element={
    <ProtectedRoute>                                      {/* 1. ¿Hay sesión? Si no → /login */}
      <RoleGuard allowedRoles={[RoleId.ADMIN_CONJUNTO]}>  {/* 2. ¿Su rol puede entrar? */}
        <AppShell>                                        {/* 3. Sidebar + contenido */}
          <AdminConjuntoComunicadosPage />
        </AppShell>
      </RoleGuard>
    </ProtectedRoute>
  }
/>
```

### `/dashboard` según el rol

`/dashboard` no tiene pantalla propia: `DashboardRedirect` (dentro de `App.tsx`) lee el rol del usuario en sesión y lo manda a su panel:

| Rol | Destino | Componente |
| --- | ------- | ---------- |
| Administrador del Sistema | `/dashboard/admin` | `pages/dashboards/AdminDashboard.tsx` |
| Administrador de Conjunto | `/dashboard/admin-conjunto` | `pages/dashboards/AdminConjuntoDashboard.tsx` |
| Reciclador | `/dashboard/reciclador` | `pages/dashboards/RecicladorDashboard.tsx` |
| Residente | `/dashboard/residente` | `pages/dashboards/ResidenteDashboard.tsx` |

Así el login y cualquier enlace interno solo necesitan ir a `/dashboard`, sin saber el rol.

### Rutas por rol

| Ruta | Roles |
| ---- | ----- |
| `/change-password`, `/profile` | Todos |
| `/directorio`, `/catalogo-educativo`, `/catalogo-educativo/:categoria` | Residente |
| `/puntos-acopio` | Reciclador (mismo `DirectorioPage` con `soloAcopio`) |
| `/comunicados` | Residente, Reciclador |
| `/novedades` | Residente, Reciclador, Admin. de Conjunto |
| `/admin-conjunto/comunicados` | Admin. de Conjunto |
| `/admin/contenido-educativo`, `/admin/puntos-acopio`, `/admin/novedades` | Admin. del Sistema |

Cualquier otra ruta (`path="*"`) redirige a `/login`.

### `replace` en `<Navigate>`

```tsx
<Navigate to="/login" replace />
```

`replace` reemplaza la entrada actual del historial en lugar de agregar una nueva. Sin él, al presionar "Atrás" el usuario volvería a la ruta que causó la redirección, y esta lo redirigiría otra vez.

---

## 9. Tipos TypeScript – `types/auth.ts`

Contratos de datos de la autenticación. Los más usados:

```typescript
// Roles: mismos números que la tabla roles del backend (RolId en be/app/models/rol.py)
export const RoleId = {
  ADMIN_SISTEMA: 1,
  RESIDENTE: 2,
  RECICLADOR: 3,
  ADMIN_CONJUNTO: 4,
} as const;
export type RoleId = (typeof RoleId)[keyof typeof RoleId];

export interface RegisterRequest {
  rol: string;                       // "residente" | "reciclador"
  correo_electronico: string;
  password: string;
  nombre: string;
  apellidos: string;
  id_conjunto_residencial?: string;  // solo Residente (UUID)
  codigo_acceso?: string;            // solo Residente
  localidad_id?: number;             // solo Reciclador
  // …torre, apto, asociacion, numero_telefonico
}

export interface UserResponse {
  id: string;          // UUID
  email: string;
  role_id: RoleId;
  is_active: boolean;
  locale?: string;     // idioma preferido; AuthContext lo aplica al iniciar sesión
  first_name: string;
  last_name: string;
  perfil?: { tipo: "administrador" | "residente" | "reciclador"; nombre_completo: string; /* … */ };
}
```

### Convenciones de nombrado

- **Sufijo `Request`** — lo que el frontend envía. **Sufijo `Response`** — lo que el backend devuelve.
- Los campos conservan el nombre del backend (`correo_electronico`, `role_id`): la respuesta HTTP se usa directo, sin transformarla.
- **Siempre `RoleId.X`**, nunca el número a mano (`role_id === 4`): si un día cambia un número, se cambia en un solo lugar.

---

## 10. Capa API – Axios

### `api/axios.ts` — la instancia compartida

Todas las peticiones salen de la misma instancia:

```typescript
const api = axios.create({
  baseURL: API_BASE_URL,         // VITE_API_URL (sección 4)
  headers: { "Content-Type": "application/json" },
  timeout: 10000,                // 10 s máximo por petición
  withCredentials: true,         // el navegador adjunta las cookies de sesión
});
```

**Los tokens no los toca JavaScript.** El backend los guarda en cookies `httpOnly` (el código de la página no puede leerlas, así un script malicioso no puede robarlas) y el navegador las adjunta solo gracias a `withCredentials: true`. Lo único que el frontend guarda es una marca sin valor secreto, `verdeapp:sesion-activa` = `"1"`, en `localStorage` ([`lib/sesionActiva.ts`](src/lib/sesionActiva.ts)), para saber si vale la pena preguntar `GET /me` al recargar.

El interceptor de respuesta hace 3 cosas:

1. **Renueva la sesión sola.** Si una petición recibe `401` y había sesión, llama una vez a `POST /auth/refresh` y repite la petición. Si varias peticiones fallan a la vez, todas esperan la misma renovación (y entre pestañas se coordinan con `navigator.locks`).
2. **Avisa si la sesión venció de verdad.** Si la renovación tampoco sirve, borra la marca y manda a `/login` con el aviso "tu sesión expiró". Las rutas de login, registro, refresh y logout quedan fuera de esta regla (un login fallido no es una sesión vencida).
3. **Normaliza los errores.** Convierte las respuestas de FastAPI (`{ detail: "..." }` o la lista de errores de Pydantic) en un `error.message` legible para mostrar en un `<Alert>`, y avisa a `ServerErrorBanner` si el servidor no responde.

### `api/auth.ts` y `lib/*Api.ts` — una función por endpoint

`api/auth.ts` tiene los endpoints de sesión: `registerUser`, `loginUser`, `refreshToken`, `logoutUser`, `changePassword`, `forgotPassword`, `resetPassword`, `verifyEmail`, `getMe` y `updateLocale`.

El resto de recursos tiene su propio cliente en `lib/`, uno por dominio: `comunicadosApi.ts`, `novedadesApi.ts`, `auditoriaConjuntoApi.ts`, `puntosAcopioApi.ts`, `contenidoEducativoApi.ts`, `adminConjuntoApi.ts`, `contactApi.ts`, etc. Las páginas nunca escriben una URL: llaman a estas funciones.

Estos clientes usan el `axios` global (no la instancia `api`), pero se comportan igual: `api/axios.ts` le instala al `axios` global los mismos interceptores y `axios.defaults.withCredentials = true`.

```typescript
// lib/comunicadosApi.ts
const API_BASE = `${API_BASE_URL}/api/v1/comunicados`;

export async function listarMisComunicados(limit: number, offset: number): Promise<PaginaDeComunicados> {
  const { data } = await axios.get(`${API_BASE}/mis-comunicados`, { params: { limit, offset } });
  return data;   // { items, total } — ver "Paginación" en la sección 13
}
```

> El genérico (`api.get<UserResponse>(...)`) le dice a TypeScript qué forma tiene `response.data`. Sin él, sería `any` y se perdería la verificación de tipos en todo el código que lo usa.

---

## 11. Contexto de Autenticación

La sesión (usuario y si todavía se está verificando) la comparte toda la app con React Context.

### ¿Por qué dos archivos?

```
context/
├── authContextDef.ts   ← Solo crea el Context con createContext()
└── AuthContext.tsx     ← Provider con estado, efectos y acciones
```

React Fast Refresh (la recarga en caliente de Vite) exige que un archivo que exporta componentes no exporte otras cosas. `AuthProvider` es un componente y `AuthContext` no, así que van separados.

### `AuthProvider` — qué guarda y qué hace

- **Estado:** `user` (`UserResponse | null`) e `isLoading`. `isAuthenticated` es simplemente `!!user`: los tokens no pasan por aquí (sección 10).
- **`login`:** `POST /auth/login` (el backend deja las cookies) → marca la sesión como activa → `GET /me` → guarda el usuario y cambia el idioma al `locale` que tenga guardado.
- **`register`:** solo `POST /auth/register`. **No** inicia sesión: la cuenta queda pendiente hasta que la persona abra el enlace de verificación que le llega al correo.
- **`logout`:** borra la marca y el usuario. El botón "Cerrar sesión" de `AppShell` llama antes a `POST /auth/logout` para que el backend borre las cookies.

### Flujo al cargar la app

```
AuthProvider monta
  ↓ isLoading = true          → ProtectedRoute muestra el spinner
  ↓ ¿Hay marca verdeapp:sesion-activa en localStorage?
      No → isLoading = false  → sin sesión
      Sí → GET /me (el navegador adjunta las cookies)
           → 200 → setUser(data) + idioma guardado → sesión restaurada
           → 401/403 → clearAuth()                 → volver al login
  ↓ isLoading = false         → ProtectedRoute decide redirigir o mostrar la ruta
```

Sin este flujo, recargar la página mandaría al login aunque la sesión siguiera viva.

Además, `AuthProvider` escucha el evento `storage` del navegador: si **otra** pestaña cierra la sesión (borra la marca), esta pestaña también queda sin usuario.

---

## 12. Hook `useAuth`

```typescript
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider. …");
  }
  return context;
}
```

Uso en cualquier componente dentro de `<AuthProvider>`:

```tsx
const { user, isLoading } = useAuth();
return <h1>Hola, {user?.first_name}</h1>;
```

> Patrón **Custom Hook**: los componentes no saben que debajo hay un Context, solo llaman al hook. Si la implementación cambiara, solo cambia `useAuth.ts`.

### Otros hooks del proyecto

| Hook | Para qué |
| ---- | -------- |
| `usePaginacion` | `limit`/`offset` de un listado paginado, junto con el componente `<Paginacion>` |
| `usePolling` | Repetir una consulta cada cierto tiempo (20 s por defecto, ej. notificaciones) y volver a consultar al instante cuando otro componente avisa un cambio |
| `useConjuntoBusqueda` | Búsqueda de conjuntos con espera entre teclas para los comboboxes |
| `useAvisoTemporal` | Mostrar un aviso de éxito unos segundos y ocultarlo solo |
| `useRestoreScroll` / `useScrollReveal` | Recordar el scroll de la landing y animar secciones al aparecer |

---

## 13. Componentes UI Base

Los componentes en `components/ui/` son **atómicos**: pequeños, reutilizables y
sin lógica de negocio. Solo reciben props y renderizan UI.

### `Button.tsx` — Variantes y estado de carga

```typescript
interface ButtonProps {
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}
```

Puntos de implementación:

- **Tres variantes** con colores distintos para indicar intención (acción principal,
  acción secundaria, acción destructiva).
- **`isLoading`:** Muestra un spinner SVG animado (`animate-spin`) y deshabilita el botón.
- **`aria-busy={isLoading}`:** Comunica el estado a lectores de pantalla (WCAG 4.1.3).
- **Regla de diseño:** Los botones de acción van siempre a la derecha:
  ```typescript
  <div className="flex justify-end gap-3">
    <Button variant="secondary">Cancelar</Button>
    <Button type="submit" isLoading={loading}>Guardar</Button>
  </div>
  ```

### `InputField.tsx` — Input accesible con toggle de contraseña

```typescript
interface InputFieldProps {
  label: string;
  name: string;
  type?: string;
  error?: string;
  value: string;
  placeholder?: string;
  autoComplete?: string;
  icon?: ReactNode; // Ícono a la izquierda (ej: <Mail />)
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
```

Puntos de accesibilidad:

- `<label htmlFor={name}>` vinculado a `<input id={name}>` (WCAG 1.3.1 — Info y relaciones).
- `aria-invalid={!!error}` comunica el estado de error al lector de pantalla.
- `aria-describedby={name + "-error"}` vincula el mensaje de error al campo.
- Para `type="password"`: botón de toggle con `aria-label` dinámico ("Mostrar/Ocultar contraseña").
- Ícono decorativo con `aria-hidden="true"` — no aporta información, no debe leerse.

### `Alert.tsx` — Feedback al usuario

```typescript
interface AlertProps {
  type: "success" | "error" | "info" | "warning";
  message: string;
  onClose?: () => void;
}
```

- `role="alert"` — Los lectores de pantalla anuncian el contenido automáticamente.
- Cuatro variantes, cada una con su ícono de `lucide-react` (mapa de íconos por concepto): éxito `BadgeCheck`, error `OctagonX`, aviso `TriangleAlert`, info `Info`.
- El ícono se mueve una vez al aparecer el mensaje (`icon-appear` + `icon-hop`/`icon-shake`/`icon-ring`/`icon-nudge`), salvo que el sistema pida "reducir movimiento".
- Si se provee `onClose`, aparece un botón con el ícono `X` y `aria-label` de cerrar.
- El ícono lleva `aria-hidden="true"`: el texto del mensaje ya comunica el tipo.

### `BrandLogo.tsx` — Logo de VerdeApp

```typescript
interface BrandLogoProps {
  variant?: "full" | "mark"; // símbolo + nombre, o solo el símbolo
  tone?: "auto" | "light";   // light = siempre blanco (fondos oscuros)
  className?: string;         // el alto, ej. "h-8"
}
```

- Único lugar que decide qué SVG de `public/logos/` mostrar: ninguna página pone un `<img>` del logo a mano.
- `tone="auto"` renderiza la versión verde y la blanca, y `dark:` esconde la que no toca, sin JavaScript.
- Las barras superiores (sidebar, header de la landing) usan solo el símbolo (`variant="mark"`).

### `ThemeToggle.tsx` — Alternancia de tema

Implementado con un custom hook interno `useTheme`:

```typescript
function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark"; // Preferencia guardada del usuario
    return window.matchMedia("(prefers-color-scheme: dark)").matches; // Fallback del OS
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark"); // Activa variantes dark: de Tailwind
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((prev) => !prev) };
}
```

> **`prefers-color-scheme`** es una media query que lee la preferencia del sistema operativo.
> Se usa como valor inicial — si el usuario cambia el tema manualmente, `localStorage`
> tiene prioridad en la próxima carga. Así se respeta tanto la preferencia del OS como
> la elección explícita del usuario.

- El `aria-label` ("Cambiar a tema claro/oscuro") y el `title` salen de i18n (`common.switchToLight`, etc.).
- `aria-pressed={isDark}` comunica el estado del botón al lector de pantalla.
- El script en línea de `index.html` aplica la misma regla antes del primer pintado, para que no haya un salto de claro a oscuro (sección 6).

---

## 14. Componentes compartidos y patrones del proyecto

Antes de escribir algo a mano en una página, revisa si ya existe aquí. La regla del proyecto (ver `CLAUDE.md`) es **reutilizar, no copiar el patrón**.

| Necesito… | Usa | Detalle |
| --------- | --- | ------- |
| Mostrar el logo | `BrandLogo` | Nunca un `<img>` a mano (sección 13) |
| Una lista vacía | `EmptyState` | Props `icon` + `message`, con la fórmula "Todavía no hay/tienes X…" |
| Confirmar una acción destructiva | `ConfirmModal` | `variant` (`warning`/`danger`/`primary`), `isConfirming`, `error`; `layer="stacked"` si va encima de otro modal |
| Un modal cualquiera | `Modal` | Cierra con Escape, atrapa el foco; `wide` y `layer="stacked"` |
| Un panel deslizable a un lado | `PanelLateral` | Detalle de un registro sin salir de la página |
| Avisar éxito o error | `Alert` | Solo para fallos reales de guardado o de red, no para "falta un campo" |
| Un campo de texto | `InputField` | `error` anclado al campo; `disablePaste` para campos de confirmación |
| Elegir un conjunto | `ConjuntoCombobox` / `ConjuntoComboboxMultiple` | Buscan en el backend con `fetchOptions`, nunca cargan el catálogo completo |
| Contar caracteres | `ContadorCaracteres` | Debajo de un `<textarea>` con `maxLength` |
| Adjuntar una imagen | `ImagenAdjuntaField` | Revisa tipo (jpg/png/webp) y tamaño (5 MB) antes de subir, igual que el backend |
| Agregar una guía de apoyo | `GuiaApoyoField` | Deja subir un archivo (imagen o PDF) o pegar un enlace; usado en contenido educativo y novedades |
| Un estado de carga | `LoadingState` | Spinner + texto con `role="status"` para lectores de pantalla (`Spinner` es solo el ícono) |

### Paginación

Los listados que pueden crecer se piden por páginas. El backend recibe `limit` y `offset` y responde `{ items, total }`; en el frontend se combinan el hook `usePaginacion` y el componente `<Paginacion>`:

```tsx
const TAMANO_PAGINA = 10;
const [total, setTotal] = useState(0);
const { offset, desde, hasta, pagina, totalPaginas, puedeAnterior, puedeSiguiente, irAAnterior, irASiguiente } =
  usePaginacion(TAMANO_PAGINA, total);

useEffect(() => {
  listarMisComunicados(TAMANO_PAGINA, offset).then(({ items, total }) => {
    setComunicados(items);
    setTotal(total);
  });
}, [offset]);

<Paginacion desde={desde} hasta={hasta} total={total} pagina={pagina} totalPaginas={totalPaginas}
  puedeAnterior={puedeAnterior} puedeSiguiente={puedeSiguiente}
  onAnterior={irAAnterior} onSiguiente={irASiguiente} />
```

Ejemplo completo: `pages/AdminConjuntoComunicadosPage.tsx`.

### Avisar a otro componente sin pasar props

Cuando un componente cambia algo que otro muestra (ej. se marcó una notificación como leída y el contador del sidebar debe bajar ya), se usa un evento de `window` en vez de pasar funciones por varios niveles de props:

| Archivo | Evento |
| ------- | ------ |
| `lib/notificationEvents.ts` | Cambiaron las notificaciones → `AppShell` y el feed vuelven a consultar |
| `lib/profileEvents.ts` | Cambió el perfil (nombre, foto) → `AppShell` actualiza el encabezado |
| `lib/serverStatusEvents.ts` | El servidor dejó de responder o volvió → `ServerErrorBanner` |

### Reglas que aplican a todo componente

- **Íconos:** solo `lucide-react`, un ícono por concepto, tamaño solo con `icon-sm`/`md`/`lg`/`xl`/`deco`.
- **Colores:** `accent-*` para la marca y `night-*` para superficies oscuras; nunca un color concreto (`bg-green-600`) ni un hex a mano en un componente reutilizable.
- **Clicables:** todo `<button>`, `<select>` o `<label>` que envuelve un input oculto lleva `cursor-pointer` explícito.
- **Fechas:** siempre con `lib/dateFormat.ts` (`formatearFechaCreacion` para instantes como `created_at`, `formatearFechaUTC` para fechas elegidas a mano).
- **Textos:** todo texto visible (incluidos `aria-label` y `title`) sale de `t("clave")`, con la clave en `es` y en `en`.
- **Validación de formularios:** por campo al salir de él (`onBlur`), con las reglas compartidas de `lib/validacion.ts` (las mismas longitudes que la base de datos).

El detalle completo de diseño está en `docs/requisitos/restricciones.md`.

---

## 15. Layouts y Rutas Protegidas

### `components/layout/AuthLayout.tsx`

Tarjeta centrada para pantallas sin sesión. Hoy la usan `ForgotPasswordPage` y `ResetPasswordPage`; login, registro y las páginas legales se muestran como modales sobre la landing.

```typescript
interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  wide?: boolean;              // tarjeta más ancha
  notice?: React.ReactNode;    // aviso arriba de la tarjeta (ej. "tu sesión expiró")
}
```

- `<main>` como landmark semántico (WCAG 2.4.1).
- Ancho máximo en escritorio y 100 % en celular (mobile-first).

### `components/layout/AppShell.tsx`

Estructura de toda pantalla con sesión: sidebar con el menú del rol, encabezado con nombre, foto, notificaciones, idioma y tema, y el contenido de la página.

- El menú cambia según el rol, y el color e ícono de cada rol salen de `config/roleTheme.ts`.
- "Cerrar sesión" llama a `POST /auth/logout` (el backend borra las cookies) y luego a `logout()` del contexto.
- Escucha los eventos de `notificationEvents` y `profileEvents` para refrescarse sin esperar al siguiente polling.

### `components/ProtectedRoute.tsx` y `components/RoleGuard.tsx`

Las dos piezas que protegen cada ruta con sesión de `App.tsx` (sección 8):

| Componente | Pregunta | Si la respuesta es no |
| ---------- | -------- | --------------------- |
| `ProtectedRoute` | ¿Hay sesión? (mientras `isLoading`, muestra un spinner con `role="status"`) | `<Navigate to="/login" replace />` |
| `RoleGuard` | ¿El rol del usuario está en `allowedRoles`? | `<Navigate to="/dashboard" replace />`, que lo lleva a su propio panel |

> Estas guardas son de **experiencia de usuario**, no de seguridad: la seguridad real está en el backend, que rechaza con 401/403 cualquier petición sin sesión o con el rol equivocado (`get_current_user`, `require_role`).

---

## 16. Páginas

Cada página en `pages/` sigue el mismo patrón:

1. Obtiene la sesión con `useAuth()` y los datos con su cliente de `lib/*Api.ts`.
2. Gestiona estado local: datos, `fieldErrors`, `isLoading`.
3. Valida cada campo al salir de él (`onBlur`) y todos juntos al enviar.
4. Muestra `<Alert>` solo para fallos reales de guardado o de red.
5. Navega con `useNavigate()` en caso de éxito cuando corresponde.

### Paneles por rol (`pages/dashboards/`)

| Panel | Qué hace el rol ahí |
| ----- | ------------------- |
| `ResidenteDashboard` | Reportar el estado del SHUT, ver sus notificaciones, los resultados de las auditorías de su conjunto y el contenido educativo recomendado |
| `RecicladorDashboard` | Sus conjuntos, enviar notificaciones de recolección a residentes y administrador, registrar auditorías de separación, responder invitaciones |
| `AdminConjuntoDashboard` | Gestionar sus conjuntos: datos, código de acceso, recicladores, avisos, auditorías y agenda del comité |
| `AdminDashboard` | Totales, tablas de usuarios por rol, invitar Administradores de Conjunto y resolver solicitudes pendientes |

### Otras páginas

| Página | Ruta |
| ------ | ---- |
| `LandingPage` | `/` (y fondo de los modales de login, registro, legales y contacto) |
| `ProfilePage` | `/profile` — datos, foto de perfil, idioma |
| `DirectorioPage` | `/directorio` (Residente) y `/puntos-acopio` (Reciclador) |
| `CatalogoEducativoPage` / `CategoriaEducativaPage` | `/catalogo-educativo` |
| `ComunicadosFeedPage` / `AdminConjuntoComunicadosPage` | `/comunicados` / `/admin-conjunto/comunicados` |
| `NovedadesFeedPage` / `AdminNovedadesPage` | `/novedades` / `/admin/novedades` |
| `AdminContenidoEducativoPage` / `AdminPuntosAcopioPage` | `/admin/contenido-educativo` / `/admin/puntos-acopio` |
| `AceptarInvitacionPage` | `/aceptar-invitacion` — termina el registro de un Administrador de Conjunto invitado |
| `TerminosModalPage`, `PrivacidadModalPage`, `CookiesModalPage`, `ContactoModalPage` | `/terminos-de-uso`, `/privacidad`, `/politica-cookies`, `/contacto` |

Abajo, el detalle de las páginas de autenticación.

### `LoginPage.tsx`

```typescript
// Campos: email + password
// En éxito: navigate("/dashboard", { replace: true })
// Error: se muestra en <Alert type="error"> y se limpia al escribir

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  setError(null); // Limpiar error al escribir — mejor UX
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  try {
    await login(formData);
    navigate("/dashboard", { replace: true });
  } catch (err) {
    setError(err instanceof Error ? err.message : "Error al iniciar sesión");
  } finally {
    setIsLoading(false);
  }
};
```

### `RegisterPage.tsx`

```typescript
// Selector de rol con 3 botones (Tab + Enter, aria-pressed):
//   - Residente / Reciclador → formulario con los campos propios de cada rol
//   - "¿Administras un conjunto?" → reemplaza el formulario por
//     <SolicitudAdminConjuntoInfo />: pasos, documentos a tener listos y un
//     botón "Solicitar acceso" que abre /contacto?motivo=admin-conjunto
//     (asunto y plantilla ya escritos). No muestra correos ni recibe archivos.
// Campos comunes: nombres, apellidos, teléfono, correo + confirmación,
//   contraseña + confirmación, aceptación de Términos y Privacidad
// Validación: por campo al salir de él (validarCampo); el botón sigue
//   deshabilitado mientras falte algo o haya un formato inválido
// En éxito: modal "revisa tu correo" — la cuenta se activa con el enlace de verificación
```

### `ChangePasswordPage.tsx`

```typescript
// Campos: contraseña actual, nueva contraseña, confirmar nueva contraseña
// Mismas reglas de validación que el registro para la nueva contraseña
// En éxito:
//   - Muestra Alert success
//   - Resetea el formulario (todos los campos vacíos)
// Botones: Cancelar + Guardar (submit), alineados a la derecha

// Patrón de éxito — sin redirección automática (el usuario puede seguir viendo el mensaje)
const [success, setSuccess] = useState(false);

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validate()) return;
  setIsLoading(true);
  try {
    await changePassword({ current_password, new_password });
    setSuccess(true);
    setFormData({ current_password: "", new_password: "", confirmPassword: "" });
  } catch (err) {
    setError(err instanceof Error ? err.message : "Error al cambiar contraseña");
  } finally {
    setIsLoading(false);
  }
};
```

### `ForgotPasswordPage.tsx`

```typescript
// Campo: solo email
// Siempre muestra mensaje de éxito genérico:
//   "Si el correo está registrado, recibirás un enlace en los próximos minutos."
// ¿Por qué genérico? Seguridad: evita revelar si un email está registrado o no.
// Este es un principio OWASP: mensajes de error no deben filtrar información de usuarios.

// Si forgotPassword() lanza error (p.ej. rate limit): se muestra en Alert error.
// Si tiene éxito: se muestra Alert success y se oculta el formulario.
```

### `ResetPasswordPage.tsx`

```typescript
// Lee el token del query string: const [searchParams] = useSearchParams()
// const token = searchParams.get("token")
//
// Caso 1 — Sin token en la URL:
//   Muestra Alert error: "Enlace inválido o expirado"
//   Link a /forgot-password para solicitar un nuevo enlace
//
// Caso 2 — Con token:
//   Campos: nueva contraseña + confirmar contraseña
//   En éxito:
//     - Oculta formulario
//     - Muestra Alert success
//     - Muestra botón "Ir al inicio de sesión"
```

### `VerifyEmailPage.tsx`

```typescript
// Lee el token del query string: const [searchParams] = useSearchParams()
// const token = searchParams.get("token")
//
// Llama a POST /api/v1/auth/verify-email una sola vez.
// useRef evita la doble llamada de React StrictMode (monta componentes 2 veces en desarrollo).
//
// Estado loading  → spinner mientras se verifica
// Estado success  → Alert verde + botón "Ir al inicio de sesión"
// Estado error    → Alert rojo + links a /login y /register
//   (mensaje común: "Este enlace ya fue usado o ha expirado.")
//
// El token llega en el email de verificación enviado por el backend al registrarse:
//   - Con Docker Compose (Mailpit): abrir http://localhost:8025 y hacer clic en el enlace.
//   - Con Mailpit binario (sin Docker): igual, http://localhost:8025.
//   - Sin Mailpit: copiar el enlace de los logs de uvicorn (línea "ENLACE (verificación) para ..."),
//     solo con ENVIRONMENT=development.
```

---

## 17. Tests – Vitest + Testing Library

### Configuración global — `__tests__/setup.ts`

Se ejecuta antes de cada archivo de tests y prepara 4 cosas:

| Qué | Para qué |
| --- | -------- |
| `@testing-library/jest-dom/vitest` | Matchers como `toBeInTheDocument()` o `toHaveValue()` |
| **Mock global de `react-i18next`** | `t("clave")` devuelve el texto real de `locales/es/translation.json` (con plurales `_one`/`_other`). Por eso los tests buscan texto en español: `getByText("Crea tu cuenta")` |
| Mock de `window.matchMedia` | jsdom no lo implementa y `ThemeToggle` lo usa |
| `cleanup()` + `localStorage.clear()` / `sessionStorage.clear()` después de cada test | Que un test no contamine al siguiente |

### Utilidades compartidas — `__tests__/helpers.tsx`

```typescript
export const mockUser: UserResponse = {
  id: "00000000-0000-7000-8000-000000000001",
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
  role_id: 2,          // Residente por defecto
  is_active: true,
  locale: "es",
};

// Envuelve el componente con MemoryRouter + AuthContext.Provider.
// authContext sobrescribe solo lo que el test necesita (user, isLoading, login…).
renderWithProviders(<RegisterPage />, { initialRoute: "/register", authContext: { user: mockUser } });
```

> **`MemoryRouter`** (en lugar de `BrowserRouter`) no depende del historial real del navegador y permite fijar la ruta inicial con `initialRoute`.

### Estructura de tests

Los tests viven en `src/__tests__/`, agrupados igual que el código:

| Carpeta | Qué prueba |
| ------- | ---------- |
| `api/` | Interceptores de Axios (renovación de sesión, sesión expirada) |
| `components/` | Componentes de `components/` y `components/ui/` (`Button`, `InputField`, `ProtectedRoute`, `RoleGuard`, `LegalLayout`…) |
| `config/` | Que cada concepto use su único ícono |
| `context/` y `hooks/` | `AuthContext`, `useAuth`, `useRestoreScroll` |
| `lib/` | Utilidades (`enlaceSeguro`, idioma de `<html>`) |
| `pages/` | Una por página, incluidos los 4 dashboards |

Para ver cuántos tests hay hoy, corre `pnpm test`: el resumen final muestra el total de archivos y de tests (no se anota aquí porque cambia con cada tarjeta).

### Ejemplo de test

```typescript
// __tests__/components/RoleGuard.test.tsx (resumido)
it("manda a /dashboard (su propio panel) a un rol sin permiso, nunca a /login", () => {
  renderWithProviders(
    <Routes>
      <Route path="/login" element={<p>Página de login</p>} />
      <Route path="/dashboard" element={<p>Redirección por rol</p>} />
      <Route
        path="/directorio"
        element={
          <RoleGuard allowedRoles={[RoleId.RESIDENTE]}>
            <p>Contenido del residente</p>
          </RoleGuard>
        }
      />
    </Routes>,
    {
      initialRoute: "/directorio",
      authContext: { isAuthenticated: true, user: { ...mockUser, role_id: RoleId.ADMIN_CONJUNTO } },
    },
  );

  expect(screen.getByText("Redirección por rol")).toBeInTheDocument();
  expect(screen.queryByText("Página de login")).not.toBeInTheDocument();
});
```

Regla del proyecto: **toda funcionalidad nueva lleva sus pruebas antes de darse por terminada**, y un bug corregido lleva el test que habría fallado antes de la corrección.

### Comandos de testing

```bash
# Ejecutar todos los tests (modo ci, sin watch)
pnpm test

# Modo interactivo — re-ejecuta al guardar archivos
pnpm test:watch

# Con reporte de cobertura
pnpm test:coverage

# Un solo archivo de tests
pnpm exec vitest run src/__tests__/pages/LoginPage.test.tsx
```

---

## 18. Comandos del Día a Día

```bash
# ── Desarrollo ────────────────────────────────────────────────────────────
pnpm dev                # Arranca servidor de desarrollo en http://localhost:5173

# ── Tests ─────────────────────────────────────────────────────────────────
pnpm test               # Ejecuta todos los tests (sin watch)
pnpm test:watch         # Modo interactivo — ideal durante desarrollo
pnpm test:coverage      # Tests + reporte de cobertura

# ── Calidad de código ─────────────────────────────────────────────────────
pnpm lint               # ESLint — detecta problemas
pnpm format             # Prettier — formatea src/**/*.{ts,tsx,css,json}
pnpm format:check       # Prettier — verifica sin cambiar (no corre en CI: varios archivos viejos aún no siguen el formato)

# ── Build de producción ───────────────────────────────────────────────────
pnpm build              # tsc -b && vite build → genera dist/
pnpm preview            # Sirve el build de dist/ localmente (preview local)
```

### Flujo completo de desarrollo

```bash
# 1. Desde la raíz del repositorio, entrar a la carpeta del frontend
cd fe

# 2. Instalar dependencias (solo la primera vez o al agregar paquetes)
pnpm install

# 3. Crear .env si no existe
cp .env.example .env

# 4. Arrancar el backend en otra terminal (necesario para la API), desde be/
# uv run uvicorn app.main:app --reload --port 8000

# 5. Arrancar frontend
pnpm dev

# 6. Durante el desarrollo: tests en modo interactivo
pnpm test:watch

# 7. Antes de hacer commit — lo mismo que revisa el CI, un comando a la vez
pnpm exec tsc -b --noEmit
pnpm lint
pnpm test
pnpm build
```

### Verificación del sistema completo

Para probar el flujo de autenticación de principio a fin:

```bash
# Terminal 1 — Base de datos + correo de prueba (desde la raíz)
docker compose up -d verde_db verde_mailpit

# Terminal 2 — Backend (desde be/)
uv run alembic upgrade head
uv run python -m app.seed
uv run uvicorn app.main:app --reload --port 8000

# Terminal 3 — Frontend
cd fe && pnpm dev

# Flujo manual a probar en http://localhost:5173:
# 1. /register      → Crear cuenta nueva
#    → el backend envía un email de verificación
#    → con Mailpit (Docker): abrir http://localhost:8025 y hacer clic en "Verificar mi cuenta"
#    → sin Mailpit: copiar el enlace de los logs de uvicorn (línea "ENLACE (verificación) para ...")
# 2. /verify-email?token=xxx → la página verifica el token automáticamente
# 3. /login         → Iniciar sesión con las credenciales del registro
# 4. /dashboard     → Redirige al panel del rol (residente o reciclador)
# 5. /change-password → Cambiar contraseña
# 6. Logout         → "Cerrar sesión" en el sidebar
#
# Para los 4 roles hay cuentas de prueba sembradas por el seed: ver README.md raíz.
# 7. /forgot-password → Solicitar recuperación de contraseña
#    → igual que el registro: el enlace llega a Mailpit o aparece en los logs
# 8. /reset-password?token=xxx → Restablecer contraseña
```

### Sin Docker — el frontend nunca necesita contenedores

El servidor de desarrollo de Vite (`pnpm dev`) corre directamente en Node.js.
No importa cómo esté corriendo el backend (Docker o uvicorn directo) — el comando
del frontend siempre es el mismo:

```bash
# Solo necesitas que el backend esté accesible en http://localhost:8000
pnpm dev   # → http://localhost:5173
```

> Consulta la sección **19. Ejecutar sin Docker** en el README del backend (`be/README.md`)
> para instrucciones sobre cómo levantar PostgreSQL y Mailpit sin Docker.

---

## 19. Glosario Rápido

| Término                   | Significado                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| **SPA**                   | Single Page Application — la app carga una vez y navega sin recargar la página                 |
| **Vite**                  | Bundler moderno que usa ES Modules nativos — más rápido que Webpack                            |
| **TSX**                   | TypeScript + JSX — archivos TypeScript que contienen sintaxis de React                         |
| **Context API**           | Sistema nativo de React para compartir estado entre componentes sin pasar props                |
| **Hook**                  | Función que empieza con `use` — permite usar estado y ciclo de vida en componentes funcionales |
| **Custom Hook**           | Hook creado por el programador que encapsula lógica reutilizable                               |
| **Interceptor**           | Función en Axios que se ejecuta antes/después de cada petición HTTP                            |
| **Cookie `httpOnly`**     | Cookie que JavaScript no puede leer — así viajan los tokens de sesión de VerdeApp               |
| **`localStorage`**        | Almacenamiento del navegador que persiste entre pestañas y cierres (aquí: marca de sesión, tema, idioma) |
| **i18n**                  | Internacionalización — los textos salen de `locales/{es,en}/translation.json` con `t("clave")`  |
| **RoleGuard**             | Componente que deja entrar a una ruta solo a ciertos roles (sección 15)                        |
| **`useMemo`**             | Hook que memoiza un valor — lo recalcula solo si sus dependencias cambian                      |
| **`useCallback`**         | Hook que memoiza una función — evita recrearla en cada render                                  |
| **`vi.fn()`**             | Función espía de Vitest — permite verificar si fue llamada y con qué argumentos                |
| **`renderWithProviders`** | Utilidad de tests que envuelve componentes con los providers necesarios                        |
| **jsdom**                 | Implementación JavaScript del DOM del navegador — usada en los tests                           |
| **MemoryRouter**          | Router de React Router para tests — no depende del navegador real                              |
| **Tree-shaking**          | Eliminación automática de código no usado durante el build de producción                       |
| **`aria-*`**              | Atributos HTML para accesibilidad — comunican semántica a lectores de pantalla                 |
| **WCAG**                  | Web Content Accessibility Guidelines — estándar internacional de accesibilidad web             |
| **Paginación `limit`/`offset`** | Pedir una lista de a trozos: `limit` = cuántos, `offset` = desde cuál (sección 14)        |
