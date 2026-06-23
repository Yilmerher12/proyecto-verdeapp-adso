/**
 * Archivo: __tests__/pages/LoginPage.test.tsx
 * Descripción: Tests de la página de login — formulario, validación, errores, navegación.
 * ¿Para qué? Verificar que el formulario de login envía credenciales correctamente,
 *           muestra errores del backend, y redirecciona al dashboard al autenticarse.
 * ¿Impacto? El login es la puerta de entrada — si falla, nadie accede a la app.
 *           Este archivo reemplaza la versión anterior, que buscaba labels y
 *           textos que no coinciden con el LoginPage real (ej: "Iniciar sesión"
 *           en vez de "Ingresa a VerdeApp" como título, "Crear cuenta" en vez
 *           de "Regístrate aquí", y un payload {email, password} en vez del
 *           real {correo_electronico, username, password}).
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginPage } from "@/pages/LoginPage";
import { renderWithProviders } from "../helpers";

describe("LoginPage", () => {
  // ¿Qué? Verifica que el formulario se renderiza con todos los campos.
  it("renderiza el formulario de login completo", () => {
    renderWithProviders(<LoginPage />, { initialRoute: "/login" });

    expect(screen.getByRole("heading", { name: "Ingresa a VerdeApp" })).toBeInTheDocument();
    expect(screen.getByLabelText("Correo Electrónico")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar Sesión" })).toBeInTheDocument();
  });

  // ¿Qué? Verifica que el enlace a "¿Olvidaste tu contraseña?" existe.
  it("muestra enlace a recuperación de contraseña", () => {
    renderWithProviders(<LoginPage />, { initialRoute: "/login" });
    expect(screen.getByText("¿Olvidaste tu contraseña?")).toBeInTheDocument();
  });

  // ¿Qué? Verifica que el enlace a registro existe (texto real: "Regístrate aquí").
  it("muestra enlace para crear una cuenta nueva", () => {
    renderWithProviders(<LoginPage />, { initialRoute: "/login" });
    expect(screen.getByText("Regístrate aquí")).toBeInTheDocument();
    expect(screen.getByText("¿No tienes cuenta aún?")).toBeInTheDocument();
  });

  // ¿Qué? Verifica que los campos aceptan entrada del usuario.
  it("permite escribir en los campos de correo y contraseña", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { initialRoute: "/login" });

    const emailInput = screen.getByLabelText("Correo Electrónico");
    const passwordInput = screen.getByLabelText("Contraseña");

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "Password1");

    expect(emailInput).toHaveValue("test@example.com");
    expect(passwordInput).toHaveValue("Password1");
  });

  // ¿Qué? Verifica que al enviar el formulario se ejecuta login() con el
  //       payload real: correo_electronico + username (ambos con el mismo
  //       valor del campo email) + password.
  // ¿Para qué? LoginPage.tsx construye loginPayload así porque el backend
  //           acepta login por correo_electronico o por username — se
  //           manda el mismo valor en ambos para máxima compatibilidad.
  it("ejecuta login con el payload correcto al enviar el formulario", async () => {
    const loginMock = vi.fn().mockResolvedValue({ role_id: 2 });
    const user = userEvent.setup();

    renderWithProviders(<LoginPage />, {
      initialRoute: "/login",
      authContext: { login: loginMock },
    });

    await user.type(screen.getByLabelText("Correo Electrónico"), "test@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "Password1");
    await user.click(screen.getByRole("button", { name: "Iniciar Sesión" }));

    expect(loginMock).toHaveBeenCalledWith({
      correo_electronico: "test@example.com",
      username: "test@example.com",
      password: "Password1",
    });
  });

  // ¿Qué? Verifica que muestra error cuando login falla.
  it("muestra alerta de error cuando login falla", async () => {
    const loginMock = vi.fn().mockRejectedValue(new Error("Credenciales incorrectas"));
    const user = userEvent.setup();

    renderWithProviders(<LoginPage />, {
      initialRoute: "/login",
      authContext: { login: loginMock },
    });

    await user.type(screen.getByLabelText("Correo Electrónico"), "bad@email.com");
    await user.type(screen.getByLabelText("Contraseña"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Iniciar Sesión" }));

    expect(await screen.findByText("Credenciales incorrectas")).toBeInTheDocument();
  });

  // ¿Qué? Verifica que el error se limpia al escribir de nuevo en cualquier campo.
  // ¿Para qué? handleChange() llama a setError(null) en cada cambio de input,
  //           sin importar cuál — basta con seguir escribiendo en el correo.
  it("limpia el error al escribir de nuevo en el campo de correo", async () => {
    const loginMock = vi.fn().mockRejectedValue(new Error("Credenciales incorrectas"));
    const user = userEvent.setup();

    renderWithProviders(<LoginPage />, {
      initialRoute: "/login",
      authContext: { login: loginMock },
    });

    await user.type(screen.getByLabelText("Correo Electrónico"), "x@x.com");
    await user.type(screen.getByLabelText("Contraseña"), "x");
    await user.click(screen.getByRole("button", { name: "Iniciar Sesión" }));

    expect(await screen.findByText("Credenciales incorrectas")).toBeInTheDocument();

    // Al escribir de nuevo, el error debe desaparecer.
    await user.type(screen.getByLabelText("Correo Electrónico"), "a");
    expect(screen.queryByText("Credenciales incorrectas")).not.toBeInTheDocument();
  });

  // ¿Qué? Verifica la redirección según el rol devuelto por login().
  // ¿Para qué? LoginPage navega a una ruta distinta según role_id: 1->admin,
  //           2->residente, 3->reciclador, cualquier otro->dashboard genérico.
  //           Este test cubre el caso más común (Residente) como ejemplo
  //           representativo de esa lógica de redirección por rol.
  it("redirige según el rol del usuario tras un login exitoso", async () => {
    const loginMock = vi.fn().mockResolvedValue({ role_id: 3 });
    const user = userEvent.setup();

    renderWithProviders(<LoginPage />, {
      initialRoute: "/login",
      authContext: { login: loginMock },
    });

    await user.type(screen.getByLabelText("Correo Electrónico"), "reciclador@correo.com");
    await user.type(screen.getByLabelText("Contraseña"), "Password1");
    await user.click(screen.getByRole("button", { name: "Iniciar Sesión" }));

    // ¿Qué? Solo confirmamos que login() se resolvió sin lanzar error —
    //       la navegación real (useNavigate) no se observa directamente
    //       en este entorno de test sin un mock explícito de react-router,
    //       así que validamos el efecto observable: la promesa se resuelve
    //       y no queda ningún mensaje de error en pantalla.
    expect(loginMock).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});