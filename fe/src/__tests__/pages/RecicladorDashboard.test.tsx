/**
 * Archivo: __tests__/pages/RecicladorDashboard.test.tsx
 * Descripción: Tests del panel del Reciclador (issue #23) — invitaciones
 *              pendientes, conjuntos autorizados y envío de notificaciones.
 */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { RecicladorDashboard } from "@/pages/dashboards/RecicladorDashboard";
import { renderWithProviders, mockUser } from "../helpers";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock("axios", () => {
  const instance = {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    patch: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
  return { default: { ...instance, create: () => instance } };
});

const conjuntoAutorizado = {
  id_conjunto_residencial: 1,
  nombre_conjunto: "Conjunto Los Alpes",
  direccion: "Cra 10 # 20-30",
  nombre_localidad: "Suba",
};

function mockRespuestasVacias() {
  mockGet.mockImplementation((url: string) => {
    if (url.includes("mis-invitaciones")) return Promise.resolve({ data: [] });
    if (url.includes("mis-conjuntos-autorizados")) return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
}

function renderPage() {
  return renderWithProviders(<RecicladorDashboard />, {
    authContext: { user: mockUser, isAuthenticated: true, accessToken: "token" },
  });
}

describe("RecicladorDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRespuestasVacias();
    mockPost.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: {} });
  });

  it("muestra el título del panel y el nombre del reciclador", () => {
    renderPage();
    expect(screen.getByText("Panel del Reciclador")).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("carga invitaciones, conjuntos y notificaciones al montar", async () => {
    renderPage();
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/reciclador-conjunto/mis-invitaciones"),
        expect.anything()
      );
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/reciclador-conjunto/mis-conjuntos-autorizados"),
        expect.anything()
      );
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/notificaciones/mis-notificaciones"),
        expect.anything()
      );
    });
  });

  it("no muestra botones de notificación cuando no hay conjuntos autorizados", async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText("Todavía no estás autorizado en ningún conjunto. Cuando un administrador te invite y aceptes, aparecerá aquí.")
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Llegué al conjunto" })).not.toBeInTheDocument();
  });

  it("permite responder una invitación pendiente", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("mis-invitaciones")) {
        return Promise.resolve({
          data: [
            {
              id: "inv-1",
              nombre_conjunto: "Conjunto Los Alpes",
              direccion_conjunto: "Cra 10 # 20-30",
              invitado_por_nombre: "Ana Admin",
              estado: "PENDIENTE",
              expires_at: "2026-09-01T00:00:00Z",
            },
          ],
        });
      }
      if (url.includes("mis-conjuntos-autorizados")) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Conjunto Los Alpes");
    await user.click(screen.getByRole("button", { name: "Aceptar" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/reciclador-conjunto/invitaciones/inv-1/responder"),
        { aceptar: true },
        expect.anything()
      );
    });
  });

  it("abre el modal y envía una notificación cuando hay un conjunto autorizado", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("mis-invitaciones")) return Promise.resolve({ data: [] });
      if (url.includes("mis-conjuntos-autorizados")) return Promise.resolve({ data: [conjuntoAutorizado] });
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    const boton = await screen.findByRole("button", { name: "Llegué al conjunto" });
    await user.click(boton);

    expect(screen.getByText("¿A qué conjunto notificas?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Enviar aviso" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/notificaciones/enviar"),
        { tipo: "LLEGADA_RECICLADOR", id_conjunto_residencial: 1 },
        expect.anything()
      );
    });
  });

  it("muestra el aviso de auditoría pendiente y envía la auditoría con evidencia", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("mis-invitaciones")) return Promise.resolve({ data: [] });
      if (url.includes("mis-conjuntos-autorizados")) return Promise.resolve({ data: [conjuntoAutorizado] });
      if (url.includes("/auditorias-conjunto/mias")) return Promise.resolve({ data: [] });
      if (url.includes("/contenido-educativo")) {
        return Promise.resolve({
          data: [{ id_contenido: 1, modulo_categoria: "Separación en la fuente y código de colores" }],
        });
      }
      return Promise.resolve({ data: [] });
    });
    mockPost.mockResolvedValue({ data: { id_auditoria: 1 } });
    const user = userEvent.setup();
    renderPage();

    // ¿Qué? Nunca se ha auditado este conjunto, así que el aviso debe verse.
    await screen.findByText("Ya puedes calificar la separación de residuos de Conjunto Los Alpes.");
    await user.click(screen.getByRole("button", { name: "Auditar ahora" }));

    expect(screen.getByText("Auditar conjunto")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Buena" }));

    const selectTema = await screen.findByRole("combobox");
    await user.selectOptions(selectTema, "Separación en la fuente y código de colores");

    const archivo = new File(["contenido"], "evidencia.jpg", { type: "image/jpeg" });
    const inputArchivo = screen.getByLabelText(/JPG, PNG o WEBP/);
    await user.upload(inputArchivo, archivo);

    await user.click(screen.getByRole("button", { name: "Enviar auditoría" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/auditorias-conjunto"),
        expect.any(FormData),
        expect.anything()
      );
    });
    const formData = mockPost.mock.calls.find(([url]) => url.includes("/auditorias-conjunto"))?.[1] as FormData;
    expect(formData.get("id_conjunto_residencial")).toBe("1");
    expect(formData.get("nivel_desempeno")).toBe("BUENA");
    expect(formData.get("tema_educativo")).toBe("Separación en la fuente y código de colores");
    expect(formData.get("evidencia")).toBeInstanceOf(File);
  });
});
