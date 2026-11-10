/**
 * Archivo: __tests__/pages/AdminConjuntoDashboard.test.tsx
 * Descripción: Tests del panel del Administrador de Conjunto (issue #23) —
 *              listado de conjuntos administrados, pestañas de cada conjunto (Resumen, Avisos
 *              y Recicladores), edición, invitación de recicladores y solicitud de
 *              desvinculación (RQF-016).
 * ¿Para qué? Issue #595: el contenido de cada conjunto pasó de cinco bloques apilados a tres
 *           pestañas; editar datos, invitar y pedir la desvinculación se hacen en ventanas; y
 *           los avisos los pide cada pestaña al servidor, de 10 en 10.
 */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { AdminConjuntoDashboard } from "@/pages/dashboards/AdminConjuntoDashboard";
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

const conjunto = {
  id_conjunto_residencial: 1,
  nombre_conjunto: "Conjunto Los Alpes",
  nit: "900123456",
  direccion: "Cra 10 # 20-30",
  nombre_localidad: "Suba",
  tiene_solicitud_pendiente: false,
  codigo_acceso: "AB3K9Q",
  total_apartamentos: null,
  apartamentos_registrados: 0,
  residentes_registrados: 0,
};

const conjunto2 = { ...conjunto, id_conjunto_residencial: 2, nombre_conjunto: "Conjunto Los Robles", nit: "800555666" };

const aviso = (id: string, idConjunto: number | null, extra: object = {}) => ({
  id,
  tipo: "SHUT_LLENO",
  mensaje: `Mensaje ${id}`,
  id_referencia: null,
  nombre_conjunto: "Conjunto Los Alpes",
  id_conjunto_residencial: idConjunto,
  leida: false,
  created_at: new Date().toISOString(),
  ...extra,
});

// ¿Qué? Lo que responde el "servidor" de estas pruebas: cada llamada a axios.get se reparte por su dirección.
// ¿Para qué? El panel ahora hace varias peticiones distintas (conjuntos, lista general para los banners, contadores
//           de avisos sin leer por conjunto, y una página de avisos por cada conjunto); cada prueba solo dice qué
//           datos tiene cada una.
interface Panel {
  conjuntos?: object[];
  /** Lista general de notificaciones (la de los banners de arriba). */
  general?: object[];
  /** Avisos sin leer por conjunto: { idConjunto: cantidad }. */
  sinLeer?: Record<number, number>;
  /** Avisos de cada conjunto (TODOS; el "servidor" los entrega de a `limit`). */
  avisos?: Record<number, object[]>;
  autorizados?: object[];
  invitaciones?: object[];
}

function mockPanel(panel: Panel = {}) {
  mockGet.mockImplementation((url: string, config?: { params?: { limit?: number; offset?: number } }) => {
    if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: panel.conjuntos ?? [conjunto] });
    if (url.includes("/notificaciones/mis-notificaciones")) return Promise.resolve({ data: panel.general ?? [] });
    if (url.includes("/notificaciones/no-leidas-por-conjunto")) {
      const filas = Object.entries(panel.sinLeer ?? {}).map(([id, count]) => ({ id_conjunto_residencial: Number(id), count }));
      return Promise.resolve({ data: filas });
    }
    const avisosDeUnConjunto = url.match(/\/notificaciones\/por-conjunto\/(\d+)/);
    if (avisosDeUnConjunto) {
      const todos = panel.avisos?.[Number(avisosDeUnConjunto[1])] ?? [];
      const offset = config?.params?.offset ?? 0;
      const limit = config?.params?.limit ?? 10;
      return Promise.resolve({ data: { items: todos.slice(offset, offset + limit), total: todos.length } });
    }
    if (url.includes("/autorizados")) return Promise.resolve({ data: panel.autorizados ?? [] });
    if (url.includes("/invitaciones")) return Promise.resolve({ data: panel.invitaciones ?? [] });
    return Promise.resolve({ data: [] });
  });
}

function renderPage() {
  return renderWithProviders(<AdminConjuntoDashboard />, {
    authContext: { user: adminConjuntoUser, isAuthenticated: true },
  });
}

// ¿Qué? Abre una pestaña de un conjunto. Con dos conjuntos abiertos, `indice` dice de cuál.
async function abrirPestana(user: ReturnType<typeof userEvent.setup>, nombre: RegExp, indice = 0) {
  const pestanas = await screen.findAllByRole("tab", { name: nombre });
  await user.click(pestanas[indice]);
}

describe("AdminConjuntoDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPanel({ conjuntos: [] });
    mockPost.mockResolvedValue({ data: {} });
    mockPatch.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: {} });
  });

  it("muestra el título del panel y el correo del administrador de conjunto", () => {
    renderPage();
    expect(screen.getByText("Panel de Administrador de Conjunto")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no administra ningún conjunto", async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText("Todavía no tienes ningún conjunto asignado. Contacta al equipo de VerdeApp.")
      ).toBeInTheDocument();
    });
  });

  it("muestra un aviso de error si falla la carga de mis conjuntos (issue #223, f2 y f9 del diagnóstico)", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.reject(new Error("Network Error"));
      return Promise.resolve({ data: [] });
    });
    renderPage();
    expect(await screen.findByText("No se pudo cargar la información. Intenta de nuevo más tarde.")).toBeInTheDocument();
  });

  describe("pestañas de cada conjunto (issue #595)", () => {
    it("cada conjunto tiene las pestañas Resumen, Avisos y Recicladores, y empieza en Resumen", async () => {
      mockPanel();
      renderPage();

      const pestanas = await screen.findAllByRole("tab");
      expect(pestanas.map((p) => p.textContent?.replace(/\d+$/, ""))).toEqual(["Resumen", "Avisos", "Recicladores"]);
      expect(screen.getByRole("tab", { name: "Resumen" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tablist", { name: "Secciones del conjunto" })).toBeInTheDocument();
      // ¿Qué? Resumen trae la cobertura, el código de acceso y, al final, "Dejar de administrar".
      expect(screen.getByText("Apartamentos registrados en VerdeApp")).toBeInTheDocument();
      expect(screen.getByText("AB3K9Q")).toBeInTheDocument();
      expect(screen.getByText("Dejar de administrar este conjunto")).toBeInTheDocument();
    });

    it("muestra un bloque a la vez: al cambiar de pestaña, el Resumen se oculta", async () => {
      mockPanel();
      const user = userEvent.setup();
      renderPage();

      await screen.findByText("Dejar de administrar este conjunto");
      await abrirPestana(user, /^Recicladores/);

      expect(screen.getByRole("tab", { name: /^Recicladores/ })).toHaveAttribute("aria-selected", "true");
      expect(screen.queryByRole("button", { name: "Dejar de administrar este conjunto" })).not.toBeInTheDocument();
      expect(screen.getByText("Autorizados")).toBeInTheDocument();
      expect(screen.getByText("Invitaciones enviadas")).toBeInTheDocument();
    });

    it("la pestaña Recicladores muestra cuántos hay autorizados", async () => {
      mockPanel({
        autorizados: [
          { id_reciclador: "r1", nombre: "Ana", apellidos: "Gómez", correo_electronico: "ana@example.com", numero_telefonico: null, asociacion: null },
          { id_reciclador: "r2", nombre: "Luis", apellidos: "Pérez", correo_electronico: "luis@example.com", numero_telefonico: null, asociacion: null },
        ],
      });
      renderPage();

      expect(await screen.findByRole("tab", { name: "Recicladores 2" })).toBeInTheDocument();
    });

    it("ya no existe «Ver detalle / Ocultar detalle»", async () => {
      mockPanel();
      renderPage();

      await screen.findByText("Dejar de administrar este conjunto");
      expect(screen.queryByRole("button", { name: "Ver detalle" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Ocultar detalle" })).not.toBeInTheDocument();
    });
  });

  describe("recicladores", () => {
    it("muestra un aviso de error si falla la carga de recicladores autorizados (issue #223, f2 y f9 del diagnóstico)", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
        if (url.includes("/autorizados")) return Promise.reject(new Error("Network Error"));
        return Promise.resolve({ data: [] });
      });
      const user = userEvent.setup();
      renderPage();

      await abrirPestana(user, /^Recicladores/);

      expect(await screen.findByText("No se pudo cargar la información. Intenta de nuevo más tarde.")).toBeInTheDocument();
    });

    it("invita a un reciclador desde una ventana de un solo campo y se cierra al enviar", async () => {
      mockPanel();
      const user = userEvent.setup();
      renderPage();

      await abrirPestana(user, /^Recicladores/);
      await user.click(screen.getByRole("button", { name: "+ Invitar reciclador" }));
      const ventana = await screen.findByRole("dialog", { name: "Invitar reciclador" });
      await user.type(within(ventana).getByPlaceholderText("correo.del.reciclador@ejemplo.com"), "reciclador@example.com");
      await user.click(within(ventana).getByRole("button", { name: "Invitar" }));

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          expect.stringContaining("/reciclador-conjunto/invitar"),
          { correo_reciclador: "reciclador@example.com", id_conjunto_residencial: 1 }
        );
      });
      await waitFor(() => expect(screen.queryByRole("dialog", { name: "Invitar reciclador" })).not.toBeInTheDocument());
    });

    it("la lista de recicladores sigue a la vista detrás de la ventana de invitar", async () => {
      mockPanel({
        autorizados: [
          { id_reciclador: "r1", nombre: "Ana", apellidos: "Gómez", correo_electronico: "ana@example.com", numero_telefonico: null, asociacion: null },
        ],
      });
      const user = userEvent.setup();
      renderPage();

      await abrirPestana(user, /^Recicladores/);
      await user.click(await screen.findByRole("button", { name: "+ Invitar reciclador" }));
      await screen.findByRole("dialog", { name: "Invitar reciclador" });

      expect(screen.getByText("Ana Gómez")).toBeInTheDocument();
    });

    it("si invitar falla, el error sale dentro de la ventana y el correo escrito se conserva", async () => {
      mockPanel();
      mockPost.mockRejectedValue(new Error("El reciclador no existe."));
      const user = userEvent.setup();
      renderPage();

      await abrirPestana(user, /^Recicladores/);
      await user.click(screen.getByRole("button", { name: "+ Invitar reciclador" }));
      const ventana = await screen.findByRole("dialog", { name: "Invitar reciclador" });
      await user.type(within(ventana).getByPlaceholderText("correo.del.reciclador@ejemplo.com"), "nadie@example.com");
      await user.click(within(ventana).getByRole("button", { name: "Invitar" }));

      expect(await within(ventana).findByText("El reciclador no existe.")).toBeInTheDocument();
      expect(within(ventana).getByPlaceholderText("correo.del.reciclador@ejemplo.com")).toHaveValue("nadie@example.com");
    });

    // ¿Qué? Issue #352 — con noValidate, el formato del correo lo revisa la
    //       app (mensaje anclado al campo), no el globo del navegador.
    it("muestra el error de correo inválido al invitar y no envía nada", async () => {
      mockPanel();
      const user = userEvent.setup();
      renderPage();

      await abrirPestana(user, /^Recicladores/);
      await user.click(screen.getByRole("button", { name: "+ Invitar reciclador" }));
      const ventana = await screen.findByRole("dialog", { name: "Invitar reciclador" });
      const correo = within(ventana).getByPlaceholderText("correo.del.reciclador@ejemplo.com");
      expect(correo).toHaveAttribute("maxLength", "255");
      await user.type(correo, "no-es-correo");
      await user.click(within(ventana).getByRole("button", { name: "Invitar" }));

      expect(await within(ventana).findByText("El formato del correo no es válido.")).toBeInTheDocument();
      expect(correo).toHaveAttribute("aria-invalid", "true");
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("cancelar la ventana de invitar no envía nada", async () => {
      mockPanel();
      const user = userEvent.setup();
      renderPage();

      await abrirPestana(user, /^Recicladores/);
      await user.click(screen.getByRole("button", { name: "+ Invitar reciclador" }));
      const ventana = await screen.findByRole("dialog", { name: "Invitar reciclador" });
      await user.click(within(ventana).getByRole("button", { name: "Cancelar" }));

      expect(screen.queryByRole("dialog", { name: "Invitar reciclador" })).not.toBeInTheDocument();
      expect(mockPost).not.toHaveBeenCalled();
    });

    // ¿Qué? El Admin de Conjunto revoca directo el acceso de un reciclador
    //       ya autorizado — sin que el reciclador tenga que pedir nada.
    it("revoca el acceso de un reciclador autorizado, tras confirmar", async () => {
      const recicladorAutorizado = {
        id_reciclador: "r1",
        nombre: "Reciclador",
        apellidos: "De Prueba",
        correo_electronico: "reciclador@example.com",
        numero_telefonico: null,
        asociacion: null,
      };
      mockPanel({ autorizados: [recicladorAutorizado] });
      const user = userEvent.setup();
      renderPage();

      await abrirPestana(user, /^Recicladores/);
      await screen.findByText("Reciclador De Prueba");

      await user.click(screen.getByRole("button", { name: "Revocar acceso de Reciclador De Prueba" }));
      expect(screen.getByText("¿Revocar el acceso de Reciclador De Prueba?")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Sí, revocar" }));

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith(
          expect.stringContaining("/reciclador-conjunto/mi-conjunto/1/autorizados/r1")
        );
      });
    });
  });

  describe("dejar de administrar un conjunto (RQF-016)", () => {
    it("envía una solicitud de desvinculación desde una ventana", async () => {
      mockPanel();
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: "Dejar de administrar este conjunto" }));
      const ventana = await screen.findByRole("dialog", { name: "Dejar de administrar este conjunto" });
      await user.click(within(ventana).getByRole("button", { name: "Enviar solicitud" }));

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          expect.stringContaining("/conjunto-panel/mis-conjuntos/1/solicitar-desvinculacion"),
          { motivo: null }
        );
      });
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("envía el motivo escrito en la ventana", async () => {
      mockPanel();
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: "Dejar de administrar este conjunto" }));
      const ventana = await screen.findByRole("dialog", { name: "Dejar de administrar este conjunto" });
      await user.type(within(ventana).getByLabelText("Motivo (opcional)"), "Fin de contrato");
      await user.click(within(ventana).getByRole("button", { name: "Enviar solicitud" }));

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          expect.stringContaining("/solicitar-desvinculacion"),
          { motivo: "Fin de contrato" }
        );
      });
    });

    it("si falla, el error sale dentro de la ventana", async () => {
      mockPanel();
      mockPost.mockRejectedValue(new Error("Ya tienes una solicitud pendiente."));
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: "Dejar de administrar este conjunto" }));
      const ventana = await screen.findByRole("dialog", { name: "Dejar de administrar este conjunto" });
      await user.click(within(ventana).getByRole("button", { name: "Enviar solicitud" }));

      expect(await within(ventana).findByText("Ya tienes una solicitud pendiente.")).toBeInTheDocument();
    });

    it("con una solicitud pendiente muestra el aviso en vez del botón", async () => {
      mockPanel({ conjuntos: [{ ...conjunto, tiene_solicitud_pendiente: true }] });
      renderPage();

      expect(await screen.findByText("Solicitud de desvinculación pendiente")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Dejar de administrar este conjunto" })).not.toBeInTheDocument();
    });

    // ¿Qué? Issue #513 — el botón solo ENVÍA una solicitud al equipo de VerdeApp; antes el texto
    //       decía que "transfiere la administración a otra persona", lo cual no es lo que hace.
    it("explica que dejar de administrar solo envía una solicitud al equipo de VerdeApp", async () => {
      mockPanel();
      renderPage();

      expect(await screen.findByText(/Esto envía una solicitud al equipo de VerdeApp/)).toHaveTextContent(
        "mientras tanto sigues administrando el conjunto",
      );
      expect(screen.queryByText(/transfiere la administración/)).not.toBeInTheDocument();
    });
  });

  describe("acordeón de conjuntos (issue #166)", () => {
    it("solo el primer conjunto viene abierto; los demás se abren con un clic", async () => {
      mockPanel({ conjuntos: [conjunto, conjunto2] });
      const user = userEvent.setup();
      renderPage();

      await screen.findByText("Conjunto Los Alpes");
      expect(screen.getByText("Conjunto Los Robles")).toBeInTheDocument();
      // ¿Qué? Issue #513 — "Editar datos del conjunto" y el código de acceso solo se ven en
      //       el conjunto desplegado (solo Los Alpes, al inicio): con el conjunto cerrado la
      //       cabecera es solo para abrir y cerrar, sin botones.
      expect(screen.getAllByRole("button", { name: "Editar datos del conjunto" })).toHaveLength(1);
      expect(screen.getAllByText("AB3K9Q")).toHaveLength(1);

      const cabeceraRobles = screen.getByRole("button", { name: /Conjunto Los Robles/ });
      expect(cabeceraRobles).toHaveAttribute("aria-expanded", "false");
      await user.click(cabeceraRobles);
      expect(cabeceraRobles).toHaveAttribute("aria-expanded", "true");
      expect(screen.getAllByRole("button", { name: "Editar datos del conjunto" })).toHaveLength(2);
      expect(screen.getAllByText("AB3K9Q")).toHaveLength(2);
    });

    // ¿Qué? Issue #595 — acordeón independiente: abrir uno no cierra el otro.
    it("se pueden tener dos conjuntos abiertos a la vez", async () => {
      mockPanel({ conjuntos: [conjunto, conjunto2] });
      const user = userEvent.setup();
      renderPage();

      await screen.findByText("Conjunto Los Alpes");
      await user.click(screen.getByRole("button", { name: /Conjunto Los Robles/ }));

      expect(screen.getByRole("button", { name: /Conjunto Los Alpes/ })).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("button", { name: /Conjunto Los Robles/ })).toHaveAttribute("aria-expanded", "true");
    });

    it("respeta el orden en que el servidor entrega los conjuntos (alfabético)", async () => {
      mockPanel({ conjuntos: [conjunto, conjunto2] });
      renderPage();

      const nombres = (await screen.findAllByRole("heading", { level: 4 })).map((h) => h.textContent);
      expect(nombres).toEqual(["Conjunto Los Alpes", "Conjunto Los Robles"]);
    });

    it("la pestaña de cada conjunto es independiente de la del otro", async () => {
      mockPanel({ conjuntos: [conjunto, conjunto2] });
      const user = userEvent.setup();
      renderPage();

      await screen.findByText("Conjunto Los Alpes");
      await user.click(screen.getByRole("button", { name: /Conjunto Los Robles/ }));
      await abrirPestana(user, /^Recicladores/, 1);

      const [alpes, robles] = screen.getAllByRole("tab", { name: /^Resumen|^Recicladores/ }).filter((p) => p.getAttribute("aria-selected") === "true");
      expect(alpes).toHaveTextContent("Resumen");
      expect(robles).toHaveTextContent("Recicladores");
    });
  });

  // ¿Qué? Issue #513 — un solo botón para editar los dos datos (NIT y cantidad de
  //       apartamentos), dentro del conjunto abierto y con esos datos a la vista. Issue #595: el
  //       formulario se abre en una ventana, no reemplaza el contenido del conjunto.
  describe("botón Editar datos del conjunto (issue #513)", () => {
    it("muestra el NIT y la cantidad de apartamentos que edita el botón, y 'sin definir' si faltan", async () => {
      mockPanel({ conjuntos: [{ ...conjunto, nit: null, total_apartamentos: 120 }] });
      renderPage();

      expect(await screen.findByText(/NIT: sin definir/)).toHaveTextContent("Apartamentos del conjunto: 120");
    });

    it("cada botón se describe con el nombre de su conjunto, para distinguirlos con lector de pantalla", async () => {
      mockPanel({ conjuntos: [conjunto, conjunto2] });
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: /Conjunto Los Robles/ }));
      const [botonAlpes, botonRobles] = screen.getAllByRole("button", { name: "Editar datos del conjunto" });
      expect(botonAlpes).toHaveAccessibleDescription("Conjunto Los Alpes");
      expect(botonRobles).toHaveAccessibleDescription("Conjunto Los Robles");
    });

    it("abre una ventana con el NIT y la cantidad de apartamentos, y el panel sigue detrás", async () => {
      mockPanel({ conjuntos: [conjunto, conjunto2] });
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: "Editar datos del conjunto" }));
      const ventana = await screen.findByRole("dialog", { name: "Editar datos del conjunto" });
      expect(within(ventana).getByDisplayValue("900123456")).toBeInTheDocument();
      expect(within(ventana).getByLabelText("Cantidad de apartamentos (opcional)")).toBeInTheDocument();
      // ¿Qué? El contenido del conjunto no se reemplazó: el código de acceso sigue en la pantalla.
      expect(screen.getByText("AB3K9Q")).toBeInTheDocument();

      await user.click(within(ventana).getByRole("button", { name: "Cancelar" }));
      expect(screen.queryByRole("dialog", { name: "Editar datos del conjunto" })).not.toBeInTheDocument();
      expect(mockPatch).not.toHaveBeenCalled();
    });

    // ¿Qué? Issue #180: nombre y dirección se quitaron del formulario de
    //       edición (vienen ya verificados desde el dataset oficial de
    //       Bogotá) — solo el NIT sigue editable.
    it("guarda el NIT al editar un conjunto, cierra la ventana y avisa que se guardó", async () => {
      mockPanel();
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: "Editar datos del conjunto" }));
      const ventana = await screen.findByRole("dialog", { name: "Editar datos del conjunto" });
      const inputNit = within(ventana).getByDisplayValue("900123456");
      await user.clear(inputNit);
      await user.type(inputNit, "900111222-1");
      await user.click(within(ventana).getByRole("button", { name: "Guardar" }));

      await waitFor(() => {
        expect(mockPatch).toHaveBeenCalledWith(
          expect.stringContaining("/conjunto-panel/mis-conjuntos/1"),
          { nit: "900111222-1", total_apartamentos: null }
        );
      });
      expect(await screen.findByText("Conjunto actualizado correctamente.")).toBeInTheDocument();
      expect(screen.queryByRole("dialog", { name: "Editar datos del conjunto" })).not.toBeInTheDocument();
    });

    it("si falla guardar, el error sale dentro de la ventana y lo escrito se conserva", async () => {
      mockPanel();
      mockPatch.mockRejectedValue(new Error("falló"));
      vi.spyOn(console, "error").mockImplementation(() => {});
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: "Editar datos del conjunto" }));
      const ventana = await screen.findByRole("dialog", { name: "Editar datos del conjunto" });
      await user.type(within(ventana).getByLabelText("Cantidad de apartamentos (opcional)"), "80");
      await user.click(within(ventana).getByRole("button", { name: "Guardar" }));

      expect(await within(ventana).findByText("No se pudo guardar el cambio. Intenta de nuevo.")).toBeInTheDocument();
      expect(within(ventana).getByLabelText("Cantidad de apartamentos (opcional)")).toHaveValue(80);
    });
  });

  describe("avisos por conjunto desde el servidor (issues #436 y #595)", () => {
    // ¿Qué? Dos conjuntos con EXACTAMENTE el mismo nombre y distinto id: antes el
    //       panel repartía los avisos por nombre y los mezclaba.
    const gemeloA = { ...conjunto, id_conjunto_residencial: 1 };
    const gemeloB = { ...conjunto, id_conjunto_residencial: 2 };

    it("cada conjunto muestra su propio contador de avisos sin leer, aunque tengan el mismo nombre", async () => {
      mockPanel({ conjuntos: [gemeloA, gemeloB], sinLeer: { 1: 2, 2: 1 } });
      renderPage();

      const [cabeceraA, cabeceraB] = await screen.findAllByRole("button", { name: /Conjunto Los Alpes/ });
      expect(await within(cabeceraA).findByRole("img", { name: "2 avisos nuevos" })).toBeInTheDocument();
      expect(within(cabeceraB).getByRole("img", { name: "1 aviso nuevo" })).toBeInTheDocument();
    });

    // ¿Qué? Issue #595 — ámbar, no rojo: 5 avisos sin leer no son un error; el rojo queda para peligro.
    it("el contador de avisos de la cabecera es ámbar", async () => {
      mockPanel({ sinLeer: { 1: 5 } });
      renderPage();

      const contador = await screen.findByRole("img", { name: "5 avisos nuevos" });
      expect(contador).toHaveClass("bg-amber-100");
      expect(contador).not.toHaveClass("bg-red-100");
    });

    it("la pestaña Avisos muestra el mismo contador, y no hay contador si no hay avisos sin leer", async () => {
      mockPanel({ sinLeer: { 1: 3 } });
      const { unmount } = renderPage();
      expect(await screen.findByRole("tab", { name: "Avisos 3" })).toBeInTheDocument();
      unmount();

      mockPanel({ sinLeer: {} });
      renderPage();
      expect(await screen.findByRole("tab", { name: "Avisos" })).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: /aviso/ })).not.toBeInTheDocument();
    });

    it("no pide los avisos de un conjunto hasta que se abre su pestaña Avisos", async () => {
      mockPanel({ avisos: { 1: [aviso("a1", 1)] } });
      const user = userEvent.setup();
      renderPage();

      await screen.findByText("Dejar de administrar este conjunto");
      expect(mockGet.mock.calls.some(([url]) => String(url).includes("/notificaciones/por-conjunto/"))).toBe(false);

      await abrirPestana(user, /^Avisos/);
      expect(await screen.findByText("Mensaje a1")).toBeInTheDocument();
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/notificaciones/por-conjunto/1"),
        { params: { limit: 10, offset: 0 } },
      );
    });

    it("cada conjunto pide solo sus avisos, sin mezclarlos con los del otro", async () => {
      mockPanel({ conjuntos: [gemeloA, gemeloB], avisos: { 1: [aviso("a1", 1), aviso("a2", 1)], 2: [aviso("b1", 2)] } });
      const user = userEvent.setup();
      renderPage();

      await abrirPestana(user, /^Avisos/);
      expect(await screen.findByText("Mensaje a1")).toBeInTheDocument();
      expect(screen.getByText("Mensaje a2")).toBeInTheDocument();
      expect(screen.queryByText("Mensaje b1")).not.toBeInTheDocument();

      await user.click(screen.getAllByRole("button", { name: /Conjunto Los Alpes/ })[1]);
      await abrirPestana(user, /^Avisos/, 1);
      expect(await screen.findByText("Mensaje b1")).toBeInTheDocument();
    });

    it("las filas no repiten el nombre del conjunto, porque ya estás dentro de él", async () => {
      mockPanel({ avisos: { 1: [aviso("a1", 1), aviso("a2", 1)] } });
      const user = userEvent.setup();
      renderPage();

      await abrirPestana(user, /^Avisos/);
      await screen.findByText("Mensaje a1");

      // ¿Qué? "Conjunto Los Alpes" solo aparece en la cabecera, no en cada fila.
      expect(screen.getAllByText("Conjunto Los Alpes")).toHaveLength(1);
    });

    // ¿Qué? Issue #513 — la frase explicativa se ve siempre, no solo con la lista vacía.
    it("explica qué avisos salen en la pestaña, aunque ya haya avisos", async () => {
      mockPanel({ avisos: { 1: [aviso("a1", 1)] } });
      const user = userEvent.setup();
      renderPage();

      await abrirPestana(user, /^Avisos/);
      await screen.findByText("Mensaje a1");
      expect(screen.getByText(/Reportes de residentes y recicladores, y respuestas de VerdeApp a tus solicitudes/)).toBeInTheDocument();
    });

    it("sin avisos muestra un mensaje de lista vacía y no hay contador", async () => {
      mockPanel({ avisos: { 1: [] } });
      const user = userEvent.setup();
      renderPage();

      await abrirPestana(user, /^Avisos/);

      expect(await screen.findByText(/Todavía no hay avisos de este conjunto/)).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: /aviso/ })).not.toBeInTheDocument();
    });

    it("con 10 avisos o menos no aparece la barra de paginación", async () => {
      mockPanel({ avisos: { 1: Array.from({ length: 10 }, (_, i) => aviso(`a${i}`, 1)) } });
      const user = userEvent.setup();
      renderPage();

      await abrirPestana(user, /^Avisos/);
      await screen.findByText("Mensaje a0");

      expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
    });

    it("con más de 10 avisos pagina de 10 en 10 pidiendo cada página al servidor", async () => {
      mockPanel({ avisos: { 1: Array.from({ length: 25 }, (_, i) => aviso(`a${i}`, 1, { leida: true })) } });
      const user = userEvent.setup();
      renderPage();

      await abrirPestana(user, /^Avisos/);
      expect(await screen.findByText("Mensaje a0")).toBeInTheDocument();
      expect(screen.getByText("Mensaje a9")).toBeInTheDocument();
      expect(screen.queryByText("Mensaje a10")).not.toBeInTheDocument();
      expect(screen.getByText("Mostrando 1–10 de 25")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Página siguiente" }));

      expect(await screen.findByText("Mensaje a10")).toBeInTheDocument();
      expect(screen.queryByText("Mensaje a0")).not.toBeInTheDocument();
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/notificaciones/por-conjunto/1"),
        { params: { limit: 10, offset: 10 } },
      );
    });

    it("'Marcar leídas' solo marca los avisos de ese conjunto", async () => {
      mockPanel({ conjuntos: [gemeloA, gemeloB], sinLeer: { 1: 1, 2: 1 }, avisos: { 1: [aviso("a1", 1)], 2: [aviso("b1", 2)] } });
      const user = userEvent.setup();
      renderPage();

      await abrirPestana(user, /^Avisos/);
      await screen.findByText("Mensaje a1");
      await user.click(screen.getByRole("button", { name: "Marcar leídas" }));

      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/notificaciones/marcar-todas-leidas"),
        {},
        { params: { id_conjunto_residencial: 1 } },
      );
      await waitFor(() => expect(screen.queryByRole("button", { name: "Marcar leídas" })).not.toBeInTheDocument());
    });

    it("'Limpiar leídas' pide de nuevo la lista de ese conjunto", async () => {
      const avisos = { 1: [aviso("a1", 1, { leida: true }), aviso("a2", 1)] as { id: string; leida: boolean }[] };
      mockPanel({ avisos });
      mockDelete.mockImplementation(() => {
        avisos[1] = avisos[1].filter((n) => !n.leida);
        return Promise.resolve({ data: {} });
      });
      const user = userEvent.setup();
      renderPage();

      await abrirPestana(user, /^Avisos/);
      await screen.findByText("Mensaje a1");
      await user.click(screen.getByRole("button", { name: "Limpiar leídas" }));

      expect(mockDelete).toHaveBeenCalledWith(
        expect.stringContaining("/notificaciones/limpiar-leidas"),
        { params: { id_conjunto_residencial: 1 } },
      );
      await waitFor(() => expect(screen.queryByText("Mensaje a1")).not.toBeInTheDocument());
      expect(screen.getByText("Mensaje a2")).toBeInTheDocument();
    });

    it("marcar un aviso como leído sigue funcionando al hacer clic en él", async () => {
      mockPanel({ sinLeer: { 1: 1 }, avisos: { 1: [aviso("a1", 1)] } });
      const user = userEvent.setup();
      renderPage();

      await abrirPestana(user, /^Avisos/);
      await user.click(await screen.findByText("Mensaje a1"));

      expect(mockPost).toHaveBeenCalledWith(expect.stringContaining("/notificaciones/a1/leer"), {});
    });

    it("el aviso de auditoría se ve en su banner (lista general) y no cuenta en el contador del conjunto", async () => {
      mockPanel({
        general: [aviso("au1", 1, { tipo: "AUDITORIA_PUBLICADA", mensaje: "El reciclador auditó tu conjunto.", id_referencia: "aud-1" })],
        sinLeer: {},
      });
      renderPage();

      expect(await screen.findByText("El reciclador auditó tu conjunto.")).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: /aviso/ })).not.toBeInTheDocument();
    });

    it("la desvinculación aprobada de un conjunto que ya no administra se ve en un banner arriba", async () => {
      mockPanel({
        general: [aviso("d1", 99, { tipo: "DESVINCULACION_APROBADA", mensaje: "Tu desvinculación de Torres del Sur fue aprobada." })],
      });
      const user = userEvent.setup();
      renderPage();

      expect(await screen.findByText("Tu desvinculación de Torres del Sur fue aprobada.")).toBeInTheDocument();
      expect(screen.getByText("Desvinculación aprobada")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Entendido" }));

      expect(mockPost).toHaveBeenCalledWith(expect.stringContaining("/notificaciones/d1/leer"), {});
      await waitFor(() => expect(screen.queryByText("Desvinculación aprobada")).not.toBeInTheDocument());
    });

    it("un aviso de desvinculación de un conjunto que sí administra va en la pestaña Avisos, no en el banner", async () => {
      const rechazada = aviso("d2", 1, { tipo: "DESVINCULACION_RECHAZADA", mensaje: "Tu solicitud fue rechazada." });
      mockPanel({ general: [rechazada], sinLeer: { 1: 1 }, avisos: { 1: [rechazada] } });
      const user = userEvent.setup();
      renderPage();

      await abrirPestana(user, /^Avisos/);

      expect(await screen.findByText("Tu solicitud fue rechazada.")).toBeInTheDocument();
      expect(screen.queryByText("Desvinculación aprobada")).not.toBeInTheDocument();
    });

    it("muestra un aviso de error si falla la carga de los avisos de un conjunto", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
        if (url.includes("/notificaciones/por-conjunto/")) return Promise.reject(new Error("Network Error"));
        return Promise.resolve({ data: [] });
      });
      const user = userEvent.setup();
      renderPage();

      await abrirPestana(user, /^Avisos/);

      expect(await screen.findAllByText("No se pudo cargar la información. Intenta de nuevo más tarde.")).not.toHaveLength(0);
    });

    it("muestra un aviso de error si falla la carga de los contadores", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
        if (url.includes("/notificaciones/no-leidas-por-conjunto")) return Promise.reject(new Error("Network Error"));
        return Promise.resolve({ data: [] });
      });
      renderPage();

      expect(await screen.findByText("No se pudo cargar la información. Intenta de nuevo más tarde.")).toBeInTheDocument();
    });
  });

  it("ya no muestra la agenda dentro del acordeón del conjunto (ahora vive en su propia opción del menú)", async () => {
    mockPanel();
    renderPage();

    await screen.findByText("Conjunto Los Alpes");
    expect(screen.queryByText("Agenda del conjunto")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver agenda" })).not.toBeInTheDocument();
  });

  // ¿Qué? Issue #491 — "Solicitar otro conjunto" y el código de acceso arriba. Issue #595: el botón
  //       es pequeño y va arriba a la derecha de la lista de conjuntos.
  describe("solicitar otro conjunto y código de acceso", () => {
    it("muestra el botón Solicitar otro conjunto en el encabezado de la lista, antes de los conjuntos", async () => {
      mockPanel();
      renderPage();

      const nombre = await screen.findByText("Conjunto Los Alpes");
      const boton = screen.getByRole("button", { name: /Solicitar otro conjunto/ });
      expect(boton.compareDocumentPosition(nombre) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      // ¿Qué? Ya no es una fila grande con texto de ayuda.
      expect(screen.queryByText("Pide que te asignen otro conjunto.")).not.toBeInTheDocument();
    });

    it("el botón se ve también si el administrador todavía no tiene conjuntos", async () => {
      renderPage();

      expect(await screen.findByRole("button", { name: /Solicitar otro conjunto/ })).toBeInTheDocument();
    });

    it("al pulsarlo abre el paso a paso, con los documentos y el texto de quien ya tiene cuenta", async () => {
      mockPanel();
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: /Solicitar otro conjunto/ }));

      const ventana = await screen.findByRole("dialog", { name: "Solicitar otro conjunto" });
      expect(within(ventana).getByText(/el conjunto se asigna a tu cuenta/)).toBeInTheDocument();
      expect(within(ventana).getByText(/Certificado de Representación Legal de la Propiedad Horizontal/)).toBeInTheDocument();
      expect(within(ventana).getByText(/Copia de tu cédula de ciudadanía, ampliada al 150 %/)).toBeInTheDocument();
      expect(within(ventana).getByText(/nunca se suben a VerdeApp/)).toBeInTheDocument();
      // ¿Qué? Es el texto del registro ("autorización de registro"): aquí no aplica.
      expect(within(ventana).queryByText(/autorización de registro/)).not.toBeInTheDocument();
    });

    it("se puede cerrar la ventana", async () => {
      mockPanel();
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: /Solicitar otro conjunto/ }));
      await user.click(await screen.findByRole("button", { name: "Cerrar" }));

      expect(screen.queryByRole("dialog", { name: "Solicitar otro conjunto" })).not.toBeInTheDocument();
    });

    it("pide el correo con el asunto Otro conjunto, sin botón, y con el ícono de copiar", async () => {
      mockPanel();
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: /Solicitar otro conjunto/ }));
      const ventana = await screen.findByRole("dialog", { name: "Solicitar otro conjunto" });

      expect(within(ventana).queryByRole("button", { name: "Solicitar acceso" })).not.toBeInTheDocument();
      const href = within(ventana).getByRole("link", { name: "administradorverdeapp@gmail.com" }).getAttribute("href") ?? "";
      const params = new URLSearchParams(href.slice(href.indexOf("?") + 1));
      expect(params.get("subject")).toBe("Otro conjunto");
      expect(params.get("body")).toContain("Mi correo en VerdeApp:");

      await user.click(within(ventana).getByRole("button", { name: "Copiar correo" }));
      expect(await navigator.clipboard.readText()).toBe("administradorverdeapp@gmail.com");
    });

    // ¿Qué? Issue #513 — la cobertura va primero (es la cifra que se mira) y el código de
    //       acceso queda a su lado.
    it("la cobertura queda primero y el código de acceso a su lado", async () => {
      mockPanel();
      renderPage();

      const codigo = await screen.findByText("AB3K9Q");
      const cobertura = screen.getByText("Apartamentos registrados en VerdeApp");
      expect(cobertura.compareDocumentPosition(codigo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  describe("historial de auditorías", () => {
    // ¿Qué? Issue #487: el historial semanal salió del acordeón; ahora vive en la
    //       página "Desempeño" (AdminConjuntoDesempenoPage).
    it("ya no pide el historial ni lo muestra dentro del conjunto", async () => {
      mockPanel();
      renderPage();

      await screen.findByText("AB3K9Q");
      expect(screen.queryByText("Historial de auditorías")).not.toBeInTheDocument();
      const urlsPedidas = mockGet.mock.calls.map(([url]) => String(url));
      expect(urlsPedidas.some((url) => url.includes("/auditorias-conjunto/historial"))).toBe(false);
    });
  });

  describe("apartamentos registrados por conjunto", () => {
    function mockConjunto(extra: object) {
      mockPanel({ conjuntos: [{ ...conjunto, ...extra }] });
    }

    it("muestra cuántos apartamentos están registrados, el avance y cuántos faltan", async () => {
      mockConjunto({ total_apartamentos: 120, apartamentos_registrados: 62, residentes_registrados: 71 });
      renderPage();

      expect(await screen.findByText("de 120 apartamentos")).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "62 de 120 apartamentos registrados" })).toBeInTheDocument();
      expect(screen.getByText("58")).toBeInTheDocument();
      expect(screen.getByText("71")).toBeInTheDocument();
      expect(screen.getByText("52% registrado")).toBeInTheDocument();
    });

    it("nunca muestra negativos si hay más registrados que el total escrito", async () => {
      mockConjunto({ total_apartamentos: 10, apartamentos_registrados: 14, residentes_registrados: 15 });
      renderPage();

      expect(await screen.findByText("100% registrado")).toBeInTheDocument();
      expect(screen.getByText("apartamentos por registrar").previousElementSibling).toHaveTextContent("0");
    });

    // ¿Qué? Issue #513 — la cantidad se define solo con "Editar datos del conjunto": ya no
    //       hay un segundo botón en la cobertura.
    it("sin cantidad definida muestra los registrados y manda a definirla con Editar datos del conjunto", async () => {
      mockConjunto({ total_apartamentos: null, apartamentos_registrados: 38 });
      const user = userEvent.setup();
      renderPage();

      expect(await screen.findByText("apartamentos ya tienen residentes")).toBeInTheDocument();
      expect(screen.getByText(/Define los apartamentos del conjunto con «Editar datos del conjunto»/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Definir cantidad de apartamentos" })).not.toBeInTheDocument();
      // ¿Qué? Sin cantidad definida la cabecera no muestra el porcentaje.
      expect(screen.queryByText(/% registrado/)).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Editar datos del conjunto" }));
      expect(screen.getByLabelText("Cantidad de apartamentos (opcional)")).toBeInTheDocument();
    });

    it("guarda la cantidad de apartamentos junto con el NIT", async () => {
      mockConjunto({ total_apartamentos: null });
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: "Editar datos del conjunto" }));
      await user.type(screen.getByLabelText("Cantidad de apartamentos (opcional)"), "120");
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      await waitFor(() => {
        expect(mockPatch).toHaveBeenCalledWith(
          expect.stringContaining("/conjunto-panel/mis-conjuntos/1"),
          { nit: "900123456", total_apartamentos: 120 }
        );
      });
    });

    it("rechaza una cantidad inválida sin llamar al servidor", async () => {
      mockConjunto({ total_apartamentos: null });
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: "Editar datos del conjunto" }));
      await user.type(screen.getByLabelText("Cantidad de apartamentos (opcional)"), "0");
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      expect(await screen.findByText("Escribe un número entero entre 1 y 20000.")).toBeInTheDocument();
      expect(mockPatch).not.toHaveBeenCalled();
    });
  });
});
