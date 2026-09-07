/**
 * Archivo: __tests__/pages/AdminPuntosAcopioPage.test.tsx
 * Descripción: Tests del panel de gestión de puntos de acopio del Admin
 *              Sistema (RQF-011 / HU-015, HU-016, HU-017).
 */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { AdminPuntosAcopioPage } from "@/pages/AdminPuntosAcopioPage";
import { RoleId } from "@/types/auth";
import { renderWithProviders, mockUser } from "../helpers";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock("axios", () => {
  const instance = {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
  return { default: { ...instance, create: () => instance } };
});

const adminUser = { ...mockUser, role_id: RoleId.ADMIN_SISTEMA };

const localidades = [{ id_localidad: 1, nombre_localidad: "Usaquén" }];

const puntoActivo = {
  id_punto_acopio: "1",
  nombre: "ECA Kennedy",
  direccion: "Carrera 84 # 11A-34",
  id_localidad: 1,
  nombre_localidad: "Usaquén",
  nombre_encargado: null,
  telefono_contacto: null,
  activo: true,
};

const puntoInactivo = { ...puntoActivo, id_punto_acopio: "2", nombre: "ECA Retirado", activo: false };

function mockRespuestas(puntos: unknown[]) {
  mockGet.mockImplementation((url: string) => {
    if (url.includes("/admin/puntos-acopio")) return Promise.resolve({ data: puntos });
    if (url.includes("/geography/localidades")) return Promise.resolve({ data: localidades });
    return Promise.resolve({ data: [] });
  });
}

function renderPage() {
  return renderWithProviders(<AdminPuntosAcopioPage />, {
    authContext: { user: adminUser, isAuthenticated: true, accessToken: "token" },
  });
}

describe("AdminPuntosAcopioPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRespuestas([]);
    mockPost.mockResolvedValue({ data: {} });
    mockPut.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: {} });
  });

  it("muestra el estado vacío cuando no hay puntos registrados", async () => {
    renderPage();
    expect(await screen.findByText("Todavía no hay puntos de acopio registrados.")).toBeInTheDocument();
  });

  it("lista los puntos de acopio, marcando los inactivos", async () => {
    mockRespuestas([puntoActivo, puntoInactivo]);
    renderPage();

    expect(await screen.findByText("ECA Kennedy")).toBeInTheDocument();
    expect(screen.getByText("ECA Retirado")).toBeInTheDocument();
    expect(screen.getByText("Inactivo")).toBeInTheDocument();

    // ¿Qué? El botón de dar de baja no debe ofrecerse para uno ya inactivo.
    expect(screen.queryByRole("button", { name: "Dar de baja ECA Retirado" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dar de baja ECA Kennedy" })).toBeInTheDocument();
  });

  it("crea un punto de acopio nuevo", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Todavía no hay puntos de acopio registrados.");
    await user.click(screen.getByRole("button", { name: "Nuevo punto de acopio" }));

    await user.type(screen.getByPlaceholderText("Ej: ECA Kennedy"), "ECA Nueva");
    await user.type(screen.getByPlaceholderText("Ej: Carrera 84 # 11A-34"), "Calle 1 # 1-1");
    await user.selectOptions(screen.getByLabelText(/Localidad/), "1");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/admin/puntos-acopio"),
        expect.objectContaining({ nombre: "ECA Nueva", direccion: "Calle 1 # 1-1", id_localidad: 1 }),
        expect.anything()
      );
    });
  });

  it("edita un punto de acopio existente", async () => {
    mockRespuestas([puntoActivo]);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("ECA Kennedy");
    await user.click(screen.getByRole("button", { name: "Editar ECA Kennedy" }));

    const inputNombre = screen.getByDisplayValue("ECA Kennedy");
    await user.clear(inputNombre);
    await user.type(inputNombre, "ECA Kennedy Renovada");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        expect.stringContaining("/admin/puntos-acopio/1"),
        expect.objectContaining({ nombre: "ECA Kennedy Renovada" }),
        expect.anything()
      );
    });
  });

  it("da de baja un punto de acopio tras confirmar", async () => {
    mockRespuestas([puntoActivo]);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("ECA Kennedy");
    await user.click(screen.getByRole("button", { name: "Dar de baja ECA Kennedy" }));

    expect(screen.getByText('¿Dar de baja "ECA Kennedy"?')).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sí, dar de baja" }));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(
        expect.stringContaining("/admin/puntos-acopio/1"),
        expect.anything()
      );
    });
  });

  it("reactiva un punto dado de baja, sin necesitar confirmación", async () => {
    mockRespuestas([puntoInactivo]);
    mockPost.mockResolvedValue({ data: { ...puntoInactivo, activo: true } });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("ECA Retirado");
    await user.click(screen.getByRole("button", { name: "Reactivar ECA Retirado" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/admin/puntos-acopio/2/reactivar"),
        {},
        expect.anything()
      );
    });
  });

  // ¿Qué? Distinto de "dar de baja": solo se ofrece para un punto ya
  //       inactivo, y borra el registro por completo.
  it("elimina definitivamente un punto ya dado de baja, tras confirmar", async () => {
    mockRespuestas([puntoInactivo]);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("ECA Retirado");
    expect(screen.queryByRole("button", { name: "Dar de baja ECA Retirado" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Eliminar ECA Retirado" }));

    expect(screen.getByText('¿Eliminar "ECA Retirado" definitivamente?')).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sí, eliminar" }));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(
        expect.stringContaining("/admin/puntos-acopio/2/definitivo"),
        expect.anything()
      );
    });
  });
});
