/**
 * Archivo: __tests__/pages/AdminConjuntoDashboard.test.tsx
 * Descripción: Tests del panel del Administrador de Conjunto (issue #23) —
 *              listado de conjuntos administrados, edición, invitación de
 *              recicladores y solicitud de desvinculación (RQF-016).
 */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { AdminConjuntoDashboard } from "@/pages/dashboards/AdminConjuntoDashboard";
import { RoleId } from "@/types/auth";
import { renderWithProviders, mockUser } from "../helpers";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock("axios", () => {
  const instance = {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
  return { default: { ...instance, create: () => instance } };
});

const adminConjuntoUser = { ...mockUser, role_id: RoleId.ADMIN_CONJUNTO };

const conjunto = {
  id_conjunto_residencial: 1,
  nombre_conjunto: "Conjunto Los Alpes",
  nit: "900123456",
  direccion: "Cra 10 # 20-30",
  nombre_localidad: "Suba",
  tiene_solicitud_pendiente: false,
  codigo_acceso: "AB3K9Q",
};

function mockRespuestasVacias() {
  mockGet.mockImplementation((url: string) => {
    if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [] });
    if (url.includes("/invitaciones")) return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
}

function renderPage() {
  return renderWithProviders(<AdminConjuntoDashboard />, {
    authContext: { user: adminConjuntoUser, isAuthenticated: true, accessToken: "token" },
  });
}

describe("AdminConjuntoDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRespuestasVacias();
    mockPost.mockResolvedValue({ data: {} });
    mockPatch.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: {} });
  });

  it("muestra el título del panel y el correo del administrador de conjunto", () => {
    renderPage();
    expect(screen.getByText("Panel de Administrador de Conjunto")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no administra ningún conjunto", async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText("Todavía no tienes ningún conjunto asignado. Contacta al equipo de VerdeApp.")
      ).toBeInTheDocument();
    });
  });

  it("lista los conjuntos administrados con su sección de recicladores", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
      if (url.includes("/invitaciones")) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Conjunto Los Alpes")).toBeInTheDocument();
    });
    expect(screen.getByText("Dejar de administrar este conjunto")).toBeInTheDocument();

    // ¿Qué? Antes había un solo título "Recicladores Autorizados" que en
    //       realidad mostraba el historial de invitaciones, no la
    //       autorización real — ahora son 2 secciones separadas y honestas.
    // ¿Impacto? Con el rediseño (issue #166) esta sección queda colapsada
    //           por defecto para no empujar el resto del panel fuera de la
    //           vista inicial — hay que expandirla primero.
    await user.click(screen.getByRole("button", { name: "Ver detalle" }));
    expect(screen.getByText("Autorizados")).toBeInTheDocument();
    expect(screen.getByText("Invitaciones enviadas")).toBeInTheDocument();
  });

  it("guarda los cambios al editar un conjunto", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
      if (url.includes("/invitaciones")) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Conjunto Los Alpes");
    await user.click(screen.getByRole("button", { name: "Editar" }));

    const inputNombre = screen.getByDisplayValue("Conjunto Los Alpes");
    await user.clear(inputNombre);
    await user.type(inputNombre, "Conjunto Los Alpes Renovado");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(
        expect.stringContaining("/conjunto-panel/mis-conjuntos/1"),
        expect.objectContaining({ nombre_conjunto: "Conjunto Los Alpes Renovado" }),
        expect.anything()
      );
    });
    expect(await screen.findByText("Conjunto actualizado correctamente.")).toBeInTheDocument();
  });

  it("invita a un reciclador desde la sección del conjunto", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
      if (url.includes("/invitaciones")) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Conjunto Los Alpes");
    await user.click(screen.getByRole("button", { name: "+ Invitar reciclador" }));
    await user.type(
      screen.getByPlaceholderText("correo.del.reciclador@ejemplo.com"),
      "reciclador@example.com"
    );
    await user.click(screen.getByRole("button", { name: "Invitar" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/reciclador-conjunto/invitar"),
        { correo_reciclador: "reciclador@example.com", id_conjunto_residencial: 1 },
        expect.anything()
      );
    });
  });

  it("envía una solicitud de desvinculación", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
      if (url.includes("/invitaciones")) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Conjunto Los Alpes");
    await user.click(screen.getByRole("button", { name: "Dejar de administrar este conjunto" }));
    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/conjunto-panel/mis-conjuntos/1/solicitar-desvinculacion"),
        { motivo: null },
        expect.anything()
      );
    });
  });
});
