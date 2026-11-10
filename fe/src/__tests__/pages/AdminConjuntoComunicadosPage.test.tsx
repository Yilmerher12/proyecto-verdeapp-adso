/**
 * Archivo: __tests__/pages/AdminConjuntoComunicadosPage.test.tsx
 * Descripción: Tests del listado de comunicados del Admin de Conjunto (pestañas Vigentes y Vencidos, filas dentro de
 *              una tarjeta, paginación de 10 en 10 desde el servidor y orden del formulario; issue #632).
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
const FECHA_EXPIRACION = "2099-12-31T23:59:59Z";

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

  it("muestra un estado vacío cuando el admin no tiene comunicados vigentes", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/No tienes comunicados vigentes/)).toBeInTheDocument();
    });
  });

  it("muestra la paginación y pide la siguiente página al hacer clic en la flecha", async () => {
    // ¿Qué? Issue #11 (y #632: de 10 en 10) — con 20 comunicados en total y 10 por página, debe
    //       mostrar "1–10 de 20" y, al avanzar, pedir offset=10 con la misma vigencia.
    mockListar.mockResolvedValue({ items: [COMUNICADO], total: 20 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Mostrando 1–10 de 20");

    await user.click(screen.getByRole("button", { name: "Página siguiente" }));

    await waitFor(() => {
      expect(mockListar).toHaveBeenLastCalledWith(10, 10, "VIGENTES");
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

  describe("pestañas Vigentes y Vencidos (issue #632)", () => {
    const VENCIDO: Comunicado = {
      ...COMUNICADO,
      id_comunicado: "c-vencido",
      texto: "Ya pasó el corte de agua.",
      fecha_expiracion: "2026-01-20T23:59:59Z",
    };

    it("empieza en Vigentes y pide al servidor la primera página de 10 vigentes", async () => {
      renderPage();

      await screen.findByText(/No tienes comunicados vigentes/);
      expect(screen.getByRole("tab", { name: "Vigentes" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tab", { name: "Vencidos" })).toHaveAttribute("aria-selected", "false");
      expect(mockListar).toHaveBeenCalledWith(10, 0, "VIGENTES");
    });

    it("al pasar a Vencidos pide los vencidos desde la primera página", async () => {
      mockListar.mockImplementation((_limit: number, _offset: number, vigencia: string) =>
        Promise.resolve(vigencia === "VENCIDOS" ? { items: [VENCIDO], total: 1 } : { items: [COMUNICADO], total: 1 }),
      );
      const user = userEvent.setup();
      renderPage();
      await screen.findByText(COMUNICADO.texto);

      await user.click(screen.getByRole("tab", { name: "Vencidos" }));

      expect(await screen.findByText(VENCIDO.texto)).toBeInTheDocument();
      expect(screen.queryByText(COMUNICADO.texto)).not.toBeInTheDocument();
      expect(mockListar).toHaveBeenLastCalledWith(10, 0, "VENCIDOS");
    });

    it("vuelve a la primera página al cambiar de pestaña", async () => {
      mockListar.mockResolvedValue({ items: [COMUNICADO], total: 25 });
      const user = userEvent.setup();
      renderPage();
      await screen.findByText("Mostrando 1–10 de 25");
      await user.click(screen.getByRole("button", { name: "Página siguiente" }));
      await waitFor(() => expect(mockListar).toHaveBeenLastCalledWith(10, 10, "VIGENTES"));

      await user.click(screen.getByRole("tab", { name: "Vencidos" }));

      await waitFor(() => expect(mockListar).toHaveBeenLastCalledWith(10, 0, "VENCIDOS"));
    });

    it("sin comunicados vencidos explica que todavía no hay ninguno", async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText(/No tienes comunicados vigentes/);

      await user.click(screen.getByRole("tab", { name: "Vencidos" }));

      expect(await screen.findByText("Todavía no tienes comunicados vencidos.")).toBeInTheDocument();
    });

    it("un vencido dice «Venció el» y no «Expira el»; un vigente al revés", async () => {
      mockListar.mockResolvedValue({ items: [VENCIDO, COMUNICADO], total: 2 });
      renderPage();

      await screen.findByText(VENCIDO.texto);
      expect(screen.getAllByText(/^Venció el /)).toHaveLength(1);
      expect(screen.getAllByText(/^Expira el /)).toHaveLength(1);
    });

    it("la franja de la izquierda tiene el color del tipo y se vuelve gris cuando venció", async () => {
      mockListar.mockResolvedValue({
        items: [
          { ...COMUNICADO, id_comunicado: "u", tipo: "URGENTE", texto: "Urgente vigente." },
          { ...VENCIDO, tipo: "URGENTE" },
        ],
        total: 2,
      });
      renderPage();

      const franjaVigente = (await screen.findByText("Urgente vigente.")).closest("li")!.firstElementChild!;
      const franjaVencida = screen.getByText(VENCIDO.texto).closest("li")!.firstElementChild!;
      expect(franjaVigente).toHaveClass("bg-red-500");
      expect(franjaVencida).toHaveClass("bg-gray-300");
      expect(franjaVencida).not.toHaveClass("bg-red-500");
    });

    it("la franja de cada tipo usa su propio color", async () => {
      mockListar.mockResolvedValue({
        items: [
          { ...COMUNICADO, id_comunicado: "a", tipo: "INFORMATIVO", texto: "Informativo." },
          { ...COMUNICADO, id_comunicado: "b", tipo: "CONVOCATORIA", texto: "Convocatoria." },
          { ...COMUNICADO, id_comunicado: "c", tipo: "MANTENIMIENTO", texto: "Mantenimiento." },
          { ...COMUNICADO, id_comunicado: "d", tipo: "RECICLAJE", texto: "Reciclaje." },
        ],
        total: 4,
      });
      renderPage();

      await screen.findByText("Informativo.");
      const color = (texto: string) => screen.getByText(texto).closest("li")!.firstElementChild!;
      expect(color("Informativo.")).toHaveClass("bg-blue-500");
      expect(color("Convocatoria.")).toHaveClass("bg-purple-500");
      expect(color("Mantenimiento.")).toHaveClass("bg-amber-500");
      expect(color("Reciclaje.")).toHaveClass("bg-accent-600");
    });

    it("las filas, las pestañas y la paginación viven en la misma tarjeta", async () => {
      mockListar.mockResolvedValue({ items: [COMUNICADO], total: 25 });
      renderPage();

      const fila = await screen.findByText(COMUNICADO.texto);
      const pestanas = screen.getByRole("tablist", { name: "Vigencia de los comunicados" });
      expect(pestanas.parentElement).toContainElement(fila);
      expect(pestanas.parentElement).toContainElement(screen.getByText("Mostrando 1–10 de 25"));
    });

    it("con 10 comunicados o menos la barra de paginación se ve igual, con las flechas apagadas", async () => {
      mockListar.mockResolvedValue({ items: [COMUNICADO], total: 10 });
      renderPage();

      await screen.findByText(COMUNICADO.texto);
      expect(screen.getByText("Mostrando 1–10 de 10")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Página siguiente" })).toBeDisabled();
    });

    it("si falla la carga muestra un aviso de error en vez de la lista vacía", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      mockListar.mockRejectedValue(new Error("Network Error"));
      renderPage();

      expect(await screen.findByText("No se pudo cargar la información. Intenta de nuevo más tarde.")).toBeInTheDocument();
      expect(screen.queryByText(/No tienes comunicados vigentes/)).not.toBeInTheDocument();
    });

    it("publicar desde la pestaña Vencidos lleva a Vigentes, donde nace el comunicado nuevo", async () => {
      mockCrear.mockResolvedValue({});
      const user = userEvent.setup();
      renderPage();
      await screen.findByText(/No tienes comunicados vigentes/);
      await user.click(screen.getByRole("tab", { name: "Vencidos" }));
      await screen.findByText("Todavía no tienes comunicados vencidos.");

      await user.click(screen.getByRole("button", { name: "Nuevo comunicado" }));
      await user.type(await screen.findByLabelText(/Mensaje/), "Aviso nuevo.");
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      await waitFor(() => expect(mockCrear).toHaveBeenCalled());
      await waitFor(() => expect(screen.getByRole("tab", { name: "Vigentes" })).toHaveAttribute("aria-selected", "true"));
      expect(mockListar).toHaveBeenLastCalledWith(10, 0, "VIGENTES");
    });
  });

  describe("orden del formulario (issue #632)", () => {
    // ¿Qué? Devuelve true si el primer elemento va antes que el segundo en el documento.
    const va_antes = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

    it("sigue el orden: para quién, qué dices, cuándo y la imagen al final", async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole("button", { name: "Nuevo comunicado" }));
      const dialogo = await screen.findByRole("dialog");

      const conjunto = within(dialogo).getByLabelText(/^Conjunto/);
      const destinatarios = within(dialogo).getByRole("radiogroup");
      const tipo = within(dialogo).getByLabelText(/Tipo de comunicado/);
      const mensaje = within(dialogo).getByLabelText(/Mensaje/);
      const expiracion = within(dialogo).getByLabelText(/Fecha de expiración/);
      const imagen = within(dialogo).getByText(/Imagen adjunta/);

      expect(va_antes(conjunto, destinatarios)).toBe(true);
      expect(va_antes(destinatarios, tipo)).toBe(true);
      expect(va_antes(tipo, mensaje)).toBe(true);
      expect(va_antes(mensaje, expiracion)).toBe(true);
      expect(va_antes(expiracion, imagen)).toBe(true);
    });

    it("con Convocatoria la fecha del evento va después del mensaje y junto a la de expiración", async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole("button", { name: "Nuevo comunicado" }));
      const dialogo = await screen.findByRole("dialog");
      await user.selectOptions(within(dialogo).getByLabelText(/Tipo de comunicado/), "CONVOCATORIA");

      const mensaje = within(dialogo).getByLabelText(/Mensaje/);
      const evento = within(dialogo).getByLabelText(/Fecha del evento/);
      const expiracion = within(dialogo).getByLabelText(/Fecha de expiración/);
      const imagen = within(dialogo).getByText(/Imagen adjunta/);

      expect(va_antes(mensaje, evento)).toBe(true);
      expect(va_antes(evento, expiracion)).toBe(true);
      expect(va_antes(expiracion, imagen)).toBe(true);
      // ¿Qué? Las dos fechas comparten fila (la misma rejilla de dos columnas).
      expect(evento.parentElement!.parentElement).toBe(expiracion.parentElement!.parentElement);
      expect(evento.parentElement!.parentElement).toHaveClass("sm:grid-cols-2");
    });

    it("sin Convocatoria no hay fecha del evento y la expiración va sola, a todo el ancho", async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole("button", { name: "Nuevo comunicado" }));
      const dialogo = await screen.findByRole("dialog");

      expect(within(dialogo).queryByLabelText(/Fecha del evento/)).not.toBeInTheDocument();
      const expiracion = within(dialogo).getByLabelText(/Fecha de expiración/);
      expect(expiracion.parentElement!.parentElement).not.toHaveClass("sm:grid-cols-2");
    });

    it("al editar, el conjunto y los destinatarios van arriba como dato fijo y el resto sigue el mismo orden", async () => {
      mockListar.mockResolvedValue({ items: [COMUNICADO], total: 1 });
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: /Editar/ }));
      const dialogo = await screen.findByRole("dialog");

      const fijo = within(dialogo).getByText(/El conjunto y los destinatarios no se pueden cambiar/);
      const tipo = within(dialogo).getByLabelText(/Tipo de comunicado/);
      const mensaje = within(dialogo).getByLabelText(/Mensaje/);
      const expiracion = within(dialogo).getByLabelText(/Fecha de expiración/);
      expect(va_antes(fijo, tipo)).toBe(true);
      expect(va_antes(tipo, mensaje)).toBe(true);
      expect(va_antes(mensaje, expiracion)).toBe(true);
    });

  });

  // ¿Qué? Issue #632 — ajustes de espacio pedidos al revisar la página con el usuario.
  describe("espacios y botón (issue #632)", () => {
    it("las pestañas Vigentes y Vencidos tienen margen a cada lado, como en Desempeño", async () => {
      renderPage();

      expect(await screen.findByRole("tablist", { name: "Vigencia de los comunicados" })).toHaveClass("mx-5");
    });

    it("la barra del tipo es delgada y no está pegada al borde de la tarjeta", async () => {
      mockListar.mockResolvedValue({ items: [COMUNICADO], total: 1 });
      renderPage();

      const fila = (await screen.findByText(COMUNICADO.texto)).closest("li")!;
      expect(fila).toHaveClass("px-5");
      expect(fila.firstElementChild).toHaveClass("w-[3px]");
    });

    it("el botón Nuevo comunicado no parte su texto y deja espacio con el título", async () => {
      renderPage();

      const boton = await screen.findByRole("button", { name: "Nuevo comunicado" });
      expect(boton).toHaveClass("whitespace-nowrap", "shrink-0");
      expect(boton.parentElement).toHaveClass("gap-4");
    });
  });
});
