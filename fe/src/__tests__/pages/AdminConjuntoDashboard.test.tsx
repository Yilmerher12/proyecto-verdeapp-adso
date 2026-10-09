/**
 * Archivo: __tests__/pages/AdminConjuntoDashboard.test.tsx
 * Descripción: Tests del panel del Administrador de Conjunto (issue #23) —
 *              listado de conjuntos administrados, edición, invitación de
 *              recicladores y solicitud de desvinculación (RQF-016).
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
    await user.click(screen.getByRole("button", { name: "Editar" }));

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
      // ¿Qué? "Editar" solo lo trae la vista abierta de cada conjunto — con
      //       1 solo visible, solo el primero (Los Alpes) viene desplegado.
      expect(screen.getAllByRole("button", { name: "Editar" })).toHaveLength(1);

      const cabeceraRobles = screen.getByRole("button", { name: /Conjunto Los Robles/ });
      expect(cabeceraRobles).toHaveAttribute("aria-expanded", "false");
      await user.click(cabeceraRobles);
      expect(cabeceraRobles).toHaveAttribute("aria-expanded", "true");
      expect(screen.getAllByRole("button", { name: "Editar" })).toHaveLength(2);
    });
  });

  describe("avisos del conjunto, por rol", () => {
    const avisoReciclador = {
      id: "n1",
      tipo: "LLEGADA_RECICLADOR",
      mensaje: "Juan Pérez avisó su llegada al SHUT.",
      id_referencia: null,
      nombre_conjunto: "Conjunto Los Alpes",
      leida: false,
      created_at: new Date().toISOString(),
    };
    const avisoResidente = {
      id: "n2",
      tipo: "SHUT_LLENO",
      mensaje: "Torre 3, Apto 402 avisó que el SHUT está lleno.",
      id_referencia: null,
      nombre_conjunto: "Conjunto Los Alpes",
      leida: true,
      created_at: new Date().toISOString(),
    };

    it("separa los avisos del conjunto en 'De recicladores' y 'De residentes'", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
        if (url.includes("/mis-notificaciones")) return Promise.resolve({ data: [avisoReciclador, avisoResidente] });
        return Promise.resolve({ data: [] });
      });
      renderPage();

      await screen.findByText("Conjunto Los Alpes");
      // ¿Qué? El mismo aviso también aparece en NotificationFeed, arriba del
      //       todo (feed global) — se busca el bloque "Avisos de este
      //       conjunto" y se mira SOLO adentro de él, para no chocar con esa
      //       segunda copia.
      const bloqueAvisos = (await screen.findByText("Avisos de este conjunto")).closest("div")!;
      expect(within(bloqueAvisos).getByText("Juan Pérez avisó su llegada al SHUT.")).toBeInTheDocument();
      expect(within(bloqueAvisos).getByText("Torre 3, Apto 402 avisó que el SHUT está lleno.")).toBeInTheDocument();
      expect(within(bloqueAvisos).getByText("De recicladores")).toBeInTheDocument();
      expect(within(bloqueAvisos).getByText("De residentes")).toBeInTheDocument();
      // ¿Qué? Solo avisoReciclador está sin leer — el badge cuenta 1, no 2.
      expect(screen.getByText("1 aviso nuevo")).toBeInTheDocument();
    });

    it("no muestra la sección de avisos si el conjunto no tiene ninguno", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
        return Promise.resolve({ data: [] });
      });
      renderPage();

      await screen.findByText("Conjunto Los Alpes");
      expect(screen.queryByText("Avisos de este conjunto")).not.toBeInTheDocument();
    });
  });

  describe("agenda del conjunto", () => {
    const tema = {
      id: "t-1",
      texto: "Arreglar la puerta del sótano.",
      url_evidencia: "/uploads/adjuntos/puerta.jpg",
      estado: "PENDIENTE",
      created_at: "2026-09-22T10:00:00Z",
    };

    function mockConAgenda(items: unknown[]) {
      mockGet.mockImplementation((url: string) => {
        // ¿Qué? "/agenda" se revisa primero: su URL también contiene "/mis-conjuntos".
        if (url.includes("/agenda")) return Promise.resolve({ data: items });
        if (url.includes("/conjunto-panel/mis-conjuntos")) return Promise.resolve({ data: [conjunto] });
        return Promise.resolve({ data: [] });
      });
    }

    async function abrirAgenda(user: ReturnType<typeof userEvent.setup>) {
      await screen.findByText("Conjunto Los Alpes");
      await user.click(screen.getByRole("button", { name: "Ver agenda" }));
    }

    it("lista los temas al desplegar la agenda, con su foto", async () => {
      mockConAgenda([tema]);
      const user = userEvent.setup();
      renderPage();
      await abrirAgenda(user);

      expect(await screen.findByText("Arreglar la puerta del sótano.")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Ver foto" })).toHaveAttribute("href", expect.stringContaining("/uploads/adjuntos/puerta.jpg"));
    });

    it("muestra el estado vacío si no hay temas", async () => {
      mockConAgenda([]);
      const user = userEvent.setup();
      renderPage();
      await abrirAgenda(user);

      expect(await screen.findByText("Todavía no hay temas en la agenda de este conjunto.")).toBeInTheDocument();
    });

    it("agrega un tema nuevo (el botón se habilita solo con texto)", async () => {
      mockConAgenda([]);
      mockPost.mockResolvedValue({ data: {} });
      const user = userEvent.setup();
      renderPage();
      await abrirAgenda(user);

      await user.click(await screen.findByRole("button", { name: "+ Agregar tema" }));
      const guardar = screen.getByRole("button", { name: "Guardar tema" });
      expect(guardar).toBeDisabled();

      await user.type(screen.getByLabelText("Tema"), "Pintar el pasillo.");
      expect(guardar).toBeEnabled();
      await user.click(guardar);

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          expect.stringContaining("/conjunto-panel/mis-conjuntos/1/agenda"),
          { texto: "Pintar el pasillo.", url_evidencia: null }
        );
      });
    });

    it("deja un tema en espera", async () => {
      mockConAgenda([tema]);
      mockPatch.mockResolvedValue({ data: {} });
      const user = userEvent.setup();
      renderPage();
      await abrirAgenda(user);

      await user.click(await screen.findByRole("button", { name: "Dejar en espera" }));

      await waitFor(() => {
        expect(mockPatch).toHaveBeenCalledWith(
          expect.stringContaining("/conjunto-panel/mis-conjuntos/1/agenda/t-1"),
          { estado: "EN_ESPERA" }
        );
      });
    });

    it("borra un tema con confirmación", async () => {
      mockConAgenda([tema]);
      mockDelete.mockResolvedValue({ data: {} });
      const user = userEvent.setup();
      renderPage();
      await abrirAgenda(user);

      await user.click(await screen.findByRole("button", { name: "Eliminar tema" }));
      await user.click(await screen.findByRole("button", { name: "Sí, eliminar" }));

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith(expect.stringContaining("/conjunto-panel/mis-conjuntos/1/agenda/t-1"));
      });
    });
  });

  describe("historial de auditorías por conjunto", () => {
    const auditoria = (id: string, idConjunto: number, tema: string) => ({
      id_auditoria: id,
      id_conjunto_residencial: idConjunto,
      nombre_conjunto: "x",
      nivel_desempeno: "BUENA",
      tema_educativo: tema,
      descripcion: null,
      ruta_evidencia: "/x.jpg",
      ruta_evidencia_2: null,
      ruta_evidencia_3: null,
      created_at: "2026-09-22T10:00:00Z",
      nombre_reciclador: "Juan",
    });

    it("muestra dentro de cada conjunto solo las auditorías de ESE conjunto", async () => {
      mockGet.mockImplementation((url: string) => {
        // ¿Qué? "/historial" se revisa primero: la lista mezcla auditorías de 2 conjuntos.
        if (url.includes("/auditorias-conjunto/historial")) {
          return Promise.resolve({
            data: [auditoria("a1", 1, "Tema del conjunto uno"), auditoria("a2", 2, "Tema del conjunto dos")],
          });
        }
        if (url.includes("/conjunto-panel/mis-conjuntos")) {
          return Promise.resolve({
            data: [conjunto, { ...conjunto, id_conjunto_residencial: 2, nombre_conjunto: "Conjunto Capellanía" }],
          });
        }
        return Promise.resolve({ data: [] });
      });
      renderPage();

      // ¿Qué? Solo el primer conjunto viene desplegado: ve su tema y NO el del otro.
      expect(await screen.findByText("Tema del conjunto uno")).toBeInTheDocument();
      expect(screen.queryByText("Tema del conjunto dos")).not.toBeInTheDocument();
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

    it("sin cantidad definida muestra los registrados y el botón para definirla, que abre Editar", async () => {
      mockConjunto({ total_apartamentos: null, apartamentos_registrados: 38 });
      const user = userEvent.setup();
      renderPage();

      expect(await screen.findByText("apartamentos ya tienen residentes")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Definir cantidad de apartamentos" }));
      expect(screen.getByLabelText("Cantidad de apartamentos (opcional)")).toBeInTheDocument();
    });

    it("guarda la cantidad de apartamentos junto con el NIT", async () => {
      mockConjunto({ total_apartamentos: null });
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: "Editar" }));
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

      await user.click(await screen.findByRole("button", { name: "Editar" }));
      await user.type(screen.getByLabelText("Cantidad de apartamentos (opcional)"), "0");
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      expect(await screen.findByText("Escribe un número entero entre 1 y 20000.")).toBeInTheDocument();
      expect(mockPatch).not.toHaveBeenCalled();
    });
  });
});
