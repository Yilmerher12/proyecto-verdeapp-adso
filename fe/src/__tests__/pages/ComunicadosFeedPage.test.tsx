/**
 * Archivo: __tests__/pages/ComunicadosFeedPage.test.tsx
 * Descripción: Tests del feed de comunicados que ven Residente y Reciclador.
 * ¿Para qué? Issue #400 (CN-048): el enlace al adjunto pasa por
 *           enlaceAdjuntoSeguro — un enlace inseguro (javascript:, http://,
 *           "..", "%2e%2e") nunca debe llegar a un href.
 */
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { API_BASE_URL } from "@/api/axios";
import { ComunicadosFeedPage } from "@/pages/ComunicadosFeedPage";
import { renderWithProviders, mockUser } from "../helpers";
import type { Comunicado } from "@/lib/comunicadosApi";

const mockFeed = vi.fn();

vi.mock("@/lib/comunicadosApi", () => ({
  verFeedComunicados: (...args: unknown[]) => mockFeed(...args),
}));

const COMUNICADO: Comunicado = {
  id_comunicado: "00000000-0000-7000-8000-000000000020",
  id_conjunto_residencial: "00000000-0000-7000-8000-000000000010",
  nombre_conjunto: "Conjunto de Prueba",
  destinatarios: "AMBOS",
  tipo: "INFORMATIVO",
  texto: "Se realizará mantenimiento de ascensores.",
  url_adjunto: null,
  fecha_evento: null,
  fecha_expiracion: "2099-12-31T23:59:59Z",
  created_at: "2026-01-15T10:30:00Z",
  editado: false,
};

function renderPage() {
  return renderWithProviders(<ComunicadosFeedPage />, {
    authContext: { user: mockUser, isAuthenticated: true },
  });
}

describe("ComunicadosFeedPage — adjuntos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pinta el adjunto subido a VerdeApp con la URL del backend", async () => {
    mockFeed.mockResolvedValue([{ ...COMUNICADO, url_adjunto: "/uploads/adjuntos/circular.pdf" }]);
    renderPage();

    expect(await screen.findByRole("link", { name: "Ver adjunto" })).toHaveAttribute(
      "href",
      `${API_BASE_URL}/uploads/adjuntos/circular.pdf`
    );
  });

  it("deja tal cual un adjunto https://", async () => {
    mockFeed.mockResolvedValue([{ ...COMUNICADO, url_adjunto: "https://bogota.gov.co/guia" }]);
    renderPage();

    expect(await screen.findByRole("link", { name: "Ver adjunto" })).toHaveAttribute("href", "https://bogota.gov.co/guia");
  });

  it.each(["javascript:alert(1)", "/uploads/%2e%2e/api/v1/users/me", "http://sitio-malo.com/f.pdf"])(
    "no pinta el adjunto %s",
    async (url) => {
      mockFeed.mockResolvedValue([{ ...COMUNICADO, url_adjunto: url }]);
      renderPage();

      expect(await screen.findByText(COMUNICADO.texto)).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Ver adjunto" })).not.toBeInTheDocument();
    }
  );
});

// ¿Qué? Los urgentes se fijan arriba; con 4 o más comunicados aparecen el filtro por tipo y los
//       encabezados por fecha. Con pocos, la lista queda simple y sin filtros.
describe("ComunicadosFeedPage — urgentes fijados, filtros y grupos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const haceDias = (dias: number) => new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
  const nuevo = (id: string, tipo: Comunicado["tipo"], dias: number): Comunicado => ({
    ...COMUNICADO,
    id_comunicado: id,
    tipo,
    texto: `Texto ${id}`,
    created_at: haceDias(dias),
  });

  it("con pocos comunicados no muestra filtros ni encabezados, pero el urgente va primero", async () => {
    mockFeed.mockResolvedValue([nuevo("info", "INFORMATIVO", 1), nuevo("urgente", "URGENTE", 3)]);
    renderPage();

    await screen.findByText("Texto urgente");
    expect(screen.queryByRole("group", { name: "Filtrar por tipo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Esta semana" })).not.toBeInTheDocument();
    const textos = screen.getAllByText(/^Texto /).map((n) => n.textContent);
    expect(textos).toEqual(["Texto urgente", "Texto info"]);
  });

  it("con 4 o más comunicados agrupa por fecha y muestra el filtro solo con los tipos que hay", async () => {
    mockFeed.mockResolvedValue([
      nuevo("a", "INFORMATIVO", 1),
      nuevo("b", "RECICLAJE", 2),
      nuevo("c", "RECICLAJE", 20),
      nuevo("d", "MANTENIMIENTO", 30),
    ]);
    renderPage();

    const filtro = await screen.findByRole("group", { name: "Filtrar por tipo" });
    expect(within(filtro).getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
    expect(within(filtro).getByRole("button", { name: "Reciclaje" })).toBeInTheDocument();
    expect(within(filtro).queryByRole("button", { name: "Convocatoria" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Esta semana" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Anteriores" })).toBeInTheDocument();
  });

  it("al elegir un tipo solo quedan los comunicados de ese tipo", async () => {
    mockFeed.mockResolvedValue([
      nuevo("a", "INFORMATIVO", 1),
      nuevo("b", "RECICLAJE", 2),
      nuevo("c", "RECICLAJE", 3),
      nuevo("d", "MANTENIMIENTO", 4),
    ]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Reciclaje" }));

    expect(screen.getByText("Texto b")).toBeInTheDocument();
    expect(screen.getByText("Texto c")).toBeInTheDocument();
    expect(screen.queryByText("Texto a")).not.toBeInTheDocument();
    expect(screen.queryByText("Texto d")).not.toBeInTheDocument();
  });
});
