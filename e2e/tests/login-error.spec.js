import { test, expect } from "@playwright/test";

// ¿Qué? Fuerza el idioma del navegador a español de Colombia.
// ¿Para qué? Playwright abre Chromium en en-US por defecto y la app detecta el
//           idioma del navegador (i18n.ts: localStorage -> navigator), así que
//           sin esto los textos saldrían en inglés y los locators fallarían.
// ¿Impacto? Solo afecta a este archivo de test, no a la app.
test.use({ locale: "es-CO" });

test.describe("Login con credenciales incorrectas", () => {
  test("muestra el error y no deja entrar al dashboard", async ({ page }) => {
    // Arrange
    // ¿Qué? Un correo único por ejecución, que no existe en la BD.
    // ¿Para qué? El backend bloquea una cuenta 15 min tras 5 fallos seguidos
    //           (MAXIMO_INTENTOS_FALLIDOS en auth_service.py). Con una cuenta
    //           sembrada como admin@verdeapp.com, 5 corridas de este test la
    //           dejarían bloqueada para los demás E2E.
    // ¿Impacto? El mensaje es el mismo para contraseña mala y correo
    //           inexistente (Issue #373, CN-026), así que el flujo probado
    //           es idéntico para la persona usuaria.
    const correo = `e2e.${Date.now()}@verdeapp.com`;
    await page.goto("/login");

    // Act
    await page.getByLabel("Correo electrónico").fill(correo);
    await page.getByLabel("Contraseña", { exact: true }).fill("ClaveIncorrecta2026*");
    await page.getByRole("button", { name: "Iniciar Sesión" }).click();

    // Assert
    // ¿Qué? Se filtra el aviso por su texto en vez de tomar cualquier role="alert".
    // ¿Para qué? La app también muestra un banner global de red con ese mismo
    //           rol (cuando no hay conexión con el backend); sin el filtro,
    //           Playwright falla por encontrar dos avisos a la vez.
    await expect(page.getByRole("alert").filter({ hasText: "Credenciales incorrectas" })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
