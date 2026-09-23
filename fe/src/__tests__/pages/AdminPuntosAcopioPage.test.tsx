/**
 * Archivo: __tests__/pages/AdminPuntosAcopioPage.test.tsx
 * Descripción: Tests del panel de gestión de puntos de acopio del Admin
 *              Sistema (RQF-011 / HU-015, HU-016, HU-017).
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
};

const puntoInactivo = { ...puntoActivo, id_punto_acopio: "2", nombre: "ECA Retirado", activo: false };

const comentario = {
  id_comentario: "c1",
  texto: "Encargada confirmada por llamada.",
  created_at: "2026-09-12T15:00:00Z",
  autor: "admin@verdeapp.com",
};

// ¿Qué? "/comentarios" se revisa primero: su URL también contiene "/admin/puntos-acopio".
function mockRespuestas(puntos: unknown[], comentarios: unknown[] = []) {
  mockGet.mockImplementation((url: string) => {
    if (url.includes("/comentarios")) return Promise.resolve({ data: comentarios });
    if (url.includes("/admin/puntos-acopio")) return Promise.resolve({ data: puntos });
    if (url.includes("/geography/localidades")) return Promise.resolve({ data: localidades });
    return Promise.resolve({ data: [] });
  });
}

// ¿Qué? Las secciones de localidad arrancan cerradas. Por defecto la prueba las
//       abre todas para poder ver las filas; con abrir=false se ve el estado inicial.
async function renderPage(abrir = true) {
  const utils = renderWithProviders(<AdminPuntosAcopioPage />, {
    authContext: { user: adminUser, isAuthenticated: true },
  });
  if (abrir) {
    const user = userEvent.setup();
    for (const boton of await screen.findAllByRole("button", { expanded: false })) {
      await user.click(boton);
    }
  }
  return utils;
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
    await renderPage(false);
    expect(await screen.findByText("Todavía no hay puntos de acopio registrados.")).toBeInTheDocument();
  });

  it("lista los puntos de acopio, marcando los inactivos", async () => {
    mockRespuestas([puntoActivo, puntoInactivo]);
    await renderPage();

    expect(await screen.findByText("ECA Kennedy")).toBeInTheDocument();
    expect(screen.getByText("ECA Retirado")).toBeInTheDocument();
    expect(screen.getByText("Inactivo")).toBeInTheDocument();

    // ¿Qué? El botón de dar de baja no debe ofrecerse para uno ya inactivo.
    expect(screen.queryByRole("button", { name: "Dar de baja ECA Retirado" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dar de baja ECA Kennedy" })).toBeInTheDocument();
  });

  it("crea un punto de acopio nuevo", async () => {
    const user = userEvent.setup();
    await renderPage(false);

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
    await renderPage(false);

    await screen.findByText("Todavía no hay puntos de acopio registrados.");
    await user.click(screen.getByRole("button", { name: "Nuevo punto de acopio" }));

    await user.click(screen.getByLabelText("Nombre"));
    await user.tab();

    expect(await screen.findByText("El nombre es obligatorio.")).toBeInTheDocument();
    expect(screen.queryByText("La dirección es obligatoria.")).not.toBeInTheDocument();
  });

  it("edita un punto de acopio existente", async () => {
    mockRespuestas([puntoActivo]);
    const user = userEvent.setup();
    await renderPage();

    await screen.findByText("ECA Kennedy");
    await user.click(screen.getByRole("button", { name: "Editar ECA Kennedy" }));

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
  });

  it("da de baja un punto de acopio tras confirmar", async () => {
    mockRespuestas([puntoActivo]);
    const user = userEvent.setup();
    await renderPage();

    await screen.findByText("ECA Kennedy");
    await user.click(screen.getByRole("button", { name: "Dar de baja ECA Kennedy" }));

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
    await renderPage();

    await screen.findByText("ECA Retirado");
    await user.click(screen.getByRole("button", { name: "Reactivar ECA Retirado" }));

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
    await renderPage();

    await screen.findByText("ECA Retirado");
    expect(screen.queryByRole("button", { name: "Dar de baja ECA Retirado" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Eliminar ECA Retirado" }));

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

    it("filtra por texto sin importar tildes ni mayúsculas", async () => {
      mockRespuestas([puntoActivo, engativa]);
      const user = userEvent.setup();
      await renderPage();

      await screen.findByText("ECA Kennedy");
      await user.type(screen.getByRole("searchbox"), "engativa");

      expect(screen.getByText("ECA Engativá")).toBeInTheDocument();
      expect(screen.queryByText("ECA Kennedy")).not.toBeInTheDocument();
    });

    it("muestra un aviso si nada coincide con la búsqueda", async () => {
      mockRespuestas([puntoActivo, engativa]);
      const user = userEvent.setup();
      await renderPage();

      await screen.findByText("ECA Kennedy");
      await user.type(screen.getByRole("searchbox"), "zzz");

      expect(screen.getByText("Ningún punto coincide con tu búsqueda.")).toBeInTheDocument();
    });

    it("filtra por estado y muestra el conteo de cada uno", async () => {
      mockRespuestas([puntoActivo, puntoInactivo]);
      const user = userEvent.setup();
      await renderPage();

      await screen.findByText("ECA Kennedy");
      expect(screen.getByRole("button", { name: "Todos · 2" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Activos · 1" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "De baja · 1" }));
      expect(screen.queryByText("ECA Kennedy")).not.toBeInTheDocument();
      expect(screen.getByText("ECA Retirado")).toBeInTheDocument();
    });
  });

  describe("lista: mapa y teléfono", () => {
    it("ofrece 'Ver en el mapa' con la dirección, la localidad y Bogotá", async () => {
      mockRespuestas([puntoActivo]);
      await renderPage();

      const enlace = await screen.findByRole("link", { name: "Ver ECA Kennedy en el mapa" });
      const url = new URL(enlace.getAttribute("href") ?? "");
      expect(url.hostname).toBe("www.google.com");
      expect(url.searchParams.get("query")).toBe("Carrera 84 # 11A-34, Usaquén, Bogotá, Colombia");
      expect(enlace).toHaveAttribute("target", "_blank");
    });

    it("avisa 'Sin teléfono' solo en puntos activos sin teléfono", async () => {
      mockRespuestas([
        puntoActivo,
        puntoInactivo,
        { ...puntoActivo, id_punto_acopio: "4", nombre: "ECA Con Teléfono", telefono_contacto: "3105550142" },
      ]);
      await renderPage();

      await screen.findByText("ECA Kennedy");
      // ¿Qué? Uno activo sin teléfono; el inactivo no lleva aviso y el que tiene teléfono lo muestra.
      expect(screen.getAllByText("Sin teléfono")).toHaveLength(1);
      expect(screen.getByText("3105550142")).toBeInTheDocument();
    });
  });

  describe("panel lateral del punto", () => {
    const puntoConDatos = { ...puntoActivo, nombre_encargado: "Marta Rojas", telefono_contacto: "3105550142" };

    it("abre el perfil con los datos y los comentarios del punto", async () => {
      mockRespuestas([puntoConDatos], [comentario]);
      const user = userEvent.setup();
      await renderPage();

      await user.click(await screen.findByRole("button", { name: "ECA Kennedy" }));

      const panel = await screen.findByRole("dialog", { name: "Detalle de ECA Kennedy" });
      expect(panel).toHaveTextContent("Marta Rojas");
      expect(panel).toHaveTextContent("3105550142");
      expect(await screen.findByText("Encargada confirmada por llamada.")).toBeInTheDocument();
      expect(screen.getByText("admin@verdeapp.com")).toBeInTheDocument();
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/admin/puntos-acopio/1/comentarios"));
    });

    it("agrega un comentario y lo muestra arriba", async () => {
      mockRespuestas([puntoConDatos], [comentario]);
      mockPost.mockResolvedValue({
        data: { id_comentario: "c2", texto: "Nuevo dato", created_at: "2026-09-23T10:00:00Z", autor: "admin@verdeapp.com" },
      });
      const user = userEvent.setup();
      await renderPage();

      await user.click(await screen.findByRole("button", { name: "ECA Kennedy" }));
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

    it("edita desde el panel y envía el motivo del cambio", async () => {
      mockRespuestas([puntoConDatos]);
      const user = userEvent.setup();
      await renderPage();

      await user.click(await screen.findByRole("button", { name: "ECA Kennedy" }));
      await user.click(await screen.findByRole("button", { name: "Editar" }));

      const encargado = screen.getByDisplayValue("Marta Rojas");
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
      // ¿Qué? Tras guardar, el panel vuelve a mostrar los datos (ya no el formulario).
      await waitFor(() => expect(screen.queryByLabelText(/Motivo del cambio/)).not.toBeInTheDocument());
    });

    it("el lápiz de la fila abre el panel directo en modo edición", async () => {
      mockRespuestas([puntoConDatos]);
      const user = userEvent.setup();
      await renderPage();

      await user.click(await screen.findByRole("button", { name: "Editar ECA Kennedy" }));

      expect(await screen.findByLabelText(/Motivo del cambio/)).toBeInTheDocument();
    });

    it("para un punto de baja ofrece reactivar y eliminar definitivamente", async () => {
      mockRespuestas([puntoInactivo]);
      const user = userEvent.setup();
      await renderPage();

      await user.click(await screen.findByRole("button", { name: "ECA Retirado" }));

      const panel = await screen.findByRole("dialog", { name: "Detalle de ECA Retirado" });
      expect(within(panel).getByRole("button", { name: "Reactivar" })).toBeInTheDocument();
      expect(within(panel).getByRole("button", { name: "Eliminar definitivamente" })).toBeInTheDocument();
      expect(within(panel).queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
    });

    it("da de baja desde el panel, pidiendo confirmación", async () => {
      mockRespuestas([puntoActivo]);
      const user = userEvent.setup();
      await renderPage();

      await user.click(await screen.findByRole("button", { name: "ECA Kennedy" }));
      const panel = await screen.findByRole("dialog", { name: "Detalle de ECA Kennedy" });
      await user.click(within(panel).getByRole("button", { name: "Dar de baja" }));
      await user.click(screen.getByRole("button", { name: "Sí, dar de baja" }));

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith(expect.stringContaining("/admin/puntos-acopio/1"));
      });
    });
  });

  describe("lista agrupada por localidad", () => {
    const engativa = { ...puntoActivo, id_punto_acopio: "3", nombre: "ECA Engativá", id_localidad: 2, nombre_localidad: "Engativá" };

    it("arranca con las localidades cerradas y las abre y cierra con un clic", async () => {
      mockRespuestas([puntoActivo, engativa]);
      const user = userEvent.setup();
      await renderPage(false);

      const cabecera = await screen.findByRole("button", { name: /^Engativá/ });
      expect(cabecera).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByText("ECA Engativá")).not.toBeInTheDocument();
      expect(screen.queryByText("ECA Kennedy")).not.toBeInTheDocument();

      await user.click(cabecera);
      expect(cabecera).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByText("ECA Engativá")).toBeInTheDocument();
      // ¿Qué? Abrir una localidad no abre las demás.
      expect(screen.queryByText("ECA Kennedy")).not.toBeInTheDocument();

      await user.click(cabecera);
      expect(screen.queryByText("ECA Engativá")).not.toBeInTheDocument();
    });

    it("ordena las localidades alfabéticamente y muestra cuántos puntos tiene cada una", async () => {
      mockRespuestas([puntoActivo, engativa, { ...engativa, id_punto_acopio: "5", nombre: "ECA Engativá 2" }]);
      await renderPage(false);

      const cabeceras = await screen.findAllByRole("button", { expanded: false });
      expect(cabeceras.map((c) => c.textContent)).toEqual(["Engativá2", "Usaquén1"]);
    });

    it("muestra el resumen de puntos y localidades, y cuántos están de baja", async () => {
      mockRespuestas([puntoActivo, puntoInactivo, engativa]);
      await renderPage(false);

      expect(await screen.findByText("3 puntos en 2 localidades · 1 de baja")).toBeInTheDocument();
    });

    it("al buscar abre solas las localidades con coincidencias", async () => {
      mockRespuestas([puntoActivo, engativa]);
      const user = userEvent.setup();
      await renderPage(false);

      await screen.findByRole("button", { name: /^Engativá/ });
      await user.type(screen.getByRole("searchbox"), "kennedy");

      expect(screen.getByText("ECA Kennedy")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Engativá/ })).not.toBeInTheDocument();
    });

    it("marca en la cabecera cuántos puntos de la localidad están de baja", async () => {
      mockRespuestas([puntoActivo, puntoInactivo]);
      await renderPage(false);

      const cabecera = await screen.findByRole("button", { name: /^Usaquén/ });
      expect(cabecera).toHaveTextContent("1 de baja");
    });
  });
});
