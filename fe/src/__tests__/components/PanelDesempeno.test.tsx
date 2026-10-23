/**
 * Archivo: __tests__/components/PanelDesempeno.test.tsx
 * Descripción: Panel de desempeño semanal de un conjunto (issue #487): tarjetas,
 *              gráfica, tabla alternativa, auditorías de la semana, ranking de
 *              temas y el aviso cuando hay pocos datos.
 */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PanelDesempeno } from "@/components/desempeno/PanelDesempeno";
import type { AuditoriaConjunto, DesempenoConjunto } from "@/lib/auditoriaConjuntoApi";
import { formatearFechaCreacion } from "@/lib/dateFormat";
import { renderWithProviders } from "../helpers";

const mockObtenerDesempeno = vi.fn();
const mockListarSemana = vi.fn();
const mockObtenerAuditoria = vi.fn();

vi.mock("@/lib/auditoriaConjuntoApi", () => ({
  obtenerDesempeno: (...args: unknown[]) => mockObtenerDesempeno(...args),
  listarAuditoriasDeSemana: (...args: unknown[]) => mockListarSemana(...args),
  obtenerAuditoria: (...args: unknown[]) => mockObtenerAuditoria(...args),
}));

const auditoria = (id: string, tema: string, nivel: AuditoriaConjunto["nivel_desempeno"], creada: string): AuditoriaConjunto => ({
  id_auditoria: id,
  id_conjunto_residencial: "c1",
  nombre_conjunto: "Los Alpes",
  nivel_desempeno: nivel,
  tema_educativo: tema,
  descripcion: null,
  ruta_evidencia: "/x.jpg",
  ruta_evidencia_2: null,
  ruta_evidencia_3: null,
  created_at: creada,
  nombre_reciclador: "Juan",
});

const semana = (lunes: string, bueno = 0, regular = 0, malo = 0) => ({ lunes, bueno, regular, malo });

// ¿Qué? 8 semanas reales (todos lunes; la última, 19 oct 2026, es la "en curso") con 12 auditorías.
const DESEMPENO: DesempenoConjunto = {
  id_conjunto_residencial: "c1",
  total: 12,
  semanas: [
    semana("2026-08-31"),
    semana("2026-09-07"),
    semana("2026-09-14", 1),
    semana("2026-09-21"),
    semana("2026-09-28", 0, 1),
    semana("2026-10-05", 2, 0, 1),
    semana("2026-10-12", 2, 1),
    semana("2026-10-19", 3, 1),
  ],
  temas: [
    { tema: "Cómo entregar el material", bueno: 5, regular: 0, malo: 0 },
    { tema: "Cantidad de basura generada", bueno: 1, regular: 3, malo: 1 },
    { tema: "Separación por colores de bolsa", bueno: 2, regular: 0, malo: 0 },
  ],
};

const SEMANA_ACTUAL = [
  auditoria("a2", "Cantidad de basura generada", "REGULAR", "2026-10-21T15:00:00Z"),
  auditoria("a1", "Cómo entregar el material", "BUENA", "2026-10-20T15:00:00Z"),
];

function mockRespuestas(desempeno: DesempenoConjunto, porSemana: Record<string, AuditoriaConjunto[]> = {}) {
  mockObtenerDesempeno.mockResolvedValue(desempeno);
  mockListarSemana.mockImplementation((lunes: string) => Promise.resolve(porSemana[lunes] ?? []));
}

describe("PanelDesempeno", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra un aviso de carga y luego las tarjetas de resumen", async () => {
    mockRespuestas(DESEMPENO, { "2026-10-19": SEMANA_ACTUAL });
    renderWithProviders(<PanelDesempeno idConjunto="c1" semanas={8} />);

    expect(screen.getByText("Cargando...")).toBeInTheDocument();

    expect(await screen.findByText("Auditorías del período")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("8 de 12")).toBeInTheDocument();
    // ¿Qué? El tema a reforzar sale dos veces (tarjeta y ranking): se busca el detalle de la tarjeta.
    expect(screen.getAllByText("Cantidad de basura generada").length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText(formatearFechaCreacion("2026-10-21T15:00:00Z"), { selector: "dd" })).toBeInTheDocument();
  });

  it("pide los datos con el conjunto y el período elegidos", async () => {
    mockRespuestas(DESEMPENO, { "2026-10-19": SEMANA_ACTUAL });
    renderWithProviders(<PanelDesempeno idConjunto="c1" semanas={12} />);

    await screen.findByText("Auditorías del período");
    expect(mockObtenerDesempeno).toHaveBeenCalledWith("c1", 12);
  });

  it("sin conjunto (el caso del Residente) pide los datos sin id_conjunto", async () => {
    mockRespuestas(DESEMPENO);
    renderWithProviders(<PanelDesempeno semanas={8} />);

    await screen.findByText("Auditorías del período");
    expect(mockObtenerDesempeno).toHaveBeenCalledWith(undefined, 8);
  });

  it("dibuja una barra por semana, cada una como botón con su descripción completa", async () => {
    mockRespuestas(DESEMPENO, { "2026-10-19": SEMANA_ACTUAL });
    renderWithProviders(<PanelDesempeno idConjunto="c1" semanas={8} />);

    const actual = await screen.findByRole("button", { name: /^Semana en curso, del .*: Bueno 3, Regular 1, Malo 0$/ });
    expect(actual).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /^Semana del .*: Bueno 2, Regular 1, Malo 0$/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getAllByRole("button", { name: /^Semana (en curso, )?del / })).toHaveLength(8);
  });

  it("la leyenda trae ícono y nombre de cada nivel, no solo color", async () => {
    mockRespuestas(DESEMPENO);
    renderWithProviders(<PanelDesempeno idConjunto="c1" semanas={8} />);

    const leyenda = await screen.findByRole("list", { name: "Niveles de desempeño" });
    expect(within(leyenda).getByText("Bueno")).toBeInTheDocument();
    expect(within(leyenda).getByText("Regular")).toBeInTheDocument();
    expect(within(leyenda).getByText("Malo")).toBeInTheDocument();
    expect(leyenda.querySelectorAll("svg")).toHaveLength(3);
  });

  it("la semana más reciente con auditorías viene abierta y marcada como en curso", async () => {
    mockRespuestas(DESEMPENO, { "2026-10-19": SEMANA_ACTUAL });
    renderWithProviders(<PanelDesempeno idConjunto="c1" semanas={8} />);

    expect(await screen.findByText(/\(en curso\)$/)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Ver detalle de la auditoría de Cómo entregar el material" })).toBeInTheDocument();
    expect(screen.getByText("2 auditorías")).toBeInTheDocument();
    expect(mockListarSemana).toHaveBeenCalledWith("2026-10-19", "c1");
  });

  it("al tocar una barra pide y muestra las auditorías de esa semana", async () => {
    const user = userEvent.setup();
    mockRespuestas(DESEMPENO, {
      "2026-10-19": SEMANA_ACTUAL,
      "2026-10-12": [auditoria("a3", "Residuos orgánicos", "BUENA", "2026-10-14T15:00:00Z")],
    });
    renderWithProviders(<PanelDesempeno idConjunto="c1" semanas={8} />);

    await user.click(await screen.findByRole("button", { name: /^Semana del .*: Bueno 2, Regular 1, Malo 0$/ }));

    expect(await screen.findByRole("button", { name: "Ver detalle de la auditoría de Residuos orgánicos" })).toBeInTheDocument();
    expect(mockListarSemana).toHaveBeenCalledWith("2026-10-12", "c1");
    expect(screen.getByRole("button", { name: /^Semana del .*: Bueno 2, Regular 1, Malo 0$/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("se puede elegir una semana con el teclado (Enter)", async () => {
    const user = userEvent.setup();
    mockRespuestas(DESEMPENO, {
      "2026-10-19": SEMANA_ACTUAL,
      "2026-10-12": [auditoria("a3", "Residuos orgánicos", "BUENA", "2026-10-14T15:00:00Z")],
    });
    renderWithProviders(<PanelDesempeno idConjunto="c1" semanas={8} />);

    const semana12 = await screen.findByRole("button", { name: /^Semana del .*: Bueno 2, Regular 1, Malo 0$/ });
    semana12.focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("button", { name: "Ver detalle de la auditoría de Residuos orgánicos" })).toBeInTheDocument();
  });

  it("'Ver detalle' abre el detalle de la auditoría", async () => {
    const user = userEvent.setup();
    mockRespuestas(DESEMPENO, { "2026-10-19": SEMANA_ACTUAL });
    mockObtenerAuditoria.mockResolvedValue(SEMANA_ACTUAL[1]);
    renderWithProviders(<PanelDesempeno idConjunto="c1" semanas={8} />);

    await user.click(await screen.findByRole("button", { name: "Ver detalle de la auditoría de Cómo entregar el material" }));

    expect(mockObtenerAuditoria).toHaveBeenCalledWith("a1");
    expect(await screen.findByText("Resultado de la auditoría")).toBeInTheDocument();
  });

  it("'Ver como tabla' muestra los mismos números y se puede volver a la gráfica", async () => {
    const user = userEvent.setup();
    mockRespuestas(DESEMPENO, { "2026-10-19": SEMANA_ACTUAL });
    renderWithProviders(<PanelDesempeno idConjunto="c1" semanas={8} />);

    await screen.findByRole("button", { name: /^Semana en curso/ });
    await user.click(screen.getAllByRole("button", { name: "Ver como tabla" })[0]);

    const tabla = screen.getByRole("table", { name: "Auditorías por semana y nivel" });
    expect(within(tabla).getAllByRole("row")).toHaveLength(9); // encabezado + 8 semanas
    const filaActual = within(tabla).getByRole("button", { name: /\(en curso\)/ }).closest("tr") as HTMLElement;
    expect(within(filaActual).getAllByRole("cell").map((c) => c.textContent)).toEqual(["3", "1", "0", "4"]);

    await user.click(screen.getByRole("button", { name: "Ver como gráfica" }));
    expect(await screen.findByRole("button", { name: /^Semana en curso/ })).toBeInTheDocument();
  });

  it("elegir una semana desde la tabla también muestra sus auditorías", async () => {
    const user = userEvent.setup();
    mockRespuestas(DESEMPENO, {
      "2026-10-19": SEMANA_ACTUAL,
      "2026-10-12": [auditoria("a3", "Residuos orgánicos", "BUENA", "2026-10-14T15:00:00Z")],
    });
    renderWithProviders(<PanelDesempeno idConjunto="c1" semanas={8} />);

    await screen.findByRole("button", { name: /^Semana en curso/ });
    await user.click(screen.getAllByRole("button", { name: "Ver como tabla" })[0]);
    const tabla = screen.getByRole("table", { name: "Auditorías por semana y nivel" });
    const botones = within(tabla).getAllByRole("button");
    await user.click(botones[botones.length - 2]); // 12 oct

    expect(await screen.findByRole("button", { name: "Ver detalle de la auditoría de Residuos orgánicos" })).toBeInTheDocument();
  });

  it("el ranking pone arriba el tema con más Regular o Malo y lo escribe con palabras", async () => {
    mockRespuestas(DESEMPENO, { "2026-10-19": SEMANA_ACTUAL });
    renderWithProviders(<PanelDesempeno idConjunto="c1" semanas={8} />);

    const ranking = await screen.findByRole("region", { name: "Temas del período" });
    // ¿Qué? Solo los temas (hijos directos de la lista ordenada), no las cifras por nivel de cada uno.
    const items = within(ranking).getAllByRole("listitem").filter((li) => li.parentElement?.tagName === "OL");
    expect(items[0]).toHaveTextContent("Cantidad de basura generada");
    expect(items[0]).toHaveTextContent("Regular o Malo: 4 de 5");
    // ¿Qué? Los dos sin Regular ni Malo quedan después, el de más auditorías primero.
    expect(items[1]).toHaveTextContent("Cómo entregar el material");
    expect(items[1]).toHaveTextContent("Sin Regular ni Malo (5)");
    expect(items[2]).toHaveTextContent("Separación por colores de bolsa");
    expect(items[2]).toHaveTextContent("Sin Regular ni Malo (2)");
    expect(within(ranking).getByText(/Con pocos datos es una pista, no una conclusión/)).toBeInTheDocument();
  });

  it("el ranking también se puede ver como tabla", async () => {
    const user = userEvent.setup();
    mockRespuestas(DESEMPENO, { "2026-10-19": SEMANA_ACTUAL });
    renderWithProviders(<PanelDesempeno idConjunto="c1" semanas={8} />);

    const ranking = await screen.findByRole("region", { name: "Temas del período" });
    await user.click(within(ranking).getByRole("button", { name: "Ver como tabla" }));

    const tabla = within(ranking).getByRole("table", { name: "Auditorías por tema y nivel" });
    const primera = within(tabla).getAllByRole("row")[1];
    expect(within(primera).getByRole("rowheader")).toHaveTextContent("Cantidad de basura generada");
    expect(within(primera).getAllByRole("cell").map((c) => c.textContent)).toEqual(["1", "3", "1", "4"]);
  });

  describe("con pocas auditorías", () => {
    const POCAS: DesempenoConjunto = {
      ...DESEMPENO,
      total: 3,
      semanas: DESEMPENO.semanas.map((s) => ({ ...s, bueno: 0, regular: 0, malo: 0 })).map((s) =>
        s.lunes === "2026-10-12" ? { ...s, bueno: 1 } : s.lunes === "2026-10-19" ? { ...s, regular: 2 } : s,
      ),
      temas: [{ tema: "Cantidad de basura generada", bueno: 1, regular: 2, malo: 0 }],
    };

    it("avisa que faltan datos, no dibuja la gráfica ni el ranking, y deja visible la lista del período", async () => {
      mockRespuestas(POCAS, {
        "2026-10-19": [auditoria("a2", "Tema nuevo", "REGULAR", "2026-10-21T15:00:00Z")],
        "2026-10-12": [auditoria("a3", "Tema viejo", "BUENA", "2026-10-14T15:00:00Z")],
      });
      renderWithProviders(<PanelDesempeno idConjunto="c1" semanas={8} />);

      expect(
        await screen.findByText(/Todavía no hay suficientes auditorías para mostrar la gráfica\. Aparecerá con al menos 4 auditorías en las últimas 8 semanas/),
      ).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Semana/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("region", { name: "Temas del período" })).not.toBeInTheDocument();

      const lista = await screen.findByRole("region", { name: "Auditorías del período" });
      const temas = await within(lista).findAllByText(/^Tema (nuevo|viejo)$/);
      // ¿Qué? Las del período juntas, la más reciente primero.
      expect(temas.map((t) => t.textContent)).toEqual(["Tema nuevo", "Tema viejo"]);
    });

    it("sin ninguna auditoría dice que todavía no hay y las tarjetas muestran guiones", async () => {
      mockRespuestas({
        ...DESEMPENO,
        total: 0,
        semanas: DESEMPENO.semanas.map((s) => ({ ...s, bueno: 0, regular: 0, malo: 0 })),
        temas: [],
      });
      renderWithProviders(<PanelDesempeno idConjunto="c1" semanas={8} />);

      expect(await screen.findByText("Todavía no hay auditorías en este período.")).toBeInTheDocument();
      expect(screen.getAllByText("—")).toHaveLength(3);
    });
  });

  it("si falla la carga muestra el error", async () => {
    mockObtenerDesempeno.mockRejectedValue(new Error("falló"));
    renderWithProviders(<PanelDesempeno idConjunto="c1" semanas={8} />);

    expect(await screen.findByText("No se pudo cargar el desempeño.")).toBeInTheDocument();
  });

  it("si fallan las auditorías de la semana lo avisa, sin tumbar el resto", async () => {
    mockObtenerDesempeno.mockResolvedValue(DESEMPENO);
    mockListarSemana.mockRejectedValue(new Error("falló"));
    renderWithProviders(<PanelDesempeno idConjunto="c1" semanas={8} />);

    expect(await screen.findByText("No se pudieron cargar las auditorías.")).toBeInTheDocument();
    expect(screen.getByText("Auditorías del período")).toBeInTheDocument();
  });

  it("al cambiar de período vuelve a pedir y no muestra la respuesta anterior mientras carga", async () => {
    mockRespuestas(DESEMPENO, { "2026-10-19": SEMANA_ACTUAL });
    const { rerender } = renderWithProviders(<PanelDesempeno idConjunto="c1" semanas={8} />);
    await screen.findByText("Auditorías del período");

    mockObtenerDesempeno.mockReturnValue(new Promise(() => {}));
    rerender(<PanelDesempeno idConjunto="c1" semanas={4} />);

    await waitFor(() => expect(screen.getByText("Cargando...")).toBeInTheDocument());
    expect(screen.queryByText("Auditorías del período")).not.toBeInTheDocument();
    expect(mockObtenerDesempeno).toHaveBeenLastCalledWith("c1", 4);
  });
});
