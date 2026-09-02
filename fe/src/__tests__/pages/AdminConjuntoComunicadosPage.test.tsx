/**
 * Archivo: __tests__/pages/AdminConjuntoComunicadosPage.test.tsx
 * Descripción: Tests del listado de comunicados del Admin de Conjunto.
 * ¿Para qué? El profesor pidió que se muestre la fecha de creación junto a
 *           la de expiración (issue #165) — estas pruebas cubren que ambas
 *           aparecen en cada tarjeta del listado, con el formato correcto.
 */
import { screen, waitFor } from "@testing-library/react";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { AdminConjuntoComunicadosPage } from "@/pages/AdminConjuntoComunicadosPage";
import { renderWithProviders, mockUser } from "../helpers";
import type { Comunicado } from "@/lib/comunicadosApi";
import type { ConjuntoAdministrado } from "@/lib/conjuntoPanelApi";

const mockListar = vi.fn();
const mockObtenerConjuntos = vi.fn();

vi.mock("@/lib/comunicadosApi", () => ({
  listarMisComunicados: (...args: unknown[]) => mockListar(...args),
  crearComunicado: vi.fn(),
  editarComunicado: vi.fn(),
  eliminarComunicado: vi.fn(),
}));

vi.mock("@/lib/conjuntoPanelApi", () => ({
  obtenerMisConjuntos: (...args: unknown[]) => mockObtenerConjuntos(...args),
}));

const CONJUNTO: ConjuntoAdministrado = {
  id_conjunto_residencial: "00000000-0000-7000-8000-000000000010",
  nombre_conjunto: "Conjunto de Prueba",
  nit: null,
  direccion: "Calle Falsa 123",
  nombre_localidad: "Usaquén",
  tiene_solicitud_pendiente: false,
};

// ¿Qué? Se usan fechas alejadas entre sí (creación en enero, expiración en
//       diciembre) para que un error que confunda una fecha con la otra no
//       pase desapercibido por coincidencia.
const FECHA_CREACION = "2026-01-15T10:30:00Z";
const FECHA_EXPIRACION = "2026-12-31T23:59:59Z";

const COMUNICADO: Comunicado = {
  id_comunicado: "00000000-0000-7000-8000-000000000020",
  id_conjunto_residencial: CONJUNTO.id_conjunto_residencial,
  nombre_conjunto: CONJUNTO.nombre_conjunto,
  destinatarios: "AMBOS",
  tipo: "INFORMATIVO",
  texto: "Se realizará mantenimiento de ascensores.",
  url_adjunto: null,
  fecha_evento: null,
  fecha_expiracion: FECHA_EXPIRACION,
  created_at: FECHA_CREACION,
  editado: false,
};

function renderPage() {
  return renderWithProviders(<AdminConjuntoComunicadosPage />, {
    authContext: { user: mockUser, isAuthenticated: true, accessToken: "token" },
  });
}

describe("AdminConjuntoComunicadosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObtenerConjuntos.mockResolvedValue([CONJUNTO]);
    mockListar.mockResolvedValue([]);
  });

  it("muestra la fecha de creación y de expiración de cada comunicado", async () => {
    mockListar.mockResolvedValue([COMUNICADO]);
    renderPage();

    // ¿Qué? No se hardcodea el string de fecha esperado — se calcula con el
    //       mismo formateo que usa el componente, para no depender de qué
    //       locale ICU tenga configurado el entorno donde corran los tests.
    const creadoEsperado = new Date(FECHA_CREACION).toLocaleDateString();
    const expiraEsperado = new Date(FECHA_EXPIRACION).toLocaleDateString(undefined, { timeZone: "UTC" });

    await waitFor(() => {
      expect(screen.getByText(`Creado el ${creadoEsperado}`)).toBeInTheDocument();
      expect(screen.getByText(`Expira el ${expiraEsperado}`)).toBeInTheDocument();
    });
  });

  it("muestra un estado vacío cuando el admin no tiene comunicados", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Todavía no has publicado ningún comunicado.")).toBeInTheDocument();
    });
  });
});
