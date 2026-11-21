/**
 * Archivo: __tests__/components/SoporteTecnico.test.tsx
 * Descripción: Tests de la pestaña "Soporte técnico" del Admin Sistema (issue #512):
 *              prioridad, estado, pestañas con contador, menú de acciones, respuesta al autor y paginación.
 */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { SoporteTecnico } from "@/components/SoporteTecnico";
import { onSolicitudesActualizadas } from "@/lib/solicitudesEvents";
import { renderWithProviders } from "../helpers";

const mockGet = vi.fn();
const mockPatch = vi.fn();

vi.mock("axios", () => {
  const instance = {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    defaults: {},
  };
  return { default: { ...instance, create: () => instance } };
});

const base = {
  origen: "Residente",
  nombre_autor: "Laura Méndez (Torre 1, Apto 101)",
  nombre_conjunto: "Quintas de Aranjuez",
  url_imagen: null,
  respuesta: null,
  respondida_at: null,
  created_at: new Date().toISOString(),
};
const login = { ...base, id: "n-1", texto: "No puedo iniciar sesión.", estado: "NUEVA", prioridad: "ALTA" };
const sugerencia = { ...base, id: "n-2", texto: "Sería bueno un modo claro.", estado: "EN_REVISION", prioridad: "BAJA" };
const vieja = { ...base, id: "n-3", texto: "Ya la atendimos.", estado: "RESUELTA", prioridad: "MEDIA", respuesta: "Listo, quedó." };

// ¿Qué? Imita al backend: sin `estado` solo trae lo pendiente; filtra por prioridad y recorta con limit/offset.
function mockLista(data: { estado: string; prioridad: string; [campo: string]: unknown }[]) {
  mockGet.mockImplementation(
    (_url: string, config?: { params?: { limit: number; offset: number; estado?: string; prioridad?: string } }) => {
      const { limit = 10, offset = 0, estado, prioridad } = config?.params ?? {};
      const filtradas = data.filter(
        (s) => (estado ? s.estado === estado : s.estado !== "RESUELTA") && (!prioridad || s.prioridad === prioridad),
      );
      return Promise.resolve({ data: { items: filtradas.slice(offset, offset + limit), total: filtradas.length } });
    },
  );
}

const abrirMenuDe = async (user: ReturnType<typeof userEvent.setup>, nombre = /Más acciones de la solicitud de Residente/) =>
  user.click(await screen.findByRole("button", { name: nombre }));

describe("SoporteTecnico", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPatch.mockResolvedValue({ data: {} });
  });

  it("muestra el estado vacío cuando no hay consultas pendientes", async () => {
    mockLista([]);
    renderWithProviders(<SoporteTecnico />);
    expect(await screen.findByText("Todavía no hay consultas de soporte pendientes.")).toBeInTheDocument();
  });

  it("lista lo pendiente con su prioridad y su estado, y deja lo resuelto fuera", async () => {
    mockLista([login, sugerencia, vieja]);
    renderWithProviders(<SoporteTecnico />);

    expect(await screen.findByText("No puedo iniciar sesión.")).toBeInTheDocument();
    expect(screen.getByText("Sería bueno un modo claro.")).toBeInTheDocument();
    expect(screen.queryByText("Ya la atendimos.")).not.toBeInTheDocument();
    expect(screen.getAllByText("Residente — Laura Méndez (Torre 1, Apto 101)")).toHaveLength(2);
    expect(screen.getByText("Nueva")).toBeInTheDocument();
    expect(screen.getByText("En revisión", { selector: "span.rounded-full" })).toBeInTheDocument();
  });

  it("cada pestaña de estado muestra cuántas consultas tiene", async () => {
    mockLista([login, sugerencia, vieja]);
    renderWithProviders(<SoporteTecnico />);

    expect(await screen.findByRole("tab", { name: /Pendientes\s*2/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Nuevas\s*1/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /En revisión\s*1/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Resueltas\s*1/ })).toBeInTheDocument();
  });

  it("la pestaña Resueltas pide el historial al backend", async () => {
    mockLista([login, vieja]);
    const user = userEvent.setup();
    renderWithProviders(<SoporteTecnico />);

    await screen.findByText("No puedo iniciar sesión.");
    await user.click(screen.getByRole("tab", { name: /Resueltas/ }));

    expect(await screen.findByText("Ya la atendimos.")).toBeInTheDocument();
    expect(screen.queryByText("No puedo iniciar sesión.")).not.toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/novedades-enviadas/soporte"), {
      params: { limit: 10, offset: 0, estado: "RESUELTA", prioridad: undefined },
    });
  });

  it("filtra por prioridad desde el menú, pidiéndoselo al backend", async () => {
    mockLista([login, sugerencia]);
    const user = userEvent.setup();
    renderWithProviders(<SoporteTecnico />);

    await screen.findByText("No puedo iniciar sesión.");
    await user.click(screen.getByRole("button", { name: "Prioridad" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Baja" }));

    await waitFor(() => expect(screen.queryByText("No puedo iniciar sesión.")).not.toBeInTheDocument());
    expect(screen.getByText("Sería bueno un modo claro.")).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/novedades-enviadas/soporte"), {
      params: { limit: 10, offset: 0, estado: undefined, prioridad: "BAJA" },
    });
  });

  it("avisa al resto de la app que las solicitudes cambiaron cuando se atiende una", async () => {
    mockLista([login]);
    const alCambiar = vi.fn();
    const darseDeBaja = onSolicitudesActualizadas(alCambiar);
    const user = userEvent.setup();
    renderWithProviders(<SoporteTecnico />);

    await abrirMenuDe(user);
    await user.click(screen.getByRole("menuitem", { name: "Marcar en revisión" }));

    await waitFor(() => expect(alCambiar).toHaveBeenCalled());
    darseDeBaja();
  });

  it("marca una consulta nueva como en revisión", async () => {
    mockLista([login]);
    const user = userEvent.setup();
    renderWithProviders(<SoporteTecnico />);

    await abrirMenuDe(user);
    await user.click(screen.getByRole("menuitem", { name: "Marcar en revisión" }));

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith(expect.stringContaining("/novedades-enviadas/soporte/n-1"), { estado: "EN_REVISION" }),
    );
  });

  it("marca como resuelta, y una resuelta se puede reabrir", async () => {
    mockLista([sugerencia, vieja]);
    const user = userEvent.setup();
    renderWithProviders(<SoporteTecnico />);

    await abrirMenuDe(user);
    expect(screen.queryByRole("menuitem", { name: "Marcar en revisión" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Marcar como resuelta" }));
    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith(expect.stringContaining("/soporte/n-2"), { estado: "RESUELTA" }),
    );

    await user.click(screen.getByRole("tab", { name: /Resueltas/ }));
    await screen.findByText("Ya la atendimos.");
    await abrirMenuDe(user);
    await user.click(screen.getByRole("menuitem", { name: "Reabrir" }));
    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith(expect.stringContaining("/soporte/n-3"), { estado: "EN_REVISION" }),
    );
  });

  it("el Admin Sistema corrige la prioridad desde el menú de la consulta", async () => {
    mockLista([login]);
    const user = userEvent.setup();
    renderWithProviders(<SoporteTecnico />);

    await abrirMenuDe(user);
    expect(screen.getByRole("menuitemradio", { name: "Prioridad Alta" })).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("menuitemradio", { name: "Prioridad Baja" }));

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith(expect.stringContaining("/soporte/n-1"), { prioridad: "BAJA" }),
    );
  });

  it("responder exige texto y envía la respuesta al autor", async () => {
    mockLista([login]);
    const user = userEvent.setup();
    renderWithProviders(<SoporteTecnico />);

    await screen.findByText("No puedo iniciar sesión.");
    await user.click(screen.getByRole("button", { name: "Responder" }));

    const enviar = screen.getByRole("button", { name: "Enviar respuesta" });
    expect(enviar).toBeDisabled();
    await user.type(screen.getByLabelText("Respuesta para quien envió la consulta"), "Ya restablecimos tu acceso.");
    expect(enviar).toBeEnabled();
    await user.click(enviar);

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith(expect.stringContaining("/soporte/n-1"), { respuesta: "Ya restablecimos tu acceso." }),
    );
  });

  it("al abrir una consulta muestra la respuesta ya enviada y el enlace de la foto", async () => {
    mockLista([{ ...vieja, url_imagen: "/uploads/adjuntos/c.jpg" }]);
    const user = userEvent.setup();
    renderWithProviders(<SoporteTecnico />);

    await user.click(await screen.findByRole("tab", { name: /Resueltas/ }));
    expect(screen.queryByText("Listo, quedó.")).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /Ya la atendimos/ }));

    expect(await screen.findByText("Listo, quedó.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cambiar respuesta" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver foto" })).toHaveAttribute("href", expect.stringContaining("/uploads/adjuntos/c.jpg"));
  });

  it("pagina de a 10 filas y pide la siguiente página al backend", async () => {
    const muchas = Array.from({ length: 12 }, (_, i) => ({ ...login, id: `m-${i}`, texto: `Consulta ${i}` }));
    mockLista(muchas);
    const user = userEvent.setup();
    renderWithProviders(<SoporteTecnico />);

    expect(await screen.findByText("Consulta 0")).toBeInTheDocument();
    expect(screen.queryByText("Consulta 10")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /siguiente/i }));

    expect(await screen.findByText("Consulta 10")).toBeInTheDocument();
    expect(screen.queryByText("Consulta 0")).not.toBeInTheDocument();
  });
});
