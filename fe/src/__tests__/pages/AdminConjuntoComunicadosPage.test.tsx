/**
 * Archivo: __tests__/pages/AdminConjuntoComunicadosPage.test.tsx
 * Descripción: Tests del listado de comunicados del Admin de Conjunto.
 * ¿Para qué? El profesor pidió que se muestre la fecha de creación junto a
 *           la de expiración (issue #165) — estas pruebas cubren que ambas
 *           aparecen en cada tarjeta del listado, con el formato correcto.
 */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { API_BASE_URL } from "@/api/axios";
import { AdminConjuntoComunicadosPage } from "@/pages/AdminConjuntoComunicadosPage";
import { renderWithProviders, mockUser } from "../helpers";
import type { Comunicado } from "@/lib/comunicadosApi";
import type { ConjuntoAdministrado } from "@/lib/conjuntoPanelApi";

const mockListar = vi.fn();
const mockObtenerConjuntos = vi.fn();
const mockCrear = vi.fn();
const mockEditar = vi.fn();

vi.mock("@/lib/comunicadosApi", () => ({
  listarMisComunicados: (...args: unknown[]) => mockListar(...args),
  crearComunicado: (...args: unknown[]) => mockCrear(...args),
  editarComunicado: (...args: unknown[]) => mockEditar(...args),
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
  codigo_acceso: "AB3K9Q",
  total_apartamentos: null,
  apartamentos_registrados: 0,
  residentes_registrados: 0,
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

// ¿Qué? Fecha "AAAA-MM-DD" a N días de hoy, en UTC como el formulario.
function fechaEnDias(dias: number): string {
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function renderPage() {
  return renderWithProviders(<AdminConjuntoComunicadosPage />, {
    authContext: { user: mockUser, isAuthenticated: true },
  });
}

describe("AdminConjuntoComunicadosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObtenerConjuntos.mockResolvedValue([CONJUNTO]);
    mockListar.mockResolvedValue({ items: [], total: 0 });
  });

  it("muestra la fecha de creación y de expiración de cada comunicado", async () => {
    mockListar.mockResolvedValue({ items: [COMUNICADO], total: 1 });
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

  // ¿Qué? Issue #400 (CN-048): el adjunto pasa por enlaceAdjuntoSeguro.
  it("pinta el adjunto subido a VerdeApp y no pinta uno inseguro", async () => {
    mockListar.mockResolvedValue({
      items: [
        { ...COMUNICADO, id_comunicado: "c-seguro", texto: "Con adjunto seguro.", url_adjunto: "/uploads/adjuntos/circular.pdf" },
        { ...COMUNICADO, id_comunicado: "c-malo", texto: "Con adjunto inseguro.", url_adjunto: "/uploads/%2e%2e/api/v1/users/me" },
      ],
      total: 2,
    });
    renderPage();

    await screen.findByText("Con adjunto inseguro.");
    const enlaces = screen.getAllByRole("link", { name: "Ver adjunto" });
    expect(enlaces).toHaveLength(1);
    expect(enlaces[0]).toHaveAttribute("href", `${API_BASE_URL}/uploads/adjuntos/circular.pdf`);
  });

  it("muestra un estado vacío cuando el admin no tiene comunicados", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Todavía no has publicado ningún comunicado.")).toBeInTheDocument();
    });
  });

  it("muestra la paginación y pide la siguiente página al hacer clic en la flecha", async () => {
    // ¿Qué? Issue #11 — con 20 comunicados en total y 8 por página, debe
    //       mostrar "1–8 de 20" y, al avanzar, pedir offset=8.
    mockListar.mockResolvedValue({ items: [COMUNICADO], total: 20 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Mostrando 1–8 de 20");

    await user.click(screen.getByRole("button", { name: "Página siguiente" }));

    await waitFor(() => {
      expect(mockListar).toHaveBeenLastCalledWith(8, 8);
    });
  });

  // ¿Qué? El selector de "Destinatarios" es un grupo de botones mutuamente
  //       excluyentes — debe exponer role="radiogroup"/"radio" y
  //       aria-checked, no solo distinguir la opción elegida con una clase
  //       CSS (re-auditoría de accesibilidad post-#16).
  it("el selector de destinatarios usa semántica de radiogroup", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Nuevo comunicado" }));

    const residentes = await screen.findByRole("radio", { name: "Residentes" });
    const ambos = screen.getByRole("radio", { name: "Ambos" });
    expect(residentes).toHaveAttribute("aria-checked", "false");
    expect(ambos).toHaveAttribute("aria-checked", "true");

    await user.click(residentes);
    expect(residentes).toHaveAttribute("aria-checked", "true");
    expect(ambos).toHaveAttribute("aria-checked", "false");
  });

  // ¿Qué? Issue #352 — el texto no deja escribir más de lo que acepta el
  //       backend, y el contador avisa cuánto queda.
  it("limita el mensaje del comunicado y muestra el contador de caracteres", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Nuevo comunicado" }));
    const texto = await screen.findByLabelText(/Mensaje/);
    expect(texto).toHaveAttribute("maxLength", "2000");

    await user.type(texto, "Hola");
    expect(screen.getByText("4/2000 caracteres")).toBeInTheDocument();
  });

  // ¿Qué? Issue #367 — un comunicado con fecha pasada nacía vencido: el
  //       residente recibía la notificación pero no lo veía en su feed.
  describe("fecha de expiración", () => {
    it("el calendario solo ofrece desde hoy hasta un año", async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole("button", { name: "Nuevo comunicado" }));

      const campo = await screen.findByLabelText(/Fecha de expiración/);
      expect(campo).toHaveAttribute("min", fechaEnDias(0));
      expect(campo).toHaveAttribute("max", fechaEnDias(365));
    });

    it("una fecha pasada muestra el error bajo el campo al salir y no publica", async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole("button", { name: "Nuevo comunicado" }));
      await user.type(await screen.findByLabelText(/Mensaje/), "Se va el agua mañana.");

      const campo = screen.getByLabelText(/Fecha de expiración/);
      fireEvent.change(campo, { target: { value: fechaEnDias(-1) } });
      fireEvent.blur(campo);

      const error = screen.getByRole("alert");
      expect(error).toHaveTextContent("La fecha debe ser hoy o una fecha futura.");
      expect(campo).toHaveAttribute("aria-invalid", "true");
      expect(campo).toHaveAttribute("aria-describedby", error.id);

      await user.click(screen.getByRole("button", { name: "Guardar" }));
      expect(mockCrear).not.toHaveBeenCalled();
    });

    it("una fecha a más de un año muestra el error y no publica", async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole("button", { name: "Nuevo comunicado" }));
      await user.type(await screen.findByLabelText(/Mensaje/), "Aviso muy lejano.");

      const campo = screen.getByLabelText(/Fecha de expiración/);
      fireEvent.change(campo, { target: { value: fechaEnDias(400) } });
      fireEvent.blur(campo);

      expect(screen.getByRole("alert")).toHaveTextContent("La fecha no puede superar 365 días desde hoy.");
      await user.click(screen.getByRole("button", { name: "Guardar" }));
      expect(mockCrear).not.toHaveBeenCalled();
    });

    it("al editar un comunicado ya vencido pide una fecha nueva antes de guardar", async () => {
      const user = userEvent.setup();
      mockListar.mockResolvedValue({
        items: [{ ...COMUNICADO, fecha_expiracion: `${fechaEnDias(-4)}T23:59:59Z` }],
        total: 1,
      });
      renderPage();

      await user.click(await screen.findByRole("button", { name: /Editar/ }));
      const dialogo = await screen.findByRole("dialog");
      await user.click(within(dialogo).getByRole("button", { name: "Guardar" }));

      expect(within(dialogo).getByRole("alert")).toHaveTextContent("La fecha debe ser hoy o una fecha futura.");
      expect(mockEditar).not.toHaveBeenCalled();
    });
  });
});
