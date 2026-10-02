/**
 * Archivo: __tests__/components/SolicitudesPendientes.test.tsx
 * Descripción: Tests de la bandeja unificada "Solicitudes pendientes" del
 *              Admin Sistema — junta desvinculación (RQF-016) con las
 *              novedads sobre un residente, filtrable por tipo.
 */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { SolicitudesPendientes } from "@/components/SolicitudesPendientes";
import { renderWithProviders } from "../helpers";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("axios", () => {
  const instance = {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    defaults: {},
  };
  return { default: { ...instance, create: () => instance } };
});

const desvinculacion = {
  id: "s-1",
  tipo: "DESVINCULACION",
  titulo: "Dejar de administrar Quintas de Aranjuez",
  origen: "Admin de Conjunto · Admin de Prueba",
  nombre_conjunto: "Quintas de Aranjuez",
  detalle: "Me mudé de ciudad.",
  estado: "PENDIENTE",
  created_at: new Date().toISOString(),
};
const novedad = {
  id: "s-2",
  tipo: "NOVEDAD",
  titulo: "Novedad — Laura Méndez",
  origen: "Residente",
  nombre_conjunto: "Quintas de Aranjuez",
  detalle: "Contenedor desbordado.",
  url_evidencia: "/uploads/adjuntos/c.jpg",
  estado: "PENDIENTE",
  created_at: new Date().toISOString(),
};

function mockLista(data: unknown[]) {
  mockGet.mockImplementation((url: string) => {
    if (url.includes("/admin-conjunto/solicitudes")) return Promise.resolve({ data });
    return Promise.resolve({ data: [] });
  });
}

describe("SolicitudesPendientes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValue({ data: {} });
  });

  it("muestra el estado vacío cuando no hay solicitudes", async () => {
    mockLista([]);
    renderWithProviders(<SolicitudesPendientes />);
    expect(await screen.findByText("No hay solicitudes pendientes.")).toBeInTheDocument();
  });

  it("lista las solicitudes de los 2 orígenes juntas, con sus chips de filtro", async () => {
    mockLista([desvinculacion, novedad]);
    renderWithProviders(<SolicitudesPendientes />);

    expect(await screen.findByText("Dejar de administrar Quintas de Aranjuez")).toBeInTheDocument();
    expect(screen.getByText("Novedad — Laura Méndez")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todas · 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desvinculación · 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Novedad · 1" })).toBeInTheDocument();
  });

  it("filtra por tipo al hacer clic en un chip", async () => {
    mockLista([desvinculacion, novedad]);
    const user = userEvent.setup();
    renderWithProviders(<SolicitudesPendientes />);

    await screen.findByText("Dejar de administrar Quintas de Aranjuez");
    await user.click(screen.getByRole("button", { name: "Novedad · 1" }));

    expect(screen.queryByText("Dejar de administrar Quintas de Aranjuez")).not.toBeInTheDocument();
    expect(screen.getByText("Novedad — Laura Méndez")).toBeInTheDocument();
  });

  it("avisa el conteo total (sin importar el filtro) por onCountChange", async () => {
    mockLista([desvinculacion, novedad]);
    const onCountChange = vi.fn();
    renderWithProviders(<SolicitudesPendientes onCountChange={onCountChange} />);

    await waitFor(() => expect(onCountChange).toHaveBeenCalledWith(2));
  });

  it("aprueba una desvinculación con el endpoint de su propio tipo", async () => {
    mockLista([desvinculacion]);
    const user = userEvent.setup();
    renderWithProviders(<SolicitudesPendientes />);

    await screen.findByText("Dejar de administrar Quintas de Aranjuez");
    await user.click(screen.getByRole("button", { name: "Aprobar" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/admin-conjunto/solicitudes/DESVINCULACION/s-1/resolver"),
        { aprobar: true, motivo_rechazo: null }
      );
    });
  });

  it("una novedad solo se marca como vista (sin aprobar ni rechazar) y muestra su imagen", async () => {
    mockLista([novedad]);
    const user = userEvent.setup();
    renderWithProviders(<SolicitudesPendientes />);

    await screen.findByText("Novedad — Laura Méndez");
    expect(screen.queryByRole("button", { name: "Aprobar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rechazar" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver foto" })).toHaveAttribute("href", expect.stringContaining("/uploads/adjuntos/c.jpg"));

    await user.click(screen.getByRole("button", { name: "Marcar como vista" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/admin-conjunto/solicitudes/NOVEDAD/s-2/resolver"),
        { aprobar: true, motivo_rechazo: null }
      );
    });
  });

  it("rechazar una desvinculación exige motivo antes de poder confirmarse", async () => {
    mockLista([desvinculacion]);
    const user = userEvent.setup();
    renderWithProviders(<SolicitudesPendientes />);

    await screen.findByText("Dejar de administrar Quintas de Aranjuez");
    await user.click(screen.getByRole("button", { name: "Rechazar" }));

    const confirmar = screen.getByRole("button", { name: "Rechazar solicitud" });
    expect(confirmar).toBeDisabled();

    await user.type(screen.getByLabelText("Motivo del rechazo *"), "No procede.");
    expect(confirmar).toBeEnabled();
    await user.click(confirmar);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/admin-conjunto/solicitudes/DESVINCULACION/s-1/resolver"),
        { aprobar: false, motivo_rechazo: "No procede." }
      );
    });
  });
});
