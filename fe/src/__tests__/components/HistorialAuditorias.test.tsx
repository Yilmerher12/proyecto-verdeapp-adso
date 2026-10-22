/**
 * Archivo: __tests__/components/HistorialAuditorias.test.tsx
 * Descripción: Lista de auditorías de a páginas (RQF-009): la usan el Residente
 *              (`listarHistorial`) y el Reciclador (`listarMisAuditorias`).
 */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HistorialAuditorias } from "@/components/dashboard/HistorialAuditorias";
import type { AuditoriaConjunto, PaginaAuditorias } from "@/lib/auditoriaConjuntoApi";
import { renderWithProviders } from "../helpers";

const mockObtenerAuditoria = vi.fn();

vi.mock("@/lib/auditoriaConjuntoApi", () => ({
  obtenerAuditoria: (...args: unknown[]) => mockObtenerAuditoria(...args),
}));

const auditoria = (n: number, idConjunto = "c1", nombre = "Los Alpes"): AuditoriaConjunto => ({
  id_auditoria: `a${n}`,
  id_conjunto_residencial: idConjunto,
  nombre_conjunto: nombre,
  nivel_desempeno: "BUENA",
  tema_educativo: `Tema ${n}`,
  descripcion: null,
  ruta_evidencia: "/x.jpg",
  ruta_evidencia_2: null,
  ruta_evidencia_3: null,
  created_at: "2026-10-20T10:00:00Z",
  nombre_reciclador: "Juan",
});

// ¿Qué? Un servidor de mentira con `total` auditorías numeradas de la más reciente (1) a la más vieja.
function servidorCon(total: number) {
  return vi.fn((limit: number, offset: number): Promise<PaginaAuditorias> => {
    const items = Array.from({ length: Math.max(0, Math.min(limit, total - offset)) }, (_, i) => auditoria(offset + i + 1));
    return Promise.resolve({ items, total });
  });
}

describe("HistorialAuditorias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pide la primera página de 10 y muestra 'Mostrando 1–10 de 25'", async () => {
    const cargar = servidorCon(25);
    renderWithProviders(<HistorialAuditorias cargar={cargar} />);

    expect(await screen.findByText("Tema 1")).toBeInTheDocument();
    expect(screen.getByText("Tema 10")).toBeInTheDocument();
    expect(screen.queryByText("Tema 11")).not.toBeInTheDocument();
    expect(screen.getByText("Mostrando 1–10 de 25")).toBeInTheDocument();
    expect(cargar).toHaveBeenCalledWith(10, 0);
  });

  it("al pasar de página pide el offset siguiente, y se puede volver a la anterior", async () => {
    const user = userEvent.setup();
    const cargar = servidorCon(25);
    renderWithProviders(<HistorialAuditorias cargar={cargar} />);
    await screen.findByText("Tema 1");

    await user.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(await screen.findByText("Tema 11")).toBeInTheDocument();
    expect(cargar).toHaveBeenLastCalledWith(10, 10);
    expect(screen.getByText("Mostrando 11–20 de 25")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(await screen.findByText("Tema 21")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 21–25 de 25")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página siguiente" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Página anterior" }));
    expect(await screen.findByText("Tema 11")).toBeInTheDocument();
    expect(cargar).toHaveBeenLastCalledWith(10, 10);
  });

  it("con 10 auditorías o menos no muestra la barra de páginas", async () => {
    renderWithProviders(<HistorialAuditorias cargar={servidorCon(7)} />);

    await screen.findByText("Tema 7");
    expect(screen.queryByRole("button", { name: "Página siguiente" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
  });

  it("sin auditorías dice que todavía no hay", async () => {
    renderWithProviders(<HistorialAuditorias cargar={servidorCon(0)} />);

    expect(await screen.findByText("Todavía no hay auditorías registradas.")).toBeInTheDocument();
  });

  it("si falla la carga muestra lo mismo que sin auditorías, sin romperse", async () => {
    renderWithProviders(<HistorialAuditorias cargar={() => Promise.reject(new Error("falló"))} />);

    expect(await screen.findByText("Todavía no hay auditorías registradas.")).toBeInTheDocument();
  });

  it("escribe el nombre del conjunto solo si la página tiene varios, o siempre si se pide", async () => {
    const dosConjuntos = () =>
      Promise.resolve({ items: [auditoria(1, "c1", "Los Alpes"), auditoria(2, "c2", "Capellanía")], total: 2 });
    const { unmount } = renderWithProviders(<HistorialAuditorias cargar={dosConjuntos} />);
    expect(await screen.findByText("Los Alpes — Tema 1")).toBeInTheDocument();
    unmount();

    const { unmount: unmount2 } = renderWithProviders(<HistorialAuditorias cargar={servidorCon(2)} />);
    expect(await screen.findByText("Tema 1")).toBeInTheDocument();
    unmount2();

    renderWithProviders(<HistorialAuditorias cargar={servidorCon(2)} mostrarSiempreElConjunto />);
    expect(await screen.findByText("Los Alpes — Tema 1")).toBeInTheDocument();
  });

  it("al cambiar `recargar` vuelve a pedir la página", async () => {
    const cargar = servidorCon(3);
    const { rerender } = renderWithProviders(<HistorialAuditorias cargar={cargar} recargar={0} />);
    await screen.findByText("Tema 3");
    expect(cargar).toHaveBeenCalledTimes(1);

    rerender(<HistorialAuditorias cargar={cargar} recargar={1} />);

    await waitFor(() => expect(cargar).toHaveBeenCalledTimes(2));
  });

  it("al tocar una auditoría abre su detalle", async () => {
    const user = userEvent.setup();
    mockObtenerAuditoria.mockResolvedValue(auditoria(1));
    renderWithProviders(<HistorialAuditorias cargar={servidorCon(2)} />);

    await user.click(await screen.findByText("Tema 1"));

    expect(mockObtenerAuditoria).toHaveBeenCalledWith("a1");
    expect(await screen.findByText("Resultado de la auditoría")).toBeInTheDocument();
  });
});
