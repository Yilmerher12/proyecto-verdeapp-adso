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
        HttpResponse.json({ message: "Sesión iniciada correctamente" }),
      ),
    );

    const respuesta = await loginUser({ email: "ana@correo.com", password: "Clave123!" });

    expect(respuesta).toEqual({ message: "Sesión iniciada correctamente" });
  });

  // ¿Qué? Login con la clave incorrecta: el backend real responde 401 con { detail: "<texto>" } (el
  //       detail es un texto, no una lista), capturado con curl sobre la BD de pruebas en la semana 6.
  // ¿Para qué? Comprobar que loginUser rechaza la promesa y que axios.ts copia ese detail en
  //           error.message, que es lo que la pantalla de login muestra al usuario.
  // ¿Impacto? Tipo de doble: stub de red (MSW) con una respuesta REAL. Si el backend cambia el texto,
  //           hay que volver a capturarlo. Es el mismo texto para clave mala y correo inexistente.
  it("loginUser rechaza con el texto del servidor cuando responde 401", async () => {
    // Arrange
    servidor.use(
      http.post(`${API_BASE_URL}/api/v1/auth/login`, () =>
        HttpResponse.json(
          {
            detail:
              "Credenciales incorrectas. Si fallaste varias veces, espera 15 minutos e intenta de nuevo.",
          },
          { status: 401 },
        ),
      ),
    );

    // Act
    const intento = loginUser({ email: "ana@correo.com", password: "ClaveIncorrecta12!" });

    // Assert
    await expect(intento).rejects.toMatchObject({
      response: { status: 401 },
      message:
        "Credenciales incorrectas. Si fallaste varias veces, espera 15 minutos e intenta de nuevo.",
    });
  });

  // ¿Qué? Login con una cuenta que todavía no verificó su correo: el backend real responde 403 con
  //       { detail: "<texto>" }, capturado con curl sobre la BD de pruebas en la semana 6.
  // ¿Para qué? Comprobar que loginUser rechaza la promesa y que el texto llega en error.message, para
  //           que la pantalla le diga a la persona que debe revisar su correo.
  // ¿Impacto? Tipo de doble: stub de red (MSW) con una respuesta REAL. El 403 solo aparece si la clave
  //           es correcta; con clave mala el backend responde 401 y no revela que la cuenta existe.
  it("loginUser rechaza con el texto del servidor cuando responde 403 (sin verificar)", async () => {
    // Arrange
    servidor.use(
      http.post(`${API_BASE_URL}/api/v1/auth/login`, () =>
        HttpResponse.json(
          {
            detail: "Tu cuenta no ha sido verificada aún. Revisa tu correo para activarla.",
          },
          { status: 403 },
        ),
      ),
    );

    // Act
    const intento = loginUser({
      email: "ananoverificada@correo.com",
      password: "ClaveCorrecta1234!",
    });

    // Assert
    await expect(intento).rejects.toMatchObject({
      response: { status: 403 },
      message: "Tu cuenta no ha sido verificada aún. Revisa tu correo para activarla.",
    });
  });

  // ¿Qué? Caso SIMULADO: un 500 no se puede provocar en el backend real sin romperlo, así que el cuerpo
  //       { detail: { code: "boom" } } es inventado (no se sabe cómo responde el backend en un 500).
  // ¿Para qué? Comprobar que registerUser no se traga el error del servidor y lo deja pasar a la pantalla.
  // ¿Impacto? Tipo de doble: stub de red (MSW). Solo el estado 500 es realista, no el cuerpo.
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

  // ¿Qué? Registro con una contraseña débil: el backend real responde 422 con { detail: [lista] }, un
  //       error por campo, y el msg de una contraseña empieza con "Value error, " (capturado con curl
  //       sobre la BD de pruebas, semana 6).
  // ¿Para qué? Comprobar que registerUser rechaza la promesa y que axios.ts toma el msg de esa lista y lo
  //           deja en error.message, que es lo que verá la persona en el formulario.
  // ¿Impacto? Tipo de doble: stub de red (MSW) con una respuesta REAL. El backend también repite la
  //           contraseña en el campo "input" de este error (observación anotada en el PR).
  it("registerUser rechaza con el mensaje del servidor cuando la contraseña es débil (422)", async () => {
    // Arrange
    servidor.use(
      http.post(`${API_BASE_URL}/api/v1/auth/register`, () =>
        HttpResponse.json(
          {
            detail: [
              {
                type: "value_error",
                loc: ["body", "password"],
                msg: "Value error, La contraseña debe contener al menos un número",
                input: "ClaveSinNumero",
                ctx: { error: {} },
              },
            ],
          },
          { status: 422 },
        ),
      ),
    );

    // Act
    const intento = registerUser({ email: "ana@correo.com", password: "clavedebil" } as never);

    // Assert
    await expect(intento).rejects.toMatchObject({
      response: { status: 422 },
      message: "Value error, La contraseña debe contener al menos un número",
    });
  });

  // ¿Qué? El 422 de este handler es copia de lo que el backend real respondió (capturado con curl sobre
  //       la BD de pruebas, semana 6) al mandar { new_password: "corta" } sin current_password.
  // ¿Para qué? Antes el handler traía dos mensajes inventados ("Contraseña muy corta", "Falta un número")
  //           para el mismo campo, algo que el backend nunca responde: Pydantic da UN error por campo, y
  //           los mensajes de contraseña empiezan con "Value error, ".
  // ¿Impacto? Tipo de doble: stub de red (MSW). Sigue probando que axios.ts une los mensajes de un 422.
  it("changePassword une los mensajes de un 422 de validación en error.message", async () => {
    servidor.use(
      http.post(`${API_BASE_URL}/api/v1/auth/change-password`, () =>
        HttpResponse.json(
          {
            detail: [
              {
                type: "missing",
                loc: ["body", "current_password"],
                msg: "Field required",
                input: { new_password: "corta" },
              },
              {
                type: "value_error",
                loc: ["body", "new_password"],
                msg: "Value error, La contraseña debe tener al menos 8 caracteres",
                input: "corta",
                ctx: { error: {} },
              },
            ],
          },
          { status: 422 },
        ),
      ),
    );

    await expect(changePassword({ new_password: "corta" } as never)).rejects.toMatchObject({
      response: { status: 422 },
      message: "Field required. Value error, La contraseña debe tener al menos 8 caracteres",
    });
  });

  // ¿Qué? Caso SIMULADO y el más débil del archivo: el backend real nunca responde HTML, y un servidor
  //       intermedio caído respondería con un estado de error (502), no con 200.
  // ¿Para qué? Comprobar que getMe devuelve el texto tal cual y no se rompe si el cuerpo no es JSON.
  // ¿Impacto? Tipo de doble: stub de red (MSW). Si se borra, verificar antes que no baje el umbral de
  //           cobertura del frontend.
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

  // ¿Qué? Pedir el perfil sin haber iniciado sesión: el backend real responde 401 con
  //       { detail: "No se pudieron validar las credenciales" }, capturado con curl sobre la BD de
  //       pruebas en la semana 6. Es un GET, así que el handler usa http.get.
  // ¿Para qué? Comprobar que getMe rechaza la promesa y que el texto llega en error.message.
  // ¿Impacto? Tipo de doble: stub de red (MSW) con una respuesta REAL. Aquí no hay marca de sesión
  //           guardada, así que axios.ts no intenta renovar la sesión ni redirige a /login.
  it("getMe rechaza con el texto del servidor cuando no hay sesión (401)", async () => {
    // Arrange
    servidor.use(
      http.get(`${API_BASE_URL}/api/v1/users/me`, () =>
        HttpResponse.json({ detail: "No se pudieron validar las credenciales" }, { status: 401 }),
      ),
    );

    // Act
    const intento = getMe();

    // Assert
    await expect(intento).rejects.toMatchObject({
      response: { status: 401 },
      message: "No se pudieron validar las credenciales",
    });
  });

  // ¿Qué? Cada función de auth que hace un POST, con la ruta y el cuerpo que debe mandar, más el
  //       estado HTTP y el mensaje que el backend real responde en esa ruta.
  // ¿Para qué? Comprobar que cada una le pega al endpoint correcto y devuelve el mensaje del servidor.
  //           Antes todas respondían 200 con "ok", pero el backend real (semana 6, capturado con
  //           curl sobre la BD de pruebas) responde un texto distinto en cada ruta, y 201 en el registro.
  // ¿Impacto? Tipo de doble: stub de red (MSW). Los textos son copia de lo que responde el backend hoy:
  //           si cambian allá, este handler queda desactualizado y hay que volver a capturarlos.
  it.each([
    [
      "registerUser",
      "register",
      () => registerUser({ correo_electronico: "a@b.co" } as never),
      { correo_electronico: "a@b.co" },
      201,
      "Registro recibido. Revisa tu correo para activar tu cuenta.",
    ],
    ["refreshToken", "refresh", () => refreshToken(), null, 200, "Sesión renovada correctamente"],
    ["logoutUser", "logout", () => logoutUser(), null, 200, "Sesión cerrada correctamente"],
    [
      "forgotPassword",
      "forgot-password",
      () => forgotPassword({ email: "a@b.co" }),
      { email: "a@b.co" },
      200,
      "Si el email está registrado, recibirás un enlace de recuperación",
    ],
    [
      "resetPassword",
      "reset-password",
      () => resetPassword({ token: "t", new_password: "N1!" }),
      { token: "t", new_password: "N1!" },
      200,
      "Contraseña restablecida exitosamente",
    ],
    [
      "verifyEmail",
      "verify-email",
      () => verifyEmail("tok-1"),
      { token: "tok-1" },
      200,
      "Email verificado exitosamente. Ya puedes iniciar sesión.",
    ],
    [
      "changePassword",
      "change-password",
      () => changePassword({ current_password: "Vieja1!", new_password: "Nueva1!" }),
      { current_password: "Vieja1!", new_password: "Nueva1!" },
      200,
      "Contraseña actualizada exitosamente",
    ],
  ])(
    "%s hace POST a /auth/%s y devuelve el mensaje",
    async (_nombre, ruta, llamar, cuerpoEsperado, estadoReal, mensajeReal) => {
      let cuerpoRecibido: unknown = null;
      servidor.use(
        http.post(`${API_BASE_URL}/api/v1/auth/${ruta}`, async ({ request }) => {
          const texto = await request.text();
          cuerpoRecibido = texto ? JSON.parse(texto) : null;
          return HttpResponse.json({ message: mensajeReal }, { status: estadoReal });
        }),
      );

      const respuesta = await llamar();

      expect(respuesta).toEqual({ message: mensajeReal });
      expect(cuerpoRecibido).toEqual(cuerpoEsperado);
    },
  );

  // ¿Qué? El handler devuelve el usuario completo, igual que el backend real (capturado con curl sobre
  //       la BD de pruebas, semana 6). Antes devolvía solo { locale: "en" }.
  // ¿Para qué? Que el doble diga lo mismo que el backend y que la prueba también compruebe la respuesta,
  //           no solo lo que la función envía.
  // ¿Impacto? Tipo de doble: stub de red (MSW). Se exige solo locale con toMatchObject: los otros
  //           campos son de adorno para esta prueba.
  it("updateLocale manda el idioma en el cuerpo del PATCH y devuelve el usuario con ese idioma", async () => {
    let cuerpoRecibido: unknown;
    servidor.use(
      http.patch(`${API_BASE_URL}/api/v1/users/me/locale`, async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json({
          id: "2f06e47e-ed73-49d6-97f0-f59f35977345",
          email: "residente.prueba@verdeapp.com",
          role_id: 2,
          is_active: true,
          first_name: "RESIDENTE",
          last_name: "DE PRUEBA",
          locale: "en",
        });
      }),
    );

    const respuesta = await updateLocale("en");

    expect(cuerpoRecibido).toEqual({ locale: "en" });
    expect(respuesta).toMatchObject({ locale: "en" });
  });
});
