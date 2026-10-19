/**
 * Archivo: __tests__/pages/AdminConjuntoAgendaPage.test.tsx
 * Descripción: Tests de la Agenda del comité del Admin de Conjunto (RQF-020,
 *              HU-046) — opción propia del menú, con dos columnas (Por tratar /
 *              En espera) y una pestaña por conjunto.
 */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { AdminConjuntoAgendaPage } from "@/pages/AdminConjuntoAgendaPage";
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
    defaults: {},
  };
  return { default: { ...instance, create: () => instance } };
});

const adminConjuntoUser = { ...mockUser, role_id: RoleId.ADMIN_CONJUNTO };

const conjuntoUno = { id_conjunto_residencial: "c-1", nombre_conjunto: "Quintas de Aranjuez" };
const conjuntoDos = { id_conjunto_residencial: "c-2", nombre_conjunto: "Portal de Capellanía" };

const temaPendiente = {
  id: "t-1",
  texto: "Arreglar la puerta del sótano.",
  url_evidencia: "/uploads/adjuntos/puerta.jpg",
  estado: "PENDIENTE",
  created_at: "2026-09-22T10:00:00Z",
};
const temaEnEspera = {
  id: "t-2",
  texto: "Instalar una cámara en la entrada de bicicletas.",
  url_evidencia: null,
  estado: "EN_ESPERA",
  created_at: "2026-09-20T10:00:00Z",
};

// ¿Qué? "/agenda" se revisa primero: su URL también contiene "/mis-conjuntos".
function mockConjuntosYAgendas(conjuntos: unknown[], agendas: Record<string, unknown[]> = {}) {
  mockGet.mockImplementation((url: string) => {
    const coincide = Object.keys(agendas).find((id) => url.includes(`/mis-conjuntos/${id}/agenda`));
    if (coincide) return Promise.resolve({ data: agendas[coincide] });
    if (url.includes("/agenda")) return Promise.resolve({ data: [] });
    if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: conjuntos });
    return Promise.resolve({ data: [] });
  });
}

function renderPage() {
  return renderWithProviders(<AdminConjuntoAgendaPage />, {
    authContext: { user: adminConjuntoUser, isAuthenticated: true },
  });
}

describe("AdminConjuntoAgendaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValue({ data: {} });
    mockPatch.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: {} });
  });

  it("reparte los temas en las columnas Por tratar y En espera, con la foto en miniatura", async () => {
    mockConjuntosYAgendas([conjuntoUno], { "c-1": [temaPendiente, temaEnEspera] });
    renderPage();

    const porTratar = await screen.findByRole("region", { name: "Por tratar" });
    const enEspera = screen.getByRole("region", { name: "En espera" });
    expect(within(porTratar).getByText("Arreglar la puerta del sótano.")).toBeInTheDocument();
    expect(within(enEspera).getByText("Instalar una cámara en la entrada de bicicletas.")).toBeInTheDocument();
    expect(within(porTratar).getByRole("link", { name: "Ver foto" })).toHaveAttribute(
      "href",
      expect.stringContaining("/uploads/adjuntos/puerta.jpg")
    );
  });

  it("muestra el estado vacío de cada columna si no hay temas", async () => {
    mockConjuntosYAgendas([conjuntoUno], { "c-1": [] });
    renderPage();

    expect(await screen.findByText("Todavía no hay temas por tratar en este conjunto.")).toBeInTheDocument();
    expect(screen.getByText("Todavía no tienes temas en espera en este conjunto.")).toBeInTheDocument();
  });

  it("avisa si no administra ningún conjunto y no deja agregar temas", async () => {
    mockConjuntosYAgendas([]);
    renderPage();

    expect(
      await screen.findByText("Todavía no tienes ningún conjunto asignado. Contacta al equipo de VerdeApp.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar tema" })).toBeDisabled();
  });

  it("muestra un aviso de error si falla la carga", async () => {
    mockGet.mockRejectedValue(new Error("Network Error"));
    renderPage();

    expect(await screen.findByText("No se pudo cargar la información. Intenta de nuevo más tarde.")).toBeInTheDocument();
  });

  it("con un solo conjunto no muestra pestañas", async () => {
    mockConjuntosYAgendas([conjuntoUno], { "c-1": [temaPendiente] });
    renderPage();

    await screen.findByText("Arreglar la puerta del sótano.");
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("con 2 conjuntos muestra una pestaña por conjunto con sus pendientes y cambia de agenda al elegirla", async () => {
    const temaOtro = { ...temaPendiente, id: "t-9", texto: "Revisar la luz del parqueadero.", url_evidencia: null };
    mockConjuntosYAgendas([conjuntoUno, conjuntoDos], { "c-1": [temaPendiente], "c-2": [temaOtro, { ...temaOtro, id: "t-10" }] });
    const user = userEvent.setup();
    renderPage();

    const pestanaDos = await screen.findByRole("tab", { name: /Portal de Capellanía/ });
    expect(within(pestanaDos).getByText("2")).toBeInTheDocument();
    expect(within(screen.getByRole("tab", { name: /Quintas de Aranjuez/ })).getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Arreglar la puerta del sótano.")).toBeInTheDocument();

    await user.click(pestanaDos);

    expect(screen.queryByText("Arreglar la puerta del sótano.")).not.toBeInTheDocument();
    expect(screen.getAllByText("Revisar la luz del parqueadero.")).toHaveLength(2);
  });

  it("agrega un tema nuevo al conjunto elegido (el botón se habilita solo con texto)", async () => {
    mockConjuntosYAgendas([conjuntoUno, conjuntoDos], {});
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("tab", { name: /Portal de Capellanía/ }));
    await user.click(screen.getByRole("button", { name: "Agregar tema" }));
    const guardar = screen.getByRole("button", { name: "Guardar tema" });
    expect(guardar).toBeDisabled();

    await user.type(screen.getByLabelText("Tema"), "Pintar el pasillo.");
    expect(guardar).toBeEnabled();
    await user.click(guardar);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/conjunto-panel/mis-conjuntos/c-2/agenda"),
        { texto: "Pintar el pasillo.", url_evidencia: null }
      );
    });
  });

  it("muestra el error si falla el guardado y deja el formulario abierto", async () => {
    mockConjuntosYAgendas([conjuntoUno], {});
    mockPost.mockRejectedValue(new Error("Servidor caído"));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Agregar tema" }));
    await user.type(screen.getByLabelText("Tema"), "Hola");
    await user.click(screen.getByRole("button", { name: "Guardar tema" }));

    expect(await screen.findByText("Servidor caído")).toBeInTheDocument();
    expect(screen.getByLabelText("Tema")).toHaveValue("Hola");
  });

  it("deja un tema en espera", async () => {
    mockConjuntosYAgendas([conjuntoUno], { "c-1": [temaPendiente] });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Dejar en espera" }));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(
        expect.stringContaining("/conjunto-panel/mis-conjuntos/c-1/agenda/t-1"),
        { estado: "EN_ESPERA" }
      );
    });
  });

  it("vuelve un tema en espera a pendiente", async () => {
    mockConjuntosYAgendas([conjuntoUno], { "c-1": [temaEnEspera] });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Volver a pendiente" }));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(
        expect.stringContaining("/conjunto-panel/mis-conjuntos/c-1/agenda/t-2"),
        { estado: "PENDIENTE" }
      );
    });
  });

  it("borra un tema con confirmación", async () => {
    mockConjuntosYAgendas([conjuntoUno], { "c-1": [temaPendiente] });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Eliminar tema" }));
    await user.click(await screen.findByRole("button", { name: "Sí, eliminar" }));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(expect.stringContaining("/conjunto-panel/mis-conjuntos/c-1/agenda/t-1"));
    });
  });

  it("muestra un aviso si falla el cambio de estado", async () => {
    mockConjuntosYAgendas([conjuntoUno], { "c-1": [temaPendiente] });
    mockPatch.mockRejectedValue(new Error("fallo"));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Dejar en espera" }));

    expect(await screen.findByText("No se pudo completar la acción. Intenta de nuevo.")).toBeInTheDocument();
  });
});
