/**
 * Archivo: __tests__/components/InvitarAdminConjuntoForm.test.tsx
 * Descripción: Tests del formulario con el que el Administrador del Sistema invita
 *              a un Administrador de Conjunto (correo + localidad + conjuntos).
 * ¿Para qué? Semana 3 del bootcamp de testing (capa Front): el componente no tenía
 *           pruebas propias y cubría solo el 52 % de sus líneas.
 * ¿Impacto? Si alguien rompe la validación del correo, el orden "primero localidad,
 *           luego conjunto" o lo que se manda al backend, uno de estos tests falla.
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { InvitarAdminConjuntoForm } from "@/components/InvitarAdminConjuntoForm";
import { invitarAdministradorConjunto } from "@/lib/adminConjuntoApi";
import { renderWithProviders } from "../helpers";

// ¿Qué? Se reemplaza axios.get, pero se conserva axios.create real.
// ¿Para qué? El formulario pide localidades y conjuntos con axios.get; sin este mock saldrían
//           peticiones HTTP reales. axios.create debe seguir siendo real porque
//           src/api/axios.ts lo ejecuta al importarse (mismo patrón que RegisterPage.test.tsx).
vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");
  return { ...actual, default: { ...actual.default, get: vi.fn(), create: actual.default.create } };
});

// ¿Qué? Se reemplaza la función que envía la invitación al backend.
// ¿Para qué? Poder comprobar con qué datos se llama y simular éxito o error del servidor.
vi.mock("@/lib/adminConjuntoApi", () => ({ invitarAdministradorConjunto: vi.fn() }));

const mockedGet = axios.get as unknown as ReturnType<typeof vi.fn>;
const mockedInvitar = invitarAdministradorConjunto as unknown as ReturnType<typeof vi.fn>;

const ID_CONJUNTO = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  mockedInvitar.mockReset();
  mockedGet.mockImplementation((url: string) => {
    if (url.includes("/geography/localidades")) {
      return Promise.resolve({ data: [{ id_localidad: 1, nombre_localidad: "Usaquén" }] });
    }
    return Promise.resolve({
      data: [{ id_conjunto_residencial: ID_CONJUNTO, nombre_conjunto: "TORRES DE ARANJUEZ" }],
    });
  });
});

// ¿Qué? Pasos compartidos: elegir localidad, buscar el conjunto y seleccionarlo.
async function elegirConjunto(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(await screen.findByLabelText("Localidad"), "1");
  await user.type(screen.getByLabelText("Conjuntos a asignar *"), "TORRES");
  await user.click(await screen.findByText("TORRES DE ARANJUEZ"));
  // ¿Qué? Se cierra el desplegable con Escape.
  // ¿Para qué? Mientras la lista está abierta (queda abierta tras elegir, porque se pueden
  //           elegir varios), Headless UI oculta el resto de la página a la accesibilidad y
  //           getByRole ya no encuentra el botón de enviar. Es lo mismo que hace una persona
  //           al terminar de elegir.
  await user.keyboard("{Escape}");
}

describe("InvitarAdminConjuntoForm", () => {
  it("arranca con el botón deshabilitado hasta tener correo y un conjunto", async () => {
    // Arrange
    const user = userEvent.setup();
    renderWithProviders(<InvitarAdminConjuntoForm />);
    const boton = screen.getByRole("button", { name: "Completa el formulario" });
    expect(boton).toBeDisabled();

    // Act: solo el correo no alcanza.
    await user.type(screen.getByLabelText("Correo del administrador a invitar *"), "admin@conjunto.com");

    // Assert
    expect(screen.getByRole("button", { name: "Completa el formulario" })).toBeDisabled();
  });

  it("muestra el error de formato al salir del campo de correo y lo quita al corregirlo", async () => {
    // Arrange
    const user = userEvent.setup();
    renderWithProviders(<InvitarAdminConjuntoForm />);
    const correo = screen.getByLabelText("Correo del administrador a invitar *");

    // Act
    await user.type(correo, "correo-sin-arroba");
    await user.tab();

    // Assert
    expect(await screen.findByText("El formato del correo no es válido.")).toBeInTheDocument();
    expect(correo).toHaveAttribute("aria-invalid", "true");

    // Act: al volver a escribir, el error desaparece.
    await user.type(correo, "@x.com");

    // Assert
    expect(screen.queryByText("El formato del correo no es válido.")).not.toBeInTheDocument();
  });

  it("pide elegir primero la localidad y solo entonces muestra el buscador de conjuntos", async () => {
    // Arrange
    const user = userEvent.setup();
    renderWithProviders(<InvitarAdminConjuntoForm />);

    // Assert: sin localidad no hay buscador.
    expect(screen.getByText("Selecciona una localidad para poder buscar el conjunto.")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Escribe el nombre del conjunto...")).not.toBeInTheDocument();

    // Act
    await user.selectOptions(await screen.findByLabelText("Localidad"), "1");

    // Assert
    expect(screen.getByPlaceholderText("Escribe el nombre del conjunto...")).toBeInTheDocument();
    expect(screen.queryByText("Selecciona una localidad para poder buscar el conjunto.")).not.toBeInTheDocument();
  });

  it("envía la invitación con el correo y el conjunto elegido y limpia el formulario", async () => {
    // Arrange
    mockedInvitar.mockResolvedValue({});
    const user = userEvent.setup();
    renderWithProviders(<InvitarAdminConjuntoForm />);

    // Act
    await user.type(screen.getByLabelText("Correo del administrador a invitar *"), "admin@conjunto.com");
    await elegirConjunto(user);
    expect(screen.getByText("1 conjunto(s) seleccionado(s)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Enviar invitación" }));

    // Assert
    expect(await screen.findByText(/Invitación enviada a admin@conjunto.com/)).toBeInTheDocument();
    expect(mockedInvitar).toHaveBeenCalledWith("admin@conjunto.com", [ID_CONJUNTO]);
    expect(screen.getByLabelText("Correo del administrador a invitar *")).toHaveValue("");
    expect(screen.queryByText("1 conjunto(s) seleccionado(s)")).not.toBeInTheDocument();
  });

  it("muestra el error del servidor y no el mensaje de éxito cuando la invitación falla", async () => {
    // Arrange
    mockedInvitar.mockRejectedValue(new Error("Ese correo ya tiene una invitación pendiente."));
    const user = userEvent.setup();
    renderWithProviders(<InvitarAdminConjuntoForm />);

    // Act
    await user.type(screen.getByLabelText("Correo del administrador a invitar *"), "admin@conjunto.com");
    await elegirConjunto(user);
    await user.click(screen.getByRole("button", { name: "Enviar invitación" }));

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent("Ese correo ya tiene una invitación pendiente.");
    expect(screen.queryByText(/Invitación enviada a/)).not.toBeInTheDocument();
  });

  it("quita un conjunto seleccionado y vuelve a deshabilitar el botón", async () => {
    // Arrange
    const user = userEvent.setup();
    renderWithProviders(<InvitarAdminConjuntoForm />);
    await user.type(screen.getByLabelText("Correo del administrador a invitar *"), "admin@conjunto.com");
    await elegirConjunto(user);
    expect(screen.getByRole("button", { name: "Enviar invitación" })).toBeEnabled();

    // Act
    await user.click(screen.getByRole("button", { name: "Quitar TORRES DE ARANJUEZ" }));

    // Assert
    expect(screen.getByRole("button", { name: "Completa el formulario" })).toBeDisabled();
    expect(mockedInvitar).not.toHaveBeenCalled();
  });
});
