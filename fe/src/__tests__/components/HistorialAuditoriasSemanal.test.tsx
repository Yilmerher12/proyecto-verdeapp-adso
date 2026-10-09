/**
 * Archivo: __tests__/components/HistorialAuditoriasSemanal.test.tsx
 * Descripción: Tests del historial de auditorías (RQF-009) agrupado por
 *              semana, con su barra Bueno/Regular/Malo — uso exclusivo del
 *              panel del Admin de Conjunto. Recibe la lista de auditorías
 *              ya filtrada por conjunto (no pide datos por su cuenta).
 */
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { HistorialAuditoriasSemanal } from "@/components/dashboard/HistorialAuditoriasSemanal";
import type { AuditoriaConjunto } from "@/lib/auditoriaConjuntoApi";
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

// ¿Qué? Dos semanas reales distintas (lunes 14 y lunes 21 de septiembre de
//       2026) — lunesUTC/rangoSemanaUTC se calculan desde esta fecha, no
//       desde "hoy", así que el test no depende de cuándo se corra.
const semanaReciente: AuditoriaConjunto[] = [
  { id_auditoria: "a1", id_conjunto_residencial: "c1", nombre_conjunto: "Los Alpes", nivel_desempeno: "BUENA", tema_educativo: "Separación en la fuente", descripcion: null, ruta_evidencia: "/x.jpg", ruta_evidencia_2: null, ruta_evidencia_3: null, created_at: "2026-09-22T10:00:00Z", nombre_reciclador: "Juan" },
  { id_auditoria: "a2", id_conjunto_residencial: "c1", nombre_conjunto: "Los Alpes", nivel_desempeno: "REGULAR", tema_educativo: "Clasificación", descripcion: null, ruta_evidencia: "/x.jpg", ruta_evidencia_2: null, ruta_evidencia_3: null, created_at: "2026-09-23T10:00:00Z", nombre_reciclador: "Juan" },
];
const semanaAnterior: AuditoriaConjunto[] = [
  { id_auditoria: "a3", id_conjunto_residencial: "c1", nombre_conjunto: "Los Alpes", nivel_desempeno: "DEFICIENTE", tema_educativo: "Residuos peligrosos", descripcion: null, ruta_evidencia: "/x.jpg", ruta_evidencia_2: null, ruta_evidencia_3: null, created_at: "2026-09-15T10:00:00Z", nombre_reciclador: "Juan" },
];

describe("HistorialAuditoriasSemanal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no muestra nada si el conjunto no tiene auditorías", () => {
    const { container } = renderWithProviders(<HistorialAuditoriasSemanal auditorias={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("agrupa por semana y solo la más reciente viene abierta", () => {
    renderWithProviders(<HistorialAuditoriasSemanal auditorias={[...semanaReciente, ...semanaAnterior]} />);

    expect(screen.getByText("Separación en la fuente")).toBeInTheDocument();
    expect(screen.getByText("Clasificación")).toBeInTheDocument();
    // ¿Qué? La semana anterior está colapsada — su único tema no se ve todavía.
    expect(screen.queryByText("Residuos peligrosos")).not.toBeInTheDocument();

    const filas = screen.getAllByRole("button", { expanded: false });
    expect(filas).toHaveLength(1);
  });

  it("abre la semana anterior al hacer clic y muestra su conteo", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HistorialAuditoriasSemanal auditorias={[...semanaReciente, ...semanaAnterior]} />);

    const cabeceraCerrada = screen.getByRole("button", { expanded: false });
    // ¿Qué? "1" es el total de auditorías de esa semana (dato real, no texto fijo).
    expect(within(cabeceraCerrada).getByText("1")).toBeInTheDocument();

    await user.click(cabeceraCerrada);
    expect(await screen.findByText("Residuos peligrosos")).toBeInTheDocument();
  });

  it("abre el detalle de una auditoría al hacer clic en su fila", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/auditorias-conjunto/a1")) return Promise.resolve({ data: semanaReciente[0] });
      return Promise.resolve({ data: {} });
    });
    const user = userEvent.setup();
    renderWithProviders(<HistorialAuditoriasSemanal auditorias={semanaReciente} />);

    await user.click(screen.getByText("Separación en la fuente"));
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/auditorias-conjunto/a1"));
  });
});
