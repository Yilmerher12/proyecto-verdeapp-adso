/**
 * Archivo: __tests__/pages/AdminConjuntoAgendaPage.test.tsx
 * Descripción: Tests de la Agenda del comité del Admin de Conjunto (RQF-020,
 *              HU-046, issue #435) — opción propia del menú, con notas "Por
 *              tratar", historial "Archivadas" paginado y una pestaña por conjunto.
 */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { AdminConjuntoAgendaPage } from "@/pages/AdminConjuntoAgendaPage";
import { RoleId } from "@/types/auth";
import { rangoDelPeriodo } from "@/lib/periodosDescarga";
import { renderWithProviders, mockUser } from "../helpers";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();
const mockDescargarArchivo = vi.fn();

// ¿Qué? Bajar el archivo a disco usa APIs del navegador que jsdom no trae (URL.createObjectURL).
vi.mock("@/lib/descargarArchivo", () => ({
  descargarArchivo: (...args: unknown[]) => mockDescargarArchivo(...args),
}));

vi.mock("axios", () => {
  const instance = {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    defaults: {},
  };
  return { default: { ...instance, create: () => instance } };
});

const adminConjuntoUser = { ...mockUser, role_id: RoleId.ADMIN_CONJUNTO };

const conjuntoUno = { id_conjunto_residencial: "c-1", nombre_conjunto: "Quintas de Aranjuez" };
const conjuntoDos = { id_conjunto_residencial: "c-2", nombre_conjunto: "Portal de Capellanía" };

const temaPendiente = {
  id: "t-1",
  texto: "Arreglar la puerta del sótano.",
  url_evidencia: "/uploads/adjuntos/puerta.jpg",
  estado: "PENDIENTE",
  created_at: "2026-09-22T10:00:00Z",
  archivado_en: null,
};
const temaArchivado = {
  id: "t-2",
  texto: "Cambiar el bombillo del parqueadero.",
  url_evidencia: null,
  estado: "ARCHIVADA",
  created_at: "2026-09-10T10:00:00Z",
  archivado_en: "2026-10-01T10:00:00Z",
};

type Listas = Record<string, unknown[]>;

// ¿Qué? "/agenda/archivadas" se revisa primero: su URL también contiene "/agenda" y "/mis-conjuntos".
//       Las archivadas se devuelven por página (limit/offset), como el backend.
function mockAgenda(conjuntos: unknown[], pendientes: Listas = {}, archivadas: Listas = {}) {
  mockGet.mockImplementation((url: string, config?: { params?: { limit: number; offset: number } }) => {
    if (url.includes("/agenda/archivadas")) {
      const id = Object.keys(archivadas).find((c) => url.includes(`/mis-conjuntos/${c}/agenda/archivadas`));
      const lista = id ? archivadas[id] : [];
      const offset = config?.params?.offset ?? 0;
      const limit = config?.params?.limit ?? 10;
      return Promise.resolve({ data: { items: lista.slice(offset, offset + limit), total: lista.length } });
    }
    if (url.includes("/agenda")) {
      const id = Object.keys(pendientes).find((c) => url.includes(`/mis-conjuntos/${c}/agenda`));
      return Promise.resolve({ data: id ? pendientes[id] : [] });
    }
    if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: conjuntos });
    return Promise.resolve({ data: [] });
  });
}

function renderPage() {
  return renderWithProviders(<AdminConjuntoAgendaPage />, {
    authContext: { user: adminConjuntoUser, isAuthenticated: true },
  });
}

describe("AdminConjuntoAgendaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValue({ data: {} });
    mockPatch.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: {} });
  });

  describe("Por tratar", () => {
    it("muestra los temas pendientes como notas, con la foto en miniatura y el contador", async () => {
      mockAgenda([conjuntoUno], { "c-1": [temaPendiente] });
      renderPage();

      expect(await screen.findByText("Arreglar la puerta del sótano.")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Ver foto" })).toHaveAttribute(
        "href",
        expect.stringContaining("/uploads/adjuntos/puerta.jpg")
      );
      expect(within(screen.getByRole("tab", { name: /Por tratar/ })).getByText("1")).toBeInTheDocument();
    });

    it("ya no ofrece 'Dejar en espera': el botón es Archivar", async () => {
      mockAgenda([conjuntoUno], { "c-1": [temaPendiente] });
      renderPage();

      await screen.findByText("Arreglar la puerta del sótano.");
      expect(screen.getByRole("button", { name: "Archivar" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Dejar en espera" })).not.toBeInTheDocument();
    });

    it("muestra el estado vacío si no hay temas por tratar", async () => {
      mockAgenda([conjuntoUno]);
      renderPage();

      expect(await screen.findByText("Todavía no hay temas por tratar en este conjunto.")).toBeInTheDocument();
    });

    it("avisa si no administra ningún conjunto y no deja agregar temas", async () => {
      mockAgenda([]);
      renderPage();

      expect(
        await screen.findByText("Todavía no tienes ningún conjunto asignado. Contacta al equipo de VerdeApp.")
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Agregar tema" })).toBeDisabled();
    });

    it("muestra un aviso de error si falla la carga", async () => {
      mockGet.mockRejectedValue(new Error("Network Error"));
      renderPage();

      expect(await screen.findByText("No se pudo cargar la información. Intenta de nuevo más tarde.")).toBeInTheDocument();
    });

    it("archiva un tema, avisa y permite deshacerlo", async () => {
      mockAgenda([conjuntoUno], { "c-1": [temaPendiente] });
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: "Archivar" }));
      await waitFor(() => {
        expect(mockPatch).toHaveBeenCalledWith(
          expect.stringContaining("/conjunto-panel/mis-conjuntos/c-1/agenda/t-1"),
          { estado: "ARCHIVADA" }
        );
      });
      expect(await screen.findByText("Tema archivado. Lo encuentras en Archivadas.")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Deshacer" }));
      await waitFor(() => {
        expect(mockPatch).toHaveBeenLastCalledWith(
          expect.stringContaining("/conjunto-panel/mis-conjuntos/c-1/agenda/t-1"),
          { estado: "PENDIENTE" }
        );
      });
      expect(screen.queryByText("Tema archivado. Lo encuentras en Archivadas.")).not.toBeInTheDocument();
    });

    // ¿Qué? Issue #458: mientras el servidor responde, el botón se desactiva y muestra que trabaja.
    // ¿Para qué? Con mala conexión el archivado puede tardar; antes el botón no cambiaba y se podía tocar dos veces.
    it("mientras archiva, el botón queda desactivado y marcado como ocupado (no se puede tocar dos veces)", async () => {
      mockAgenda([conjuntoUno], { "c-1": [temaPendiente] });
      let terminar: (valor: unknown) => void = () => {};
      mockPatch.mockImplementation(() => new Promise((resolver) => { terminar = resolver; }));
      const user = userEvent.setup();
      renderPage();

      const boton = await screen.findByRole("button", { name: "Archivar" });
      await user.click(boton);

      await waitFor(() => expect(boton).toBeDisabled());
      expect(boton).toHaveAttribute("aria-busy", "true");
      await user.click(boton);
      expect(mockPatch).toHaveBeenCalledTimes(1);

      terminar({ data: {} });
      expect(await screen.findByText("Tema archivado. Lo encuentras en Archivadas.")).toBeInTheDocument();
    });

    it("muestra un aviso si falla el archivado y no ofrece deshacer", async () => {
      mockAgenda([conjuntoUno], { "c-1": [temaPendiente] });
      mockPatch.mockRejectedValue(new Error("fallo"));
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: "Archivar" }));

      expect(await screen.findByText("No se pudo completar la acción. Intenta de nuevo.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Deshacer" })).not.toBeInTheDocument();
    });

    it("borra un tema con confirmación", async () => {
      mockAgenda([conjuntoUno], { "c-1": [temaPendiente] });
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: "Eliminar tema" }));
      await user.click(await screen.findByRole("button", { name: "Sí, eliminar" }));

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith(expect.stringContaining("/conjunto-panel/mis-conjuntos/c-1/agenda/t-1"));
      });
    });
  });

  describe("agregar un tema", () => {
    it("lo guarda en el conjunto elegido (el botón se habilita solo con texto)", async () => {
      mockAgenda([conjuntoUno, conjuntoDos]);
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("tab", { name: /Portal de Capellanía/ }));
      await user.click(screen.getByRole("button", { name: "Agregar tema" }));
      const guardar = screen.getByRole("button", { name: "Guardar tema" });
      expect(guardar).toBeDisabled();

      await user.type(screen.getByLabelText("Tema"), "Pintar el pasillo.");
      expect(guardar).toBeEnabled();
      await user.click(guardar);

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          expect.stringContaining("/conjunto-panel/mis-conjuntos/c-2/agenda"),
          { texto: "Pintar el pasillo.", url_evidencia: null }
        );
      });
    });

    it("muestra el error si falla el guardado y deja el formulario abierto", async () => {
      mockAgenda([conjuntoUno]);
      mockPost.mockRejectedValue(new Error("Servidor caído"));
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: "Agregar tema" }));
      await user.type(screen.getByLabelText("Tema"), "Hola");
      await user.click(screen.getByRole("button", { name: "Guardar tema" }));

      expect(await screen.findByText("Servidor caído")).toBeInTheDocument();
      expect(screen.getByLabelText("Tema")).toHaveValue("Hola");
    });
  });

  describe("pestañas por conjunto", () => {
    it("con un solo conjunto no muestra las pestañas de conjunto", async () => {
      mockAgenda([conjuntoUno], { "c-1": [temaPendiente] });
      renderPage();

      await screen.findByText("Arreglar la puerta del sótano.");
      expect(screen.queryByRole("tablist", { name: "Conjunto" })).not.toBeInTheDocument();
    });

    it("con 2 conjuntos muestra una pestaña por conjunto con sus pendientes y cambia de agenda al elegirla", async () => {
      const temaOtro = { ...temaPendiente, id: "t-9", texto: "Revisar la luz del parqueadero.", url_evidencia: null };
      mockAgenda([conjuntoUno, conjuntoDos], { "c-1": [temaPendiente], "c-2": [temaOtro, { ...temaOtro, id: "t-10" }] });
      const user = userEvent.setup();
      renderPage();

      const pestanaDos = await screen.findByRole("tab", { name: /Portal de Capellanía/ });
      expect(within(pestanaDos).getByText("2")).toBeInTheDocument();
      expect(within(screen.getByRole("tab", { name: /Quintas de Aranjuez/ })).getByText("1")).toBeInTheDocument();
      expect(screen.getByText("Arreglar la puerta del sótano.")).toBeInTheDocument();

      await user.click(pestanaDos);

      expect(screen.queryByText("Arreglar la puerta del sótano.")).not.toBeInTheDocument();
      expect(screen.getAllByText("Revisar la luz del parqueadero.")).toHaveLength(2);
    });

    it("el historial es de cada conjunto: al cambiar de pestaña se piden sus archivadas", async () => {
      mockAgenda([conjuntoUno, conjuntoDos], {}, { "c-1": [temaArchivado] });
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("tab", { name: /Archivadas/ }));
      expect(await screen.findByText("Cambiar el bombillo del parqueadero.")).toBeInTheDocument();

      await user.click(screen.getByRole("tab", { name: /Portal de Capellanía/ }));

      expect(await screen.findByText("Todavía no has archivado ningún tema en este conjunto.")).toBeInTheDocument();
      expect(screen.queryByText("Cambiar el bombillo del parqueadero.")).not.toBeInTheDocument();
    });
  });

  describe("Archivadas", () => {
    it("lista el historial con sus fechas y muestra el total en el contador", async () => {
      mockAgenda([conjuntoUno], {}, { "c-1": [temaArchivado] });
      const user = userEvent.setup();
      renderPage();

      const pestana = await screen.findByRole("tab", { name: /Archivadas/ });
      await waitFor(() => expect(within(pestana).getByText("1")).toBeInTheDocument());
      await user.click(pestana);

      expect(await screen.findByText("Cambiar el bombillo del parqueadero.")).toBeInTheDocument();
      expect(screen.getByText(/Creado/)).toBeInTheDocument();
      expect(screen.getByText(/Archivado/, { selector: "span" })).toBeInTheDocument();
    });

    it("muestra el estado vacío si no hay temas archivados", async () => {
      mockAgenda([conjuntoUno]);
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("tab", { name: /Archivadas/ }));

      expect(await screen.findByText("Todavía no has archivado ningún tema en este conjunto.")).toBeInTheDocument();
    });

    it("devuelve un tema archivado a Por tratar", async () => {
      mockAgenda([conjuntoUno], {}, { "c-1": [temaArchivado] });
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("tab", { name: /Archivadas/ }));
      await user.click(await screen.findByRole("button", { name: "Volver a por tratar" }));

      await waitFor(() => {
        expect(mockPatch).toHaveBeenCalledWith(
          expect.stringContaining("/conjunto-panel/mis-conjuntos/c-1/agenda/t-2"),
          { estado: "PENDIENTE" }
        );
      });
    });

    it("al restaurar un tema se quita el aviso de 'Tema archivado'", async () => {
      mockAgenda([conjuntoUno], { "c-1": [temaPendiente] }, { "c-1": [temaArchivado] });
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: "Archivar" }));
      expect(await screen.findByText("Tema archivado. Lo encuentras en Archivadas.")).toBeInTheDocument();

      await user.click(screen.getByRole("tab", { name: /Archivadas/ }));
      await user.click(await screen.findByRole("button", { name: "Volver a por tratar" }));

      expect(screen.queryByText("Tema archivado. Lo encuentras en Archivadas.")).not.toBeInTheDocument();
    });

    it("borra un tema archivado con confirmación", async () => {
      mockAgenda([conjuntoUno], {}, { "c-1": [temaArchivado] });
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("tab", { name: /Archivadas/ }));
      await user.click(await screen.findByRole("button", { name: "Eliminar tema" }));
      await user.click(await screen.findByRole("button", { name: "Sí, eliminar" }));

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith(expect.stringContaining("/conjunto-panel/mis-conjuntos/c-1/agenda/t-2"));
      });
    });

    it("pide la página siguiente del historial con el offset correcto", async () => {
      const muchos = Array.from({ length: 12 }, (_, i) => ({ ...temaArchivado, id: `a-${i}`, texto: `Tema archivado ${i}` }));
      mockAgenda([conjuntoUno], {}, { "c-1": muchos });
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("tab", { name: /Archivadas/ }));
      expect(await screen.findByText("Tema archivado 0")).toBeInTheDocument();
      expect(screen.getByText("Mostrando 1–10 de 12")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Página siguiente" }));

      expect(await screen.findByText("Tema archivado 10")).toBeInTheDocument();
      expect(mockGet).toHaveBeenLastCalledWith(
        expect.stringContaining("/mis-conjuntos/c-1/agenda/archivadas"),
        { params: { limit: 10, offset: 10 } }
      );
    });
  });

  describe("Descargar agenda (issues #479 y #480, HU-049)", () => {
    const archivoCsv = new Blob(["Tema;Estado"], { type: "text/csv" });

    // ¿Qué? "/agenda/historial/csv|pdf|conteo" se atiende antes que las demás rutas de agenda (su URL también contiene "/agenda").
    //       El conteo (issue de la ventana "Se descargarán N temas") responde por separado de la descarga.
    function mockAgendaConCsv(
      respuestaCsv: () => Promise<unknown>,
      respuestaConteo: (config?: unknown) => Promise<unknown> = () => Promise.resolve({ data: { total: 3, maximo: 500 } })
    ) {
      mockAgenda([conjuntoUno]);
      const base = mockGet.getMockImplementation()!;
      mockGet.mockImplementation((url: string, config?: unknown) => {
        if (url.includes("/agenda/historial/conteo")) return respuestaConteo(config);
        return url.includes("/agenda/historial/") ? respuestaCsv() : base(url, config);
      });
    }

    const pedidosDeConteo = () => mockGet.mock.calls.filter(([url]) => String(url).includes("/agenda/historial/conteo"));

    const abrirVentana = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(await screen.findByRole("button", { name: "Descargar agenda" }));
      return screen.findByRole("dialog");
    };

    const pedidoDeDescarga = () =>
      mockGet.mock.calls.find(([url]) => /\/agenda\/historial\/(csv|pdf)/.test(String(url))) as [string, { params: Record<string, unknown> }] | undefined;

    it("viene con CSV elegido y ofrece también PDF, como dos opciones pegadas", async () => {
      mockAgendaConCsv(() => Promise.resolve({ data: archivoCsv }));
      const user = userEvent.setup();
      renderPage();

      const ventana = await abrirVentana(user);

      expect(within(ventana).getByRole("radio", { name: "CSV (Excel)" })).toBeChecked();
      expect(within(ventana).getByRole("radio", { name: "PDF" })).not.toBeChecked();
    });

    it("el período viene en 'Todo el historial' y las fechas solo aparecen con 'Personalizado'", async () => {
      mockAgendaConCsv(() => Promise.resolve({ data: archivoCsv }));
      const user = userEvent.setup();
      renderPage();

      const ventana = await abrirVentana(user);
      expect(within(ventana).getByLabelText("Período")).toHaveValue("TODO");
      expect(within(ventana).queryByLabelText("Desde")).not.toBeInTheDocument();

      await user.selectOptions(within(ventana).getByLabelText("Período"), "PERSONALIZADO");

      expect(within(ventana).getByLabelText("Desde")).toBeInTheDocument();
      expect(within(ventana).getByLabelText("Hasta")).toBeInTheDocument();
    });

    it("'Temas' viene con lo que se está viendo: Por tratar en esa pestaña y Archivadas en la otra", async () => {
      mockAgendaConCsv(() => Promise.resolve({ data: archivoCsv }));
      const user = userEvent.setup();
      renderPage();

      let ventana = await abrirVentana(user);
      expect(within(ventana).getByLabelText("Temas")).toHaveValue("PENDIENTE");
      await user.click(within(ventana).getByRole("button", { name: "Cancelar" }));

      await user.click(screen.getByRole("tab", { name: /Archivadas/ }));
      ventana = await abrirVentana(user);
      expect(within(ventana).getByLabelText("Temas")).toHaveValue("ARCHIVADA");
    });

    it("pide el CSV con el estado y las fechas elegidos, lo baja con un nombre sin datos personales y avisa que se descargó", async () => {
      mockAgendaConCsv(() => Promise.resolve({ data: archivoCsv }));
      const user = userEvent.setup();
      renderPage();

      const ventana = await abrirVentana(user);
      await user.selectOptions(within(ventana).getByLabelText("Temas"), "ARCHIVADA");
      await user.selectOptions(within(ventana).getByLabelText("Período"), "PERSONALIZADO");
      await user.type(within(ventana).getByLabelText("Desde"), "2026-10-01");
      await user.type(within(ventana).getByLabelText("Hasta"), "2026-10-31");
      await user.click(within(ventana).getByRole("button", { name: "Descargar" }));

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining("/conjunto-panel/mis-conjuntos/c-1/agenda/historial/csv"),
          { params: { estado: "ARCHIVADA", desde: "2026-10-01", hasta: "2026-10-31" }, responseType: "blob" }
        );
      });
      await waitFor(() => {
        expect(mockDescargarArchivo).toHaveBeenCalledWith(archivoCsv, "historial-agenda-quintas-de-aranjuez-2026-10-01_2026-10-31.csv");
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(await screen.findByText("Archivo descargado.")).toBeInTheDocument();
    });

    it("con formato PDF pide el PDF con los mismos filtros y lo baja con extensión .pdf", async () => {
      const archivoPdf = new Blob(["%PDF-1.3"], { type: "application/pdf" });
      mockAgendaConCsv(() => Promise.resolve({ data: archivoPdf }));
      const user = userEvent.setup();
      renderPage();

      const ventana = await abrirVentana(user);
      await user.click(within(ventana).getByRole("radio", { name: "PDF" }));
      await user.selectOptions(within(ventana).getByLabelText("Período"), "PERSONALIZADO");
      await user.type(within(ventana).getByLabelText("Desde"), "2026-10-01");
      await user.type(within(ventana).getByLabelText("Hasta"), "2026-10-15");
      await user.click(within(ventana).getByRole("button", { name: "Descargar" }));

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining("/conjunto-panel/mis-conjuntos/c-1/agenda/historial/pdf"),
          { params: { estado: "PENDIENTE", desde: "2026-10-01", hasta: "2026-10-15" }, responseType: "blob" }
        );
      });
      await waitFor(() => {
        expect(mockDescargarArchivo).toHaveBeenCalledWith(archivoPdf, "historial-agenda-quintas-de-aranjuez-2026-10-01_2026-10-15.pdf");
      });
      expect(mockGet).not.toHaveBeenCalledWith(expect.stringContaining("/historial/csv"), expect.anything());
    });

    it("'Este mes' manda las fechas de ese mes sin que haya que escribirlas", async () => {
      mockAgendaConCsv(() => Promise.resolve({ data: archivoCsv }));
      const user = userEvent.setup();
      renderPage();

      const ventana = await abrirVentana(user);
      await user.selectOptions(within(ventana).getByLabelText("Período"), "ESTE_MES");
      await user.click(within(ventana).getByRole("button", { name: "Descargar" }));

      const { desde, hasta } = rangoDelPeriodo("ESTE_MES", { desde: "", hasta: "" });
      await waitFor(() => expect(pedidoDeDescarga()?.[1].params).toEqual({ estado: "PENDIENTE", desde, hasta }));
      expect(desde).toMatch(/^\d{4}-\d{2}-01$/);
    });

    it("con 'Todo el historial' no manda límites de fecha", async () => {
      mockAgendaConCsv(() => Promise.resolve({ data: archivoCsv }));
      const user = userEvent.setup();
      renderPage();

      const ventana = await abrirVentana(user);
      await user.click(within(ventana).getByRole("button", { name: "Descargar" }));

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/agenda/historial/csv"), {
          params: { estado: "PENDIENTE", desde: undefined, hasta: undefined },
          responseType: "blob",
        });
      });
      await waitFor(() => {
        expect(mockDescargarArchivo).toHaveBeenCalledWith(archivoCsv, "historial-agenda-quintas-de-aranjuez-inicio_hoy.csv");
      });
    });

    it("con 'Personalizado', 'Descargar' espera las dos fechas y explica por qué", async () => {
      mockAgendaConCsv(() => Promise.resolve({ data: archivoCsv }));
      const user = userEvent.setup();
      renderPage();

      const ventana = await abrirVentana(user);
      await user.selectOptions(within(ventana).getByLabelText("Período"), "PERSONALIZADO");
      const descargar = within(ventana).getByRole("button", { name: "Descargar" });

      expect(descargar).toBeDisabled();
      expect(within(ventana).getByText("Elige las dos fechas para descargar.")).toBeInTheDocument();

      await user.type(within(ventana).getByLabelText("Desde"), "2026-10-01");
      expect(descargar).toBeDisabled();

      await user.type(within(ventana).getByLabelText("Hasta"), "2026-10-31");
      expect(descargar).toBeEnabled();
      expect(within(ventana).queryByText("Elige las dos fechas para descargar.")).not.toBeInTheDocument();
    });

    it("avisa en el campo 'Hasta' si el rango está al revés y no deja descargar", async () => {
      mockAgendaConCsv(() => Promise.resolve({ data: archivoCsv }));
      const user = userEvent.setup();
      renderPage();

      const ventana = await abrirVentana(user);
      await user.selectOptions(within(ventana).getByLabelText("Período"), "PERSONALIZADO");
      await user.type(within(ventana).getByLabelText("Desde"), "2026-10-31");
      await user.type(within(ventana).getByLabelText("Hasta"), "2026-10-01");
      await user.tab();

      expect(await within(ventana).findByText('La fecha "Hasta" no puede ser anterior a la fecha "Desde".')).toBeInTheDocument();
      expect(within(ventana).getByLabelText("Hasta")).toHaveAttribute("aria-invalid", "true");
      expect(within(ventana).getByRole("button", { name: "Descargar" })).toBeDisabled();
      expect(pedidoDeDescarga()).toBeUndefined();
      expect(mockDescargarArchivo).not.toHaveBeenCalled();
    });

    it("muestra el mensaje del backend cuando el rango pasa de 500 temas (el error llega como Blob)", async () => {
      const detail = "El rango tiene 501 temas y el máximo por descarga es 500. Acota las fechas.";
      const error = Object.assign(new Error("Request failed with status code 400"), {
        response: { status: 400, data: new Blob([JSON.stringify({ detail })], { type: "application/json" }) },
      });
      mockAgendaConCsv(() => Promise.reject(error));
      const user = userEvent.setup();
      renderPage();

      const ventana = await abrirVentana(user);
      await user.click(within(ventana).getByRole("button", { name: "Descargar" }));

      expect(await within(ventana).findByText(detail)).toBeInTheDocument();
      expect(mockDescargarArchivo).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.queryByText("Archivo descargado.")).not.toBeInTheDocument();
    });

    it("muestra un mensaje genérico si falla sin respuesta del servidor", async () => {
      mockAgendaConCsv(() => Promise.reject(new Error("")));
      const user = userEvent.setup();
      renderPage();

      const ventana = await abrirVentana(user);
      await user.click(within(ventana).getByRole("button", { name: "Descargar" }));

      expect(await within(ventana).findByText("No se pudo descargar el historial. Intenta de nuevo.")).toBeInTheDocument();
    });

    describe("conteo antes de descargar", () => {
      it("muestra cuántos temas se van a descargar, con el singular cuando es uno", async () => {
        mockAgendaConCsv(() => Promise.resolve({ data: archivoCsv }), () => Promise.resolve({ data: { total: 87, maximo: 500 } }));
        const user = userEvent.setup();
        renderPage();

        const ventana = await abrirVentana(user);

        expect(await within(ventana).findByText("Se descargarán 87 temas.")).toBeInTheDocument();
        expect(within(ventana).getByRole("button", { name: "Descargar" })).toBeEnabled();
        expect(pedidosDeConteo()[0][1]).toEqual({ params: { estado: "PENDIENTE", desde: undefined, hasta: undefined } });
      });

      it("dice 'Se descargará 1 tema.' en singular", async () => {
        mockAgendaConCsv(() => Promise.resolve({ data: archivoCsv }), () => Promise.resolve({ data: { total: 1, maximo: 500 } }));
        const user = userEvent.setup();
        renderPage();

        const ventana = await abrirVentana(user);

        expect(await within(ventana).findByText("Se descargará 1 tema.")).toBeInTheDocument();
      });

      it("mientras espera avisa 'Contando temas...' y al cambiar varios filtros seguidos pide un solo conteo", async () => {
        mockAgendaConCsv(() => Promise.resolve({ data: archivoCsv }), () => Promise.resolve({ data: { total: 5, maximo: 500 } }));
        const user = userEvent.setup();
        renderPage();

        const ventana = await abrirVentana(user);
        expect(within(ventana).getByText("Contando temas...")).toBeInTheDocument();
        await user.selectOptions(within(ventana).getByLabelText("Período"), "ESTE_MES");
        await user.selectOptions(within(ventana).getByLabelText("Temas"), "ARCHIVADA");

        expect(await within(ventana).findByText("Se descargarán 5 temas.")).toBeInTheDocument();
        const { desde, hasta } = rangoDelPeriodo("ESTE_MES", { desde: "", hasta: "" });
        expect(pedidosDeConteo()).toHaveLength(1);
        expect(pedidosDeConteo()[0][1]).toEqual({ params: { estado: "ARCHIVADA", desde, hasta } });
      });

      it("si pasa del máximo escribe el motivo y deshabilita 'Descargar'", async () => {
        mockAgendaConCsv(() => Promise.resolve({ data: archivoCsv }), () => Promise.resolve({ data: { total: 620, maximo: 500 } }));
        const user = userEvent.setup();
        renderPage();

        const ventana = await abrirVentana(user);

        expect(
          await within(ventana).findByText("Son 620 temas y el máximo por archivo es 500. Elige un período más corto o un solo tipo de temas.")
        ).toBeInTheDocument();
        expect(within(ventana).getByRole("button", { name: "Descargar" })).toBeDisabled();
      });

      it("al acotar el período vuelve a habilitar 'Descargar'", async () => {
        mockAgendaConCsv(
          () => Promise.resolve({ data: archivoCsv }),
          (config) =>
            Promise.resolve({ data: { total: (config as { params: { desde?: string } }).params.desde ? 20 : 620, maximo: 500 } })
        );
        const user = userEvent.setup();
        renderPage();

        const ventana = await abrirVentana(user);
        expect(await within(ventana).findByText(/Son 620 temas/)).toBeInTheDocument();
        await user.selectOptions(within(ventana).getByLabelText("Período"), "ESTE_MES");

        expect(await within(ventana).findByText("Se descargarán 20 temas.")).toBeInTheDocument();
        expect(within(ventana).getByRole("button", { name: "Descargar" })).toBeEnabled();
      });

      it("con fechas incompletas o al revés no pide conteo", async () => {
        mockAgendaConCsv(() => Promise.resolve({ data: archivoCsv }));
        const user = userEvent.setup();
        renderPage();

        const ventana = await abrirVentana(user);
        await user.selectOptions(within(ventana).getByLabelText("Período"), "PERSONALIZADO");
        await user.type(within(ventana).getByLabelText("Desde"), "2026-10-31");
        await user.type(within(ventana).getByLabelText("Hasta"), "2026-10-01");
        await new Promise((r) => setTimeout(r, 600));

        expect(pedidosDeConteo()).toHaveLength(0);
        expect(within(ventana).queryByText(/Se descargar/)).not.toBeInTheDocument();
      });

      it("si el conteo falla no muestra nada ni bloquea la descarga", async () => {
        mockAgendaConCsv(() => Promise.resolve({ data: archivoCsv }), () => Promise.reject(new Error("")));
        const user = userEvent.setup();
        renderPage();

        const ventana = await abrirVentana(user);
        await waitFor(() => expect(pedidosDeConteo()).toHaveLength(1));
        await waitFor(() => expect(within(ventana).queryByText("Contando temas...")).not.toBeInTheDocument());

        expect(within(ventana).queryByText(/Se descargar/)).not.toBeInTheDocument();
        expect(within(ventana).getByRole("button", { name: "Descargar" })).toBeEnabled();
      });
    });

    it("cancelar cierra la ventana sin pedir nada", async () => {
      mockAgendaConCsv(() => Promise.resolve({ data: archivoCsv }));
      const user = userEvent.setup();
      renderPage();

      const ventana = await abrirVentana(user);
      await user.click(within(ventana).getByRole("button", { name: "Cancelar" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(pedidoDeDescarga()).toBeUndefined();
    });
  });
});
