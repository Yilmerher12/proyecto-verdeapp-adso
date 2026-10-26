/**
 * Archivo: __tests__/components/BandejaAdminSistema.test.tsx
 * Descripción: Tests de la bandeja del Admin Sistema con sus dos pestañas,
 *              "Soporte técnico" y "Desvinculaciones" (issue #512).
 */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { BandejaAdminSistema } from "@/components/BandejaAdminSistema";
import { renderWithProviders } from "../helpers";

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

describe("BandejaAdminSistema", () => {
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
    renderWithProviders(<BandejaAdminSistema />);

    expect(await screen.findByText("No puedo iniciar sesión.")).toBeVisible();
    expect(screen.getByText("Conjunto Los Alpes")).not.toBeVisible();

    await user.click(screen.getByRole("tab", { name: /Desvinculaciones/ }));

    expect(screen.getByText("Conjunto Los Alpes")).toBeVisible();
    expect(screen.getByText("No puedo iniciar sesión.")).not.toBeVisible();
  });

  it("avisa la suma de las dos pestañas aunque una no se esté viendo", async () => {
    const onCountChange = vi.fn();
    renderWithProviders(<BandejaAdminSistema onCountChange={onCountChange} />);

    await waitFor(() => expect(onCountChange).toHaveBeenLastCalledWith(2));
    // ¿Qué? No avisa un 0 de arranque: el resumen del panel parpadearía a "No hay solicitudes pendientes".
    expect(onCountChange).not.toHaveBeenCalledWith(0);
    expect(onCountChange).not.toHaveBeenCalledWith(1);
  });
});
