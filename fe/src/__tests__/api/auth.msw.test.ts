// ¿Qué? La página falsa de jsdom se declara en el mismo origen que la API (localhost:8000).
// ¿Para qué? Con otro origen, jsdom exige CORS: mandaría una petición OPTIONS previa y las
//           respuestas del servidor falso tendrían que traer cabeceras Access-Control-*.
// ¿Impacto? Solo afecta a este archivo; el resto de pruebas sigue con el origen por defecto.
// @vitest-environment-options {"url": "http://localhost:8000"}

/**
 * Archivo: __tests__/api/auth.msw.test.ts
 * Descripción: Pruebas del cliente HTTP de autenticación (api/auth.ts) contra un servidor falso con MSW.
 * ¿Para qué? Comprobar cómo reacciona el frontend cuando el servidor responde bien, con error 500,
 *           con error 422 o con algo que no es JSON — sin reemplazar axios ni el interceptor real.
 * ¿Impacto? Tipo de doble: stub de red (MSW intercepta la petición HTTP y devuelve una respuesta
 *           fija). Axios, api/axios.ts y sus interceptores corren de verdad; si alguien cambia una
 *           ruta o rompe el manejo de errores, estas pruebas fallan.
 */

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { API_BASE_URL } from "@/api/axios";
import {
  changePassword,
  forgotPassword,
  getMe,
  loginUser,
  logoutUser,
  refreshToken,
  registerUser,
  resetPassword,
  updateLocale,
  verifyEmail,
} from "@/api/auth";

const servidor = setupServer();

beforeAll(() => servidor.listen({ onUnhandledFrame: "error" }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

describe("api/auth con MSW", () => {
  it("loginUser devuelve el mensaje cuando el servidor responde 200", async () => {
    servidor.use(
      http.post(`${API_BASE_URL}/api/v1/auth/login`, () =>
        HttpResponse.json({ message: "Login exitoso" }),
      ),
    );

    const respuesta = await loginUser({ email: "ana@correo.com", password: "Clave123!" });

    expect(respuesta).toEqual({ message: "Login exitoso" });
  });

  it("registerUser rechaza la promesa cuando el servidor responde 500", async () => {
    servidor.use(
      http.post(`${API_BASE_URL}/api/v1/auth/register`, () =>
        HttpResponse.json({ detail: { code: "boom" } }, { status: 500 }),
      ),
    );

    await expect(
      registerUser({ email: "ana@correo.com", password: "Clave123!", full_name: "Ana" } as never),
    ).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("changePassword une los mensajes de un 422 de validación en error.message", async () => {
    servidor.use(
      http.post(`${API_BASE_URL}/api/v1/auth/change-password`, () =>
        HttpResponse.json(
          { detail: [{ msg: "Contraseña muy corta" }, { msg: "Falta un número" }] },
          { status: 422 },
        ),
      ),
    );

    await expect(
      changePassword({ current_password: "vieja", new_password: "a" } as never),
    ).rejects.toMatchObject({
      response: { status: 422 },
      message: "Contraseña muy corta. Falta un número",
    });
  });

  it("getMe devuelve el cuerpo tal cual cuando la respuesta no es JSON", async () => {
    servidor.use(
      http.get(
        `${API_BASE_URL}/api/v1/users/me`,
        () => new HttpResponse("<html>Bad gateway</html>"),
      ),
    );

    const respuesta = await getMe();

    expect(respuesta).toBe("<html>Bad gateway</html>");
  });

  // ¿Qué? Cada función de auth que hace un POST, con la ruta y el cuerpo que debe mandar.
  // ¿Para qué? Comprobar que cada una le pega al endpoint correcto y devuelve el mensaje del servidor.
  it.each([
    [
      "registerUser",
      "register",
      () => registerUser({ correo_electronico: "a@b.co" } as never),
      { correo_electronico: "a@b.co" },
    ],
    ["refreshToken", "refresh", () => refreshToken(), null],
    ["logoutUser", "logout", () => logoutUser(), null],
    [
      "forgotPassword",
      "forgot-password",
      () => forgotPassword({ email: "a@b.co" }),
      { email: "a@b.co" },
    ],
    [
      "resetPassword",
      "reset-password",
      () => resetPassword({ token: "t", new_password: "N1!" }),
      { token: "t", new_password: "N1!" },
    ],
    ["verifyEmail", "verify-email", () => verifyEmail("tok-1"), { token: "tok-1" }],
    [
      "changePassword",
      "change-password",
      () => changePassword({ current_password: "Vieja1!", new_password: "Nueva1!" }),
      { current_password: "Vieja1!", new_password: "Nueva1!" },
    ],
  ])(
    "%s hace POST a /auth/%s y devuelve el mensaje",
    async (_nombre, ruta, llamar, cuerpoEsperado) => {
      let cuerpoRecibido: unknown = null;
      servidor.use(
        http.post(`${API_BASE_URL}/api/v1/auth/${ruta}`, async ({ request }) => {
          const texto = await request.text();
          cuerpoRecibido = texto ? JSON.parse(texto) : null;
          return HttpResponse.json({ message: "ok" });
        }),
      );

      const respuesta = await llamar();

      expect(respuesta).toEqual({ message: "ok" });
      expect(cuerpoRecibido).toEqual(cuerpoEsperado);
    },
  );

  it("updateLocale manda el idioma en el cuerpo del PATCH", async () => {
    let cuerpoRecibido: unknown;
    servidor.use(
      http.patch(`${API_BASE_URL}/api/v1/users/me/locale`, async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json({ locale: "en" });
      }),
    );

    await updateLocale("en");

    expect(cuerpoRecibido).toEqual({ locale: "en" });
  });
});
