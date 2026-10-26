/**
 * Archivo: __tests__/components/SolicitudesDesvinculacion.test.tsx
 * Descripción: Tests de la pestaña "Desvinculaciones" del Admin Sistema (RQF-016,
 *              issue #512): lista, aprobar y rechazar con motivo.
 */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { SolicitudesDesvinculacion } from "@/components/SolicitudesDesvinculacion";
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

const solicitud = {
  id: "s-1",
  id_conjunto_residencial: "c-1",
  nombre_conjunto: "Quintas de Aranjuez",
  id_administrador: "a-1",
  nombre_administrador: "Admin",
  apellidos_administrador: "de Prueba",
  motivo: "Me mudé de ciudad.",
  estado: "PENDIENTE",
  created_at: new Date().toISOString(),
};

describe("SolicitudesDesvinculacion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValue({ data: {} });
  });

  it("muestra el estado vacío cuando no hay solicitudes", async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderWithProviders(<SolicitudesDesvinculacion />);
    expect(await screen.findByText("No hay solicitudes pendientes.")).toBeInTheDocument();
  });

  it("lista la solicitud con quién la pidió y su motivo, y avisa el conteo", async () => {
    mockGet.mockResolvedValue({ data: [solicitud] });
    const onCountChange = vi.fn();
    renderWithProviders(<SolicitudesDesvinculacion onCountChange={onCountChange} />);

    expect(await screen.findByText("Quintas de Aranjuez")).toBeInTheDocument();
    expect(screen.getByText("Solicitado por Admin de Prueba")).toBeInTheDocument();
    expect(screen.getByText("Me mudé de ciudad.")).toBeInTheDocument();
    await waitFor(() => expect(onCountChange).toHaveBeenCalledWith(1));
  });

  it("aprueba con el endpoint de su propia solicitud", async () => {
    mockGet.mockResolvedValue({ data: [solicitud] });
    const user = userEvent.setup();
    renderWithProviders(<SolicitudesDesvinculacion />);

    await screen.findByText("Quintas de Aranjuez");
    await user.click(screen.getByRole("button", { name: "Aprobar" }));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/admin-conjunto/solicitudes-desvinculacion/s-1/resolver"),
        { aprobar: true, motivo_rechazo: null },
      ),
    );
  });

  it("rechazar exige motivo antes de poder confirmarse", async () => {
    mockGet.mockResolvedValue({ data: [solicitud] });
    const user = userEvent.setup();
    renderWithProviders(<SolicitudesDesvinculacion />);

    await screen.findByText("Quintas de Aranjuez");
    await user.click(screen.getByRole("button", { name: "Rechazar" }));

    const confirmar = screen.getByRole("button", { name: "Rechazar solicitud" });
    expect(confirmar).toBeDisabled();

    await user.type(screen.getByLabelText("Motivo del rechazo *"), "No procede.");
    expect(confirmar).toBeEnabled();
    await user.click(confirmar);

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/admin-conjunto/solicitudes-desvinculacion/s-1/resolver"),
        { aprobar: false, motivo_rechazo: "No procede." },
      ),
    );
  });
});
