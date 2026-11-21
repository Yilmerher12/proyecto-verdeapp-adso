/**
 * Archivo: __tests__/pages/AdminSolicitudesPage.test.tsx
 * Descripción: Tests de la página de Solicitudes del Admin del Sistema (issue #596): sus dos
 *              pestañas, "Soporte técnico" y "Desvinculaciones", con su contador.
 *              Reemplaza a los de la bandeja con pestañas que vivía dentro de un modal.
 */
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { AdminSolicitudesPage } from "@/pages/AdminSolicitudesPage";
import { mockUser, renderWithProviders } from "../helpers";

const mockGet = vi.fn();

vi.mock("axios", () => {
  const instance = {
    get: (...args: unknown[]) => mockGet(...args),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    defaults: {},
  };
  return { default: { ...instance, create: () => instance } };
});

const consulta = {
  id: "n-1",
  origen: "Residente",
  nombre_autor: "Laura Méndez",
  nombre_conjunto: "Quintas de Aranjuez",
  texto: "No puedo iniciar sesión.",
  url_imagen: null,
  estado: "NUEVA",
  prioridad: "ALTA",
  respuesta: null,
  respondida_at: null,
  created_at: new Date().toISOString(),
};
const desvinculacion = {
  id: "s-1",
  id_conjunto_residencial: "c-1",
  nombre_conjunto: "Conjunto Los Alpes",
  id_administrador: "a-1",
  nombre_administrador: "Pedro",
  apellidos_administrador: "Gómez",
  motivo: null,
  estado: "PENDIENTE",
  created_at: new Date().toISOString(),
};

describe("AdminSolicitudesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url: string) =>
      url.includes("/novedades-enviadas/soporte")
        ? Promise.resolve({ data: { items: [consulta], total: 1 } })
        : Promise.resolve({ data: [desvinculacion] }),
    );
  });

  it("abre en Soporte técnico y deja las Desvinculaciones en su propia pestaña", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminSolicitudesPage />, { authContext: { user: mockUser } });

    expect(await screen.findByText("No puedo iniciar sesión.")).toBeVisible();
    expect(screen.queryByText("Conjunto Los Alpes")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Desvinculaciones/ }));

    expect(await screen.findByText("Conjunto Los Alpes")).toBeVisible();
    expect(screen.queryByText("No puedo iniciar sesión.")).not.toBeInTheDocument();
  });

  it("cada pestaña principal muestra cuántas solicitudes pendientes tiene", async () => {
    renderWithProviders(<AdminSolicitudesPage />, { authContext: { user: mockUser } });

    expect(await screen.findByRole("tab", { name: /Soporte técnico\s*1/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Desvinculaciones\s*1/ })).toBeInTheDocument();
  });
});
