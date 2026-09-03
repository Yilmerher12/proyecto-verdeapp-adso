/**
 * Archivo: __tests__/pages/AdminDashboard.test.tsx
 * Descripción: Tests del panel del Administrador del Sistema — pestañas de
 *              usuarios (Residentes / Recicladores / Admins de Conjunto)
 *              con búsqueda, filtro de localidad y paginación, más la
 *              sección de invitar administradores de conjunto.
 */

import { screen, waitFor } from "@testing-library/react";
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
    authContext: { user: adminUser, isAuthenticated: true, accessToken: "token" },
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

  it("consulta la pestaña de Residentes al montar, con el token de sesión", async () => {
    renderPage();
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/admin/vista-residentes"),
        expect.objectContaining({ headers: { Authorization: "Bearer token" } })
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
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/admin/vista-residentes")) {
        return Promise.resolve({ data: { items: [residente], total: 1 } });
      }
      if (url.includes("/admin/sp-recicladores") || url.includes("/admin/administradores-conjunto")) {
        return Promise.resolve({ data: { items: [], total: 0 } });
      }
      return Promise.resolve({ data: [] });
    });
    mockPatch.mockResolvedValue({ data: { correo_electronico: residente.Correo, habilitado: false } });
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText("Juan Pérez")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Desactivar/i }));
    expect(screen.getByText("¿Desactivar esta cuenta?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sí, continuar" }));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(
        expect.stringContaining(`/admin/usuarios/${encodeURIComponent(residente.Correo)}/habilitado`),
        { habilitado: false },
        expect.objectContaining({ headers: { Authorization: "Bearer token" } })
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

    await user.type(screen.getByPlaceholderText("Escribe el nombre de tu conjunto..."), "RESERVA");
    const opcionConjunto = await screen.findByText("RESERVA DE PRUEBA — Usaquén");
    await user.click(opcionConjunto);

    await user.click(screen.getByRole("button", { name: "Asignar" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/admin-conjunto/asignar-conjunto-adicional"),
        { id_administrador: 7, id_conjunto_residencial: 9 },
        expect.anything(),
      );
    });
    expect(await screen.findByText("Conjunto asignado correctamente.")).toBeInTheDocument();
  });
});
