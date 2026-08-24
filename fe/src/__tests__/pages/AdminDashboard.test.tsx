/**
 * Archivo: __tests__/pages/AdminDashboard.test.tsx
 * Descripción: Tests del panel del Administrador del Sistema (issue #23) —
 *              tablas de residentes/recicladores y la sección de invitar
 *              administradores de conjunto.
 */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { AdminDashboard } from "@/pages/dashboards/AdminDashboard";
import { RoleId } from "@/types/auth";
import { renderWithProviders, mockUser } from "../helpers";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("axios", () => {
  const instance = {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: vi.fn(),
    patch: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
  return { default: { ...instance, create: () => instance } };
});

const adminUser = { ...mockUser, role_id: RoleId.ADMIN_SISTEMA };

const residente = {
  Correo: "residente@example.com",
  Nombre: "Juan",
  Apellido: "Pérez",
  Conjunto: "Conjunto Los Alpes",
  Bloque: "A",
  Apartamento: "101",
};

const reciclador = {
  Correo: "reciclador@example.com",
  Nombre_Completo: "Carlos Gómez",
  Asociacion: "Asociación Verde",
};

function renderPage() {
  return renderWithProviders(<AdminDashboard />, {
    authContext: { user: adminUser, isAuthenticated: true, accessToken: "token" },
  });
}

describe("AdminDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: [] });
    mockPost.mockResolvedValue({ data: {} });
  });

  it("muestra el título del panel y el correo del administrador", () => {
    renderPage();
    expect(screen.getByText("Panel de Administración")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("consulta la vista de residentes y el procedimiento de recicladores al montar", async () => {
    renderPage();
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/admin/vista-residentes"));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/admin/sp-recicladores"));
    });
  });

  it("lista los residentes y recicladores devueltos por el backend", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("vista-residentes")) return Promise.resolve({ data: [residente] });
      if (url.includes("sp-recicladores")) return Promise.resolve({ data: [reciclador] });
      return Promise.resolve({ data: [] });
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
      expect(screen.getByText("Carlos Gómez")).toBeInTheDocument();
    });
  });

  it("muestra los mensajes de tabla vacía cuando no hay datos", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No hay residentes registrados todavía.")).toBeInTheDocument();
      expect(screen.getByText("No hay recicladores registrados todavía.")).toBeInTheDocument();
    });
  });

  it("despliega el formulario de invitar administrador de conjunto al hacer clic", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByText("Invitar Administrador de Conjunto")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "+ Invitar administrador" }));

    expect(screen.getByText("Invitar Administrador de Conjunto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ocultar" })).toBeInTheDocument();
  });
});
