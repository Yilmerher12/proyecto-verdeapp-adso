import { defineConfig, devices } from "@playwright/test";

// ¿Qué? Puerto del frontend (el mismo de "pnpm dev" en fe/).
// ¿Para qué? Si el 5173 está ocupado, se cambia con la variable FRONT_PORT
//           sin tocar este archivo.
const port = Number(process.env.FRONT_PORT ?? 5173);

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: `http://localhost:${port}`,
    // ¿Qué? Guarda la traza (paso a paso del navegador) solo si un test falla
    //       y se reintenta. Se abre con "pnpm report".
    trace: "on-first-retry",
  },
  reporter: [["list"], ["html", { open: "never" }]],
  retries: process.env.CI ? 1 : 0,
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // ¿Qué? Playwright levanta el frontend solo; el backend y la BD se levantan
  //       antes a mano (ver "Método B" del README raíz).
  // ¿Para qué? Se lanza vite con node y no con "pnpm dev": con pnpm de por
  //           medio, el proceso a veces queda vivo al terminar los tests.
  // ¿Impacto? Si "pnpm dev" ya está corriendo, lo reutiliza en vez de abrir
  //           otro (fuera del CI).
  webServer: {
    command: `node node_modules/vite/bin/vite.js --port ${port} --strictPort`,
    cwd: "../fe",
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
