/**
 * Archivo: __tests__/pages/AceptarInvitacionPage.test.tsx
 * Descripción: Tests del formulario con el que un Admin de Conjunto invitado crea su cuenta.
 * ¿Para qué? Verificar que aplica las mismas reglas que el registro y el perfil
 *           (lib/validacion.ts): antes solo revisaba que el nombre no estuviera vacío.
 * ¿Impacto? Sin estos tests, el formulario podría volver a aceptar "Juan123"
 *           como nombre o un teléfono con letras.
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AceptarInvitacionPage } from "@/pages/AceptarInvitacionPage";
import { consultarInvitacion } from "@/lib/adminConjuntoApi";
import { renderWithProviders } from "../helpers";

const mockAceptar = vi.fn();

vi.mock("@/lib/adminConjuntoApi", () => ({
  consultarInvitacion: vi.fn().mockResolvedValue({
    correo_electronico: "invitado@verdeapp.com",
    nombres_conjuntos: ["TORRES DE ARANJUEZ"],
    valido: true,
  }),
  aceptarInvitacion: (...args: unknown[]) => mockAceptar(...args),
}));

const renderPage = () =>
  renderWithProviders(<AceptarInvitacionPage />, { initialRoute: "/aceptar-invitacion?token=abc" });

// ¿Qué? Llena el formulario completo con datos válidos; la confirmación se puede cambiar.
// ¿Para qué? Los tests de envío (éxito, error del servidor, contraseñas distintas) parten del mismo formulario.
async function llenarFormulario(user: ReturnType<typeof userEvent.setup>, confirmacion = "ClaveFuerte123") {
  await user.type(await screen.findByLabelText("Nombres *"), "Ana");
  await user.type(screen.getByLabelText("Apellidos *"), "Pérez");
  await user.type(screen.getByLabelText("Teléfono"), "3001234567");
  await user.type(screen.getByLabelText("Contraseña *"), "ClaveFuerte123");
  await user.type(screen.getByLabelText("Confirmar Contraseña *"), confirmacion);
}

describe("AceptarInvitacionPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra error al salir del campo Nombres si tiene números", async () => {
    const user = userEvent.setup();
    renderPage();

    const nombre = await screen.findByLabelText("Nombres *");
    await user.type(nombre, "Juan123");
    await user.tab();

    expect(await screen.findByText("Solo se permiten letras, espacios, apóstrofe, punto o guion")).toBeInTheDocument();
    expect(nombre).toHaveAttribute("aria-invalid", "true");
  });

  it("el teléfono solo acepta dígitos y como máximo 10", async () => {
    const user = userEvent.setup();
    renderPage();

    const telefono = await screen.findByLabelText("Teléfono");
    await user.type(telefono, "30a1-2b3");

    expect(telefono).toHaveValue("30123");
    expect(telefono).toHaveAttribute("maxLength", "10");
  });

  it("no envía el formulario si el nombre no es válido", async () => {
    const user = userEvent.setup();
    renderPage();

    // Todo lo demás es válido: lo único que falla es el nombre.
    await user.type(await screen.findByLabelText("Nombres *"), "@@");
    await user.type(screen.getByLabelText("Apellidos *"), "Pérez");
    await user.type(screen.getByLabelText("Contraseña *"), "ClaveFuerte123");
    await user.type(screen.getByLabelText("Confirmar Contraseña *"), "ClaveFuerte123");

    expect(screen.getByRole("button", { name: "Completa el formulario" })).toBeDisabled();

    // Con un nombre válido, el mismo formulario sí se habilita.
    await user.clear(screen.getByLabelText("Nombres *"));
    await user.type(screen.getByLabelText("Nombres *"), "Ana");
    expect(screen.getByRole("button", { name: "Crear mi cuenta" })).toBeEnabled();
    expect(mockAceptar).not.toHaveBeenCalled();
  });

  // ¿Qué? Verifica el estado de carga: todavía no se sabe si la invitación es válida.
  // ¿Para qué? La persona debe ver "Verificando..." y no el formulario ni el error.
  // ¿Impacto? Sin ese aviso, el enlace parecería roto mientras el backend responde.
  it("should show the verifying message when the invitation has not been checked yet", () => {
    // Arrange: el backend nunca responde
    vi.mocked(consultarInvitacion).mockReturnValueOnce(new Promise(() => {}));

    // Act
    renderPage();

    // Assert
    expect(screen.getByText("Verificando tu invitación...")).toBeInTheDocument();
  });

  // ¿Qué? Verifica el enlace inválido, vencido o ya usado (el backend responde valido: false).
  // ¿Para qué? La persona debe ver el aviso y no el formulario de creación de cuenta.
  // ¿Impacto? Si se mostrara el formulario con un enlace inválido, la persona llenaría todo para nada.
  it("should show the invalid invitation message when the link is not valid", async () => {
    // Arrange
    vi.mocked(consultarInvitacion).mockResolvedValueOnce({
      correo_electronico: "",
      nombres_conjuntos: [],
      valido: false,
    });

    // Act
    renderPage();

    // Assert
    expect(await screen.findByRole("heading", { name: "Invitación no válida" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Nombres *")).not.toBeInTheDocument();
  });

  // ¿Qué? Verifica el camino feliz completo: llenar el formulario, enviarlo y ver la cuenta creada.
  // ¿Para qué? Comprobar también qué datos se mandan al backend (el token del enlace y los campos).
  // ¿Impacto? Si se enviara un dato equivocado, la cuenta se crearía mal o no se crearía.
  it("should create the account and show the success message when the form is valid", async () => {
    // Arrange
    const user = userEvent.setup();
    mockAceptar.mockResolvedValueOnce({});
    renderPage();
    await llenarFormulario(user);

    // Act
    await user.click(screen.getByRole("button", { name: "Crear mi cuenta" }));

    // Assert
    expect(await screen.findByRole("heading", { name: "¡Cuenta creada!" })).toBeInTheDocument();
    expect(mockAceptar).toHaveBeenCalledWith({
      token: "abc",
      password: "ClaveFuerte123",
      nombre: "Ana",
      apellidos: "Pérez",
      numero_telefonico: "3001234567",
    });
  });

  // ¿Qué? Verifica que el error del servidor se muestre y que no se anuncie una cuenta creada.
  // ¿Para qué? Si el backend rechaza el envío (ej. enlace ya usado), la persona debe saberlo.
  // ¿Impacto? Sin este aviso, la persona creería que su cuenta existe y no podría entrar.
  it("should show the server error when the account cannot be created", async () => {
    // Arrange
    const user = userEvent.setup();
    mockAceptar.mockRejectedValueOnce(new Error("Este enlace ya fue utilizado"));
    renderPage();
    await llenarFormulario(user);

    // Act
    await user.click(screen.getByRole("button", { name: "Crear mi cuenta" }));

    // Assert
    expect(await screen.findByText("Este enlace ya fue utilizado")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "¡Cuenta creada!" })).not.toBeInTheDocument();
  });

  // ¿Qué? Verifica que contraseñas distintas muestren su error y no se envíe nada.
  // ¿Para qué? Evitar crear una cuenta con una contraseña que la persona no confirmó bien.
  // ¿Impacto? Sin esta regla, un error de tipeo dejaría la cuenta con una contraseña que nadie conoce.
  it("should show the mismatch error and not send the form when the passwords differ", async () => {
    // Arrange
    const user = userEvent.setup();
    renderPage();
    await llenarFormulario(user, "ClaveFuerte124");

    // Act
    await user.click(screen.getByRole("button", { name: "Crear mi cuenta" }));

    // Assert
    expect(await screen.findByText("Las contraseñas no coinciden.")).toBeInTheDocument();
    expect(mockAceptar).not.toHaveBeenCalled();
  });
});
