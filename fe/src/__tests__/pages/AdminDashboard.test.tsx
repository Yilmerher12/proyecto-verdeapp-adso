/**
 * Archivo: __tests__/pages/AdminDashboard.test.tsx
 * Descripción: Tests del panel del Administrador del Sistema — pestañas de
 *              usuarios (Residentes / Recicladores / Admins de Conjunto)
 *              con búsqueda, filtro de conjunto, botón Inactivos y paginación, más la
 *              sección de invitar administradores de conjunto.
 */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { AdminDashboard } from "@/pages/dashboards/AdminDashboard";
import { RoleId } from "@/types/auth";
import { renderWithProviders, mockUser } from "../helpers";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();

vi.mock("axios", () => {
  const instance = {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    defaults: {},
  };
  return { default: { ...instance, create: () => instance } };
});

const adminUser = { ...mockUser, role_id: RoleId.ADMIN_SISTEMA };

const residente = {
  Correo: "residente@example.com",
  Nombre: "Juan",
  Apellido: "Pérez",
  Conjunto: "Conjunto Los Alpes",
  Bloque: "A",
  Apartamento: "101",
  Habilitado: true,
};

const reciclador = {
  Correo: "reciclador@example.com",
  Nombre_Completo: "Carlos Gómez",
  Asociacion: "Asociación Verde",
  Habilitado: true,
};

const administrador = {
  Correo: "admin.conjunto@example.com",
  Nombre: "Ana",
  Apellido: "Ríos",
  Teléfono: "3000000000",
  Conjuntos: "Conjunto Los Alpes",
  Habilitado: true,
};

// ¿Qué? Las 3 pestañas de usuarios devuelven { items, total } — todo lo
//       demás que consulta este dashboard (localidades, solicitudes de
//       desvinculación, conjuntos sin administrador) sigue devolviendo un
//       arreglo plano, así que el mock por defecto tiene que distinguir
//       cuál es cuál en vez de una sola respuesta genérica para todo.
function mockRespuestasVacias() {
  mockGet.mockImplementation((url: string) => {
    if (
      url.includes("/admin/vista-residentes") ||
      url.includes("/admin/sp-recicladores") ||
      url.includes("/admin/administradores-conjunto")
    ) {
      return Promise.resolve({ data: { items: [], total: 0 } });
    }
    return Promise.resolve({ data: [] });
  });
}

function renderPage() {
  return renderWithProviders(<AdminDashboard />, {
    authContext: { user: adminUser, isAuthenticated: true },
  });
}

describe("AdminDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRespuestasVacias();
    mockPost.mockResolvedValue({ data: {} });
  });

  it("muestra el título del panel y el correo del administrador", () => {
    renderPage();
    expect(screen.getByText("Panel de Administración")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("muestra un aviso de error si falla la carga (issue #223, f9 del diagnóstico)", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/admin/vista-residentes")) {
        return Promise.reject(new Error("Network Error"));
      }
      return Promise.resolve({ data: [] });
    });
    renderPage();
    expect(await screen.findByText("No se pudo cargar la información. Intenta de nuevo más tarde.")).toBeInTheDocument();
  });

  it("consulta la pestaña de Residentes al montar", async () => {
    renderPage();
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/admin/vista-residentes"),
        expect.objectContaining({ params: expect.anything() })
      );
    });
  });

  it("lista los residentes devueltos por el backend", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/admin/vista-residentes")) {
        return Promise.resolve({ data: { items: [residente], total: 1 } });
      }
      return Promise.resolve({ data: [] });
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    });
  });

  it("cambia a la pestaña de Recicladores y consulta ese endpoint", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/admin/sp-recicladores")) {
        return Promise.resolve({ data: { items: [reciclador], total: 1 } });
      }
      if (url.includes("/admin/vista-residentes") || url.includes("/admin/administradores-conjunto")) {
        return Promise.resolve({ data: { items: [], total: 0 } });
      }
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Recicladores" }));

    await waitFor(() => {
      expect(screen.getByText("Carlos Gómez")).toBeInTheDocument();
    });
  });

  it("cambia a la pestaña de Administradores de Conjunto y consulta ese endpoint", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/admin/administradores-conjunto")) {
        return Promise.resolve({ data: { items: [administrador], total: 1 } });
      }
      if (url.includes("/admin/vista-residentes") || url.includes("/admin/sp-recicladores")) {
        return Promise.resolve({ data: { items: [], total: 0 } });
      }
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Administradores de Conjunto" }));

    await waitFor(() => {
      expect(screen.getByText("Ana Ríos")).toBeInTheDocument();
    });
  });

  // ¿Qué? El profesor pidió, en la sustentación, que esta vista permitiera
  //       HACER algo con los usuarios, no solo consultarlos.
  it("desactiva una cuenta desde la tabla, con confirmación", async () => {
    // ¿Qué? Tras el cambio, el panel vuelve a pedir la lista al backend (en
    //       vez de parchar la fila a mano) — por eso el mock cambia de
    //       respuesta en cuanto llega el PATCH.
    let habilitado = true;
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/admin/vista-residentes")) {
        return Promise.resolve({ data: { items: [{ ...residente, Habilitado: habilitado }], total: 1 } });
      }
      if (url.includes("/admin/sp-recicladores") || url.includes("/admin/administradores-conjunto")) {
        return Promise.resolve({ data: { items: [], total: 0 } });
      }
      return Promise.resolve({ data: [] });
    });
    mockPatch.mockImplementation(() => {
      habilitado = false;
      return Promise.resolve({ data: {} });
    });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText("Juan Pérez")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Desactivar/i }));
    expect(screen.getByText("¿Desactivar esta cuenta?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sí, continuar" }));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(
        expect.stringContaining(`/admin/usuarios/${encodeURIComponent(residente.Correo)}/habilitado`),
        { habilitado: false }
      );
    });
    await waitFor(() => expect(screen.getByText("Inactivo")).toBeInTheDocument());
  });

  it("no muestra el botón de desactivar en la propia cuenta del Admin del Sistema", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/admin/vista-residentes")) {
        return Promise.resolve({
          data: { items: [{ ...residente, Correo: adminUser.email }], total: 1 },
        });
      }
      if (url.includes("/admin/sp-recicladores") || url.includes("/admin/administradores-conjunto")) {
        return Promise.resolve({ data: { items: [], total: 0 } });
      }
      return Promise.resolve({ data: [] });
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Juan Pérez")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Desactivar/i })).not.toBeInTheDocument();
  });

  it("busca en tiempo real (con debounce) y se lo manda al backend como parámetro", async () => {
    const user = userEvent.setup();
    renderPage();
    const input = await screen.findByPlaceholderText("Buscar por nombre o correo...");
    await user.type(input, "juan");
    // ¿Qué? No hace falta Enter — el debounce de 350ms dispara la
    //       búsqueda sola; waitFor ya reintenta con tiempo de sobra.

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/admin/vista-residentes"),
        expect.objectContaining({ params: expect.objectContaining({ search: "juan" }) })
      );
    });
  });

  it("muestra los mensajes de tabla vacía cuando no hay datos", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No hay residentes registrados todavía.")).toBeInTheDocument();
    });
  });

  it("ordena al hacer clic en una columna, e invierte la dirección en el segundo clic", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/admin/vista-residentes")) {
        return Promise.resolve({ data: { items: [residente], total: 1 } });
      }
      if (
        url.includes("/admin/sp-recicladores") ||
        url.includes("/admin/administradores-conjunto")
      ) {
        return Promise.resolve({ data: { items: [], total: 0 } });
      }
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Juan Pérez");
    // ¿Qué? aria-sort en el <th> es el patrón WCAG para encabezados
    //       ordenables — antes no existía ninguno (re-auditoría de
    //       accesibilidad post-#16).
    const thCorreo = screen.getByRole("columnheader", { name: /Correo/ });
    expect(thCorreo).toHaveAttribute("aria-sort", "none");

    await user.click(screen.getByRole("button", { name: "Ordenar por Correo" }));

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/admin/vista-residentes"),
        expect.objectContaining({
          params: expect.objectContaining({ order_by: "correo", order_dir: "asc" }),
        })
      );
    });
    expect(thCorreo).toHaveAttribute("aria-sort", "ascending");

    await user.click(screen.getByRole("button", { name: "Correo, ordenado ascendente" }));

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/admin/vista-residentes"),
        expect.objectContaining({
          params: expect.objectContaining({ order_by: "correo", order_dir: "desc" }),
        })
      );
    });
    expect(thCorreo).toHaveAttribute("aria-sort", "descending");
  });

  it("cambiar de pestaña reinicia el orden elegido", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/admin/vista-residentes")) {
        return Promise.resolve({ data: { items: [residente], total: 1 } });
      }
      if (
        url.includes("/admin/sp-recicladores") ||
        url.includes("/admin/administradores-conjunto")
      ) {
        return Promise.resolve({ data: { items: [], total: 0 } });
      }
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Juan Pérez");
    await user.click(screen.getByRole("button", { name: "Ordenar por Correo" }));
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/admin/vista-residentes"),
        expect.objectContaining({ params: expect.objectContaining({ order_by: "correo" }) })
      );
    });

    mockGet.mockClear();
    await user.click(screen.getByRole("button", { name: "Recicladores" }));

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/admin/sp-recicladores"),
        expect.objectContaining({
          params: expect.not.objectContaining({ order_by: expect.anything() }),
        })
      );
    });
  });

  it("abre el modal de invitar administrador de conjunto al hacer clic", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByText("Invitar Administrador de Conjunto")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "+ Invitar administrador" }));

    // ¿Qué? Antes el formulario se expandía dentro de la misma tarjeta; con
    //       el rediseño (issue #166) vive en su propio modal — se verifica
    //       el diálogo accesible en vez de solo el texto del formulario.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Invitar Administrador de Conjunto")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByText("Invitar Administrador de Conjunto")).not.toBeInTheDocument();
  });

  it("no muestra el buscador de conjuntos hasta elegir una localidad", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/admin/vista-residentes") || url.includes("/admin/sp-recicladores") || url.includes("/admin/administradores-conjunto")) {
        return Promise.resolve({ data: { items: [], total: 0 } });
      }
      if (url.includes("/geography/localidades")) {
        return Promise.resolve({ data: [{ id_localidad: 1, nombre_localidad: "Usaquén" }] });
      }
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "+ Invitar administrador" }));

    expect(screen.getByText("Selecciona una localidad para poder buscar el conjunto.")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Escribe el nombre del conjunto...")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Localidad" }), "1");

    expect(screen.getByPlaceholderText("Escribe el nombre del conjunto...")).toBeInTheDocument();
    expect(
      screen.queryByText("Selecciona una localidad para poder buscar el conjunto.")
    ).not.toBeInTheDocument();
  });

  // ¿Qué? El usuario reportó que el botón "Enviar invitación" quedaba
  //       habilitado con el correo vacío, aunque ya hubiera localidad y
  //       conjunto elegidos — el profesor insiste en que esto no debe
  //       pasar en ningún formulario de la app.
  it("mantiene deshabilitado el botón de invitar mientras falte el correo", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/admin/vista-residentes") || url.includes("/admin/sp-recicladores") || url.includes("/admin/administradores-conjunto")) {
        return Promise.resolve({ data: { items: [], total: 0 } });
      }
      if (url.includes("/geography/localidades")) {
        return Promise.resolve({ data: [{ id_localidad: 1, nombre_localidad: "Usaquén" }] });
      }
      if (url.includes("/geography/conjuntos/todos")) {
        return Promise.resolve({
          data: [{ id_conjunto_residencial: 1, nombre_conjunto: "TORRES DE ARANJUEZ", nombre_localidad: "Usaquén" }],
        });
      }
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "+ Invitar administrador" }));
    expect(screen.getByRole("button", { name: "Completa el formulario" })).toBeDisabled();

    await user.selectOptions(screen.getByRole("combobox", { name: "Localidad" }), "1");
    await user.type(screen.getByPlaceholderText("Escribe el nombre del conjunto..."), "TORRES");
    await user.click(await screen.findByText("TORRES DE ARANJUEZ — Usaquén"));

    // ¿Qué? Justo después de elegir una opción, HeadlessUI deja el botón
    //       con aria-hidden="true" mientras termina de cerrar el menú del
    //       combobox — eso lo saca por completo del árbol de
    //       accesibilidad (no es un tema de CSS que "hidden: true" de
    //       Testing Library pueda resolver), así que aquí se verifica
    //       contra el DOM directo en vez de por rol accesible.
    const botonInvitar = document.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(botonInvitar.textContent).toContain("Completa el formulario");
    expect(botonInvitar).toBeDisabled();

    await user.type(screen.getByLabelText("Correo del administrador a invitar *"), "nuevo@admin.com");
    expect(botonInvitar.textContent).toContain("Enviar invitación");
    expect(botonInvitar).not.toBeDisabled();
  });

  it("busca conjuntos por nombre y permite elegir/quitar varios en el formulario de invitar", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/admin/vista-residentes") || url.includes("/admin/sp-recicladores") || url.includes("/admin/administradores-conjunto")) {
        return Promise.resolve({ data: { items: [], total: 0 } });
      }
      if (url.includes("/geography/conjuntos/todos")) {
        return Promise.resolve({
          data: [{ id_conjunto_residencial: 1, nombre_conjunto: "TORRES DE ARANJUEZ", nombre_localidad: "Usaquén" }],
        });
      }
      if (url.includes("/geography/localidades")) {
        return Promise.resolve({ data: [{ id_localidad: 1, nombre_localidad: "Usaquén" }] });
      }
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "+ Invitar administrador" }));

    // ¿Qué? El buscador de conjuntos solo aparece después de elegir una
    //       localidad (ver InvitarAdminConjuntoForm) — antes se podía
    //       buscar sin acotar por localidad.
    await user.selectOptions(screen.getByRole("combobox", { name: "Localidad" }), "1");
    await user.type(screen.getByPlaceholderText("Escribe el nombre del conjunto..."), "TORRES");

    const opcion = await screen.findByText("TORRES DE ARANJUEZ — Usaquén");
    await user.click(opcion);

    expect(await screen.findByText("1 conjunto(s) seleccionado(s)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Quitar TORRES DE ARANJUEZ" }));

    expect(screen.queryByText("1 conjunto(s) seleccionado(s)")).not.toBeInTheDocument();
  });

  it("busca un administrador, busca un conjunto sin administrador por nombre y lo asigna", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/admin/vista-residentes") || url.includes("/admin/sp-recicladores") || url.includes("/admin/administradores-conjunto")) {
        return Promise.resolve({ data: { items: [], total: 0 } });
      }
      if (url.includes("/admin-conjunto/listar")) {
        return Promise.resolve({
          data: [
            {
              id_administrador: 7,
              nombre: "Ana",
              apellidos: "Ríos",
              correo_electronico: "ana.rios@example.com",
              conjuntos_actuales: [],
            },
          ],
        });
      }
      if (url.includes("/geography/conjuntos/sin-administrador")) {
        return Promise.resolve({
          data: [{ id_conjunto_residencial: 9, nombre_conjunto: "RESERVA DE PRUEBA", nombre_localidad: "Usaquén" }],
        });
      }
      if (url.includes("/geography/localidades")) {
        return Promise.resolve({ data: [{ id_localidad: 1, nombre_localidad: "Usaquén" }] });
      }
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    // ¿Qué? El formulario ahora vive en su propio modal (issue #166) — hay
    //       que abrirlo antes de poder interactuar con sus campos.
    await user.click(screen.getByRole("button", { name: "+ Asignar conjunto" }));

    await user.type(screen.getByPlaceholderText("Nombre, apellidos o correo"), "Ana");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    const tarjetaAdmin = await screen.findByText("Ana Ríos");
    await user.click(tarjetaAdmin);

    // ¿Qué? El buscador de conjuntos solo aparece después de elegir una
    //       localidad (issue de hoy) — antes se podía buscar sin acotar.
    await user.selectOptions(screen.getByRole("combobox", { name: "Localidad" }), "1");
    await user.type(screen.getByPlaceholderText("Escribe el nombre de tu conjunto..."), "RESERVA");
    const opcionConjunto = await screen.findByText("RESERVA DE PRUEBA — Usaquén");
    await user.click(opcionConjunto);

    await user.click(screen.getByRole("button", { name: "Asignar" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/admin-conjunto/asignar-conjunto-adicional"),
        { id_administrador: 7, id_conjunto_residencial: 9 }
      );
    });
    expect(await screen.findByText("Conjunto asignado correctamente.")).toBeInTheDocument();
  });

  it("el filtro de Conjunto manda conjunto_id al backend, sin ningún filtro de localidad", async () => {
    mockGet.mockImplementation((url: string) => {
      if (
        url.includes("/admin/vista-residentes") ||
        url.includes("/admin/sp-recicladores") ||
        url.includes("/admin/administradores-conjunto")
      ) {
        return Promise.resolve({ data: { items: [], total: 0 } });
      }
      if (url.includes("/geography/conjuntos/todos")) {
        return Promise.resolve({
          data: [{ id_conjunto_residencial: "c-1", nombre_conjunto: "RESERVA DE PRUEBA", nombre_localidad: "Usaquén" }],
        });
      }
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText("Buscar conjunto..."), "RESERVA");
    const opcionConjunto = await screen.findByText("RESERVA DE PRUEBA — Usaquén");
    await user.click(opcionConjunto);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/admin/vista-residentes"),
        expect.objectContaining({ params: expect.objectContaining({ conjunto_id: "c-1" }) })
      );
    });
    const llamadasALaTabla = mockGet.mock.calls.filter(
      ([url, opciones]) => String(url).includes("/admin/vista-residentes") && (opciones as { params?: Record<string, unknown> })?.params?.limit !== 1
    );
    for (const [, opciones] of llamadasALaTabla) {
      expect((opciones as { params: Record<string, unknown> }).params).not.toHaveProperty("localidad_id");
    }
    // ¿Qué? El buscador de conjunto pide conjuntos sin acotar por localidad.
    const llamadaConjuntos = mockGet.mock.calls.find(([url]) => String(url).includes("/geography/conjuntos/todos"));
    expect((llamadaConjuntos?.[1] as { params: Record<string, unknown> }).params).not.toHaveProperty("id_localidad");
  });

  it("el conteo de solicitudes pendientes llega antes de abrir el modal, y 'Ver solicitudes' lo abre", async () => {
    mockGet.mockImplementation((url: string) => {
      if (
        url.includes("/admin/vista-residentes") ||
        url.includes("/admin/sp-recicladores") ||
        url.includes("/admin/administradores-conjunto")
      ) {
        return Promise.resolve({ data: { items: [], total: 0 } });
      }
      if (url.includes("/admin-conjunto/solicitudes-desvinculacion")) {
        return Promise.resolve({
          data: [
            {
              id: "s-1",
              id_conjunto_residencial: "c-1",
              nombre_conjunto: "Conjunto Los Alpes",
              id_administrador: "a-1",
              nombre_administrador: "Pedro",
              apellidos_administrador: "Gómez",
              motivo: null,
              estado: "pendiente",
              created_at: new Date().toISOString(),
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    // ¿Qué? El número de pendientes llega apenas carga (SolicitudesDesvinculacion
    //       avisa por onCountChange) gracias a la instancia oculta (con
    //       "hidden", no deja de renderizarse) — antes de que el usuario
    //       abra el modal, la solicitud ya está en el DOM pero no visible.
    expect(await screen.findByText("1 solicitud pendiente por resolver.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ver solicitudes" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(await screen.findAllByText("Conjunto Los Alpes")).not.toHaveLength(0);
  });
  describe("botón Inactivos, motivo de desactivación y perfil", () => {
    const inactivo = {
      ...residente,
      Correo: "laura@example.com",
      Nombre: "Laura",
      Apellido: "Gómez",
      Habilitado: false,
      Fecha_Desactivacion: "2026-08-18T15:00:00Z",
      Motivo_Desactivacion: "Se mudó de ciudad",
    };

    const perfilResidente = {
      correo_electronico: residente.Correo,
      role_id: RoleId.RESIDENTE,
      rol: "RESIDENTE",
      habilitado: true,
      correo_verificado: true,
      idioma: "es",
      foto_perfil_url: null,
      bloqueado_hasta: null,
      fecha_desactivacion: null,
      motivo_desactivacion: null,
      nombre: "Juan",
      apellidos: "Pérez",
      telefono: "3001112233",
      detalle: { conjunto: "Conjunto Los Alpes", localidad: "Usaquén", torre: "A", apto: "101" },
    };

    // ¿Qué? Un mock que distingue la tabla, los contadores (limit=1) y el
    //       perfil de una persona.
    function mockConInactivos(opts: { items?: unknown[]; perfil?: unknown } = {}) {
      mockGet.mockImplementation((url: string, config?: { params?: Record<string, unknown> }) => {
        if (url.includes("/admin/usuarios/")) return Promise.resolve({ data: opts.perfil ?? perfilResidente });
        if (url.includes("/admin/vista-residentes")) {
          const soloInactivos = config?.params?.habilitado === false || config?.params?.habilitado === "false";
          const items = soloInactivos ? [inactivo] : (opts.items ?? [residente, inactivo]);
          return Promise.resolve({ data: { items, total: items.length } });
        }
        if (url.includes("/admin/sp-recicladores") || url.includes("/admin/administradores-conjunto")) {
          return Promise.resolve({ data: { items: [], total: 0 } });
        }
        return Promise.resolve({ data: [] });
      });
    }

    it("ya no muestra el filtro de localidad", async () => {
      mockConInactivos();
      renderPage();
      await waitFor(() => expect(screen.getByText("Juan Pérez")).toBeInTheDocument());
      expect(screen.queryByText("Todas las localidades")).not.toBeInTheDocument();
    });

    it("muestra las tarjetas de resumen ANTES de la tabla de usuarios", async () => {
      mockConInactivos();
      renderPage();
      await waitFor(() => expect(screen.getByText("Juan Pérez")).toBeInTheDocument());
      const tarjeta = screen.getByRole("heading", { name: "Solicitudes pendientes" });
      const tabla = screen.getByRole("heading", { name: "Usuarios registrados" });
      expect(tarjeta.compareDocumentPosition(tabla) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("una cuenta inactiva muestra la fecha y el motivo en la tabla", async () => {
      mockConInactivos({ items: [inactivo] });
      renderPage();
      expect(await screen.findByText(/Se mudó de ciudad/)).toBeInTheDocument();
    });

    it("con Inactivos encendido y sin cuentas inactivas, la tabla lo dice en vez de 'no hay residentes'", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/admin/vista-residentes") || url.includes("/admin/sp-recicladores") || url.includes("/admin/administradores-conjunto")) {
          return Promise.resolve({ data: { items: [], total: 0 } });
        }
        return Promise.resolve({ data: [] });
      });
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole("button", { name: /Inactivos 0/ }));
      expect(await screen.findByText("No hay cuentas inactivas en esta pestaña.")).toBeInTheDocument();
      expect(screen.queryByText(/No hay residentes registrados/)).not.toBeInTheDocument();
    });

    it("una cuenta inactiva sin motivo dice 'Sin motivo registrado'", async () => {
      mockConInactivos({ items: [{ ...inactivo, Motivo_Desactivacion: null }] });
      renderPage();
      expect(await screen.findByText(/Sin motivo registrado/)).toBeInTheDocument();
    });

    it("el botón Inactivos muestra el conteo, filtra con habilitado=false y al apagarlo vuelve a mostrar todo", async () => {
      mockGet.mockImplementation((url: string, config?: { params?: Record<string, unknown> }) => {
        if (url.includes("/admin/vista-residentes")) {
          const soloInactivos = config?.params?.habilitado === false || config?.params?.habilitado === "false";
          const items = soloInactivos ? [inactivo] : [residente, inactivo];
          return Promise.resolve({ data: { items, total: items.length } });
        }
        if (url.includes("/admin/sp-recicladores") || url.includes("/admin/administradores-conjunto")) {
          return Promise.resolve({ data: { items: [], total: 0 } });
        }
        return Promise.resolve({ data: [] });
      });
      const user = userEvent.setup();
      renderPage();

      const boton = await screen.findByRole("button", { name: /Inactivos 1/ });
      expect(boton).toHaveAttribute("aria-pressed", "false");

      await user.click(boton);
      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining("/admin/vista-residentes"),
          expect.objectContaining({ params: expect.objectContaining({ habilitado: "false" }) })
        );
      });
      expect(boton).toHaveAttribute("aria-pressed", "true");
      await waitFor(() => expect(screen.queryByText("Juan Pérez")).not.toBeInTheDocument());
      expect(screen.getByText("Laura Gómez")).toBeInTheDocument();

      mockGet.mockClear();
      await user.click(boton);
      await waitFor(() => {
        const llamadaTabla = mockGet.mock.calls.find(
          ([url, opciones]) => String(url).includes("/admin/vista-residentes") && (opciones as { params: Record<string, unknown> }).params.limit !== 1
        );
        expect(llamadaTabla).toBeDefined();
        expect((llamadaTabla?.[1] as { params: Record<string, unknown> }).params).not.toHaveProperty("habilitado");
      });
      expect(boton).toHaveAttribute("aria-pressed", "false");
      expect(await screen.findByText("Juan Pérez")).toBeInTheDocument();
    });

    it("con Inactivos encendido, cada pestaña muestra su número de cuentas inactivas", async () => {
      mockGet.mockImplementation((url: string, config?: { params?: Record<string, unknown> }) => {
        const inactivosPedidos = config?.params?.habilitado === false || config?.params?.habilitado === "false";
        if (url.includes("/admin/vista-residentes")) {
          return Promise.resolve({ data: { items: inactivosPedidos ? [inactivo] : [residente], total: inactivosPedidos ? 3 : 5 } });
        }
        if (url.includes("/admin/sp-recicladores")) {
          return Promise.resolve({ data: { items: [], total: inactivosPedidos ? 2 : 4 } });
        }
        if (url.includes("/admin/administradores-conjunto")) {
          return Promise.resolve({ data: { items: [], total: 0 } });
        }
        return Promise.resolve({ data: [] });
      });
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: /Inactivos 3/ }));
      const pestanaRecicladores = screen.getByRole("button", { name: /^Recicladores/ });
      await waitFor(() => expect(pestanaRecicladores).toHaveTextContent("2"));
    });

    it("pide un motivo opcional al desactivar y lo manda al backend", async () => {
      mockConInactivos({ items: [residente] });
      mockPatch.mockResolvedValue({ data: {} });
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => expect(screen.getByText("Juan Pérez")).toBeInTheDocument());

      await user.click(screen.getByRole("button", { name: /^Desactivar$/ }));
      await user.type(screen.getByLabelText(/Motivo/), "Se mudó de conjunto");
      await user.click(screen.getByRole("button", { name: "Sí, continuar" }));

      await waitFor(() => {
        expect(mockPatch).toHaveBeenCalledWith(
          expect.stringContaining(`/admin/usuarios/${encodeURIComponent(residente.Correo)}/habilitado`),
          { habilitado: false, motivo: "Se mudó de conjunto" }
        );
      });
    });

    it("no pide motivo al reactivar una cuenta", async () => {
      mockConInactivos({ items: [inactivo] });
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => expect(screen.getByText("Laura Gómez")).toBeInTheDocument());

      await user.click(screen.getByRole("button", { name: /^Activar$/ }));
      expect(screen.getByText("¿Activar esta cuenta?")).toBeInTheDocument();
      expect(screen.queryByLabelText(/Motivo/)).not.toBeInTheDocument();
    });

    it("un clic en el nombre abre el perfil de solo lectura con los datos de esa persona", async () => {
      mockConInactivos({ items: [residente] });
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => expect(screen.getByText("Juan Pérez")).toBeInTheDocument());

      await user.click(screen.getByRole("button", { name: "Ver perfil de Juan Pérez" }));

      const panel = await screen.findByRole("dialog", { name: "Perfil de Juan Pérez" });
      expect(panel).toBeInTheDocument();
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining(`/admin/usuarios/${encodeURIComponent(residente.Correo)}`));
      expect(await screen.findByText("Solo lectura")).toBeInTheDocument();
      expect(await within(panel).findByText("Conjunto Los Alpes")).toBeInTheDocument();
      expect(within(panel).getByText("A · 101")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Editar datos/ })).toBeDisabled();
    });

    it("un clic en cualquier parte de la fila también abre el perfil, pero no el botón Desactivar", async () => {
      mockConInactivos({ items: [residente] });
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => expect(screen.getByText("Juan Pérez")).toBeInTheDocument());

      await user.click(screen.getByText(residente.Conjunto));
      expect(await screen.findByRole("dialog", { name: "Perfil de Juan Pérez" })).toBeInTheDocument();
    });

    it("Desactivar en la fila abre la confirmación, no el perfil", async () => {
      mockConInactivos({ items: [residente] });
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => expect(screen.getByText("Juan Pérez")).toBeInTheDocument());

      await user.click(screen.getByRole("button", { name: /^Desactivar$/ }));
      expect(screen.getByText("¿Desactivar esta cuenta?")).toBeInTheDocument();
      expect(screen.queryByRole("dialog", { name: /Perfil de/ })).not.toBeInTheDocument();
    });

    it("Esc cierra el perfil", async () => {
      mockConInactivos({ items: [residente] });
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => expect(screen.getByText("Juan Pérez")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Ver perfil de Juan Pérez" }));
      await screen.findByRole("dialog", { name: "Perfil de Juan Pérez" });

      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog", { name: /Perfil de/ })).not.toBeInTheDocument());
    });

    it("desde el perfil se puede desactivar, y Esc cierra solo la confirmación, no el perfil", async () => {
      mockConInactivos({ items: [residente] });
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => expect(screen.getByText("Juan Pérez")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Ver perfil de Juan Pérez" }));
      await screen.findByRole("dialog", { name: "Perfil de Juan Pérez" });

      await user.click(await screen.findByRole("button", { name: "Desactivar cuenta" }));
      expect(screen.getByText("¿Desactivar esta cuenta?")).toBeInTheDocument();

      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByText("¿Desactivar esta cuenta?")).not.toBeInTheDocument());
      expect(screen.getByRole("dialog", { name: "Perfil de Juan Pérez" })).toBeInTheDocument();
    });

    it("el perfil de una cuenta desactivada muestra la fecha y el motivo", async () => {
      mockConInactivos({
        items: [inactivo],
        perfil: {
          ...perfilResidente,
          correo_electronico: "laura@example.com",
          nombre: "Laura",
          apellidos: "Gómez",
          habilitado: false,
          fecha_desactivacion: "2026-08-18T15:00:00Z",
          motivo_desactivacion: "Cuenta duplicada",
        },
      });
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => expect(screen.getByText("Laura Gómez")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Ver perfil de Laura Gómez" }));

      expect(await screen.findByText("Cuenta desactivada")).toBeInTheDocument();
      expect(screen.getByText("“Cuenta duplicada”")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Reactivar cuenta" })).toBeInTheDocument();
    });

    it("muestra un aviso si no se puede cargar el perfil", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/admin/usuarios/")) return Promise.reject(new Error("Network Error"));
        if (url.includes("/admin/vista-residentes")) return Promise.resolve({ data: { items: [residente], total: 1 } });
        if (url.includes("/admin/sp-recicladores") || url.includes("/admin/administradores-conjunto")) {
          return Promise.resolve({ data: { items: [], total: 0 } });
        }
        return Promise.resolve({ data: [] });
      });
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => expect(screen.getByText("Juan Pérez")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Ver perfil de Juan Pérez" }));

      expect(await screen.findByText("No se pudo cargar la información. Intenta de nuevo más tarde.")).toBeInTheDocument();
    });
  });
});
