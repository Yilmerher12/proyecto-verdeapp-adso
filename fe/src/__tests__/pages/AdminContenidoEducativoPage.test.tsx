/**
 * Archivo: __tests__/pages/AdminContenidoEducativoPage.test.tsx
 * Descripción: Tests del panel de administración del catálogo educativo
 *              (HU-012 crear, HU-013 editar, HU-014 eliminar) y del
 *              rediseño RQF-018: pestaña "Calificaciones por conjunto" por
 *              semana, "Sin recomendar", vista previa en vivo, y el envío
 *              manual de un módulo a uno o varios conjuntos.
 * ¿Para qué? La página usa axios directo (vía las funciones de
 *           contenidoEducativoApi/auditoriaConjuntoApi, y directo para el
 *           buscador de conjuntos) — se mockea "axios" una sola vez, igual
 *           que AdminDashboard.test.tsx, en vez de mockear cada módulo por
 *           separado.
 */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, afterEach } from "vitest";
import { AdminContenidoEducativoPage } from "@/pages/AdminContenidoEducativoPage";
import { renderWithProviders, mockUser } from "../helpers";
import type { ContenidoEducativo } from "@/lib/contenidoEducativoApi";
import type { AuditoriaAdmin } from "@/lib/auditoriaConjuntoApi";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock("axios", () => {
  const instance = {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    defaults: {},
  };
  return { default: { ...instance, create: () => instance } };
});

// ¿Qué? Hoy fijo (lunes 21 de septiembre de 2026, 10am UTC) — la página
//       calcula la semana en curso con la hora real del sistema
//       (lunesUTC()); sin fijarla, cada corrida navegaría una semana
//       distinta y las aserciones de "semana en curso"/"deshabilitar
//       siguiente" dejarían de ser confiables.
const HOY_FIJO = new Date("2026-09-21T10:00:00Z");
const SEMANA_ACTUAL = "2026-09-21";

const moduloExistente: ContenidoEducativo = {
  id_contenido: "00000000-0000-7000-8000-000000000001",
  modulo_categoria: "Separación en la fuente",
  titulo_tema: "Código de colores",
  cuerpo_texto: "Blanco, negro y verde. Separa bien tus residuos en casa.",
  url_video: null,
  url_guia: null,
  fecha_publicacion: "2026-08-18",
};

const califMalo: AuditoriaAdmin = {
  id_auditoria: "a1",
  id_conjunto_residencial: "c1",
  nombre_conjunto: "Torres de Aranjuez",
  nivel_desempeno: "DEFICIENTE",
  tema_educativo: "Separación en la fuente",
  descripcion: "Bolsas mezcladas en varios pisos.",
  ruta_evidencia: "/uploads/evidencias-auditoria/foto1.jpg",
  ruta_evidencia_2: null,
  ruta_evidencia_3: null,
  created_at: "2026-09-21T09:00:00Z",
  nombre_reciclador: "Carlos Gómez",
  avisados: 12,
};

const califBueno: AuditoriaAdmin = {
  id_auditoria: "a2",
  id_conjunto_residencial: "c2",
  nombre_conjunto: "Reserva de Prueba",
  nivel_desempeno: "BUENA",
  tema_educativo: "Tipos de residuos y su preparación",
  descripcion: null,
  ruta_evidencia: "/uploads/evidencias-auditoria/foto2.jpg",
  ruta_evidencia_2: null,
  ruta_evidencia_3: null,
  created_at: "2026-09-20T09:00:00Z",
  nombre_reciclador: "Marta Peña",
  avisados: 0,
};

// ¿Qué? Distingue las 4 rutas que golpea la página: catálogo, envíos de un
//       módulo, auditorías del Admin (por semana o "recientes"), y el
//       buscador de conjuntos — todas vacías por defecto. Cada test que
//       necesita datos puntuales llama a esta misma función como respaldo
//       (en vez de un "return Promise.resolve({ data: [] })" a ciegas), para
//       que /auditorias-conjunto/admin nunca devuelva un arreglo plano
//       donde el componente espera { items, total }.
function respuestaPorDefecto(url: string) {
  if (url.includes("/contenido-educativo") && url.includes("/envios")) return { data: [] };
  if (url.includes("/contenido-educativo")) return { data: [] };
  if (url.includes("/auditorias-conjunto/admin")) return { data: { items: [], total: 0 } };
  if (url.includes("/geography/conjuntos/todos")) return { data: [] };
  return { data: [] };
}

function mockRespuestasVacias() {
  mockGet.mockImplementation((url: string) => Promise.resolve(respuestaPorDefecto(url)));
}

function renderPage() {
  return renderWithProviders(<AdminContenidoEducativoPage />, {
    authContext: { user: mockUser, isAuthenticated: true },
  });
}

describe("AdminContenidoEducativoPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(HOY_FIJO);
    vi.clearAllMocks();
    mockRespuestasVacias();
    mockPost.mockResolvedValue({ data: {} });
    mockPut.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: undefined });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("muestra el título del panel y las dos pestañas", async () => {
    renderPage();
    expect(screen.getByText("Contenido educativo")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Calificaciones por conjunto/ })).toHaveAttribute("class", expect.stringContaining("bg-accent-700"));
    expect(screen.getByRole("button", { name: "Módulos" })).toBeInTheDocument();
  });

  it("el contenido de la pestaña se puede recoger y volver a expandir, sin esconder las pestañas", async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();
    await screen.findByText("No hay calificaciones con esos filtros en esta semana.");

    await user.click(screen.getByRole("button", { name: "Recoger" }));
    expect(screen.queryByText("No hay calificaciones con esos filtros en esta semana.")).not.toBeInTheDocument();
    // ¿Qué? Las pestañas siguen ahí — recoger solo esconde el contenido de
    //       la pestaña activa, no la navegación entre pestañas.
    expect(screen.getByRole("button", { name: /Calificaciones por conjunto/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Módulos" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ver calificaciones" }));
    expect(await screen.findByText("No hay calificaciones con esos filtros en esta semana.")).toBeInTheDocument();
  });

  it("un clic en las pestañas cambia de pestaña sin recoger el panel", async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();
    await screen.findByText("No hay calificaciones con esos filtros en esta semana.");

    // ¿Qué? La barra completa recoge/expande al hacer clic — las pestañas
    //       cortan la propagación para no disparar también el toggle. Este
    //       test cubre justo ese riesgo: elegir "Módulos" no debe cerrar
    //       el panel de un golpe.
    await user.click(screen.getByRole("button", { name: "Módulos" }));
    expect(await screen.findByText("Todavía no hay módulos creados.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recoger" })).toBeInTheDocument();
  });

  it("cambia el texto del botón para recoger según la pestaña activa", async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();
    await user.click(screen.getByRole("button", { name: "Módulos" }));
    await screen.findByText("Todavía no hay módulos creados.");

    await user.click(screen.getByRole("button", { name: "Recoger" }));
    expect(screen.getByRole("button", { name: "Ver módulos" })).toBeInTheDocument();
  });

  describe("pestaña Calificaciones por conjunto", () => {
    it("consulta la semana actual al montar", async () => {
      renderPage();
      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining("/auditorias-conjunto/admin"),
          expect.objectContaining({ params: expect.objectContaining({ lunes: SEMANA_ACTUAL }) })
        );
      });
    });

    it("muestra un estado vacío cuando no hay calificaciones esa semana", async () => {
      renderPage();
      expect(await screen.findByText("No hay calificaciones con esos filtros en esta semana.")).toBeInTheDocument();
    });

    it("lista las calificaciones de la semana con su semáforo y sus observaciones", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/auditorias-conjunto/admin")) return Promise.resolve({ data: { items: [califMalo, califBueno], total: 2 } });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      renderPage();
      expect(await screen.findByText("Torres de Aranjuez")).toBeInTheDocument();
      expect(screen.getByText("Reserva de Prueba")).toBeInTheDocument();
      expect(screen.getByText("Bolsas mezcladas en varios pisos.")).toBeInTheDocument();
      // ¿Qué? Se acota al <tr> de cada calificación porque "Malo"/"Bueno"
      //       también aparecen como etiquetas fijas en la tarjeta "Semana en
      //       curso" — sin acotar, getByText encuentra dos coincidencias.
      const filaMalo = screen.getByText("Torres de Aranjuez").closest("tr")!;
      expect(within(filaMalo).getByText("Malo")).toBeInTheDocument();
      const filaBuena = screen.getByText("Reserva de Prueba").closest("tr")!;
      expect(within(filaBuena).getByText("Bueno")).toBeInTheDocument();
    });

    it("filtra por semáforo con los chips", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/auditorias-conjunto/admin")) return Promise.resolve({ data: { items: [califMalo, califBueno], total: 2 } });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await screen.findByText("Torres de Aranjuez");

      await user.click(screen.getByRole("button", { name: "Malo 1" }));
      expect(screen.getByText("Torres de Aranjuez")).toBeInTheDocument();
      expect(screen.queryByText("Reserva de Prueba")).not.toBeInTheDocument();
    });

    it("busca por conjunto o por observación", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/auditorias-conjunto/admin")) return Promise.resolve({ data: { items: [califMalo, califBueno], total: 2 } });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await screen.findByText("Torres de Aranjuez");

      await user.type(screen.getByPlaceholderText("Buscar conjunto u observación…"), "Reserva");
      expect(screen.queryByText("Torres de Aranjuez")).not.toBeInTheDocument();
      expect(screen.getByText("Reserva de Prueba")).toBeInTheDocument();
    });

    it("navega a la semana anterior, y 'siguiente' se deshabilita en la semana en curso", async () => {
      const user = userEvent.setup({ delay: null });
      renderPage();
      await screen.findByText("21–27 sep");

      expect(screen.getByRole("button", { name: "Semana siguiente" })).toBeDisabled();

      await user.click(screen.getByRole("button", { name: "Semana anterior" }));
      expect(await screen.findByText("14–20 sep")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Semana siguiente" })).not.toBeDisabled();

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining("/auditorias-conjunto/admin"),
          expect.objectContaining({ params: expect.objectContaining({ lunes: "2026-09-14" }) })
        );
      });
    });

    it("abre el detalle de una calificación Mala, con evidencia y el módulo recomendado", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/auditorias-conjunto/admin")) return Promise.resolve({ data: { items: [califMalo], total: 1 } });
        if (url.includes("/contenido-educativo") && !url.includes("/envios")) return Promise.resolve({ data: [moduloExistente] });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await user.click(await screen.findByText("Torres de Aranjuez"));

      const panel = await screen.findByRole("dialog", { name: "Calificación de Torres de Aranjuez" });
      expect(within(panel).getByText("Carlos Gómez")).toBeInTheDocument();
      // ¿Qué? El mock de t() en __tests__/setup.ts no pluraliza (siempre usa
      //       la forma "_other" en bare) — se verifica con una expresión
      //       regular sin la "s" final, así sirve tanto aquí como con el
      //       i18next real de la app (que sí pluraliza correctamente).
      expect(within(panel).getByText(/Se avisó a 12 residente/)).toBeInTheDocument();
      expect(within(panel).getByRole("button", { name: "Ampliar foto" })).toBeInTheDocument();
      expect(within(panel).getByText("Código de colores")).toBeInTheDocument();
    });

    it("el detalle de una calificación Buena dice que no hay recomendación", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/auditorias-conjunto/admin")) return Promise.resolve({ data: { items: [califBueno], total: 1 } });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await user.click(await screen.findByText("Reserva de Prueba"));

      expect(await screen.findByText("Una calificación Buena no genera recomendación: no hay nada que mejorar en este tema.")).toBeInTheDocument();
    });
  });

  describe("pestaña Módulos", () => {
    async function irAModulos(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole("button", { name: "Módulos" }));
    }

    it("consulta el catálogo y muestra un estado vacío sin módulos", async () => {
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      expect(await screen.findByText("Todavía no hay módulos creados.")).toBeInTheDocument();
    });

    it("lista los módulos existentes, con su categoría", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/contenido-educativo") && !url.includes("/envios")) return Promise.resolve({ data: [moduloExistente] });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      expect(await screen.findByText("Código de colores")).toBeInTheDocument();
      // ¿Qué? getAllByText porque el mismo nombre de categoría también está
      //       en el <select> del filtro (como <option>) — no solo en la
      //       tarjeta del módulo.
      expect(screen.getAllByText("Separación en la fuente").length).toBeGreaterThan(0);
    });

    it("muestra 'Sin recomendar' cuando ninguna categoría auditable tuvo calificación esta semana", async () => {
      mockGet.mockImplementation((url: string, config?: { params?: Record<string, unknown> }) => {
        if (url.includes("/contenido-educativo") && !url.includes("/envios")) return Promise.resolve({ data: [moduloExistente] });
        if (url.includes("/auditorias-conjunto/admin") && config?.params?.lunes === SEMANA_ACTUAL) return Promise.resolve({ data: { items: [], total: 0 } });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      renderPage();
      await waitFor(() => {
        const numeros = screen.getAllByText("1");
        expect(numeros.length).toBeGreaterThan(0);
      });
      expect(screen.getByText("Esta semana no hay recomendación en 1 tema — puedes enviar contenido a mano para variar los temas.")).toBeInTheDocument();
    });

    it("crea un módulo nuevo eligiendo la categoría de la lista, y la vista previa en vivo se actualiza", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/contenido-educativo") && !url.includes("/envios")) return Promise.resolve({ data: [moduloExistente] });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      mockPost.mockResolvedValue({ data: { ...moduloExistente, id_contenido: "00000000-0000-7000-8000-000000000002" } });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await screen.findByText("Código de colores");

      await user.click(screen.getByRole("button", { name: "Nuevo módulo" }));
      await user.selectOptions(screen.getByLabelText("Categoría *"), "Separación en la fuente");
      await user.type(screen.getByPlaceholderText("Ej: Código de colores de bolsas"), "Nuevo tema de prueba");
      const textarea = screen.getByLabelText("Contenido *");
      await user.type(textarea, "Contenido de prueba con más de veinte caracteres.");

      // ¿Qué? La vista previa en vivo repite el título y el contenido —
      //       se verifica con getAllByText porque aparece dos veces (el
      //       campo de la izquierda y la vista previa de la derecha).
      expect(screen.getAllByText("Nuevo tema de prueba").length).toBeGreaterThan(0);

      await user.click(screen.getByRole("button", { name: "Guardar" }));
      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          expect.stringContaining("/contenido-educativo"),
          expect.objectContaining({ modulo_categoria: "Separación en la fuente", titulo_tema: "Nuevo tema de prueba" })
        );
      });
    });

    it("no deja guardar un video que no es de YouTube y muestra el error en el campo (issue #314)", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/contenido-educativo") && !url.includes("/envios")) return Promise.resolve({ data: [moduloExistente] });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await screen.findByText("Código de colores");

      await user.click(screen.getByRole("button", { name: "Nuevo módulo" }));
      await user.selectOptions(screen.getByLabelText("Categoría *"), "Separación en la fuente");
      await user.type(screen.getByPlaceholderText("Ej: Código de colores de bolsas"), "Nuevo tema de prueba");
      await user.type(screen.getByLabelText("Contenido *"), "Contenido de prueba con más de veinte caracteres.");
      await user.type(screen.getByPlaceholderText("https://www.youtube.com/watch?v=..."), "https://sitio-malo.com/video");
      await user.tab();

      expect(await screen.findByText(/El video debe ser un enlace de YouTube/)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Guardar" }));
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("permite crear una categoría nueva desde el formulario, con su aviso", async () => {
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);

      await user.click(screen.getByRole("button", { name: "Nuevo módulo" }));
      await user.selectOptions(screen.getByLabelText("Categoría *"), "+ Nueva categoría…");

      expect(screen.getByText(/Se creará una categoría nueva en el catálogo del Residente/)).toBeInTheDocument();
      await user.type(screen.getByPlaceholderText("Ej: Separación en la fuente"), "Compostaje en casa");
      expect(screen.getByText("Compostaje en casa")).toBeInTheDocument(); // vista previa
    });

    it("el botón Negrita envuelve el texto seleccionado en **", async () => {
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await user.click(screen.getByRole("button", { name: "Nuevo módulo" }));

      const textarea = screen.getByLabelText("Contenido *") as HTMLTextAreaElement;
      await user.type(textarea, "hola mundo");
      textarea.setSelectionRange(0, 4);
      await user.click(screen.getByRole("button", { name: "Negrita" }));

      expect(textarea.value).toBe("**hola** mundo");
    });

    it("avisa si el link de video no parece de YouTube", async () => {
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await user.click(screen.getByRole("button", { name: "Nuevo módulo" }));

      await user.type(screen.getByPlaceholderText("https://www.youtube.com/watch?v=..."), "https://ejemplo.com/video");
      expect(await screen.findByText("Este link no parece de YouTube: el Residente no verá el video.")).toBeInTheDocument();
    });

    it("no envía el formulario si faltan campos obligatorios", async () => {
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await user.click(screen.getByRole("button", { name: "Nuevo módulo" }));

      expect(screen.getByRole("button", { name: "Completa el formulario" })).toBeDisabled();
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("edita un módulo existente desde su panel", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/contenido-educativo") && !url.includes("/envios")) return Promise.resolve({ data: [moduloExistente] });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      mockPut.mockResolvedValue({ data: moduloExistente });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await user.click(await screen.findByText("Código de colores"));

      await user.click(await screen.findByRole("button", { name: "Editar" }));
      const inputTitulo = screen.getByDisplayValue("Código de colores");
      await user.clear(inputTitulo);
      await user.type(inputTitulo, "Código de colores actualizado");
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      await waitFor(() => {
        expect(mockPut).toHaveBeenCalledWith(
          expect.stringContaining(moduloExistente.id_contenido),
          expect.objectContaining({ titulo_tema: "Código de colores actualizado" })
        );
      });
    });

    it("elimina un módulo tras confirmar, desde el panel", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/contenido-educativo") && !url.includes("/envios")) return Promise.resolve({ data: [moduloExistente] });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await user.click(await screen.findByText("Código de colores"));
      await user.click(await screen.findByRole("button", { name: "Sí, eliminar" }));

      const dialog = screen.getByRole("dialog", { name: "Confirmar eliminación" });
      await user.click(within(dialog).getByRole("button", { name: "Sí, eliminar" }));

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith(expect.stringContaining(moduloExistente.id_contenido));
      });
    });

    it("abre el panel de un módulo y muestra a qué conjuntos se recomendó, sin repetir uno dos veces", async () => {
      const califViejaMismoConjunto: AuditoriaAdmin = { ...califMalo, id_auditoria: "a0", created_at: "2026-09-01T09:00:00Z" };
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/contenido-educativo") && url.includes("/envios")) return Promise.resolve({ data: [] });
        if (url.includes("/contenido-educativo")) return Promise.resolve({ data: [moduloExistente] });
        if (url.includes("/auditorias-conjunto/admin")) return Promise.resolve({ data: { items: [califMalo, califViejaMismoConjunto], total: 2 } });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await user.click(await screen.findByText("Código de colores"));

      const panel = await screen.findByRole("dialog", { name: /Módulo: Código de colores/ });
      expect(within(panel).getByText("Recomendado a 1 conjunto")).toBeInTheDocument();
      expect(within(panel).getAllByText("Torres de Aranjuez")).toHaveLength(1);
    });

    it("envía el módulo a un conjunto específico", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/contenido-educativo") && url.includes("/envios")) return Promise.resolve({ data: [] });
        if (url.includes("/contenido-educativo")) return Promise.resolve({ data: [moduloExistente] });
        if (url.includes("/geography/conjuntos/todos")) return Promise.resolve({ data: [{ id_conjunto_residencial: "c9", nombre_conjunto: "Conjunto Los Alpes" }] });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      mockPost.mockResolvedValue({ data: [{ id_conjunto_residencial: "c9", nombre_conjunto: "Conjunto Los Alpes", created_at: "2026-09-21T10:00:00Z" }] });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await user.click(await screen.findByText("Código de colores"));

      const panel = await screen.findByRole("dialog", { name: /Módulo: Código de colores/ });
      await user.type(within(panel).getByLabelText("A un conjunto específico"), "Alpes");
      await user.click(await within(panel).findByText("Conjunto Los Alpes"));
      // ¿Qué? Se acota al bloque "A un conjunto específico" porque el botón
      //       "Enviar" del bloque "A varios conjuntos" tiene el mismo texto
      //       mientras no hay ninguno seleccionado — sin acotar, hay dos
      //       botones con ese nombre exacto.
      const bloqueUno = within(panel).getByText("A un conjunto específico").closest("div")!;
      await user.click(within(bloqueUno).getByRole("button", { name: "Enviar" }));

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(expect.stringContaining("/enviar"), { conjuntos: ["c9"] });
      });
    });

    it("envía el módulo a varios conjuntos a la vez", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/contenido-educativo") && url.includes("/envios")) return Promise.resolve({ data: [] });
        if (url.includes("/contenido-educativo")) return Promise.resolve({ data: [moduloExistente] });
        if (url.includes("/geography/conjuntos/todos")) {
          return Promise.resolve({
            data: [
              { id_conjunto_residencial: "c9", nombre_conjunto: "Conjunto Los Alpes" },
              { id_conjunto_residencial: "c8", nombre_conjunto: "Parques de Bogotá Urapan" },
            ],
          });
        }
        return Promise.resolve(respuestaPorDefecto(url));
      });
      mockPost.mockResolvedValue({ data: [] });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await user.click(await screen.findByText("Código de colores"));

      const panel = await screen.findByRole("dialog", { name: /Módulo: Código de colores/ });
      const buscador = within(panel).getByLabelText("A varios conjuntos");
      await user.type(buscador, "a");
      await user.click(await within(panel).findByText("Conjunto Los Alpes"));
      await user.type(buscador, "a");
      await user.click(await within(panel).findByText("Parques de Bogotá Urapan"));

      // ¿Qué? El combobox de selección múltiple de Headless UI no cierra su
      //       lista al elegir un ítem (a propósito, para poder seguir
      //       marcando varios) — mientras sigue abierta, marca el resto del
      //       panel con aria-hidden="true", y el botón "Enviar" queda fuera
      //       del árbol de accesibilidad hasta cerrarla con Escape.
      await user.keyboard("{Escape}");

      // ¿Qué? Mismo motivo que arriba: el mock de t() no pluraliza, el botón
      //       queda en singular ("conjunto") aunque count=2.
      await user.click(within(panel).getByRole("button", { name: /Enviar a 2 conjunto/ }));
      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(expect.stringContaining("/enviar"), { conjuntos: ["c9", "c8"] });
      });
    });

    it("muestra la guía de apoyo integrada cuando es una imagen, y se puede ampliar", async () => {
      const moduloConGuiaImagen: ContenidoEducativo = { ...moduloExistente, url_guia: "/uploads/adjuntos/guia.jpg" };
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/contenido-educativo") && !url.includes("/envios")) return Promise.resolve({ data: [moduloConGuiaImagen] });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await user.click(await screen.findByText("Código de colores"));

      const panel = await screen.findByRole("dialog", { name: /Módulo: Código de colores/ });
      // ¿Qué? Ya no hay botón "Ver guía de apoyo" — la imagen se ve directo,
      //       integrada debajo del contenido (sin el clic extra a ciegas).
      expect(within(panel).queryByRole("link", { name: "Ver guía de apoyo" })).not.toBeInTheDocument();
      // ¿Qué? La imagen es decorativa (alt="" — el botón ya trae su propio
      //       aria-label), así que no tiene role="img" para la a11y tree;
      //       se busca directo en el DOM en vez de por rol.
      const boton = within(panel).getByRole("button", { name: "Ampliar foto" });
      expect(boton.querySelector("img")).toHaveAttribute("src", "http://localhost:8000/uploads/adjuntos/guia.jpg");

      await user.click(boton);
      const lightbox = await screen.findByRole("dialog", { name: "Ampliar foto" });
      expect(lightbox.querySelector("img")).toHaveAttribute("src", "http://localhost:8000/uploads/adjuntos/guia.jpg");
    });

    it("muestra el botón 'Ver guía de apoyo' cuando el archivo no es una imagen", async () => {
      const moduloConGuiaPdf: ContenidoEducativo = { ...moduloExistente, url_guia: "/uploads/adjuntos/guia.pdf" };
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/contenido-educativo") && !url.includes("/envios")) return Promise.resolve({ data: [moduloConGuiaPdf] });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await user.click(await screen.findByText("Código de colores"));

      const panel = await screen.findByRole("dialog", { name: /Módulo: Código de colores/ });
      const enlace = within(panel).getByRole("link", { name: "Ver guía de apoyo" });
      expect(enlace).toHaveAttribute("href", "http://localhost:8000/uploads/adjuntos/guia.pdf");
    });
  });
});
