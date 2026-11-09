/**
 * Archivo: __tests__/pages/AdminContenidoEducativoPage.test.tsx
 * Descripción: Tests del panel de administración del catálogo educativo
 *              (HU-012 crear, HU-013 editar, HU-014 eliminar) y del
 *              rediseño de RQF-009, RQF-010 y RQF-013: pestaña "Calificaciones por conjunto" por
 *              semana, "Sin recomendar", vista previa en vivo, y el envío
 *              manual de un módulo a uno o varios conjuntos.
 * ¿Para qué? La página usa axios directo (vía las funciones de
 *           contenidoEducativoApi/auditoriaConjuntoApi, y directo para el
 *           buscador de conjuntos) — se mockea "axios" una sola vez, igual
 *           que AdminDashboard.test.tsx, en vez de mockear cada módulo por
 *           separado.
 */

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, afterEach } from "vitest";
import { AdminContenidoEducativoPage } from "@/pages/AdminContenidoEducativoPage";
import { renderWithProviders, mockUser } from "../helpers";
import type { ContenidoEducativo } from "@/lib/contenidoEducativoApi";
import type { AuditoriaAdmin } from "@/lib/auditoriaConjuntoApi";
import { domingoDeLunesUTC, fechaBogota, isoToDateInputUTC } from "@/lib/dateFormat";

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

// ¿Qué? Hoy fijo (lunes 21 de septiembre de 2026, 10am UTC = 5am en Bogotá) — la
//       página calcula la semana en curso con la hora real del sistema
//       (lunesBogota()); sin fijarla, cada corrida navegaría una semana
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
  url_imagen: null,
  fecha_publicacion: "2026-08-18",
};

const califMalo: AuditoriaAdmin = {
  id_auditoria: "a1",
  id_conjunto_residencial: "c1",
  nombre_conjunto: "Torres de Aranjuez",
  id_localidad: 1,
  nombre_localidad: "Usaquén",
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

// ¿Qué? Mismo conjunto que califMalo (c1), otro día de la semana y nivel Regular.
const califRegular: AuditoriaAdmin = {
  ...califMalo,
  id_auditoria: "a3",
  nivel_desempeno: "REGULAR",
  descripcion: "Faltan bolsas verdes.",
  created_at: "2026-09-23T15:00:00Z",
};

// ¿Qué? 2026-09-28T02:00Z = domingo 27 a las 9 p. m. en Bogotá: todavía es del 27, no del 28.
const califDomingoNoche: AuditoriaAdmin = {
  ...califMalo,
  id_auditoria: "a4",
  nivel_desempeno: "BUENA",
  nombre_conjunto: "Conjunto Domingo",
  id_conjunto_residencial: "c3",
  id_localidad: 2,
  nombre_localidad: "Chapinero",
  created_at: "2026-09-28T02:00:00Z",
};

const califBueno: AuditoriaAdmin = {
  id_auditoria: "a2",
  id_conjunto_residencial: "c2",
  nombre_conjunto: "Reserva de Prueba",
  id_localidad: 2,
  nombre_localidad: "Chapinero",
  nivel_desempeno: "BUENA",
  tema_educativo: "Tipos de residuos y su preparación",
  descripcion: null,
  ruta_evidencia: "/uploads/evidencias-auditoria/foto2.jpg",
  ruta_evidencia_2: null,
  ruta_evidencia_3: null,
  created_at: "2026-09-22T09:00:00Z",
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
  if (url.includes("/auditorias-conjunto/admin/resumen-semana")) {
    return { data: { lunes: SEMANA_ACTUAL, bueno: 0, regular: 0, malo: 0, temas_con_recomendacion: [] } };
  }
  if (url.includes("/auditorias-conjunto/admin")) {
    return { data: { items: [], total: 0, conteos: { BUENA: 0, REGULAR: 0, DEFICIENTE: 0 } } };
  }
  if (url.includes("/geography/conjuntos/todos")) return { data: [] };
  return { data: [] };
}

function mockRespuestasVacias() {
  mockGet.mockImplementation((url: string) => Promise.resolve(respuestaPorDefecto(url)));
}

// ¿Qué? Issue #618: simula el servidor de calificaciones — filtra, ordena, corta en páginas y cuenta por nivel
//       igual que GET /auditorias-conjunto/admin, y responde el resumen de la semana, las localidades y los
//       conjuntos. Así las pruebas comprueban lo que la pantalla PIDE y lo que muestra con la respuesta.
function simularServidor(auditorias: AuditoriaAdmin[], extra: { modulos?: ContenidoEducativo[] } = {}) {
  const dia = (iso: string) => fechaBogota(iso);
  mockGet.mockImplementation((url: string, config?: { params?: Record<string, unknown> }) => {
    const params = config?.params ?? {};
    if (url.includes("/auditorias-conjunto/admin/resumen-semana")) {
      const lunes = String(params.lunes);
      const domingo = isoToDateInputUTC(domingoDeLunesUTC(lunes).toISOString());
      const semana = auditorias.filter((a) => dia(a.created_at) >= lunes && dia(a.created_at) <= domingo);
      return Promise.resolve({
        data: {
          lunes,
          bueno: semana.filter((a) => a.nivel_desempeno === "BUENA").length,
          regular: semana.filter((a) => a.nivel_desempeno === "REGULAR").length,
          malo: semana.filter((a) => a.nivel_desempeno === "DEFICIENTE").length,
          temas_con_recomendacion: [...new Set(semana.filter((a) => a.nivel_desempeno !== "BUENA").map((a) => a.tema_educativo))],
        },
      });
    }
    if (url.includes("/auditorias-conjunto/admin")) {
      const { desde, hasta, id_localidad, id_conjunto, buscar, nivel, orden = "recientes", limit = 100, offset = 0 } = params as {
        desde?: string;
        hasta?: string;
        id_localidad?: number;
        id_conjunto?: string;
        buscar?: string;
        nivel?: string;
        orden?: string;
        limit?: number;
        offset?: number;
      };
      const q = buscar?.toLowerCase();
      const sinNivel = auditorias
        .filter((a) => !desde || dia(a.created_at) >= desde)
        .filter((a) => !hasta || dia(a.created_at) <= hasta)
        .filter((a) => !id_localidad || a.id_localidad === id_localidad)
        .filter((a) => !id_conjunto || a.id_conjunto_residencial === id_conjunto)
        .filter((a) => !q || `${a.nombre_conjunto} ${a.tema_educativo} ${a.descripcion ?? ""}`.toLowerCase().includes(q));
      const gravedad: Record<string, number> = { DEFICIENTE: 0, REGULAR: 1, BUENA: 2 };
      const masReciente = (a: AuditoriaAdmin, b: AuditoriaAdmin) => (a.created_at < b.created_at ? 1 : -1);
      const comparadores: Record<string, (a: AuditoriaAdmin, b: AuditoriaAdmin) => number> = {
        criticas: (a, b) => gravedad[a.nivel_desempeno] - gravedad[b.nivel_desempeno] || masReciente(a, b),
        recientes: masReciente,
        conjunto: (a, b) => a.nombre_conjunto.localeCompare(b.nombre_conjunto) || masReciente(a, b),
      };
      const filtradas = sinNivel.filter((a) => !nivel || a.nivel_desempeno === nivel).sort(comparadores[orden]);
      const cuenta = (n: string) => sinNivel.filter((a) => a.nivel_desempeno === n).length;
      return Promise.resolve({
        data: {
          items: filtradas.slice(offset, offset + limit),
          total: filtradas.length,
          conteos: { BUENA: cuenta("BUENA"), REGULAR: cuenta("REGULAR"), DEFICIENTE: cuenta("DEFICIENTE") },
        },
      });
    }
    if (url.includes("/geography/localidades")) {
      return Promise.resolve({
        data: [
          { id_localidad: 1, nombre_localidad: "Usaquén" },
          { id_localidad: 2, nombre_localidad: "Chapinero" },
        ],
      });
    }
    if (url.includes("/geography/conjuntos/todos")) {
      const idLocalidad = params.id_localidad as number | undefined;
      const conjuntos = new Map(auditorias.map((a) => [a.id_conjunto_residencial, a]));
      return Promise.resolve({
        data: [...conjuntos.values()]
          .filter((a) => !idLocalidad || a.id_localidad === idLocalidad)
          .map((a) => ({ id_conjunto_residencial: a.id_conjunto_residencial, nombre_conjunto: a.nombre_conjunto, nombre_localidad: a.nombre_localidad })),
      });
    }
    if (url.includes("/contenido-educativo") && !url.includes("/envios")) return Promise.resolve({ data: extra.modulos ?? [] });
    return Promise.resolve(respuestaPorDefecto(url));
  });
}

// ¿Qué? Los nombres de conjunto también salen como <option> del selector de conjunto: se busca
//       dentro de la tabla para no encontrar el mismo texto dos veces.
const enTabla = () => within(screen.getByRole("table"));
// ¿Qué? La primera vez la tabla aparece cuando llega la respuesta (antes se muestra "Cargando…").
const tablaLista = async () => within(await screen.findByRole("table"));

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

  // ¿Qué? Issue #619: se quitó "Recoger / Ver calificaciones / Ver módulos"; el panel queda siempre abierto.
  it("el panel ya no se recoge: no hay botón Recoger en ninguna pestaña", async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();
    await screen.findByText("Todavía no hay calificaciones en este periodo.");
    expect(screen.queryByRole("button", { name: "Recoger" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Módulos" }));
    expect(await screen.findByText("Todavía no hay módulos creados.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Recoger|Ver módulos|Ver calificaciones/ })).not.toBeInTheDocument();
  });

  it("un clic en las pestañas cambia de pestaña", async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();
    await screen.findByText("Todavía no hay calificaciones en este periodo.");

    await user.click(screen.getByRole("button", { name: "Módulos" }));
    expect(await screen.findByText("Todavía no hay módulos creados.")).toBeInTheDocument();
    expect(screen.queryByText("Todavía no hay calificaciones en este periodo.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Calificaciones por conjunto/ }));
    expect(await screen.findByText("Todavía no hay calificaciones en este periodo.")).toBeInTheDocument();
  });

  it("las tarjetas de arriba dicen lo que cuentan: 'Temas sin recomendación' y 'Calificaciones de esta semana'", async () => {
    renderPage();
    expect(await screen.findByText("Temas sin recomendación")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Calificaciones de esta semana · 21–27 sep/ })).toBeInTheDocument();
  });

  describe("pestaña Calificaciones por conjunto", () => {
    // ¿Qué? Issue #618: el servidor filtra, ordena y corta; estas pruebas simulan ese servidor y comprueban lo que la
    //       pantalla le pide y lo que muestra con su respuesta.
    const pedidosAAuditorias = () =>
      mockGet.mock.calls
        .filter(([url]) => String(url).endsWith("/auditorias-conjunto/admin"))
        .map(([, config]) => (config as { params: Record<string, unknown> }).params);
    const ultimoPedido = () => pedidosAAuditorias().at(-1)!;

    // ¿Qué? Cada calificación se identifica por su observación (la 4.ª celda de la fila).
    const OBS_MALO = "Bolsas mezcladas en varios pisos.";
    const OBS_REGULAR = "Faltan bolsas verdes.";
    const OBS_DOMINGO = "Todo en orden el domingo.";
    const domingo: AuditoriaAdmin = { ...califDomingoNoche, descripcion: OBS_DOMINGO };

    const observacionesEnTabla = () =>
      enTabla()
        .getAllByRole("row")
        .slice(1)
        .map((fila) => within(fila).getAllByRole("cell")[3].textContent);

    const montar = async (items: AuditoriaAdmin[]) => {
      simularServidor(items);
      const user = userEvent.setup({ delay: null });
      renderPage();
      await screen.findByRole("table");
      return user;
    };

    it("consulta la semana actual al montar, de a 10 filas y con el peor primero", async () => {
      renderPage();
      await waitFor(() => expect(pedidosAAuditorias().length).toBeGreaterThan(0));
      expect(pedidosAAuditorias()).toContainEqual(
        expect.objectContaining({ desde: SEMANA_ACTUAL, hasta: "2026-09-27", limit: 10, offset: 0, orden: "criticas" })
      );
    });

    // ¿Qué? Domingo 20 de septiembre a las 9 p. m. en Bogotá = lunes 21 a las 2 a. m. en UTC.
    // ¿Para qué? El backend corta la semana en hora de Bogotá: ese domingo todavía es de la semana
    //           del 14 al 20, así que la pantalla no debe dar por empezada la del 21.
    it("el domingo en la noche (hora de Bogotá) la semana en curso sigue siendo la que termina ese domingo", async () => {
      vi.setSystemTime(new Date("2026-09-21T02:00:00Z"));
      renderPage();

      await screen.findByText("14–20 sep");
      expect(screen.getByRole("button", { name: "Semana siguiente" })).toBeDisabled();
      await waitFor(() => expect(pedidosAAuditorias()).toContainEqual(expect.objectContaining({ desde: "2026-09-14", hasta: "2026-09-20" })));
    });

    it("sin calificaciones y sin filtros dice que todavía no hay en el periodo (no 'con esos filtros')", async () => {
      renderPage();
      expect(await screen.findByText("Todavía no hay calificaciones en este periodo.")).toBeInTheDocument();
    });

    it("lista las calificaciones de la semana con su semáforo y sus observaciones", async () => {
      await montar([califMalo, califBueno]);
      expect(enTabla().getByText("Reserva de Prueba")).toBeInTheDocument();
      expect(screen.getByText("Bolsas mezcladas en varios pisos.")).toBeInTheDocument();
      // ¿Qué? Se acota al <tr> de cada calificación porque "Malo"/"Bueno" también aparecen como etiquetas fijas
      //       en la tarjeta "Semana en curso" — sin acotar, getByText encuentra dos coincidencias.
      const filaMalo = enTabla().getByText("Torres de Aranjuez").closest("tr")!;
      expect(within(filaMalo).getByText("Malo")).toBeInTheDocument();
      const filaBuena = enTabla().getByText("Reserva de Prueba").closest("tr")!;
      expect(within(filaBuena).getByText("Bueno")).toBeInTheDocument();
    });

    it("los botones de nivel muestran los conteos del servidor y filtran pidiéndolo al servidor", async () => {
      const user = await montar([califMalo, califBueno, califRegular, domingo]);
      expect(screen.getByRole("button", { name: "Todas 4" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Malo 1" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Malo 1" }));

      await waitFor(() => expect(ultimoPedido()).toEqual(expect.objectContaining({ nivel: "DEFICIENTE", offset: 0 })));
      await waitFor(() => expect(observacionesEnTabla()).toEqual([OBS_MALO]));
      // Los conteos no cambian al elegir un nivel: cuentan con los demás filtros, no con este.
      expect(screen.getByRole("button", { name: "Regular 1" })).toBeInTheDocument();
    });

    it("la búsqueda espera a que termines de escribir y se la manda al servidor", async () => {
      const user = await montar([califMalo, califBueno]);
      const antes = pedidosAAuditorias().length;

      await user.type(screen.getByPlaceholderText("Buscar conjunto u observación…"), "Reserva");

      await waitFor(() => expect(ultimoPedido()).toEqual(expect.objectContaining({ buscar: "Reserva" })));
      // Una sola petición nueva con el texto completo, no una por tecla.
      expect(pedidosAAuditorias().length - antes).toBeLessThanOrEqual(2);
      await waitFor(() => expect(enTabla().queryByText("Torres de Aranjuez")).not.toBeInTheDocument());
      expect(enTabla().getByText("Reserva de Prueba")).toBeInTheDocument();
    });

    it("al elegir una localidad pide solo esa localidad y los conteos se recalculan", async () => {
      const user = await montar([califMalo, califBueno, califRegular, domingo]);
      await screen.findByRole("option", { name: "Chapinero" });

      await user.selectOptions(screen.getByLabelText("Localidad"), "2");

      await waitFor(() => expect(ultimoPedido()).toEqual(expect.objectContaining({ id_localidad: 2 })));
      expect(await screen.findByRole("button", { name: "Todas 2" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Malo 0" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Bueno 2" })).toBeInTheDocument();
    });

    it("elige un conjunto en el buscador (acotado a la localidad) y se lo manda al servidor", async () => {
      const user = await montar([califMalo, califBueno, califRegular]);
      await screen.findByRole("option", { name: "Usaquén" });
      await user.selectOptions(screen.getByLabelText("Localidad"), "1");

      await user.type(screen.getByPlaceholderText("Buscar conjunto…"), "Torres");
      await user.click(await screen.findByText("Torres de Aranjuez — Usaquén"));

      await waitFor(() => expect(ultimoPedido()).toEqual(expect.objectContaining({ id_localidad: 1, id_conjunto: "c1" })));
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/geography/conjuntos/todos"),
        expect.objectContaining({ params: expect.objectContaining({ id_localidad: 1 }) })
      );
      await waitFor(() => expect(observacionesEnTabla()).toEqual([OBS_MALO, OBS_REGULAR]));
    });

    it("al cambiar de localidad se reinicia el conjunto elegido (podría no ser de la nueva)", async () => {
      const user = await montar([califMalo, califBueno, califRegular]);
      await screen.findByRole("option", { name: "Chapinero" });
      await user.selectOptions(screen.getByLabelText("Localidad"), "1");
      await user.type(screen.getByPlaceholderText("Buscar conjunto…"), "Torres");
      await user.click(await screen.findByText("Torres de Aranjuez — Usaquén"));
      await waitFor(() => expect(ultimoPedido()).toEqual(expect.objectContaining({ id_conjunto: "c1" })));

      await user.selectOptions(screen.getByLabelText("Localidad"), "2");

      await waitFor(() => expect(ultimoPedido()).not.toHaveProperty("id_conjunto", "c1"));
      expect(ultimoPedido()).toEqual(expect.objectContaining({ id_localidad: 2 }));
    });

    it("ordena: peor calificación primero por defecto, y se puede cambiar", async () => {
      const user = await montar([califMalo, califBueno, califRegular, domingo]);
      expect(observacionesEnTabla()).toEqual([OBS_MALO, OBS_REGULAR, OBS_DOMINGO, "Sin observaciones"]);

      await user.selectOptions(screen.getByLabelText("Ordenar por"), "recientes");
      await waitFor(() => expect(observacionesEnTabla()).toEqual([OBS_DOMINGO, OBS_REGULAR, "Sin observaciones", OBS_MALO]));
      expect(ultimoPedido()).toEqual(expect.objectContaining({ orden: "recientes" }));

      await user.selectOptions(screen.getByLabelText("Ordenar por"), "conjunto");
      await waitFor(() => expect(observacionesEnTabla()).toEqual([OBS_DOMINGO, "Sin observaciones", OBS_REGULAR, OBS_MALO]));
    });

    it("'Limpiar filtros' solo aparece con algún filtro activo y los deja todos en blanco", async () => {
      const user = await montar([califMalo, califBueno, califRegular, domingo]);
      await screen.findByRole("option", { name: "Usaquén" });
      expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument();

      await user.selectOptions(screen.getByLabelText("Localidad"), "1");
      await user.click(screen.getByRole("button", { name: /^Malo/ }));
      await user.type(screen.getByPlaceholderText("Buscar conjunto u observación…"), "bolsas");
      await user.click(await screen.findByRole("button", { name: "Limpiar filtros" }));

      await waitFor(() => expect(ultimoPedido().buscar).toBeUndefined());
      expect(ultimoPedido().nivel).toBeUndefined();
      expect(ultimoPedido().id_localidad).toBeUndefined();
      expect(screen.getByLabelText("Localidad")).toHaveValue("");
      expect(screen.getByPlaceholderText("Buscar conjunto u observación…")).toHaveValue("");
      expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument();
    });

    it("con filtros sin resultados dice 'con esos filtros'", async () => {
      const user = await montar([califMalo, califBueno]);
      await user.type(screen.getByPlaceholderText("Buscar conjunto u observación…"), "zzz");
      expect(await screen.findByText("No hay calificaciones con esos filtros en este periodo.")).toBeInTheDocument();
    });

    describe("paginación", () => {
      const muchas = Array.from({ length: 12 }, (_, i) => ({
        ...califMalo,
        id_auditoria: `m${i}`,
        nombre_conjunto: `Conjunto ${String(i).padStart(2, "0")}`,
        descripcion: `Obs ${i}`,
        created_at: `2026-09-21T${String(10 + i).padStart(2, "0")}:00:00Z`,
      }));

      it("muestra 10 filas, el total y pide la siguiente página al servidor", async () => {
        const user = await montar(muchas);
        expect(observacionesEnTabla()).toHaveLength(10);
        expect(screen.getByText("Mostrando 1–10 de 12")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Página siguiente" }));

        await waitFor(() => expect(ultimoPedido()).toEqual(expect.objectContaining({ offset: 10, limit: 10 })));
        expect(await screen.findByText("Mostrando 11–12 de 12")).toBeInTheDocument();
        expect(observacionesEnTabla()).toHaveLength(2);
      });

      it("cambiar un filtro vuelve a la página 1", async () => {
        const user = await montar(muchas);
        await user.click(screen.getByRole("button", { name: "Página siguiente" }));
        await screen.findByText("Mostrando 11–12 de 12");

        await user.selectOptions(screen.getByLabelText("Ordenar por"), "recientes");

        await waitFor(() => expect(ultimoPedido()).toEqual(expect.objectContaining({ offset: 0, orden: "recientes" })));
        expect(await screen.findByText("Mostrando 1–10 de 12")).toBeInTheDocument();
      });
    });

    describe("periodo: semana, mes o personalizado", () => {
      it("navega a la semana anterior, y 'siguiente' se deshabilita en la semana en curso", async () => {
        const user = userEvent.setup({ delay: null });
        renderPage();
        await screen.findByText("21–27 sep");
        expect(screen.getByRole("button", { name: "Semana siguiente" })).toBeDisabled();

        await user.click(screen.getByRole("button", { name: "Semana anterior" }));

        expect(await screen.findByText("14–20 sep")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Semana siguiente" })).not.toBeDisabled();
        await waitFor(() => expect(ultimoPedido()).toEqual(expect.objectContaining({ desde: "2026-09-14", hasta: "2026-09-20" })));
      });

      it("el modo Mes pide el mes entero, se mueve con flechas y no pasa del mes actual", async () => {
        const user = userEvent.setup({ delay: null });
        renderPage();
        await screen.findByText("21–27 sep");

        await user.click(screen.getByRole("tab", { name: "Mes" }));

        expect(await screen.findByText(/septiembre de 2026/i)).toBeInTheDocument();
        await waitFor(() => expect(ultimoPedido()).toEqual(expect.objectContaining({ desde: "2026-09-01", hasta: "2026-09-30" })));
        expect(screen.getByRole("button", { name: "Mes siguiente" })).toBeDisabled();

        await user.click(screen.getByRole("button", { name: "Mes anterior" }));

        expect(await screen.findByText(/agosto de 2026/i)).toBeInTheDocument();
        await waitFor(() => expect(ultimoPedido()).toEqual(expect.objectContaining({ desde: "2026-08-01", hasta: "2026-08-31" })));
        expect(screen.getByRole("button", { name: "Mes siguiente" })).not.toBeDisabled();
      });

      it("el modo Personalizado acepta cualquier rango, con varias semanas", async () => {
        const user = userEvent.setup({ delay: null });
        renderPage();
        await screen.findByText("21–27 sep");

        await user.click(screen.getByRole("tab", { name: "Personalizado" }));
        fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-08-10" } });
        fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-09-15" } });

        await waitFor(() => expect(ultimoPedido()).toEqual(expect.objectContaining({ desde: "2026-08-10", hasta: "2026-09-15" })));
        // No se puede elegir una fecha futura.
        expect(screen.getByLabelText("Hasta")).toHaveAttribute("max", "2026-09-21");
      });

      it("'Hasta' anterior a 'Desde' se avisa y no se manda al servidor", async () => {
        const user = userEvent.setup({ delay: null });
        renderPage();
        await screen.findByText("21–27 sep");
        await user.click(screen.getByRole("tab", { name: "Personalizado" }));
        fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-09-15" } });
        await waitFor(() => expect(ultimoPedido()).toEqual(expect.objectContaining({ desde: "2026-09-15" })));
        const pedidos = pedidosAAuditorias().length;

        fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-09-01" } });

        expect(await screen.findByRole("alert")).toHaveTextContent("\"Hasta\" no puede ser anterior a \"Desde\".");
        expect(pedidosAAuditorias().length).toBe(pedidos);
      });
    });

    describe("semana en curso vacía", () => {
      const califSemanaPasada: AuditoriaAdmin = { ...califBueno, created_at: "2026-09-20T09:00:00Z" };

      it("abre en la última semana con datos y lo explica, con un botón para volver a esta semana", async () => {
        simularServidor([califSemanaPasada]); // 20 de septiembre: la semana en curso (21–27) no tiene nada
        const user = userEvent.setup({ delay: null });
        renderPage();

        expect(await screen.findByText(/La semana en curso todavía no tiene calificaciones/)).toBeInTheDocument();
        expect(screen.getByText(/última semana con datos \(14–20 sep\)/)).toBeInTheDocument();
        expect(await (await tablaLista()).findByText("Reserva de Prueba")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Ver esta semana" }));

        expect(await screen.findByText("21–27 sep")).toBeInTheDocument();
        expect(screen.queryByText(/La semana en curso todavía no tiene calificaciones/)).not.toBeInTheDocument();
        expect(await screen.findByText("Todavía no hay calificaciones en este periodo.")).toBeInTheDocument();
      });

      it("no salta de semana si la semana en curso sí tiene calificaciones", async () => {
        await montar([califMalo, califBueno]);
        expect(screen.getByText("21–27 sep")).toBeInTheDocument();
        expect(screen.queryByText(/La semana en curso todavía no tiene calificaciones/)).not.toBeInTheDocument();
      });

      it("la franja desaparece al moverse de semana por cuenta propia", async () => {
        simularServidor([califSemanaPasada]);
        const user = userEvent.setup({ delay: null });
        renderPage();
        await screen.findByText(/La semana en curso todavía no tiene calificaciones/);

        await user.click(screen.getByRole("button", { name: "Semana anterior" }));

        expect(screen.queryByText(/La semana en curso todavía no tiene calificaciones/)).not.toBeInTheDocument();
      });
    });

    it("las tarjetas de arriba salen del resumen del servidor", async () => {
      simularServidor([califMalo, califRegular, califBueno]);
      renderPage();
      await waitFor(() =>
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining("/auditorias-conjunto/admin/resumen-semana"),
          expect.objectContaining({ params: { lunes: SEMANA_ACTUAL } })
        )
      );
    });

    it("abre el modal de la auditoría de una calificación Mala, con las fotos y el módulo recomendado", async () => {
      simularServidor([califMalo], { modulos: [moduloExistente] });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await user.click(await (await tablaLista()).findByText("Torres de Aranjuez"));

      // ¿Qué? Issue #619: es el mismo modal que ven los demás roles, con la ficha ya cargada (no se pide al servidor:
      //       GET /auditorias-conjunto/{id} rechaza al Admin del Sistema).
      const modal = await screen.findByRole("dialog", { name: "Resultado de la auditoría" });
      expect(within(modal).getByText("Carlos Gómez")).toBeInTheDocument();
      expect(within(modal).getByRole("button", { name: "Ver foto en tamaño completo" })).toBeInTheDocument();
      // ¿Qué? El mock de t() en __tests__/setup.ts no pluraliza (siempre usa la forma "_other" en bare) — se
      //       verifica con una expresión regular sin la "s" final, así sirve tanto aquí como con el i18next real.
      expect(within(modal).getByText("Contenido recomendado")).toBeInTheDocument();
      expect(within(modal).getByText(/Se avisó a 12 residente/)).toBeInTheDocument();
      expect(within(modal).getByRole("button", { name: /Código de colores/ })).toBeInTheDocument();
      expect(mockGet).not.toHaveBeenCalledWith(expect.stringContaining("/auditorias-conjunto/a1"), expect.anything());
    });

    it("el módulo recomendado del modal de la calificación abre su modal en la pestaña Módulos", async () => {
      simularServidor([califMalo], { modulos: [moduloExistente] });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await user.click(await (await tablaLista()).findByText("Torres de Aranjuez"));
      const modal = await screen.findByRole("dialog", { name: "Resultado de la auditoría" });

      await user.click(within(modal).getByRole("button", { name: /Código de colores/ }));

      expect(await screen.findByRole("dialog", { name: /Módulo: Código de colores/ })).toBeInTheDocument();
      expect(screen.queryByRole("dialog", { name: "Resultado de la auditoría" })).not.toBeInTheDocument();
    });

    // ¿Qué? Issue #587: pasados 6 meses la foto se borra (rutas en null) y el detalle lo avisa.
    it("el detalle de una calificación sin fotos (ya se borraron) lo avisa y conserva lo demás", async () => {
      const sinFotos: AuditoriaAdmin = { ...califMalo, ruta_evidencia: null, ruta_evidencia_2: null, ruta_evidencia_3: null };
      simularServidor([sinFotos]);
      const user = userEvent.setup({ delay: null });
      renderPage();
      await user.click(await (await tablaLista()).findByText("Torres de Aranjuez"));

      const modal = await screen.findByRole("dialog", { name: "Resultado de la auditoría" });
      expect(within(modal).getByText(/La foto ya no está disponible/)).toBeInTheDocument();
      expect(within(modal).queryByRole("button", { name: "Ver foto en tamaño completo" })).not.toBeInTheDocument();
      expect(within(modal).getByText("Carlos Gómez")).toBeInTheDocument();
    });

    it("el detalle de una calificación Buena dice que no hay recomendación", async () => {
      simularServidor([{ ...califBueno, created_at: "2026-09-21T09:00:00Z" }]);
      const user = userEvent.setup({ delay: null });
      renderPage();
      await user.click(await (await tablaLista()).findByText("Reserva de Prueba"));

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
      simularServidor([], { modulos: [moduloExistente] });
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

    describe("texto como muro", () => {
      async function abrirFormularioNuevo(user: ReturnType<typeof userEvent.setup>) {
        mockGet.mockImplementation((url: string) => {
          if (url.includes("/contenido-educativo") && !url.includes("/envios")) return Promise.resolve({ data: [moduloExistente] });
          return Promise.resolve(respuestaPorDefecto(url));
        });
        renderPage();
        await irAModulos(user);
        await screen.findByText("Código de colores");
        await user.click(screen.getByRole("button", { name: "Nuevo módulo" }));
      }

      it("explica cómo escribir el texto para que el muro quede bien", async () => {
        const user = userEvent.setup({ delay: null });
        await abrirFormularioNuevo(user);

        expect(screen.getByText(/Cada párrafo \(separado por una línea en blanco\) será una tarjeta del muro/)).toBeInTheDocument();
      });

      it("la vista previa dibuja el muro: 'De qué trata' y una tarjeta con su título", async () => {
        const user = userEvent.setup({ delay: null });
        await abrirFormularioNuevo(user);

        await user.type(
          screen.getByLabelText("Contenido *"),
          "Los tres colores de bolsa se usan en toda la ciudad.\n\nBolsa blanca: material limpio y seco."
        );

        expect(await screen.findByText("De qué trata")).toBeInTheDocument();
        expect(screen.getByRole("heading", { level: 3, name: "Bolsa blanca" })).toBeInTheDocument();
      });

      it("una imagen escrita en el texto no se pinta en la vista previa", async () => {
        const user = userEvent.setup({ delay: null });
        await abrirFormularioNuevo(user);

        await user.type(
          screen.getByLabelText("Contenido *"),
          "Introducción del tema.\n\n![rastreo](https://sitio-malo.com/pixel.png)\n\nBolsa blanca: material limpio y seco."
        );

        expect(await screen.findByRole("heading", { level: 3, name: "Bolsa blanca" })).toBeInTheDocument();
        expect(document.querySelector("img[src*='sitio-malo']")).toBeNull();
      });
    });

    describe("imágenes del muro", () => {
      const URL_SUBIDA = "/uploads/adjuntos/0b9c1a0e-3f4d-4c52-9b57-6f1f2a3b4c5d.png";
      const foto = () => new File(["x"], "foto.png", { type: "image/png" });

      async function abrirFormularioNuevo(user: ReturnType<typeof userEvent.setup>) {
        mockGet.mockImplementation((url: string) => {
          if (url.includes("/contenido-educativo") && !url.includes("/envios")) return Promise.resolve({ data: [moduloExistente] });
          return Promise.resolve(respuestaPorDefecto(url));
        });
        mockPost.mockImplementation((url: string) =>
          Promise.resolve({ data: url.includes("/uploads/") ? { url: URL_SUBIDA } : moduloExistente })
        );
        renderPage();
        await irAModulos(user);
        await screen.findByText("Código de colores");
        await user.click(screen.getByRole("button", { name: "Nuevo módulo" }));
      }

      it("'Insertar imagen' sube la imagen y la escribe en el texto, en su propia línea", async () => {
        const user = userEvent.setup({ delay: null });
        await abrirFormularioNuevo(user);
        await user.type(screen.getByLabelText("Contenido *"), "Introducción del tema.");

        const entrada = screen.getByText("Insertar imagen").closest("label")!.querySelector("input")!;
        await user.upload(entrada, foto());

        await waitFor(() => {
          expect((screen.getByLabelText("Contenido *") as HTMLTextAreaElement).value).toBe(
            `Introducción del tema.\n\n![descripción de la imagen](${URL_SUBIDA})\n\n`
          );
        });
      });

      it("si falla la subida de la imagen del texto, lo avisa y no cambia el texto", async () => {
        const user = userEvent.setup({ delay: null });
        await abrirFormularioNuevo(user);
        mockPost.mockRejectedValue(new Error("falló"));
        await user.type(screen.getByLabelText("Contenido *"), "Texto original del módulo.");

        await user.upload(screen.getByText("Insertar imagen").closest("label")!.querySelector("input")!, foto());

        expect(await screen.findByText("No se pudo subir la imagen. Intenta de nuevo.")).toBeInTheDocument();
        expect((screen.getByLabelText("Contenido *") as HTMLTextAreaElement).value).toBe("Texto original del módulo.");
      });

      it("la imagen insertada se ve en la vista previa, pegada a su tarjeta", async () => {
        const user = userEvent.setup({ delay: null });
        await abrirFormularioNuevo(user);
        await user.type(screen.getByLabelText("Contenido *"), "Introducción del tema.");
        await user.upload(screen.getByText("Insertar imagen").closest("label")!.querySelector("input")!, foto());
        await waitFor(() => expect((screen.getByLabelText("Contenido *") as HTMLTextAreaElement).value).toContain(URL_SUBIDA));

        await user.type(screen.getByLabelText("Contenido *"), "Bolsa blanca: limpio y seco.");

        const tarjeta = (await screen.findByRole("heading", { level: 3, name: "Bolsa blanca" })).closest("article")!;
        expect(tarjeta.querySelector("img")?.getAttribute("src")).toMatch(/\/uploads\/adjuntos\/0b9c1a0e.*\.png$/);
      });

      it("la imagen de portada se sube y se envía al guardar el módulo", async () => {
        const user = userEvent.setup({ delay: null });
        await abrirFormularioNuevo(user);
        await user.selectOptions(screen.getByLabelText("Categoría *"), "Separación en la fuente");
        await user.type(screen.getByPlaceholderText("Ej: Código de colores de bolsas"), "Tema con portada");
        await user.type(screen.getByLabelText("Contenido *"), "Contenido de prueba con más de veinte caracteres.");

        const portada = screen.getByText("Imagen de portada (opcional)").parentElement!.querySelector("input[type=file]")!;
        await user.upload(portada as HTMLInputElement, foto());
        await screen.findByRole("img", { name: /vista previa/i });
        await user.click(screen.getByRole("button", { name: "Guardar" }));

        await waitFor(() => {
          expect(mockPost).toHaveBeenCalledWith(
            expect.stringMatching(/\/contenido-educativo$/),
            expect.objectContaining({ titulo_tema: "Tema con portada", url_imagen: URL_SUBIDA })
          );
        });
      });

      it("un módulo sin portada se guarda con url_imagen en null", async () => {
        const user = userEvent.setup({ delay: null });
        await abrirFormularioNuevo(user);
        await user.selectOptions(screen.getByLabelText("Categoría *"), "Separación en la fuente");
        await user.type(screen.getByPlaceholderText("Ej: Código de colores de bolsas"), "Tema sin portada");
        await user.type(screen.getByLabelText("Contenido *"), "Contenido de prueba con más de veinte caracteres.");

        await user.click(screen.getByRole("button", { name: "Guardar" }));

        await waitFor(() => {
          expect(mockPost).toHaveBeenCalledWith(
            expect.stringMatching(/\/contenido-educativo$/),
            expect.objectContaining({ url_imagen: null })
          );
        });
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

    it("edita un módulo existente desde el menú de la fila", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/contenido-educativo") && !url.includes("/envios")) return Promise.resolve({ data: [moduloExistente] });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      mockPut.mockResolvedValue({ data: moduloExistente });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await user.click(await screen.findByRole("button", { name: "Acciones de Código de colores" }));
      await user.click(await screen.findByRole("menuitem", { name: "Editar" }));
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

    it("pulsar la fila abre el modal de ver, y 'Recomendado a' muestra los conjuntos sin repetir uno dos veces", async () => {
      const califViejaMismoConjunto: AuditoriaAdmin = { ...califMalo, id_auditoria: "a0", created_at: "2026-09-01T09:00:00Z" };
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/contenido-educativo") && url.includes("/envios")) return Promise.resolve({ data: [] });
        if (url.includes("/contenido-educativo")) return Promise.resolve({ data: [moduloExistente] });
        if (url.includes("/auditorias-conjunto/admin/resumen-semana")) return Promise.resolve(respuestaPorDefecto(url));
        if (url.includes("/auditorias-conjunto/admin")) {
          return Promise.resolve({ data: { items: [califMalo, califViejaMismoConjunto], total: 2, conteos: { BUENA: 0, REGULAR: 0, DEFICIENTE: 2 } } });
        }
        return Promise.resolve(respuestaPorDefecto(url));
      });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      // ¿Qué? El chip de la fila ya dice "Recomendado a N conjuntos" (no "N conjunto").
      expect(await screen.findByText("Recomendado a 1 conjunto")).toBeInTheDocument();
      await user.click(await screen.findByText("Código de colores"));

      const modal = await screen.findByRole("dialog", { name: /Módulo: Código de colores/ });
      // Se abre en "Vista previa": el contenido del módulo, no la lista de conjuntos.
      expect(within(modal).getByRole("tab", { name: "Vista previa" })).toHaveAttribute("aria-selected", "true");
      expect(within(modal).getByText(/Blanco, negro y verde/)).toBeInTheDocument();
      expect(within(modal).queryByText("Torres de Aranjuez")).not.toBeInTheDocument();

      await user.click(within(modal).getByRole("tab", { name: "Recomendado a (1)" }));
      expect(within(modal).getAllByText("Torres de Aranjuez")).toHaveLength(1);
    });

    // ¿Qué? Cada acción tiene un solo lugar: el menú de tres puntos de la fila. El modal de ver solo muestra.
    it("el modal de ver no tiene acciones: ni Enviar, ni Editar, ni Eliminar", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/contenido-educativo") && !url.includes("/envios")) return Promise.resolve({ data: [moduloExistente] });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await user.click(await screen.findByText("Código de colores"));

      const modal = await screen.findByRole("dialog", { name: /Módulo: Código de colores/ });
      expect(within(modal).queryByRole("button", { name: /Enviar a conjuntos|Editar|Eliminar/ })).not.toBeInTheDocument();
    });

    it("el menú de tres puntos de la fila solo tiene acciones (Enviar, Editar y Eliminar), sin 'Ver'", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/contenido-educativo") && !url.includes("/envios")) return Promise.resolve({ data: [moduloExistente] });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await user.click(await screen.findByRole("button", { name: "Acciones de Código de colores" }));

      const menu = await screen.findByRole("menu");
      expect(within(menu).getAllByRole("menuitem").map((o) => o.textContent)).toEqual(["Enviar a conjuntos…", "Editar", "Eliminar"]);
      // Abrir el menú no abre el modal de ver: el clic no sube a la fila.
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("Eliminar desde el menú de la fila pide confirmación antes de borrar", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/contenido-educativo") && !url.includes("/envios")) return Promise.resolve({ data: [moduloExistente] });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await user.click(await screen.findByRole("button", { name: "Acciones de Código de colores" }));
      await user.click(await screen.findByRole("menuitem", { name: "Eliminar" }));

      expect(mockDelete).not.toHaveBeenCalled();
      const dialog = await screen.findByRole("dialog", { name: "Confirmar eliminación" });
      await user.click(within(dialog).getByRole("button", { name: "Sí, eliminar" }));
      await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(expect.stringContaining(moduloExistente.id_contenido)));
    });

    it("Editar desde el menú de la fila abre el formulario de edición", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/contenido-educativo") && !url.includes("/envios")) return Promise.resolve({ data: [moduloExistente] });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await user.click(await screen.findByRole("button", { name: "Acciones de Código de colores" }));
      await user.click(await screen.findByRole("menuitem", { name: "Editar" }));

      expect(await screen.findByDisplayValue("Código de colores")).toBeInTheDocument();
    });

    // ¿Qué? Issue #619: un solo control de varios conjuntos y un botón que dice cuántos se enviarán.
    const montarEnvio = (enviosDespues: unknown[] = []) => {
      let yaEnvio = false;
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/contenido-educativo") && url.includes("/envios")) return Promise.resolve({ data: yaEnvio ? enviosDespues : [] });
        if (url.includes("/contenido-educativo")) return Promise.resolve({ data: [moduloExistente] });
        if (url.includes("/geography/localidades")) return Promise.resolve({ data: [{ id_localidad: 1, nombre_localidad: "Usaquén" }] });
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
      mockPost.mockImplementation(() => {
        yaEnvio = true;
        return Promise.resolve({ data: [] });
      });
    };

    it("envía el módulo a un conjunto desde la ventana 'Enviar a conjuntos', y el chip de la lista se actualiza", async () => {
      montarEnvio([{ id_conjunto_residencial: "c9", nombre_conjunto: "Conjunto Los Alpes", created_at: "2026-09-21T10:00:00Z" }]);
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await user.click(await screen.findByRole("button", { name: "Acciones de Código de colores" }));
      await user.click(await screen.findByRole("menuitem", { name: "Enviar a conjuntos…" }));

      const ventana = await screen.findByRole("dialog", { name: "Enviar a conjuntos" });
      await user.type(within(ventana).getByLabelText("Conjuntos"), "Alpes");
      // ¿Qué? Las opciones se buscan en `screen`: la lista del buscador se dibuja fuera de la ventana (`anchor`, issue #615).
      await user.click(await screen.findByText("Conjunto Los Alpes"));
      await user.keyboard("{Escape}");
      // ¿Qué? El mock de t() no pluraliza: el botón queda en singular ("conjunto") aunque haya más de uno.
      await user.click(within(ventana).getByRole("button", { name: /Enviar a 1 conjunto/ }));

      await waitFor(() => expect(mockPost).toHaveBeenCalledWith(expect.stringContaining("/enviar"), { conjuntos: ["c9"] }));
      await waitFor(() => expect(screen.queryByRole("dialog", { name: "Enviar a conjuntos" })).not.toBeInTheDocument());
      expect(await screen.findByText("Recomendado a 1 conjunto")).toBeInTheDocument();
    });

    it("envía el módulo a varios conjuntos a la vez", async () => {
      montarEnvio();
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await user.click(await screen.findByRole("button", { name: "Acciones de Código de colores" }));
      await user.click(await screen.findByRole("menuitem", { name: "Enviar a conjuntos…" }));

      const ventana = await screen.findByRole("dialog", { name: "Enviar a conjuntos" });
      const buscador = within(ventana).getByLabelText("Conjuntos");
      await user.type(buscador, "a");
      await user.click(await screen.findByText("Conjunto Los Alpes"));
      await user.type(buscador, "a");
      await user.click(await screen.findByText("Parques de Bogotá Urapan"));

      // ¿Qué? El combobox de selección múltiple de Headless UI no cierra su lista al elegir un ítem (a propósito, para
      //       poder seguir marcando varios) — mientras sigue abierta, marca el resto con aria-hidden="true", y el botón
      //       queda fuera del árbol de accesibilidad hasta cerrarla con Escape.
      await user.keyboard("{Escape}");
      await user.click(within(ventana).getByRole("button", { name: /Enviar a 2 conjunto/ }));

      await waitFor(() => expect(mockPost).toHaveBeenCalledWith(expect.stringContaining("/enviar"), { conjuntos: ["c9", "c8"] }));
    });

    it("la Localidad es opcional: acota la búsqueda de conjuntos y los ya elegidos se conservan al cambiarla", async () => {
      montarEnvio();
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await user.click(await screen.findByRole("button", { name: "Acciones de Código de colores" }));
      await user.click(await screen.findByRole("menuitem", { name: "Enviar a conjuntos…" }));
      const ventana = await screen.findByRole("dialog", { name: "Enviar a conjuntos" });
      // Sin elegir localidad ya se puede buscar y enviar: no es obligatoria.
      expect(within(ventana).getByLabelText("Localidad (opcional)")).toHaveValue("");
      await user.type(within(ventana).getByLabelText("Conjuntos"), "Alpes");
      await user.click(await screen.findByText("Conjunto Los Alpes"));
      await user.keyboard("{Escape}");
      expect(within(ventana).getByRole("button", { name: /Enviar a 1 conjunto/ })).toBeEnabled();

      await screen.findByRole("option", { name: "Usaquén" });
      await user.selectOptions(within(ventana).getByLabelText("Localidad (opcional)"), "1");
      await user.type(within(ventana).getByLabelText("Conjuntos"), "a");

      await waitFor(() =>
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining("/geography/conjuntos/todos"),
          expect.objectContaining({ params: expect.objectContaining({ id_localidad: 1 }) })
        )
      );
      // El conjunto elegido antes de cambiar de localidad sigue ahí (con la lista abierta el resto queda aria-hidden).
      await user.keyboard("{Escape}");
      expect(within(ventana).getByText("Conjunto Los Alpes")).toBeInTheDocument();
      expect(within(ventana).getByRole("button", { name: /Enviar a 1 conjunto/ })).toBeInTheDocument();
    });

    it("sin ningún conjunto elegido el botón de enviar está desactivado", async () => {
      montarEnvio();
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await user.click(await screen.findByRole("button", { name: "Acciones de Código de colores" }));
      await user.click(await screen.findByRole("menuitem", { name: "Enviar a conjuntos…" }));

      const ventana = await screen.findByRole("dialog", { name: "Enviar a conjuntos" });
      expect(within(ventana).getByRole("button", { name: "Enviar" })).toBeDisabled();
    });

    it("si falla el envío lo avisa y la ventana se queda abierta con lo elegido", async () => {
      montarEnvio();
      mockPost.mockRejectedValue(new Error("falló"));
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await user.click(await screen.findByRole("button", { name: "Acciones de Código de colores" }));
      await user.click(await screen.findByRole("menuitem", { name: "Enviar a conjuntos…" }));
      const ventana = await screen.findByRole("dialog", { name: "Enviar a conjuntos" });
      await user.type(within(ventana).getByLabelText("Conjuntos"), "Alpes");
      await user.click(await screen.findByText("Conjunto Los Alpes"));
      await user.keyboard("{Escape}");

      await user.click(within(ventana).getByRole("button", { name: /Enviar a 1 conjunto/ }));

      expect(await within(ventana).findByText("No se pudo enviar. Intenta de nuevo.")).toBeInTheDocument();
      expect(within(ventana).getByRole("button", { name: /Enviar a 1 conjunto/ })).toBeInTheDocument();
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

    // ¿Qué? Issue #400 (CN-048): una guía con ruta insegura no se pinta ni
    //       como imagen ni como botón "Ver guía de apoyo".
    it("no pinta la guía de apoyo si el enlace guardado no es seguro", async () => {
      const moduloConGuiaInsegura: ContenidoEducativo = { ...moduloExistente, url_guia: "/uploads/%2e%2e/api/guia.jpg" };
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/contenido-educativo") && !url.includes("/envios")) return Promise.resolve({ data: [moduloConGuiaInsegura] });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      const user = userEvent.setup({ delay: null });
      renderPage();
      await irAModulos(user);
      await user.click(await screen.findByText("Código de colores"));

      const panel = await screen.findByRole("dialog", { name: /Módulo: Código de colores/ });
      expect(within(panel).queryByRole("link", { name: "Ver guía de apoyo" })).not.toBeInTheDocument();
      expect(within(panel).queryByRole("button", { name: "Ampliar foto" })).not.toBeInTheDocument();
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
