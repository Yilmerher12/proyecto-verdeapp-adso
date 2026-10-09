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
});
