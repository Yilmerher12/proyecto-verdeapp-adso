/**
 * Archivo: __tests__/pages/AdminPuntosAcopioPage.test.tsx
 * Descripción: Tests del panel de gestión de puntos de acopio del Admin
 *              Sistema (RQF-011 / HU-015, HU-016, HU-017): tabla con filas
 *              desplegables, kebab por fila y modal de edición.
 */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { AdminPuntosAcopioPage } from "@/pages/AdminPuntosAcopioPage";
import { RoleId } from "@/types/auth";
import { renderWithProviders, mockUser } from "../helpers";

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

const adminUser = { ...mockUser, role_id: RoleId.ADMIN_SISTEMA };

const localidades = [{ id_localidad: 1, nombre_localidad: "Usaquén" }];

const puntoActivo = {
  id_punto_acopio: "1",
  nombre: "ECA Kennedy",
  direccion: "Carrera 84 # 11A-34",
  id_localidad: 1,
  nombre_localidad: "Usaquén",
  nombre_encargado: null,
  telefono_contacto: null,
  activo: true,
  url_foto: null,
};

const puntoInactivo = { ...puntoActivo, id_punto_acopio: "2", nombre: "ECA Retirado", activo: false };

const comentario = {
  id_comentario: "c1",
  texto: "Encargada confirmada por llamada.",
  created_at: "2026-09-12T15:00:00Z",
  autor: "admin@verdeapp.com",
};

type PuntoMock = typeof puntoActivo;

const sinTildes = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ¿Qué? Hace de servidor: la búsqueda, los filtros y la página se aplican aquí, como en el backend real
//       (issue #664: la página ya no recibe la lista completa). La lista se entrega en el orden en que se pasa.
// ¿Impacto? "/comentarios" y "/resumen" se revisan primero: sus URL también contienen "/admin/puntos-acopio".
function mockRespuestas(puntos: unknown[], comentarios: unknown[] = []) {
  const todos = puntos as PuntoMock[];
  mockGet.mockImplementation((url: string, config?: { params?: Record<string, string | number> }) => {
    if (url.includes("/comentarios")) return Promise.resolve({ data: comentarios });
    if (url.includes("/admin/puntos-acopio/resumen")) {
      const activos = todos.filter((p) => p.activo).length;
      const porLocalidad = new Map(todos.map((p) => [p.id_localidad, p.nombre_localidad]));
      return Promise.resolve({
        data: {
          total: todos.length,
          activos,
          de_baja: todos.length - activos,
          localidades: [...porLocalidad]
            .map(([id_localidad, nombre_localidad]) => ({ id_localidad, nombre_localidad }))
            .sort((a, b) => a.nombre_localidad.localeCompare(b.nombre_localidad)),
        },
      });
    }
    if (url.includes("/admin/puntos-acopio")) {
      const { q, estado, id_localidad, limit = 20, offset = 0 } = config?.params ?? {};
      const filtrados = todos.filter(
        (p) =>
          (estado !== "activos" || p.activo) &&
          (estado !== "baja" || !p.activo) &&
          (!id_localidad || p.id_localidad === Number(id_localidad)) &&
          (!q || sinTildes(`${p.nombre} ${p.direccion}`).includes(sinTildes(String(q)))),
      );
      return Promise.resolve({ data: { items: filtrados.slice(Number(offset), Number(offset) + Number(limit)), total: filtrados.length } });
    }
    if (url.includes("/geography/localidades")) return Promise.resolve({ data: localidades });
    return Promise.resolve({ data: [] });
  });
}

function renderPage() {
  return renderWithProviders(<AdminPuntosAcopioPage />, {
    authContext: { user: adminUser, isAuthenticated: true },
  });
}

// ¿Qué? Abre el kebab de un punto y elige una de sus opciones del menú.
async function elegirOpcion(user: ReturnType<typeof userEvent.setup>, nombre: string, opcion: string) {
  await user.click(await screen.findByRole("button", { name: `Acciones de ${nombre}` }));
  await user.click(screen.getByRole("menuitem", { name: opcion }));
}

describe("AdminPuntosAcopioPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRespuestas([]);
    mockPost.mockResolvedValue({ data: {} });
    mockPut.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: {} });
  });

  it("muestra el estado vacío cuando no hay puntos registrados", async () => {
    renderPage();
    expect(await screen.findByText("Todavía no hay puntos de acopio registrados.")).toBeInTheDocument();
  });

  it("lista los puntos en una tabla, marcando los inactivos", async () => {
    mockRespuestas([puntoActivo, puntoInactivo]);
    renderPage();

    expect(await screen.findByText("ECA Kennedy")).toBeInTheDocument();
    expect(screen.getByText("ECA Retirado")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Punto" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Estado" })).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it("no tiene secciones por localidad ni botones de ícono en la fila: las acciones van en el kebab", async () => {
    mockRespuestas([puntoActivo]);
    renderPage();

    await screen.findByText("ECA Kennedy");
    expect(screen.queryByRole("button", { name: "Editar ECA Kennedy" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dar de baja ECA Kennedy" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Acciones de ECA Kennedy" })).toBeInTheDocument();
  });

  it("el menú de un punto activo ofrece ver, editar y dar de baja, pero no reactivar ni eliminar", async () => {
    mockRespuestas([puntoActivo]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Acciones de ECA Kennedy" }));

    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["Ver ficha", "Editar", "Dar de baja"]);
  });

  it("el menú de un punto de baja ofrece reactivar y eliminar definitivamente, pero no dar de baja", async () => {
    mockRespuestas([puntoInactivo]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Acciones de ECA Retirado" }));

    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
      "Ver ficha",
      "Editar",
      "Reactivar",
      "Eliminar definitivamente",
    ]);
  });

  it("crea un punto de acopio nuevo", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Todavía no hay puntos de acopio registrados.");
    await user.click(screen.getByRole("button", { name: "Nuevo punto de acopio" }));

    await user.type(screen.getByPlaceholderText("Ej: ECA Kennedy"), "ECA Nueva");
    await user.type(screen.getByPlaceholderText("Ej: Carrera 84 # 11A-34"), "Calle 1 # 1-1");
    await user.selectOptions(screen.getByLabelText(/Localidad/), "1");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/admin/puntos-acopio"),
        expect.objectContaining({ nombre: "ECA Nueva", direccion: "Calle 1 # 1-1", id_localidad: 1 })
      );
    });
  });

  // ¿Qué? Issue #13 (hallazgo U8 de la auditoría) — antes un campo vacío
  //       solo se avisaba con un Alert genérico al enviar ("Nombre,
  //       dirección y localidad son obligatorios"). Ahora cada campo se
  //       valida al salir de él, y el error queda anclado a ESE campo.
  it("marca el campo Nombre con su propio error al salir vacío, sin tocar los demás", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Todavía no hay puntos de acopio registrados.");
    await user.click(screen.getByRole("button", { name: "Nuevo punto de acopio" }));

    await user.click(screen.getByLabelText("Nombre"));
    await user.tab();

    expect(await screen.findByText("El nombre es obligatorio.")).toBeInTheDocument();
    expect(screen.queryByText("La dirección es obligatoria.")).not.toBeInTheDocument();
  });

  it("'Editar' abre el formulario en un modal, no en un panel lateral, y guarda el cambio", async () => {
    mockRespuestas([puntoActivo]);
    const user = userEvent.setup();
    renderPage();

    await elegirOpcion(user, "ECA Kennedy", "Editar");

    expect(await screen.findByRole("dialog", { name: "Editar punto de acopio" })).toBeInTheDocument();
    const inputNombre = screen.getByDisplayValue("ECA Kennedy");
    await user.clear(inputNombre);
    await user.type(inputNombre, "ECA Kennedy Renovada");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        expect.stringContaining("/admin/puntos-acopio/1"),
        expect.objectContaining({ nombre: "ECA Kennedy Renovada" })
      );
    });
    // ¿Qué? Tras guardar, el modal se cierra.
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Editar punto de acopio" })).not.toBeInTheDocument());
  });

  it("al editar envía el motivo del cambio", async () => {
    mockRespuestas([{ ...puntoActivo, nombre_encargado: "Marta Rojas", telefono_contacto: "3105550142" }]);
    const user = userEvent.setup();
    renderPage();

    await elegirOpcion(user, "ECA Kennedy", "Editar");

    const encargado = await screen.findByDisplayValue("Marta Rojas");
    await user.clear(encargado);
    await user.type(encargado, "Luis Peña");
    expect(screen.getByText("Cambió: Marta Rojas → Luis Peña")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Motivo del cambio/), "Marta dejó el cargo");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        expect.stringContaining("/admin/puntos-acopio/1"),
        expect.objectContaining({ nombre_encargado: "Luis Peña", motivo_cambio: "Marta dejó el cargo" })
      );
    });
  });

  it("si falla al guardar la edición, el modal se queda abierto con el aviso", async () => {
    mockRespuestas([puntoActivo]);
    mockPut.mockRejectedValue(new Error("Network Error"));
    const user = userEvent.setup();
    renderPage();

    await elegirOpcion(user, "ECA Kennedy", "Editar");
    await screen.findByRole("dialog", { name: "Editar punto de acopio" });
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText(/No se pudo guardar/)).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Editar punto de acopio" })).toBeInTheDocument();
  });

  it("da de baja un punto de acopio tras confirmar", async () => {
    mockRespuestas([puntoActivo]);
    const user = userEvent.setup();
    renderPage();

    await elegirOpcion(user, "ECA Kennedy", "Dar de baja");

    expect(screen.getByText('¿Dar de baja "ECA Kennedy"?')).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sí, dar de baja" }));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(expect.stringContaining("/admin/puntos-acopio/1"));
    });
  });

  it("reactiva un punto dado de baja, sin necesitar confirmación", async () => {
    mockRespuestas([puntoInactivo]);
    mockPost.mockResolvedValue({ data: { ...puntoInactivo, activo: true } });
    const user = userEvent.setup();
    renderPage();

    await elegirOpcion(user, "ECA Retirado", "Reactivar");

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/admin/puntos-acopio/2/reactivar"),
        {}
      );
    });
  });

  // ¿Qué? Distinto de "dar de baja": solo se ofrece para un punto ya
  //       inactivo, y borra el registro por completo.
  it("elimina definitivamente un punto ya dado de baja, tras confirmar", async () => {
    mockRespuestas([puntoInactivo]);
    const user = userEvent.setup();
    renderPage();

    await elegirOpcion(user, "ECA Retirado", "Eliminar definitivamente");

    expect(screen.getByText('¿Eliminar "ECA Retirado" definitivamente?')).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sí, eliminar" }));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(
        expect.stringContaining("/admin/puntos-acopio/2/definitivo")
      );
    });
  });

  describe("búsqueda y filtros", () => {
    const engativa = { ...puntoActivo, id_punto_acopio: "3", nombre: "ECA Engativá", direccion: "Calle 80C # 92-44", id_localidad: 2, nombre_localidad: "Engativá" };

    // ¿Qué? Los últimos parámetros con los que se pidió la lista al servidor.
    const ultimosParametros = () => {
      const llamadas = mockGet.mock.calls.filter(([url]) => String(url).endsWith("/admin/puntos-acopio"));
      return llamadas[llamadas.length - 1][1].params;
    };

    it("pide la búsqueda al servidor, que ignora tildes y mayúsculas, y espera a que dejes de escribir", async () => {
      mockRespuestas([puntoActivo, engativa]);
      const user = userEvent.setup();
      renderPage();

      await screen.findByText("ECA Kennedy");
      await user.type(screen.getByRole("searchbox"), "engativa");

      expect(await screen.findByText("ECA Engativá")).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByText("ECA Kennedy")).not.toBeInTheDocument());
      expect(ultimosParametros()).toMatchObject({ q: "engativa", offset: 0 });
      // ¿Qué? Una sola petición con el texto completo, no una por cada letra.
      const conTexto = mockGet.mock.calls.filter(([url, cfg]) => String(url).endsWith("/admin/puntos-acopio") && cfg?.params?.q);
      expect(conTexto).toHaveLength(1);
    });

    it("muestra un aviso si nada coincide con la búsqueda", async () => {
      mockRespuestas([puntoActivo, engativa]);
      const user = userEvent.setup();
      renderPage();

      await screen.findByText("ECA Kennedy");
      await user.type(screen.getByRole("searchbox"), "zzz");

      expect(await screen.findByText("Ningún punto coincide con tu búsqueda.")).toBeInTheDocument();
    });

    it("filtra por estado en el servidor y muestra el conteo de cada uno", async () => {
      mockRespuestas([puntoActivo, puntoInactivo]);
      const user = userEvent.setup();
      renderPage();

      await screen.findByText("ECA Kennedy");
      expect(await screen.findByRole("button", { name: "Todos · 2" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Activos · 1" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "De baja · 1" }));
      expect(await screen.findByText("ECA Retirado")).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByText("ECA Kennedy")).not.toBeInTheDocument());
      expect(ultimosParametros()).toMatchObject({ estado: "baja" });
      // ¿Qué? Los conteos son de todos los puntos, no de la página filtrada.
      expect(screen.getByRole("button", { name: "Todos · 2" })).toBeInTheDocument();
    });

    it("filtra por localidad en el servidor, con solo las localidades que tienen puntos", async () => {
      mockRespuestas([puntoActivo, engativa]);
      const user = userEvent.setup();
      renderPage();

      await screen.findByText("ECA Kennedy");
      const select = screen.getByRole("combobox", { name: "Localidad" });
      await waitFor(() =>
        expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual(["Todas las localidades", "Engativá", "Usaquén"]),
      );

      await user.selectOptions(select, "2");
      expect(await screen.findByText("ECA Engativá")).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByText("ECA Kennedy")).not.toBeInTheDocument());
      expect(ultimosParametros()).toMatchObject({ id_localidad: 2 });
    });

    it("muestra las filas en el orden en que las entrega el servidor", async () => {
      mockRespuestas([puntoActivo, engativa, { ...engativa, id_punto_acopio: "5", nombre: "ECA Engativá 2" }]);
      renderPage();

      await screen.findByText("ECA Kennedy");
      const nombres = screen.getAllByRole("row").slice(1).map((fila) => within(fila).getAllByRole("cell")[0].querySelector("p")?.textContent);
      expect(nombres).toEqual(["ECA Kennedy", "ECA Engativá", "ECA Engativá 2"]);
    });

    it("muestra el resumen de puntos y localidades, y cuántos están de baja", async () => {
      mockRespuestas([puntoActivo, puntoInactivo, engativa]);
      renderPage();

      expect(await screen.findByText("3 puntos en 2 localidades · 1 de baja")).toBeInTheDocument();
    });

    describe("paginación", () => {
      const muchos = Array.from({ length: 45 }, (_, i) => ({
        ...puntoActivo,
        id_punto_acopio: `p${i}`,
        nombre: `ECA ${String(i + 1).padStart(2, "0")}`,
      }));

      it("pide de a 20 puntos y muestra cuántos hay en total", async () => {
        mockRespuestas(muchos);
        renderPage();

        expect(await screen.findByText("ECA 01")).toBeInTheDocument();
        expect(screen.getByText("ECA 20")).toBeInTheDocument();
        expect(screen.queryByText("ECA 21")).not.toBeInTheDocument();
        expect(screen.getByText(/1.*20.*45/)).toBeInTheDocument();
        expect(ultimosParametros()).toMatchObject({ limit: 20, offset: 0 });
      });

      it("pasa a la página siguiente y pide su offset", async () => {
        mockRespuestas(muchos);
        const user = userEvent.setup();
        renderPage();

        await screen.findByText("ECA 01");
        await user.click(screen.getByRole("button", { name: "Página siguiente" }));

        expect(await screen.findByText("ECA 21")).toBeInTheDocument();
        expect(screen.queryByText("ECA 01")).not.toBeInTheDocument();
        expect(ultimosParametros()).toMatchObject({ offset: 20 });
      });

      it("al cambiar un filtro vuelve a la primera página", async () => {
        mockRespuestas(muchos);
        const user = userEvent.setup();
        renderPage();

        await screen.findByText("ECA 01");
        await user.click(screen.getByRole("button", { name: "Página siguiente" }));
        await screen.findByText("ECA 21");
        await user.click(await screen.findByRole("button", { name: "Activos · 45" }));

        expect(await screen.findByText("ECA 01")).toBeInTheDocument();
        expect(ultimosParametros()).toMatchObject({ estado: "activos", offset: 0 });
      });
    });

    it("muestra el resumen de puntos y localidades, y cuántos están de baja", async () => {
      mockRespuestas([puntoActivo, puntoInactivo, engativa]);
      renderPage();

      expect(await screen.findByText("3 puntos en 2 localidades · 1 de baja")).toBeInTheDocument();
    });
  });

  describe("fila desplegable: ficha y comentarios", () => {
    const puntoConDatos = { ...puntoActivo, nombre_encargado: "Marta Rojas", telefono_contacto: "3105550142" };

    it("'Ver ficha' despliega la fila con la ubicación, el contacto y los comentarios del punto", async () => {
      mockRespuestas([puntoConDatos], [comentario]);
      const user = userEvent.setup();
      renderPage();

      await elegirOpcion(user, "ECA Kennedy", "Ver ficha");

      const ficha = await screen.findByRole("region", { name: "Ficha de ECA Kennedy" });
      expect(ficha).toHaveTextContent("Carrera 84 # 11A-34");
      expect(ficha).toHaveTextContent("Marta Rojas");
      expect(ficha).toHaveTextContent("3105550142");
      expect(await screen.findByText("Encargada confirmada por llamada.")).toBeInTheDocument();
      expect(screen.getByText("admin@verdeapp.com")).toBeInTheDocument();
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/admin/puntos-acopio/1/comentarios"));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("elegir 'Ver ficha' otra vez pliega la fila", async () => {
      mockRespuestas([puntoConDatos]);
      const user = userEvent.setup();
      renderPage();

      await elegirOpcion(user, "ECA Kennedy", "Ver ficha");
      await screen.findByRole("region", { name: "Ficha de ECA Kennedy" });
      await elegirOpcion(user, "ECA Kennedy", "Ver ficha");

      expect(screen.queryByRole("region", { name: "Ficha de ECA Kennedy" })).not.toBeInTheDocument();
    });

    it("un clic en la fila no la despliega: solo se abre desde el kebab", async () => {
      mockRespuestas([puntoConDatos]);
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByText("ECA Kennedy"));

      expect(screen.queryByRole("region", { name: /Ficha de/ })).not.toBeInTheDocument();
    });

    it("solo hay una fila desplegada a la vez", async () => {
      mockRespuestas([puntoConDatos, { ...puntoActivo, id_punto_acopio: "9", nombre: "ECA Fontibón" }]);
      const user = userEvent.setup();
      renderPage();

      await elegirOpcion(user, "ECA Kennedy", "Ver ficha");
      await screen.findByRole("region", { name: "Ficha de ECA Kennedy" });
      await elegirOpcion(user, "ECA Fontibón", "Ver ficha");

      await screen.findByRole("region", { name: "Ficha de ECA Fontibón" });
      expect(screen.queryByRole("region", { name: "Ficha de ECA Kennedy" })).not.toBeInTheDocument();
    });

    it("ofrece 'Cómo llegar' con la dirección, la localidad y Bogotá", async () => {
      mockRespuestas([puntoConDatos]);
      const user = userEvent.setup();
      renderPage();

      await elegirOpcion(user, "ECA Kennedy", "Ver ficha");

      const enlace = await screen.findByRole("link", { name: "Cómo llegar a ECA Kennedy en Google Maps" });
      const url = new URL(enlace.getAttribute("href") ?? "");
      expect(url.hostname).toBe("www.google.com");
      expect(url.searchParams.get("query")).toBe("Carrera 84 # 11A-34, Usaquén, Bogotá, Colombia");
      expect(enlace).toHaveAttribute("target", "_blank");
    });

    it("sin teléfono ni encargado dice 'Sin teléfono' y 'Sin encargado', no la línea de la UAESP", async () => {
      mockRespuestas([puntoActivo]);
      const user = userEvent.setup();
      renderPage();

      await elegirOpcion(user, "ECA Kennedy", "Ver ficha");

      const ficha = await screen.findByRole("region", { name: "Ficha de ECA Kennedy" });
      expect(ficha).toHaveTextContent("Sin teléfono");
      expect(ficha).toHaveTextContent("Sin encargado");
      expect(ficha).not.toHaveTextContent("UAESP");
    });

    it("agrega un comentario y lo muestra arriba", async () => {
      mockRespuestas([puntoConDatos], [comentario]);
      mockPost.mockResolvedValue({
        data: { id_comentario: "c2", texto: "Nuevo dato", created_at: "2026-09-23T10:00:00Z", autor: "admin@verdeapp.com" },
      });
      const user = userEvent.setup();
      renderPage();

      await elegirOpcion(user, "ECA Kennedy", "Ver ficha");
      await screen.findByText("Encargada confirmada por llamada.");
      expect(screen.getByRole("button", { name: "Agregar comentario" })).toBeDisabled();

      await user.type(screen.getByPlaceholderText("Escribe un comentario sobre este punto…"), "Nuevo dato");
      await user.click(screen.getByRole("button", { name: "Agregar comentario" }));

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          expect.stringContaining("/admin/puntos-acopio/1/comentarios"),
          { texto: "Nuevo dato" }
        );
      });
      expect(await screen.findByText("Nuevo dato")).toBeInTheDocument();
    });

    it("la fila se pliega al cambiar un filtro", async () => {
      mockRespuestas([puntoConDatos]);
      const user = userEvent.setup();
      renderPage();

      await elegirOpcion(user, "ECA Kennedy", "Ver ficha");
      await screen.findByRole("region", { name: "Ficha de ECA Kennedy" });
      await user.click(screen.getByRole("button", { name: "Activos · 1" }));

      expect(screen.queryByRole("region", { name: "Ficha de ECA Kennedy" })).not.toBeInTheDocument();
    });
  });

  describe("foto del punto", () => {
    const FOTO = "/uploads/adjuntos/0b9c1a0e-3f4d-4c52-9b57-6f1f2a3b4c5d.png";
    const puntoConFoto = { ...puntoActivo, url_foto: FOTO };

    // ¿Qué? La subida (/uploads/adjunto) devuelve la ruta; lo demás responde vacío.
    function mockSubidaDeFoto() {
      mockPost.mockImplementation((url: string) =>
        Promise.resolve({ data: url.includes("/uploads/adjunto") ? { url: FOTO } : {} })
      );
    }

    it("la ficha desplegada muestra la foto del punto", async () => {
      mockRespuestas([puntoConFoto]);
      const user = userEvent.setup();
      renderPage();

      await elegirOpcion(user, "ECA Kennedy", "Ver ficha");

      const ficha = await screen.findByRole("region", { name: "Ficha de ECA Kennedy" });
      expect(within(ficha).getByRole("img", { name: "Foto de ECA Kennedy" })).toHaveAttribute("src", `http://localhost:8000${FOTO}`);
    });

    it("al crear un punto se puede subir una foto y se manda su ruta", async () => {
      mockSubidaDeFoto();
      const user = userEvent.setup();
      renderPage();

      await screen.findByText("Todavía no hay puntos de acopio registrados.");
      await user.click(screen.getByRole("button", { name: "Nuevo punto de acopio" }));
      await user.type(screen.getByPlaceholderText("Ej: ECA Kennedy"), "ECA Nueva");
      await user.type(screen.getByPlaceholderText("Ej: Carrera 84 # 11A-34"), "Calle 1 # 1-1");
      await user.selectOptions(screen.getByLabelText(/Localidad/), "1");
      await user.upload(
        document.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement,
        new File(["x"], "eca.png", { type: "image/png" })
      );
      await screen.findByAltText("Vista previa de la imagen adjunta");
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          expect.stringContaining("/admin/puntos-acopio"),
          expect.objectContaining({ nombre: "ECA Nueva", url_foto: FOTO })
        );
      });
    });

    it("al editar, el formulario trae la foto y se puede quitar", async () => {
      mockRespuestas([puntoConFoto]);
      const user = userEvent.setup();
      renderPage();

      await elegirOpcion(user, "ECA Kennedy", "Editar");
      expect(await screen.findByAltText("Vista previa de la imagen adjunta")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Quitar imagen" }));
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      await waitFor(() => {
        expect(mockPut).toHaveBeenCalledWith(
          expect.stringContaining("/admin/puntos-acopio/1"),
          expect.objectContaining({ url_foto: null })
        );
      });
    });

    it("un punto sin foto se crea con url_foto nula", async () => {
      const user = userEvent.setup();
      renderPage();

      await screen.findByText("Todavía no hay puntos de acopio registrados.");
      await user.click(screen.getByRole("button", { name: "Nuevo punto de acopio" }));
      await user.type(screen.getByPlaceholderText("Ej: ECA Kennedy"), "ECA Sin Foto");
      await user.type(screen.getByPlaceholderText("Ej: Carrera 84 # 11A-34"), "Calle 2 # 2-2");
      await user.selectOptions(screen.getByLabelText(/Localidad/), "1");
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          expect.stringContaining("/admin/puntos-acopio"),
          expect.objectContaining({ nombre: "ECA Sin Foto", url_foto: null })
        );
      });
    });
  });

  // ¿Qué? Issue #352 — cada campo usa el tamaño de su columna en la base de datos.
  it("no deja escribir más de lo que guarda cada columna", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Todavía no hay puntos de acopio registrados.");
    await user.click(screen.getByRole("button", { name: "Nuevo punto de acopio" }));

    expect(screen.getByLabelText("Nombre")).toHaveAttribute("maxLength", "200");
    expect(screen.getByLabelText("Dirección")).toHaveAttribute("maxLength", "255");
    expect(screen.getByLabelText("Nombre del encargado")).toHaveAttribute("maxLength", "100");
    expect(screen.getByLabelText("Teléfono de contacto")).toHaveAttribute("maxLength", "15");
  });
});
