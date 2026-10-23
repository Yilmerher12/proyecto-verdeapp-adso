/**
 * Archivo: __tests__/pages/AdminConjuntoDashboard.test.tsx
 * Descripción: Tests del panel del Administrador de Conjunto (issue #23) —
 *              listado de conjuntos administrados, edición, invitación de
 *              recicladores y solicitud de desvinculación (RQF-016).
 */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { Route, Routes, useLocation } from "react-router-dom";
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

function mockRespuestasVacias() {
  mockGet.mockImplementation((url: string) => {
    if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [] });
    if (url.includes("/invitaciones")) return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
}

function renderPage() {
  return renderWithProviders(<AdminConjuntoDashboard />, {
    authContext: { user: adminConjuntoUser, isAuthenticated: true },
  });
}

describe("AdminConjuntoDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRespuestasVacias();
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

  it("muestra un aviso de error si falla la carga de recicladores autorizados (issue #223, f2 y f9 del diagnóstico)", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
      if (url.includes("/invitaciones")) return Promise.resolve({ data: [] });
      if (url.includes("/autorizados")) return Promise.reject(new Error("Network Error"));
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    const botonDetalle = await screen.findByRole("button", { name: "Ver detalle" });
    await user.click(botonDetalle);

    expect(await screen.findByText("No se pudo cargar la información. Intenta de nuevo más tarde.")).toBeInTheDocument();
  });

  it("lista los conjuntos administrados con su sección de recicladores", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
      if (url.includes("/invitaciones")) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Conjunto Los Alpes")).toBeInTheDocument();
    });
    expect(screen.getByText("Dejar de administrar este conjunto")).toBeInTheDocument();

    // ¿Qué? Antes había un solo título "Recicladores Autorizados" que en
    //       realidad mostraba el historial de invitaciones, no la
    //       autorización real — ahora son 2 secciones separadas y honestas.
    // ¿Impacto? Con el rediseño (issue #166) esta sección queda colapsada
    //           por defecto para no empujar el resto del panel fuera de la
    //           vista inicial — hay que expandirla primero.
    // ¿Qué? aria-expanded comunica el estado de un botón que muestra/oculta
    //       una sección — antes solo cambiaba el texto visible, sin nada
    //       que un lector de pantalla pudiera anunciar (re-auditoría de
    //       accesibilidad post-#16).
    const botonDetalle = screen.getByRole("button", { name: "Ver detalle" });
    expect(botonDetalle).toHaveAttribute("aria-expanded", "false");
    await user.click(botonDetalle);
    expect(screen.getByText("Autorizados")).toBeInTheDocument();
    expect(screen.getByText("Invitaciones enviadas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ocultar detalle" })).toHaveAttribute("aria-expanded", "true");
  });

  // ¿Qué? Issue #180: nombre y dirección se quitaron del formulario de
  //       edición (vienen ya verificados desde el dataset oficial de
  //       Bogotá) — solo el NIT sigue editable.
  it("guarda el NIT al editar un conjunto", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
      if (url.includes("/invitaciones")) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Conjunto Los Alpes");
    await user.click(screen.getByRole("button", { name: "Editar datos del conjunto" }));

    const inputNit = screen.getByDisplayValue("900123456");
    await user.clear(inputNit);
    await user.type(inputNit, "900111222-1");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(
        expect.stringContaining("/conjunto-panel/mis-conjuntos/1"),
        { nit: "900111222-1", total_apartamentos: null }
      );
    });
    expect(await screen.findByText("Conjunto actualizado correctamente.")).toBeInTheDocument();
  });

  it("invita a un reciclador desde la sección del conjunto", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
      if (url.includes("/invitaciones")) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Conjunto Los Alpes");
    const botonInvitar = screen.getByRole("button", { name: "+ Invitar reciclador" });
    expect(botonInvitar).toHaveAttribute("aria-expanded", "false");
    await user.click(botonInvitar);
    expect(botonInvitar).toHaveAttribute("aria-expanded", "true");
    await user.type(
      screen.getByPlaceholderText("correo.del.reciclador@ejemplo.com"),
      "reciclador@example.com"
    );
    await user.click(screen.getByRole("button", { name: "Invitar" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/reciclador-conjunto/invitar"),
        { correo_reciclador: "reciclador@example.com", id_conjunto_residencial: 1 }
      );
    });
  });

  // ¿Qué? Issue #352 — con noValidate, el formato del correo lo revisa la
  //       app (mensaje anclado al campo), no el globo del navegador.
  it("muestra el error de correo inválido al invitar y no envía nada", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Conjunto Los Alpes");
    await user.click(screen.getByRole("button", { name: "+ Invitar reciclador" }));
    const correo = screen.getByPlaceholderText("correo.del.reciclador@ejemplo.com");
    expect(correo).toHaveAttribute("maxLength", "255");
    await user.type(correo, "no-es-correo");
    await user.click(screen.getByRole("button", { name: "Invitar" }));

    expect(await screen.findByText("El formato del correo no es válido.")).toBeInTheDocument();
    expect(correo).toHaveAttribute("aria-invalid", "true");
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
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
      if (url.includes("/autorizados")) return Promise.resolve({ data: [recicladorAutorizado] });
      if (url.includes("/invitaciones")) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    mockDelete.mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Conjunto Los Alpes");
    await user.click(screen.getByRole("button", { name: "Ver detalle" }));
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

  it("envía una solicitud de desvinculación", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
      if (url.includes("/invitaciones")) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Conjunto Los Alpes");
    await user.click(screen.getByRole("button", { name: "Dejar de administrar este conjunto" }));
    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/conjunto-panel/mis-conjuntos/1/solicitar-desvinculacion"),
        { motivo: null }
      );
    });
  });

  // ¿Qué? Issue #513 — el botón solo ENVÍA una solicitud al equipo de VerdeApp; antes el texto
  //       decía que "transfiere la administración a otra persona", lo cual no es lo que hace.
  it("explica que dejar de administrar solo envía una solicitud al equipo de VerdeApp", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
      return Promise.resolve({ data: [] });
    });
    renderPage();

    expect(await screen.findByText(/Esto envía una solicitud al equipo de VerdeApp/)).toHaveTextContent(
      "mientras tanto sigues administrando el conjunto",
    );
    expect(screen.queryByText(/transfiere la administración/)).not.toBeInTheDocument();
  });

  describe("acordeón de conjuntos (issue #166)", () => {
    const conjunto2 = { ...conjunto, id_conjunto_residencial: 2, nombre_conjunto: "Conjunto Los Robles" };

    it("solo el primer conjunto viene abierto; los demás se abren con un clic", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto, conjunto2] });
        if (url.includes("/invitaciones")) return Promise.resolve({ data: [] });
        return Promise.resolve({ data: [] });
      });
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
  });

  // ¿Qué? Issue #513 — un solo botón para editar los dos datos (NIT y cantidad de
  //       apartamentos), dentro del conjunto abierto y con esos datos a la vista.
  describe("botón Editar datos del conjunto (issue #513)", () => {
    const conjunto2 = { ...conjunto, id_conjunto_residencial: 2, nombre_conjunto: "Conjunto Los Robles", nit: "800555666" };

    function mockDosConjuntos() {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto, conjunto2] });
        return Promise.resolve({ data: [] });
      });
    }

    it("muestra el NIT y la cantidad de apartamentos que edita el botón, y 'sin definir' si faltan", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/conjunto-panel/mis-conjuntos")) {
          return Promise.resolve({ data: [{ ...conjunto, nit: null, total_apartamentos: 120 }] });
        }
        return Promise.resolve({ data: [] });
      });
      renderPage();

      expect(await screen.findByText(/NIT: sin definir/)).toHaveTextContent("Apartamentos del conjunto: 120");
    });

    it("cada botón se describe con el nombre de su conjunto, para distinguirlos con lector de pantalla", async () => {
      mockDosConjuntos();
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: /Conjunto Los Robles/ }));
      const [botonAlpes, botonRobles] = screen.getAllByRole("button", { name: "Editar datos del conjunto" });
      expect(botonAlpes).toHaveAccessibleDescription("Conjunto Los Alpes");
      expect(botonRobles).toHaveAccessibleDescription("Conjunto Los Robles");
    });

    it("abre el formulario con el NIT y la cantidad de apartamentos, y vuelve al cancelar", async () => {
      mockDosConjuntos();
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: "Editar datos del conjunto" }));
      expect(screen.getByDisplayValue("900123456")).toBeInTheDocument();
      expect(screen.getByLabelText("Cantidad de apartamentos (opcional)")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Editar datos del conjunto" })).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(screen.getByRole("button", { name: "Editar datos del conjunto" })).toBeInTheDocument();
    });
  });

  describe("avisos por conjunto (issue #436)", () => {
    // ¿Qué? Dos conjuntos con EXACTAMENTE el mismo nombre y distinto id: antes el
    //       panel repartía los avisos por nombre y los mezclaba.
    const gemeloA = { ...conjunto, id_conjunto_residencial: 1 };
    const gemeloB = { ...conjunto, id_conjunto_residencial: 2 };

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

    function mockPanel(conjuntos: object[], notificaciones: object[]) {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: conjuntos });
        if (url.includes("/mis-notificaciones")) return Promise.resolve({ data: notificaciones });
        return Promise.resolve({ data: [] });
      });
    }

    it("cada conjunto muestra solo sus avisos y su propio contador, aunque tengan el mismo nombre", async () => {
      mockPanel([gemeloA, gemeloB], [aviso("a1", 1), aviso("a2", 1), aviso("b1", 2)]);
      const user = userEvent.setup();
      renderPage();

      // ¿Qué? Solo el primer conjunto viene desplegado: ve sus 2 avisos y NO el del otro.
      expect(await screen.findByText("Mensaje a1")).toBeInTheDocument();
      expect(screen.getByText("Mensaje a2")).toBeInTheDocument();
      expect(screen.queryByText("Mensaje b1")).not.toBeInTheDocument();

      const [cabeceraA, cabeceraB] = screen.getAllByRole("button", { name: /Conjunto Los Alpes/ });
      expect(within(cabeceraA).getByRole("img", { name: "2 avisos nuevos" })).toBeInTheDocument();
      expect(within(cabeceraB).getByRole("img", { name: "1 aviso nuevo" })).toBeInTheDocument();

      await user.click(cabeceraB);
      expect(await screen.findByText("Mensaje b1")).toBeInTheDocument();
    });

    it("ya no hay una lista general de avisos arriba del panel", async () => {
      mockPanel([gemeloA, gemeloB], [aviso("b1", 2)]);
      renderPage();

      await screen.findAllByRole("button", { name: /Conjunto Los Alpes/ });
      expect(screen.queryByText("Actividad del conjunto")).not.toBeInTheDocument();
      // ¿Qué? El aviso es del segundo conjunto, que está cerrado: no aparece en ningún lado.
      expect(screen.queryByText("Mensaje b1")).not.toBeInTheDocument();
    });

    // ¿Qué? Issue #513 — la frase explicativa se ve siempre, no solo con la lista vacía.
    it("explica qué avisos salen en la sección, aunque ya haya avisos", async () => {
      mockPanel([conjunto], [aviso("a1", 1)]);
      renderPage();

      await screen.findByText("Mensaje a1");
      expect(screen.getByText(/Reportes de residentes y recicladores, y respuestas de VerdeApp a tus solicitudes/)).toBeInTheDocument();
    });

    it("sin avisos no muestra contador y sí un mensaje de lista vacía", async () => {
      mockPanel([conjunto], []);
      renderPage();

      expect(await screen.findByText(/Todavía no hay avisos de este conjunto/)).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: /aviso/ })).not.toBeInTheDocument();
    });

    it("'Marcar leídas' solo marca los avisos de ese conjunto", async () => {
      mockPanel([gemeloA, gemeloB], [aviso("a1", 1), aviso("b1", 2)]);
      const user = userEvent.setup();
      renderPage();

      await screen.findByText("Mensaje a1");
      await user.click(screen.getByRole("button", { name: "Marcar leídas" }));

      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/notificaciones/marcar-todas-leidas"),
        {},
        { params: { id_conjunto_residencial: 1 } },
      );
      const [cabeceraA, cabeceraB] = screen.getAllByRole("button", { name: /Conjunto Los Alpes/ });
      await waitFor(() => expect(within(cabeceraA).queryByRole("img", { name: /aviso/ })).not.toBeInTheDocument());
      // ¿Qué? El otro conjunto conserva su aviso sin leer.
      expect(within(cabeceraB).getByRole("img", { name: "1 aviso nuevo" })).toBeInTheDocument();
    });

    it("'Limpiar leídas' solo quita los avisos leídos de ese conjunto", async () => {
      mockPanel(
        [gemeloA, gemeloB],
        [aviso("a1", 1, { leida: true }), aviso("a2", 1), aviso("b1", 2, { leida: true })],
      );
      const user = userEvent.setup();
      renderPage();

      await screen.findByText("Mensaje a1");
      await user.click(screen.getByRole("button", { name: "Limpiar leídas" }));

      expect(mockDelete).toHaveBeenCalledWith(
        expect.stringContaining("/notificaciones/limpiar-leidas"),
        { params: { id_conjunto_residencial: 1 } },
      );
      await waitFor(() => expect(screen.queryByText("Mensaje a1")).not.toBeInTheDocument());
      expect(screen.getByText("Mensaje a2")).toBeInTheDocument();
      // ¿Qué? El aviso leído del otro conjunto no se tocó: se ve al desplegarlo.
      await user.click(screen.getAllByRole("button", { name: /Conjunto Los Alpes/ })[1]);
      expect(await screen.findByText("Mensaje b1")).toBeInTheDocument();
    });

    it("marcar un aviso como leído sigue funcionando al hacer clic en él", async () => {
      mockPanel([conjunto], [aviso("a1", 1)]);
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByText("Mensaje a1"));

      expect(mockPost).toHaveBeenCalledWith(expect.stringContaining("/notificaciones/a1/leer"), {});
    });

    it("el aviso de auditoría se ve en su banner y no cuenta en el contador del conjunto", async () => {
      mockPanel(
        [conjunto],
        [aviso("au1", 1, { tipo: "AUDITORIA_PUBLICADA", mensaje: "El reciclador auditó tu conjunto.", id_referencia: "aud-1" })],
      );
      renderPage();

      expect(await screen.findByText("El reciclador auditó tu conjunto.")).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: /aviso/ })).not.toBeInTheDocument();
    });

    it("la desvinculación aprobada de un conjunto que ya no administra se ve en un banner arriba", async () => {
      mockPanel(
        [conjunto],
        [
          aviso("d1", 99, { tipo: "DESVINCULACION_APROBADA", mensaje: "Tu desvinculación de Torres del Sur fue aprobada." }),
        ],
      );
      const user = userEvent.setup();
      renderPage();

      expect(await screen.findByText("Tu desvinculación de Torres del Sur fue aprobada.")).toBeInTheDocument();
      expect(screen.getByText("Desvinculación aprobada")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Entendido" }));

      expect(mockPost).toHaveBeenCalledWith(expect.stringContaining("/notificaciones/d1/leer"), {});
      await waitFor(() => expect(screen.queryByText("Desvinculación aprobada")).not.toBeInTheDocument());
    });

    it("un aviso de desvinculación de un conjunto que sí administra va dentro de ese conjunto, no en el banner", async () => {
      mockPanel(
        [conjunto],
        [aviso("d2", 1, { tipo: "DESVINCULACION_RECHAZADA", mensaje: "Tu solicitud fue rechazada." })],
      );
      renderPage();

      expect(await screen.findByText("Tu solicitud fue rechazada.")).toBeInTheDocument();
      expect(screen.queryByText("Desvinculación aprobada")).not.toBeInTheDocument();
    });
  });

  it("ya no muestra la agenda dentro del acordeón del conjunto (ahora vive en su propia opción del menú)", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
      return Promise.resolve({ data: [] });
    });
    renderPage();

    await screen.findByText("Conjunto Los Alpes");
    expect(screen.queryByText("Agenda del conjunto")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver agenda" })).not.toBeInTheDocument();
  });

  // ¿Qué? Issue #491 — "Solicitar otro conjunto" y el código de acceso arriba.
  describe("solicitar otro conjunto y código de acceso", () => {
    function mockUnConjunto() {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
        return Promise.resolve({ data: [] });
      });
    }

    function DestinoContacto() {
      const { pathname, search } = useLocation();
      return <p>destino:{pathname}{search}</p>;
    }

    it("muestra la fila Solicitar otro conjunto debajo de la lista de conjuntos", async () => {
      mockUnConjunto();
      renderPage();

      const nombre = await screen.findByText("Conjunto Los Alpes");
      const fila = screen.getByRole("button", { name: /Solicitar otro conjunto/ });
      expect(nombre.compareDocumentPosition(fila) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(screen.getByText("Pide que te asignen otro conjunto.")).toBeInTheDocument();
    });

    it("la fila se ve también si el administrador todavía no tiene conjuntos", async () => {
      renderPage();

      expect(await screen.findByRole("button", { name: /Solicitar otro conjunto/ })).toBeInTheDocument();
    });

    it("al pulsarla abre el paso a paso, con los documentos y el texto de quien ya tiene cuenta", async () => {
      mockUnConjunto();
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: /Solicitar otro conjunto/ }));

      const ventana = await screen.findByRole("dialog", { name: "Solicitar otro conjunto" });
      expect(within(ventana).getByText(/el conjunto se asigna a tu cuenta/)).toBeInTheDocument();
      expect(within(ventana).getByText(/Certificado de existencia y representación legal/)).toBeInTheDocument();
      expect(within(ventana).getByText(/nunca se suben a VerdeApp/)).toBeInTheDocument();
      // ¿Qué? Es el texto del registro ("terminar de crear tu cuenta"): aquí no aplica.
      expect(within(ventana).queryByText(/terminar de crear tu cuenta/)).not.toBeInTheDocument();
    });

    it("se puede cerrar la ventana", async () => {
      mockUnConjunto();
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: /Solicitar otro conjunto/ }));
      await user.click(await screen.findByRole("button", { name: "Cerrar" }));

      expect(screen.queryByRole("dialog", { name: "Solicitar otro conjunto" })).not.toBeInTheDocument();
    });

    it("Solicitar acceso lleva al contacto con el motivo otro-conjunto", async () => {
      mockUnConjunto();
      const user = userEvent.setup();
      renderWithProviders(
        <Routes>
          <Route path="/" element={<AdminConjuntoDashboard />} />
          <Route path="/contacto" element={<DestinoContacto />} />
        </Routes>,
        { authContext: { user: adminConjuntoUser, isAuthenticated: true } },
      );

      await user.click(await screen.findByRole("button", { name: /Solicitar otro conjunto/ }));
      await user.click(await screen.findByRole("button", { name: "Solicitar acceso" }));

      expect(screen.getByText("destino:/contacto?motivo=otro-conjunto")).toBeInTheDocument();
    });

    // ¿Qué? Issue #513 — la cobertura va primero (es la cifra que se mira) y el código de
    //       acceso queda a su lado.
    it("la cobertura queda primero y el código de acceso a su lado", async () => {
      mockUnConjunto();
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
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
        return Promise.resolve({ data: [] });
      });
      renderPage();

      await screen.findByText("AB3K9Q");
      expect(screen.queryByText("Historial de auditorías")).not.toBeInTheDocument();
      const urlsPedidas = mockGet.mock.calls.map(([url]) => String(url));
      expect(urlsPedidas.some((url) => url.includes("/auditorias-conjunto/historial"))).toBe(false);
    });
  });

  describe("apartamentos registrados por conjunto", () => {
    function mockConjunto(extra: object) {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [{ ...conjunto, ...extra }] });
        return Promise.resolve({ data: [] });
      });
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
