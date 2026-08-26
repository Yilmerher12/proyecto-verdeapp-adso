/**
 * Archivo: __tests__/pages/AdminDashboard.test.tsx
 * Descripción: Tests del panel del Administrador del Sistema — pestañas de
 *              usuarios (Residentes / Recicladores / Admins de Conjunto)
 *              con búsqueda, filtro de localidad y paginación, más la
 *              sección de invitar administradores de conjunto.
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

const administrador = {
  Correo: "admin.conjunto@example.com",
  Nombre: "Ana",
  Apellido: "Ríos",
  Teléfono: "3000000000",
  Conjuntos: "Conjunto Los Alpes",
};

// ¿Qué? Las 3 pestañas de usuarios devuelven { items, total } — todo lo
//       demás que consulta este dashboard (localidades, solicitudes de
//       desvinculación, conjuntos sin administrador) sigue devolviendo un
//       arreglo plano, así que el mock por defecto tiene que distinguir
//       cuál es cuál en vez de una sola respuesta genérica para todo.
function mockRespuestasVacias() {
  mockGet.mockImplementation((url: string) => {
    if (
      url.includes("/admin/vista-residentes") ||
      url.includes("/admin/sp-recicladores") ||
      url.includes("/admin/administradores-conjunto")
    ) {
      return Promise.resolve({ data: { items: [], total: 0 } });
    }
    return Promise.resolve({ data: [] });
  });
}

function renderPage() {
  return renderWithProviders(<AdminDashboard />, {
    authContext: { user: adminUser, isAuthenticated: true, accessToken: "token" },
  });
}

describe("AdminDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRespuestasVacias();
    mockPost.mockResolvedValue({ data: {} });
  });

  it("muestra el título del panel y el correo del administrador", () => {
    renderPage();
    expect(screen.getByText("Panel de Administración")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("consulta la pestaña de Residentes al montar, con el token de sesión", async () => {
    renderPage();
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/admin/vista-residentes"),
        expect.objectContaining({ headers: { Authorization: "Bearer token" } })
      );
    });
  });

  it("lista los residentes devueltos por el backend", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/admin/vista-residentes")) {
        return Promise.resolve({ data: { items: [residente], total: 1 } });
      }
      return Promise.resolve({ data: [] });
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    });
  });

  it("cambia a la pestaña de Recicladores y consulta ese endpoint", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/admin/sp-recicladores")) {
        return Promise.resolve({ data: { items: [reciclador], total: 1 } });
      }
      if (url.includes("/admin/vista-residentes") || url.includes("/admin/administradores-conjunto")) {
        return Promise.resolve({ data: { items: [], total: 0 } });
      }
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Recicladores" }));

    await waitFor(() => {
      expect(screen.getByText("Carlos Gómez")).toBeInTheDocument();
    });
  });

  it("cambia a la pestaña de Admins. de Conjunto y consulta ese endpoint", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/admin/administradores-conjunto")) {
        return Promise.resolve({ data: { items: [administrador], total: 1 } });
      }
      if (url.includes("/admin/vista-residentes") || url.includes("/admin/sp-recicladores")) {
        return Promise.resolve({ data: { items: [], total: 0 } });
      }
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Admins. de Conjunto" }));

    await waitFor(() => {
      expect(screen.getByText("Ana Ríos")).toBeInTheDocument();
    });
  });

  it("busca en tiempo real (con debounce) y se lo manda al backend como parámetro", async () => {
    const user = userEvent.setup();
    renderPage();

    const input = await screen.findByPlaceholderText("Buscar por nombre o correo...");
    await user.type(input, "juan");
    // ¿Qué? No hace falta Enter — el debounce de 350ms dispara la
    //       búsqueda sola; waitFor ya reintenta con tiempo de sobra.

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/admin/vista-residentes"),
        expect.objectContaining({ params: expect.objectContaining({ search: "juan" }) })
      );
    });
  });

  it("muestra los mensajes de tabla vacía cuando no hay datos", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No hay residentes registrados todavía.")).toBeInTheDocument();
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
