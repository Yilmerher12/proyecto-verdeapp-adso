/**
 * Archivo: __tests__/pages/AdminNovedadesPage.test.tsx
 * Descripción: Tests del listado de novedades del Admin del Sistema.
 * ¿Para qué? Mismo requisito del profesor que en comunicados (issue #165):
 *           mostrar la fecha de creación junto a la de expiración en cada
 *           tarjeta del listado.
 */
import { screen, waitFor } from "@testing-library/react";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { AdminNovedadesPage } from "@/pages/AdminNovedadesPage";
import { renderWithProviders, mockUser } from "../helpers";
import type { Novedad } from "@/lib/novedadesApi";

const mockListar = vi.fn();

vi.mock("@/lib/novedadesApi", () => ({
  listarTodasLasNovedades: (...args: unknown[]) => mockListar(...args),
  crearNovedad: vi.fn(),
  editarNovedad: vi.fn(),
  archivarNovedad: vi.fn(),
}));

// ¿Qué? Fechas alejadas entre sí (ver mismo criterio en
//       AdminConjuntoComunicadosPage.test.tsx) para que un mezclado entre
//       "creado" y "expira" no pase desapercibido por coincidencia.
const FECHA_CREACION = "2026-02-10T08:00:00Z";
const FECHA_EXPIRACION = "2026-11-30T23:59:59Z";

const NOVEDAD: Novedad = {
  id_novedad: "00000000-0000-7000-8000-000000000030",
  alcance: "TODOS",
  texto: "Nueva funcionalidad de reportes disponible.",
  url_adjunto: null,
  fecha_expiracion: FECHA_EXPIRACION,
  created_at: FECHA_CREACION,
  editado: false,
  archivada: false,
};

function renderPage() {
  return renderWithProviders(<AdminNovedadesPage />, {
    authContext: { user: mockUser, isAuthenticated: true, accessToken: "token" },
  });
}

describe("AdminNovedadesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListar.mockResolvedValue([]);
  });

  it("muestra la fecha de creación y de expiración de cada novedad", async () => {
    mockListar.mockResolvedValue([NOVEDAD]);
    renderPage();

    const creadoEsperado = new Date(FECHA_CREACION).toLocaleDateString();
    const expiraEsperado = new Date(FECHA_EXPIRACION).toLocaleDateString(undefined, { timeZone: "UTC" });

    await waitFor(() => {
      expect(screen.getByText(`Creado el ${creadoEsperado}`)).toBeInTheDocument();
      expect(screen.getByText(`Expira el ${expiraEsperado}`)).toBeInTheDocument();
    });
  });

  it("muestra un estado vacío cuando no hay novedades", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Todavía no has publicado ninguna novedad.")).toBeInTheDocument();
    });
  });
});
