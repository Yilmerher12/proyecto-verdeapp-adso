/**
 * Archivo: __tests__/pages/AdminConjuntoDesempenoPage.test.tsx
 * Descripción: Página "Desempeño" del Admin de Conjunto (issue #487): elegir
 *              conjunto y período, y que el panel pida los datos del elegido.
 */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminConjuntoDesempenoPage } from "@/pages/AdminConjuntoDesempenoPage";
import { renderWithProviders } from "../helpers";

const mockObtenerMisConjuntos = vi.fn();

vi.mock("@/lib/conjuntoPanelApi", () => ({
  obtenerMisConjuntos: (...args: unknown[]) => mockObtenerMisConjuntos(...args),
}));

// ¿Qué? El panel (gráfica, ranking...) tiene sus propias pruebas: aquí solo
//       interesa con qué conjunto y período lo monta la página.
vi.mock("@/components/desempeno/PanelDesempeno", () => ({
  PanelDesempeno: ({ idConjunto, semanas }: { idConjunto?: string; semanas: number }) => (
    <p>
      panel:{idConjunto}:{semanas}
    </p>
  ),
}));

const conjunto = (id: string, nombre: string) => ({ id_conjunto_residencial: id, nombre_conjunto: nombre });

describe("AdminConjuntoDesempenoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("con un solo conjunto no muestra selector de conjunto y usa 8 semanas por defecto", async () => {
    mockObtenerMisConjuntos.mockResolvedValue([conjunto("c1", "Los Alpes")]);
    renderWithProviders(<AdminConjuntoDesempenoPage />);

    expect(await screen.findByText("panel:c1:8")).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Desempeño" })).toBeInTheDocument();
  });

  it("con varios conjuntos muestra una pestaña por conjunto, con el primero elegido", async () => {
    mockObtenerMisConjuntos.mockResolvedValue([conjunto("c1", "Los Alpes"), conjunto("c2", "Capellanía")]);
    renderWithProviders(<AdminConjuntoDesempenoPage />);

    expect(await screen.findByRole("tab", { name: "Los Alpes" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Capellanía" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("panel:c1:8")).toBeInTheDocument();
  });

  it("al elegir otro conjunto, el panel pide el desempeño de ese conjunto", async () => {
    const user = userEvent.setup();
    mockObtenerMisConjuntos.mockResolvedValue([conjunto("c1", "Los Alpes"), conjunto("c2", "Capellanía")]);
    renderWithProviders(<AdminConjuntoDesempenoPage />);

    await user.click(await screen.findByRole("tab", { name: "Capellanía" }));

    expect(screen.getByText("panel:c2:8")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Capellanía" })).toHaveAttribute("aria-selected", "true");
  });

  it("ofrece 4, 8 y 12 semanas y pasa la elegida al panel", async () => {
    const user = userEvent.setup();
    mockObtenerMisConjuntos.mockResolvedValue([conjunto("c1", "Los Alpes")]);
    renderWithProviders(<AdminConjuntoDesempenoPage />);

    const periodo = await screen.findByLabelText("Período");
    expect(Array.from((periodo as HTMLSelectElement).options).map((o) => o.textContent)).toEqual([
      "Últimas 4 semanas",
      "Últimas 8 semanas",
      "Últimas 12 semanas",
    ]);
    expect(periodo).toHaveValue("8");

    await user.selectOptions(periodo, "12");

    expect(screen.getByText("panel:c1:12")).toBeInTheDocument();
  });

  it("sin conjuntos asignados lo dice y no monta el panel", async () => {
    mockObtenerMisConjuntos.mockResolvedValue([]);
    renderWithProviders(<AdminConjuntoDesempenoPage />);

    expect(await screen.findByText("Todavía no tienes conjuntos asignados.")).toBeInTheDocument();
    expect(screen.queryByText(/^panel:/)).not.toBeInTheDocument();
  });

  it("si falla la carga de conjuntos muestra el error", async () => {
    mockObtenerMisConjuntos.mockRejectedValue(new Error("falló"));
    renderWithProviders(<AdminConjuntoDesempenoPage />);

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.queryByText(/^panel:/)).not.toBeInTheDocument();
  });
});
