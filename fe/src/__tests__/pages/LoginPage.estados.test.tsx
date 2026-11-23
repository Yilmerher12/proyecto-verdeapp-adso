/**
 * Archivo: __tests__/pages/LoginPage.estados.test.tsx
 * Descripción: Tests de LoginPage que cubren lo que LoginPage.test.tsx no probaba —
 *              validación del correo, sesión vencida, error sin mensaje y redirección por rol.
 * ¿Para qué? Semana 3 del bootcamp de testing (capa Front): probar los estados
 *           que no son el caso feliz y comprobar a dónde navega cada rol.
 * ¿Impacto? Si alguien cambia una ruta de dashboard, el texto de un error o la
 *           marca de sesión vencida, uno de estos tests falla.
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginPage } from "@/pages/LoginPage";
import { RoleId } from "@/types/auth";
import { renderWithProviders } from "../helpers";

// ¿Qué? Se reemplaza useNavigate por una función espía; el resto de react-router-dom queda real.
// ¿Para qué? Así se puede comprobar a qué ruta navega LoginPage, algo que el test anterior
//           no podía observar directamente.
const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-router-dom")>();
  return { ...original, useNavigate: () => navigateMock };
});

describe("LoginPage — estados y redirección", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    sessionStorage.clear();
  });

  // ¿Qué? Un correo sin formato válido se rechaza antes de llamar al backend.
  it("muestra el error de formato en el campo de correo y no llama a login", async () => {
    // Arrange
    const loginMock = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { initialRoute: "/login", authContext: { login: loginMock } });

    // Act
    await user.type(screen.getByLabelText("Correo electrónico"), "correo-sin-arroba");
    await user.type(screen.getByLabelText("Contraseña"), "Password1");
    await user.click(screen.getByRole("button", { name: "Iniciar Sesión" }));

    // Assert
    expect(await screen.findByText("El formato del correo no es válido.")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toHaveAttribute("aria-invalid", "true");
    expect(loginMock).not.toHaveBeenCalled();
  });

  // ¿Qué? El error de formato desaparece apenas la persona corrige el campo.
  it("quita el error de formato al volver a escribir en el correo", async () => {
    // Arrange
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { initialRoute: "/login" });
    await user.type(screen.getByLabelText("Correo electrónico"), "correo-sin-arroba");
    await user.type(screen.getByLabelText("Contraseña"), "Password1");
    await user.click(screen.getByRole("button", { name: "Iniciar Sesión" }));
    expect(await screen.findByText("El formato del correo no es válido.")).toBeInTheDocument();

    // Act
    await user.type(screen.getByLabelText("Correo electrónico"), "@x.com");

    // Assert
    expect(screen.queryByText("El formato del correo no es válido.")).not.toBeInTheDocument();
  });

  // ¿Qué? Si axios.ts dejó la marca de sesión vencida, LoginPage lo explica una sola vez.
  it("avisa que la sesión expiró y borra la marca", () => {
    // Arrange
    sessionStorage.setItem("verdeapp:session-expired", "1");

    // Act
    renderWithProviders(<LoginPage />, { initialRoute: "/login" });

    // Assert
    expect(screen.getByRole("alert")).toHaveTextContent("Tu sesión expiró. Vuelve a iniciar sesión.");
    expect(sessionStorage.getItem("verdeapp:session-expired")).toBeNull();
  });

  // ¿Qué? Si login() falla con algo que no es un Error, se muestra el mensaje por defecto.
  it("muestra el mensaje por defecto cuando el rechazo no trae un Error", async () => {
    // Arrange
    const loginMock = vi.fn().mockRejectedValue("fallo sin mensaje");
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { initialRoute: "/login", authContext: { login: loginMock } });

    // Act
    await user.type(screen.getByLabelText("Correo electrónico"), "x@x.com");
    await user.type(screen.getByLabelText("Contraseña"), "Password1");
    await user.click(screen.getByRole("button", { name: "Iniciar Sesión" }));

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Credenciales incorrectas. Verifica tu correo y contraseña.",
    );
    expect(navigateMock).not.toHaveBeenCalled();
  });

  // ¿Qué? Cada rol termina en su propio panel; cualquier otro valor va al /dashboard genérico.
  it.each([
    { rol: "Administrador del Sistema", roleId: RoleId.ADMIN_SISTEMA, ruta: "/dashboard/admin" },
    { rol: "Residente", roleId: RoleId.RESIDENTE, ruta: "/dashboard/residente" },
    { rol: "Reciclador", roleId: RoleId.RECICLADOR, ruta: "/dashboard/reciclador" },
    { rol: "Administrador de Conjunto", roleId: RoleId.ADMIN_CONJUNTO, ruta: "/dashboard" },
  ])("navega a $ruta cuando entra el rol $rol", async ({ roleId, ruta }) => {
    // Arrange
    const loginMock = vi.fn().mockResolvedValue({ role_id: roleId });
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { initialRoute: "/login", authContext: { login: loginMock } });

    // Act
    await user.type(screen.getByLabelText("Correo electrónico"), "usuario@correo.com");
    await user.type(screen.getByLabelText("Contraseña"), "Password1");
    await user.click(screen.getByRole("button", { name: "Iniciar Sesión" }));

    // Assert
    expect(navigateMock).toHaveBeenCalledWith(ruta, { replace: true });
  });
});
