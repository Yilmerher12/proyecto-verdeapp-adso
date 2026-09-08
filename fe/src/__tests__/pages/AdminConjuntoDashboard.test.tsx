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
    // ¿Qué? aria-expanded comunica el estado de un botón que muestra/oculta
    //       una sección — antes solo cambiaba el texto visible, sin nada
    //       que un lector de pantalla pudiera anunciar (re-auditoría de
    //       accesibilidad post-#16).
    const botonDetalle = screen.getByRole("button", { name: "Ver detalle" });
    expect(botonDetalle).toHaveAttribute("aria-expanded", "false");
    await user.click(botonDetalle);
    expect(screen.getByText("Autorizados")).toBeInTheDocument();
    expect(screen.getByText("Invitaciones enviadas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ocultar detalle" })).toHaveAttribute("aria-expanded", "true");
  });

  // ¿Qué? Issue #180: nombre y dirección se quitaron del formulario de
  //       edición (vienen ya verificados desde el dataset oficial de
  //       Bogotá) — solo el NIT sigue editable.
  it("guarda el NIT al editar un conjunto", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
      if (url.includes("/invitaciones")) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Conjunto Los Alpes");
    await user.click(screen.getByRole("button", { name: "Editar" }));

    const inputNit = screen.getByDisplayValue("900123456");
    await user.clear(inputNit);
    await user.type(inputNit, "900111222-1");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(
        expect.stringContaining("/conjunto-panel/mis-conjuntos/1"),
        { nit: "900111222-1" },
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
    const botonInvitar = screen.getByRole("button", { name: "+ Invitar reciclador" });
    expect(botonInvitar).toHaveAttribute("aria-expanded", "false");
    await user.click(botonInvitar);
    expect(botonInvitar).toHaveAttribute("aria-expanded", "true");
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

  // ¿Qué? El Admin de Conjunto revoca directo el acceso de un reciclador
  //       ya autorizado — sin que el reciclador tenga que pedir nada.
  it("revoca el acceso de un reciclador autorizado, tras confirmar", async () => {
    const recicladorAutorizado = {
      id_reciclador: "r1",
      nombre: "Reciclador",
      apellidos: "De Prueba",
      correo_electronico: "reciclador@example.com",
      numero_telefonico: null,
      asociacion: null,
    };
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
      if (url.includes("/autorizados")) return Promise.resolve({ data: [recicladorAutorizado] });
      if (url.includes("/invitaciones")) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    mockDelete.mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Conjunto Los Alpes");
    await user.click(screen.getByRole("button", { name: "Ver detalle" }));
    await screen.findByText("Reciclador De Prueba");

    await user.click(screen.getByRole("button", { name: "Revocar acceso de Reciclador De Prueba" }));
    expect(screen.getByText("¿Revocar el acceso de Reciclador De Prueba?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sí, revocar" }));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(
        expect.stringContaining("/reciclador-conjunto/mi-conjunto/1/autorizados/r1"),
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
