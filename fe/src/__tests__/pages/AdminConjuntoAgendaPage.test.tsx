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
import { renderWithProviders, mockUser } from "../helpers";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

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
});
