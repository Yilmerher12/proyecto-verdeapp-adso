import { test, expect } from "@playwright/test";

// ¿Qué? Fuerza el idioma del navegador a español de Colombia (igual que login-error.spec.js).
// ¿Para qué? La app detecta el idioma del navegador; sin esto los textos saldrían en
//           inglés y los locators fallarían.
// ¿Impacto? Solo afecta a este archivo de test, no a la app.
test.use({ locale: "es-CO" });

// ¿Qué? Pruebas del login cuando el backend falla (servidor caído, error 500, límite de
//       peticiones). Semana 5 del bootcamp, issue #661.
// ¿Para qué? Esos fallos son difíciles de provocar con un backend real. Con page.route
//           el navegador intercepta la llamada al login ANTES de que salga y la respuesta
//           se inventa dentro de la prueba, así que estas pruebas solo necesitan el frontend.
// ¿Impacto? Tipo de doble: stub. Responde algo fijo y no comprueba cómo se le llamó.
//           Como no tocan el backend ni la BD, no bloquean cuentas ni dependen de datos.
test.describe("Login cuando el servidor falla", () => {
  test("con el servidor caído muestra el aviso de conexión y no deja entrar", async ({ page }) => {
    // Arrange
    // ¿Qué? route.abort() corta la petición como si nadie contestara en el servidor.
    // ¿Para qué? Es lo que ve axios cuando el backend está apagado o no hay red: la
    //           petición salió pero nunca llegó respuesta (error.request sin response).
    // ¿Impacto? Esa rama del interceptor (axios.ts) pone el mensaje "No se pudo conectar
    //           con el servidor" y además enciende el banner global de toda la app.
    await page.route("**/api/v1/auth/login", (route) => route.abort("connectionrefused"));
    await page.goto("/login");

    // Act
    await page.getByLabel("Correo electrónico").fill("persona.prueba@verdeapp.com");
    await page.getByLabel("Contraseña", { exact: true }).fill("ClaveCualquiera2026*");
    await page.getByRole("button", { name: "Iniciar Sesión" }).click();

    // Assert
    // ¿Qué? Hay DOS avisos con role="alert" y los dos empiezan con el mismo texto: el del
    //       formulario (texto exacto) y el banner global (agrega "Verifica tu conexión...").
    // ¿Para qué? El ancla ^...$ evita que el aviso del formulario también coincida con el
    //           banner; sin ella Playwright falla por encontrar dos elementos a la vez.
    const avisoDelFormulario = page.getByRole("alert").filter({ hasText: /^No se pudo conectar con el servidor$/ });
    const bannerGlobal = page.getByRole("alert").filter({ hasText: "Verifica tu conexión" });

    await expect(avisoDelFormulario).toBeVisible();
    await expect(bannerGlobal).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("con un error 500 muestra un aviso de error y no deja entrar", async ({ page }) => {
    // Arrange
    // ¿Qué? route.fulfill() responde 500 con texto plano, igual que FastAPI cuando algo
    //       revienta sin manejar (be/app/main.py no tiene manejador para el 500).
    // ¿Para qué? Provocar un 500 real exigiría romper el backend a propósito.
    // ¿Impacto? Como la respuesta no trae "detail", el mensaje que se ve hoy es el de
    //           Axios ("Request failed with status code 500"). Este test NO lo verifica a
    //           propósito: daría por bueno un texto técnico en inglés. Queda anotado como
    //           hallazgo en el PR; corregirlo exige tocar el frontend, fuera de este issue.
    await page.route("**/api/v1/auth/login", (route) =>
      route.fulfill({ status: 500, contentType: "text/plain", body: "Internal Server Error" }),
    );
    await page.goto("/login");

    // Act
    await page.getByLabel("Correo electrónico").fill("persona.prueba@verdeapp.com");
    await page.getByLabel("Contraseña", { exact: true }).fill("ClaveCualquiera2026*");
    await page.getByRole("button", { name: "Iniciar Sesión" }).click();

    // Assert
    // ¿Qué? Se comprueba que haya un aviso, que NO diga "Credenciales incorrectas" y que
    //       la URL siga en /login.
    // ¿Para qué? Un fallo del servidor no debe presentarse como "contraseña mala": la
    //           persona creería que escribió mal sus datos cuando el problema no es suyo.
    const aviso = page.getByRole("alert");
    await expect(aviso).toBeVisible();
    await expect(aviso).not.toContainText("Credenciales incorrectas");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("con el límite de peticiones (429) muestra el mensaje de esperar y envía lo que se escribió", async ({
    page,
  }) => {
    // Arrange
    // ¿Qué? Se simula la respuesta real de slowapi (el límite de intentos del login):
    //       un 429 con { error: "..." } y SIN "detail".
    // ¿Para qué? Es el caso que el issue #414 corrigió en axios.ts: antes la pantalla
    //           mostraba "Request failed with status code 429".
    // ¿Impacto? Tipo de doble: stub + espía. El stub inventa la respuesta; el espía
    //           guarda el cuerpo que mandó el formulario para revisarlo después.
    let cuerpoEnviado = null;
    await page.route("**/api/v1/auth/login", (route) => {
      cuerpoEnviado = route.request().postDataJSON();
      return route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ error: "Rate limit exceeded: 5 per 1 minute" }),
      });
    });
    await page.goto("/login");

    // Act
    await page.getByLabel("Correo electrónico").fill("persona.prueba@verdeapp.com");
    await page.getByLabel("Contraseña", { exact: true }).fill("ClaveCualquiera2026*");
    await page.getByRole("button", { name: "Iniciar Sesión" }).click();

    // Assert
    await expect(
      page.getByRole("alert").filter({ hasText: "Hiciste demasiadas peticiones. Espera un momento e intenta de nuevo." }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    expect(cuerpoEnviado).toEqual({ email: "persona.prueba@verdeapp.com", password: "ClaveCualquiera2026*" });
  });
});
