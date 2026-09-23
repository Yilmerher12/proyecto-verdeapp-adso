/**
 * Archivo: __tests__/pages/AdminNovedadesPage.test.tsx
 * Descripción: Tests del panel de novedades del Admin del Sistema
 *              (RQF-015): listado con fechas, paginación, filtros (alcance,
 *              archivadas, búsqueda — todos viajan al backend), lista
 *              recogible y el formulario con "Más opciones" (conjunto
 *              específico, adjunto y video).
 * ¿Para qué? La página usa la API de novedades (mockeada) y, aparte, axios
 *           directo para el buscador de conjuntos — por eso se mockea
 *           también "axios", igual que AdminContenidoEducativoPage.test.tsx.
 */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { AdminNovedadesPage } from "@/pages/AdminNovedadesPage";
import { renderWithProviders, mockUser } from "../helpers";
import type { Novedad } from "@/lib/novedadesApi";

const mockListar = vi.fn();
const mockCrear = vi.fn();
const mockEditar = vi.fn();
const mockAxiosGet = vi.fn();

vi.mock("@/lib/novedadesApi", () => ({
  listarTodasLasNovedades: (...args: unknown[]) => mockListar(...args),
  crearNovedad: (...args: unknown[]) => mockCrear(...args),
  editarNovedad: (...args: unknown[]) => mockEditar(...args),
  archivarNovedad: vi.fn(),
}));

vi.mock("axios", () => {
  const instance = {
    get: (...args: unknown[]) => mockAxiosGet(...args),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    defaults: {},
  };
  return { default: { ...instance, create: () => instance } };
});

// ¿Qué? Fechas alejadas entre sí (ver mismo criterio en
//       AdminConjuntoComunicadosPage.test.tsx) para que un mezclado entre
//       "creado" y "expira" no pase desapercibido por coincidencia.
const FECHA_CREACION = "2026-02-10T08:00:00Z";
const FECHA_EXPIRACION = "2099-11-30T23:59:59Z";

const NOVEDAD: Novedad = {
  id_novedad: "00000000-0000-7000-8000-000000000030",
  alcance: "TODOS",
  texto: "Nueva funcionalidad de reportes disponible.",
  url_adjunto: null,
  url_video: null,
  conjuntos: [],
  fecha_expiracion: FECHA_EXPIRACION,
  created_at: FECHA_CREACION,
  editado: false,
  archivada: false,
};

const CONJUNTO = { id_conjunto_residencial: "c-1", nombre_conjunto: "Torres de Aranjuez", nombre_localidad: "Usaquén" };
const CONJUNTO_2 = { id_conjunto_residencial: "c-2", nombre_conjunto: "Conjunto Los Alpes", nombre_localidad: "Suba" };

function renderPage() {
  return renderWithProviders(<AdminNovedadesPage />, {
    authContext: { user: mockUser, isAuthenticated: true },
  });
}

describe("AdminNovedadesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListar.mockResolvedValue({ items: [], total: 0 });
    mockAxiosGet.mockResolvedValue({ data: [CONJUNTO] });
    mockCrear.mockResolvedValue(NOVEDAD);
    mockEditar.mockResolvedValue(NOVEDAD);
  });

  it("muestra la fecha de creación y de expiración de cada novedad", async () => {
    mockListar.mockResolvedValue({ items: [NOVEDAD], total: 1 });
    renderPage();

    const creadoEsperado = new Date(FECHA_CREACION).toLocaleDateString();
    const expiraEsperado = new Date(FECHA_EXPIRACION).toLocaleDateString(undefined, { timeZone: "UTC" });

    await waitFor(() => {
      expect(screen.getByText(`Creado el ${creadoEsperado}`)).toBeInTheDocument();
      expect(screen.getByText(`Expira el ${expiraEsperado}`)).toBeInTheDocument();
    });
  });

  it("muestra la paginación y pide la siguiente página al hacer clic en la flecha", async () => {
    // ¿Qué? Issue #227 — con 20 novedades en total y 8 por página, debe
    //       mostrar "1–8 de 20" y, al avanzar, pedir offset=8.
    mockListar.mockResolvedValue({ items: [NOVEDAD], total: 20 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Mostrando 1–8 de 20");

    await user.click(screen.getByRole("button", { name: "Página siguiente" }));

    await waitFor(() => {
      expect(mockListar).toHaveBeenLastCalledWith(8, 8, expect.objectContaining({ incluirArchivadas: false }));
    });
  });

  it("muestra un estado vacío cuando no hay novedades", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Todavía no has publicado ninguna novedad.")).toBeInTheDocument();
    });
  });

  // ¿Qué? El selector de "Alcance" es un grupo de botones mutuamente
  //       excluyentes — debe exponer role="radiogroup"/"radio" y
  //       aria-checked (re-auditoría de accesibilidad post-#16).
  it("el selector de alcance usa semántica de radiogroup", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Nueva novedad" }));

    const todos = await screen.findByRole("radio", { name: "Todos" });
    const residentes = screen.getByRole("radio", { name: "Residentes" });
    expect(todos).toHaveAttribute("aria-checked", "true");
    expect(residentes).toHaveAttribute("aria-checked", "false");

    await user.click(residentes);
    expect(residentes).toHaveAttribute("aria-checked", "true");
    expect(todos).toHaveAttribute("aria-checked", "false");
  });

  describe("filtros y lista recogible", () => {
    it("por defecto pide la lista sin archivadas y sin filtro de alcance", async () => {
      renderPage();
      await waitFor(() => {
        expect(mockListar).toHaveBeenCalledWith(8, 0, { alcance: undefined, incluirArchivadas: false, search: "" });
      });
    });

    it("los chips no repiten 'Todas' y 'Todos': solo 'Todas' (sin filtro) y los tres roles", async () => {
      renderPage();
      await screen.findByText("Todavía no has publicado ninguna novedad.");

      expect(screen.getByRole("button", { name: "Todas" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Todos" })).not.toBeInTheDocument();
      for (const rol of ["Residentes", "Recicladores", "Administradores de Conjunto"]) {
        expect(screen.getByRole("button", { name: rol })).toBeInTheDocument();
      }
    });

    it("filtra por alcance en el servidor y vuelve a la primera página", async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText("Todavía no has publicado ninguna novedad.");

      await user.click(screen.getByRole("button", { name: "Residentes" }));

      await waitFor(() => {
        expect(mockListar).toHaveBeenLastCalledWith(8, 0, expect.objectContaining({ alcance: "RESIDENTES" }));
      });
      // ¿Qué? Con un filtro activo, el vacío ya no dice "no has publicado
      //       nada" (sería falso) sino que no hay coincidencias.
      expect(await screen.findByText("No hay novedades con esos filtros.")).toBeInTheDocument();
    });

    it("'Ver archivadas' incluye las archivadas al activarse", async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText("Todavía no has publicado ninguna novedad.");

      const interruptor = screen.getByRole("switch", { name: "Ver archivadas" });
      expect(interruptor).toHaveAttribute("aria-checked", "false");
      await user.click(interruptor);

      expect(interruptor).toHaveAttribute("aria-checked", "true");
      await waitFor(() => {
        expect(mockListar).toHaveBeenLastCalledWith(8, 0, expect.objectContaining({ incluirArchivadas: true }));
      });
    });

    it("la búsqueda viaja al servidor (con un pequeño retraso, no con cada tecla)", async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText("Todavía no has publicado ninguna novedad.");

      await user.type(screen.getByPlaceholderText("Buscar en el texto de la novedad…"), "vidrio");

      await waitFor(() => {
        expect(mockListar).toHaveBeenLastCalledWith(8, 0, expect.objectContaining({ search: "vidrio" }));
      });
      // Nunca se pidió una búsqueda a medias ("v", "vi", ...).
      expect(mockListar).not.toHaveBeenCalledWith(8, 0, expect.objectContaining({ search: "vi" }));
    });

    it("la barra recoge y expande todo el contenido de la lista", async () => {
      mockListar.mockResolvedValue({ items: [NOVEDAD], total: 1 });
      const user = userEvent.setup();
      renderPage();
      await screen.findByText(NOVEDAD.texto);

      await user.click(screen.getByRole("button", { name: /Recoger/ }));
      expect(screen.queryByText(NOVEDAD.texto)).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText("Buscar en el texto de la novedad…")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /Ver novedades/ }));
      expect(await screen.findByText(NOVEDAD.texto)).toBeInTheDocument();
    });
  });

  describe("tarjetas", () => {
    it("indica a qué conjuntos va cada novedad: todos, uno o varios", async () => {
      mockListar.mockResolvedValue({
        items: [
          NOVEDAD,
          { ...NOVEDAD, id_novedad: "n2", texto: "Solo para un conjunto.", conjuntos: [CONJUNTO] },
          { ...NOVEDAD, id_novedad: "n3", texto: "Para dos conjuntos.", conjuntos: [CONJUNTO, CONJUNTO_2] },
        ],
        total: 3,
      });
      renderPage();

      expect(await screen.findByText("Todos los conjuntos")).toBeInTheDocument();
      expect(screen.getByText("Torres de Aranjuez")).toBeInTheDocument();
      // ¿Qué? El mock de t() no pluraliza — "2 conjuntos" sale del texto
      //       "{{count}} conjuntos" tal cual, sin depender de la forma plural.
      expect(screen.getByText("2 conjuntos")).toBeInTheDocument();
      expect(screen.getByText("Torres de Aranjuez · Conjunto Los Alpes")).toBeInTheDocument();
    });

    it("marca 'Expira en N días' cuando vence en una semana o menos", async () => {
      const enTresDias = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      mockListar.mockResolvedValue({ items: [{ ...NOVEDAD, fecha_expiracion: enTresDias }], total: 1 });
      renderPage();

      // ¿Qué? El mock de t() no pluraliza (siempre singular) — se acepta
      //       tanto "día" como "días" con un regex sin la "s" final.
      expect(await screen.findByText(/Expira en 3 día/)).toBeInTheDocument();
    });

    it("no marca 'Expira en' cuando falta más de una semana", async () => {
      mockListar.mockResolvedValue({ items: [NOVEDAD], total: 1 });
      renderPage();
      await screen.findByText(NOVEDAD.texto);
      expect(screen.queryByText(/Expira en \d+ día/)).not.toBeInTheDocument();
    });

    it("muestra el enlace al video cuando la novedad lo trae", async () => {
      mockListar.mockResolvedValue({ items: [{ ...NOVEDAD, url_video: "https://www.youtube.com/watch?v=abc123DEF45" }], total: 1 });
      renderPage();

      const enlace = await screen.findByRole("link", { name: "Ver video" });
      expect(enlace).toHaveAttribute("href", "https://www.youtube.com/watch?v=abc123DEF45");
    });
  });

  describe("formulario: Conjuntos y Más opciones", () => {
    async function abrirFormulario(user: ReturnType<typeof userEvent.setup>) {
      await user.click(await screen.findByRole("button", { name: "Nueva novedad" }));
      return screen.findByRole("dialog", { name: "Nueva novedad" });
    }

    it("muestra Conjuntos siempre visible, sin ninguno elegido, y no deja publicar", async () => {
      const user = userEvent.setup();
      renderPage();
      const dialogo = await abrirFormulario(user);

      expect(within(dialogo).getByRole("radio", { name: "Elegir uno o varios" })).toHaveAttribute("aria-checked", "true");
      expect(within(dialogo).getByRole("radio", { name: "Todos los conjuntos" })).toHaveAttribute("aria-checked", "false");
      expect(within(dialogo).getByText("Elige al menos un conjunto para poder publicar.")).toBeInTheDocument();

      // Aunque ya haya mensaje, sin conjuntos el botón sigue bloqueado.
      await user.type(within(dialogo).getByLabelText(/Mensaje/), "Reunión presencial.");
      expect(within(dialogo).getByRole("button", { name: "Completa el formulario" })).toBeDisabled();
      expect(mockCrear).not.toHaveBeenCalled();
    });

    it("'Más opciones' empieza recogido y al abrirlo trae adjunto y video (ya no el conjunto)", async () => {
      const user = userEvent.setup();
      renderPage();
      const dialogo = await abrirFormulario(user);

      expect(within(dialogo).queryByLabelText(/Enlace de video/)).not.toBeInTheDocument();

      await user.click(within(dialogo).getByRole("button", { name: /Más opciones/ }));

      expect(within(dialogo).getByLabelText(/Enlace de video/)).toBeInTheDocument();
      expect(within(dialogo).getByText(/Imagen o archivo adjunto/)).toBeInTheDocument();
      // El selector de conjuntos sigue siendo uno solo, el de arriba.
      expect(within(dialogo).getAllByRole("radio", { name: "Todos los conjuntos" })).toHaveLength(1);
    });

    it("marcar 'Todos los conjuntos' avisa que es masivo y deja publicar sin mandar ids", async () => {
      const user = userEvent.setup();
      renderPage();
      const dialogo = await abrirFormulario(user);

      await user.click(within(dialogo).getByRole("radio", { name: "Todos los conjuntos" }));
      expect(within(dialogo).getByText(/Es un aviso masivo/)).toBeInTheDocument();

      await user.type(within(dialogo).getByLabelText(/Mensaje/), "Aviso general.");
      await user.click(within(dialogo).getByRole("button", { name: "Guardar" }));

      await waitFor(() => {
        expect(mockCrear).toHaveBeenCalledWith(
          expect.objectContaining({ alcance: "TODOS", texto: "Aviso general.", conjuntos: [], url_video: null })
        );
      });
    });

    it("publica para varios conjuntos, con video", async () => {
      mockAxiosGet.mockImplementation((_url: string, config?: { params?: { search?: string } }) =>
        Promise.resolve({ data: config?.params?.search?.includes("Alpes") ? [CONJUNTO_2] : [CONJUNTO] })
      );
      const user = userEvent.setup();
      renderPage();
      const dialogo = await abrirFormulario(user);

      await user.type(within(dialogo).getByLabelText(/Mensaje/), "Reunión presencial.");

      const buscador = within(dialogo).getByRole("combobox", { name: "Conjuntos" });
      await user.type(buscador, "Torres");
      await user.click(await within(dialogo).findByText(/Torres de Aranjuez/));
      // ¿Qué? El buscador conserva lo escrito ("Torres") al elegir — lo que se
      //       escribe ahora se suma, y la búsqueda pasa a incluir "Alpes".
      await user.type(buscador, "Alpes");
      await user.click(await within(dialogo).findByText(/Conjunto Los Alpes/));
      // ¿Qué? El combobox de selección múltiple deja su lista abierta y
      //       oculta (aria-hidden) el resto del modal hasta cerrarla.
      await user.keyboard("{Escape}");

      // ¿Qué? El mock de t() no pluraliza: sale "2 conjunto" — el regex sin la
      //       "s" final sirve igual con el i18next real ("2 conjuntos").
      expect(within(dialogo).getByText(/^2 conjunto/)).toBeInTheDocument();

      await user.click(within(dialogo).getByRole("button", { name: /Más opciones/ }));
      await user.type(within(dialogo).getByLabelText(/Enlace de video/), "https://www.youtube.com/watch?v=abc123DEF45");
      await user.click(within(dialogo).getByRole("button", { name: "Guardar" }));

      await waitFor(() => {
        expect(mockCrear).toHaveBeenCalledWith(
          expect.objectContaining({
            texto: "Reunión presencial.",
            conjuntos: ["c-1", "c-2"],
            url_video: "https://www.youtube.com/watch?v=abc123DEF45",
          })
        );
      });
    });

    it("al editar, los conjuntos quedan fijos (solo se ven) y sí se puede cambiar el video", async () => {
      mockListar.mockResolvedValue({
        items: [{ ...NOVEDAD, conjuntos: [CONJUNTO, CONJUNTO_2] }],
        total: 1,
      });
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: /Editar Nueva funcionalidad/ }));
      const dialogo = await screen.findByRole("dialog", { name: "Editar novedad" });

      expect(within(dialogo).getByText(/Torres de Aranjuez, Conjunto Los Alpes/)).toBeInTheDocument();
      expect(within(dialogo).queryByRole("radio", { name: "Elegir uno o varios" })).not.toBeInTheDocument();

      await user.click(within(dialogo).getByRole("button", { name: /Más opciones/ }));
      await user.type(within(dialogo).getByLabelText(/Enlace de video/), "https://youtu.be/abc123DEF45");
      await user.click(within(dialogo).getByRole("button", { name: "Guardar" }));

      await waitFor(() => {
        expect(mockEditar).toHaveBeenCalledWith(
          NOVEDAD.id_novedad,
          expect.objectContaining({ url_video: "https://youtu.be/abc123DEF45" })
        );
      });
      // ¿Qué? EditarNovedadPayload a propósito no lleva conjuntos ni alcance.
      expect(mockEditar.mock.calls[0][1]).not.toHaveProperty("conjuntos");
    });
  });
});
