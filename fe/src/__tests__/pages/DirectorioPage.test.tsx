/**
 * Archivo: __tests__/pages/DirectorioPage.test.tsx
 * Descripción: Tests del Directorio del Residente (HU-006) — la pestaña
 *              Recicladores queda fija a la localidad propia (CA-006.6),
 *              mientras que Puntos de Acopio sigue con el filtro libre.
 */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { DirectorioPage } from "@/pages/DirectorioPage";
import { RoleId } from "@/types/auth";
import { renderWithProviders, mockUser } from "../helpers";

const mockGet = vi.fn();

vi.mock("axios", () => {
  const instance = {
    get: (...args: unknown[]) => mockGet(...args),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
  return { default: { ...instance, create: () => instance } };
});

const residenteUser = { ...mockUser, role_id: RoleId.RESIDENTE };

const localidades = [
  { id_localidad: 1, nombre_localidad: "Usaquén" },
  { id_localidad: 2, nombre_localidad: "Kennedy" },
];

const recicladorUsaquen = {
  id_reciclador: "r1",
  nombre: "Reciclador",
  apellidos: "De Usaquén",
  numero_telefonico: null,
  asociacion: null,
  nombre_localidad: "Usaquén",
};

function mockRespuestas({ nombreLocalidad }: { nombreLocalidad: string | null }) {
  mockGet.mockImplementation((url: string) => {
    if (url.includes("/geography/localidades")) return Promise.resolve({ data: localidades });
    if (url.includes("/users/me")) return Promise.resolve({ data: { nombre_localidad: nombreLocalidad } });
    if (url.includes("/directorio/recicladores")) return Promise.resolve({ data: [recicladorUsaquen] });
    if (url.includes("/directorio/puntos-acopio")) return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
}

function renderPage() {
  return renderWithProviders(<DirectorioPage />, {
    authContext: { user: residenteUser, isAuthenticated: true, accessToken: "token" },
  });
}

describe("DirectorioPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("en Recicladores muestra la localidad propia fija, sin selector editable", async () => {
    mockRespuestas({ nombreLocalidad: "Usaquén" });
    renderPage();

    await screen.findByText("Reciclador De Usaquén");
    expect(screen.getByText("Tu localidad: Usaquén")).toBeInTheDocument();
    // ¿Qué? No debe existir ningún <select> mientras esta pestaña esté activa.
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/directorio/recicladores"),
        expect.objectContaining({ params: { localidad_id: 1 } })
      );
    });
  });

  it("si no se pudo detectar la localidad, lo avisa en vez de mostrar una vacía", async () => {
    mockRespuestas({ nombreLocalidad: null });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No se pudo detectar tu localidad")).toBeInTheDocument();
    });
  });

  it("en Puntos de Acopio el filtro de localidad sigue siendo libre", async () => {
    mockRespuestas({ nombreLocalidad: "Usaquén" });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Reciclador De Usaquén");
    await user.click(screen.getByRole("button", { name: "Puntos de Acopio" }));

    // Preseleccionado en la misma localidad por conveniencia, pero editable.
    const select = await screen.findByRole("combobox");
    expect(select).toHaveValue("1");

    await user.selectOptions(select, "2");

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/directorio/puntos-acopio"),
        expect.objectContaining({ params: { localidad_id: 2 } })
      );
    });

    // Volver a Recicladores no se contamina con el cambio hecho en Puntos.
    await user.click(screen.getByRole("button", { name: "Recicladores" }));
    expect(screen.getByText("Tu localidad: Usaquén")).toBeInTheDocument();
  });
});
