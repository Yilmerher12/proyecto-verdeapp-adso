/**
 * Archivo: __tests__/pages/ProfilePage.test.tsx
 * Descripción: Tests del panel "Mi perfil".
 * ¿Para qué? Issue #13 (hallazgo U8 de la auditoría) — antes "Nombre y
 *           apellidos son obligatorios" era un solo Alert genérico que no
 *           decía cuál de los dos campos estaba vacío. Ahora cada campo se
 *           valida al salir de él (onBlur), con el error anclado a ese
 *           campo — esta prueba cubre justo ese comportamiento nuevo.
 */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { ProfilePage } from "@/pages/ProfilePage";
import { renderWithProviders, mockUser } from "../helpers";

const mockGet = vi.fn();
const mockPut = vi.fn();

vi.mock("axios", () => {
  const instance = {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    defaults: {},
  };
  return { default: { ...instance, create: () => instance } };
});

const perfil = {
  id: 1,
  email: "residente@example.com",
  role_id: 2,
  first_name: "Ana",
  last_name: "Martínez",
  numero_telefonico: null,
  nombre_conjunto: "Conjunto de Prueba",
  torre: "1",
  apto: "402",
  asociacion: null,
  nombre_localidad: "Usaquén",
  conjuntos_administrados: null,
  mostrar_contacto_directorio: false,
  foto_perfil_url: null,
};

function renderPage() {
  return renderWithProviders(<ProfilePage />, {
    authContext: { user: mockUser, isAuthenticated: true },
  });
}

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: perfil });
    mockPut.mockResolvedValue({ data: {} });
  });

  it("marca el campo Nombre con su propio error al salir vacío, sin tocar Apellidos", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Ana Martínez");
    await user.click(screen.getByRole("button", { name: "Editar" }));

    const inputNombre = await screen.findByLabelText("Nombre");
    await user.clear(inputNombre);
    await user.tab();

    expect(await screen.findByText("El nombre es obligatorio.")).toBeInTheDocument();
    expect(screen.queryByText("Los apellidos son obligatorios.")).not.toBeInTheDocument();
  });

  it("guarda el perfil cuando los campos son válidos", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Ana Martínez");
    await user.click(screen.getByRole("button", { name: "Editar" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        expect.stringContaining("/users/me"),
        expect.objectContaining({ nombre: "Ana", apellidos: "Martínez" })
      );
    });
  });
});
