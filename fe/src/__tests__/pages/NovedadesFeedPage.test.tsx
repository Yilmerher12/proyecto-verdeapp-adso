/**
 * Archivo: __tests__/pages/NovedadesFeedPage.test.tsx
 * Descripción: Tests del feed de novedades que ven Residente, Reciclador y
 *              Admin de Conjunto (RQF-015, HU-033).
 * ¿Para qué? El Admin Sistema ahora puede adjuntar un enlace de video a una
 *           novedad — sin este test, el campo podría guardarse bien y aun
 *           así no verse nunca en el feed.
 */
import { screen } from "@testing-library/react";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { NovedadesFeedPage } from "@/pages/NovedadesFeedPage";
import { renderWithProviders, mockUser } from "../helpers";
import type { Novedad } from "@/lib/novedadesApi";

const mockFeed = vi.fn();

vi.mock("@/lib/novedadesApi", () => ({
  verFeedNovedades: (...args: unknown[]) => mockFeed(...args),
}));

const NOVEDAD: Novedad = {
  id_novedad: "00000000-0000-7000-8000-000000000031",
  alcance: "TODOS",
  texto: "Mira este video sobre cómo separar el vidrio.",
  url_adjunto: null,
  url_video: null,
  conjuntos: [],
  fecha_expiracion: "2099-11-30T23:59:59Z",
  created_at: "2026-02-10T08:00:00Z",
  editado: false,
  archivada: false,
};

function renderPage() {
  return renderWithProviders(<NovedadesFeedPage />, {
    authContext: { user: mockUser, isAuthenticated: true },
  });
}

describe("NovedadesFeedPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFeed.mockResolvedValue([]);
  });

  it("muestra el video de una novedad que lo trae", async () => {
    mockFeed.mockResolvedValue([{ ...NOVEDAD, url_video: "https://www.youtube.com/watch?v=abc123DEF45" }]);
    renderPage();

    expect(await screen.findByText(NOVEDAD.texto)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reproducir video/ })).toBeInTheDocument();
  });

  it("no muestra ningún reproductor si la novedad no trae video", async () => {
    mockFeed.mockResolvedValue([NOVEDAD]);
    renderPage();

    expect(await screen.findByText(NOVEDAD.texto)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reproducir video/ })).not.toBeInTheDocument();
  });
});
