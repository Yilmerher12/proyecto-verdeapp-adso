/**
 * Archivo: __tests__/pages/NovedadesEnviadas.test.tsx
 * Descripción: Tests de las novedades que Residente, Reciclador y Admin de
 *              Conjunto le ENVÍAN al Admin Sistema, desde las pestañas
 *              "Escribir novedad" y "Mis envíos" de la página de Novedades.
 */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { NovedadesFeedPage } from "@/pages/NovedadesFeedPage";
import { RoleId } from "@/types/auth";
import { renderWithProviders, mockUser } from "../helpers";

const mockEnviar = vi.fn();
const mockMias = vi.fn();
const mockConjuntos = vi.fn();

vi.mock("@/lib/novedadesApi", () => ({
  verFeedNovedades: () => Promise.resolve([]),
}));
vi.mock("@/lib/novedadesEnviadasApi", () => ({
  enviarNovedad: (...args: unknown[]) => mockEnviar(...args),
  misNovedadesEnviadas: (...args: unknown[]) => mockMias(...args),
}));
vi.mock("@/lib/conjuntoPanelApi", () => ({
  obtenerMisConjuntos: (...args: unknown[]) => mockConjuntos(...args),
}));

function renderPage(roleId: RoleId = RoleId.RESIDENTE) {
  return renderWithProviders(<NovedadesFeedPage />, {
    authContext: { user: { ...mockUser, role_id: roleId }, isAuthenticated: true },
  });
}

describe("Novedades enviadas al Admin Sistema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnviar.mockResolvedValue({});
    mockMias.mockResolvedValue([]);
    mockConjuntos.mockResolvedValue([]);
  });

  it("envía una novedad: el botón se habilita solo con texto", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: "Escribir novedad" }));
    const enviar = screen.getByRole("button", { name: "Enviar novedad" });
    expect(enviar).toBeDisabled();

    await user.type(screen.getByLabelText("Novedad"), "El contenedor del sótano está desbordado.");
    expect(enviar).toBeEnabled();
    await user.click(enviar);

    await waitFor(() => {
      expect(mockEnviar).toHaveBeenCalledWith({
        texto: "El contenedor del sótano está desbordado.",
        url_imagen: null,
        id_conjunto_residencial: null,
      });
    });
    expect(await screen.findByText("Novedad enviada. El Administrador del Sistema la revisará.")).toBeInTheDocument();
  });

  it("un Residente no ve el selector de conjunto", async () => {
    const user = userEvent.setup();
    renderPage(RoleId.RESIDENTE);

    await user.click(screen.getByRole("tab", { name: "Escribir novedad" }));
    expect(screen.queryByLabelText("¿De qué conjunto hablas?")).not.toBeInTheDocument();
  });

  it("un Admin de Conjunto con 2 conjuntos elige de cuál habla", async () => {
    mockConjuntos.mockResolvedValue([
      { id_conjunto_residencial: "c-1", nombre_conjunto: "Quintas de Aranjuez" },
      { id_conjunto_residencial: "c-2", nombre_conjunto: "Portal de Capellanía" },
    ]);
    const user = userEvent.setup();
    renderPage(RoleId.ADMIN_CONJUNTO);

    await user.click(screen.getByRole("tab", { name: "Escribir novedad" }));
    await user.selectOptions(await screen.findByLabelText("¿De qué conjunto hablas?"), "c-2");
    await user.type(screen.getByLabelText("Novedad"), "Rayaron una pared.");
    await user.click(screen.getByRole("button", { name: "Enviar novedad" }));

    await waitFor(() => {
      expect(mockEnviar).toHaveBeenCalledWith(expect.objectContaining({ id_conjunto_residencial: "c-2" }));
    });
  });

  it("muestra el error si falla el envío", async () => {
    mockEnviar.mockRejectedValue(new Error("Servidor caído"));
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: "Escribir novedad" }));
    await user.type(screen.getByLabelText("Novedad"), "Hola");
    await user.click(screen.getByRole("button", { name: "Enviar novedad" }));

    expect(await screen.findByText("Servidor caído")).toBeInTheDocument();
  });

  it("Mis envíos lista lo enviado con su estado", async () => {
    mockMias.mockResolvedValue([
      { id: "n-1", texto: "Pared rayada.", url_imagen: null, estado: "VISTA", nombre_conjunto: "Quintas", created_at: "2026-09-22T10:00:00Z" },
      { id: "n-2", texto: "Punto cerrado.", url_imagen: null, estado: "NUEVA", nombre_conjunto: null, created_at: "2026-09-23T10:00:00Z" },
    ]);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: "Mis envíos" }));

    expect(await screen.findByText("Pared rayada.")).toBeInTheDocument();
    expect(screen.getByText("Vista por el Admin del Sistema")).toBeInTheDocument();
    expect(screen.getByText("Enviada")).toBeInTheDocument();
  });

  it("Mis envíos muestra el estado vacío", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: "Mis envíos" }));
    expect(await screen.findByText("Todavía no has enviado ninguna novedad.")).toBeInTheDocument();
  });
});
