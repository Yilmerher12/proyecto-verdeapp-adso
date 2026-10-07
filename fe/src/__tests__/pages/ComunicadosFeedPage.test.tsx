/**
 * Archivo: __tests__/pages/ComunicadosFeedPage.test.tsx
 * Descripción: Tests del feed de comunicados que ven Residente y Reciclador.
 * ¿Para qué? Issue #400 (CN-048): el enlace al adjunto pasa por
 *           enlaceAdjuntoSeguro — un enlace inseguro (javascript:, http://,
 *           "..", "%2e%2e") nunca debe llegar a un href.
 */
import { screen } from "@testing-library/react";
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
