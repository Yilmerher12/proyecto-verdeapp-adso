/**
 * Archivo: __tests__/pages/ContactoModalPage.test.tsx
 * Descripción: Issue #351 — formulario de contacto: validación por campo y envío real.
 * ¿Impacto? Antes el formulario mostraba "enviado" sin mandar nada; estas
 *           pruebas fallan si vuelve a pasar.
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactoModalPage } from "@/pages/ContactoModalPage";
import { enviarMensajeContacto } from "@/lib/contactApi";
import { renderWithProviders } from "../helpers";

vi.mock("@/lib/contactApi", () => ({ enviarMensajeContacto: vi.fn() }));
const enviarMock = vi.mocked(enviarMensajeContacto);

async function llenarFormulario(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nombre completo"), "María José");
  await user.type(screen.getByLabelText("Correo electrónico"), "maria@ejemplo.com");
  await user.type(screen.getByLabelText("Asunto"), "Duda sobre mi cuenta");
  await user.type(screen.getByLabelText("Mensaje"), "No puedo ver las auditorías.");
}

describe("ContactoModalPage", () => {
  beforeEach(() => {
    enviarMock.mockReset();
  });

  it("muestra el error de cada campo inválido al salir de él", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactoModalPage />, { initialRoute: "/contacto" });

    await user.type(screen.getByLabelText("Nombre completo"), "Juan123");
    await user.type(screen.getByLabelText("Correo electrónico"), "no-es-correo");
    await user.type(screen.getByLabelText("Asunto"), "a");
    await user.type(screen.getByLabelText("Mensaje"), "corto");
    await user.tab();

    expect(screen.getByText("Solo se permiten letras, espacios, apóstrofe, punto o guion")).toBeInTheDocument();
    expect(screen.getByText("El formato del correo no es válido.")).toBeInTheDocument();
    expect(screen.getByText("El asunto debe tener al menos 3 caracteres")).toBeInTheDocument();
    expect(screen.getByText("El mensaje debe tener al menos 10 caracteres")).toBeInTheDocument();
    expect(screen.getByLabelText("Mensaje")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Completa todos los campos correctamente" })).toBeDisabled();
  });

  it("envía el mensaje al API y solo entonces muestra el éxito", async () => {
    enviarMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<ContactoModalPage />, { initialRoute: "/contacto" });

    await llenarFormulario(user);
    await user.click(screen.getByRole("button", { name: "Enviar Mensaje" }));

    expect(enviarMock).toHaveBeenCalledWith({
      name: "María José",
      email: "maria@ejemplo.com",
      subject: "Duda sobre mi cuenta",
      message: "No puedo ver las auditorías.",
    });
    expect(await screen.findByText(/Mensaje enviado con éxito/)).toBeInTheDocument();
  });

  it("si el envío falla muestra el error y nunca el éxito", async () => {
    enviarMock.mockRejectedValue(new Error("No pudimos enviar tu mensaje en este momento."));
    const user = userEvent.setup();
    renderWithProviders(<ContactoModalPage />, { initialRoute: "/contacto" });

    await llenarFormulario(user);
    await user.click(screen.getByRole("button", { name: "Enviar Mensaje" }));

    expect(await screen.findByText("No pudimos enviar tu mensaje en este momento.")).toBeInTheDocument();
    expect(screen.queryByText(/Mensaje enviado con éxito/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Mensaje")).toHaveValue("No puedo ver las auditorías.");
  });
});
