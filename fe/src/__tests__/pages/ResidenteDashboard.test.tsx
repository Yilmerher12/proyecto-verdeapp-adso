/**
 * Archivo: __tests__/pages/ResidenteDashboard.test.tsx
 * Descripción: Tests del panel del Residente (issue #23) — carga de estado del
 *              SHUT y notificaciones, y el reporte de "SHUT lleno".
 */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { ResidenteDashboard } from "@/pages/dashboards/ResidenteDashboard";
import { renderWithProviders, mockUser } from "../helpers";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock("axios", () => {
  const instance = {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    patch: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    defaults: {},
  };
  return { default: { ...instance, create: () => instance } };
});

// ¿Qué? Respuesta de relleno para las peticiones que cada prueba no mira.
// ¿Para qué? Desde el issue #488 el panel también pide el desempeño semanal, que es un
//           objeto (no una lista): contestarle [] como a las demás lo rompería.
const DESEMPENO_VACIO = {
  id_conjunto_residencial: "c1",
  total: 0,
  semanas: [{ lunes: "2026-10-19", bueno: 0, regular: 0, malo: 0 }],
  temas: [],
};

function respuestaPorDefecto(url: string) {
  if (url.endsWith("/auditorias-conjunto/desempeno")) return { data: DESEMPENO_VACIO };
  // ¿Qué? El historial de auditorías llega paginado ({items, total}), no como arreglo.
  if (url.endsWith("/auditorias-conjunto/historial")) return { data: { items: [], total: 0 } };
  return { data: [] };
}

function renderPage() {
  return renderWithProviders(<ResidenteDashboard />, {
    authContext: { user: mockUser, isAuthenticated: true },
  });
}

describe("ResidenteDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
      if (url.includes("estado-shut")) {
        return Promise.resolve({ data: { lleno: false, created_at: null } });
      }
      return Promise.resolve(respuestaPorDefecto(url));
    });
    mockPost.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: {} });
  });

  it("muestra el título del panel y el nombre del residente", async () => {
    renderPage();
    expect(screen.getByText("Panel del Residente")).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  // ¿Qué? Issue #514: orden de los bloques — primero lo que pasó (avisos), luego lo que el
  //       Residente puede hacer, luego la actividad, y al final lo de consulta.
  // ¿Impacto? Si alguien reordena el panel sin querer, esta prueba falla.
  it("muestra los bloques en orden: avisos, reportar, actividad reciente y mi conjunto", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("estado-shut")) {
        return Promise.resolve({ data: { lleno: true, created_at: "2026-08-24T10:00:00Z" } });
      }
      if (url.includes("mis-notificaciones")) {
        return Promise.resolve({
          data: [
            {
              id: 5,
              tipo: "AUDITORIA_PUBLICADA",
              mensaje: "El reciclador auditó la separación de residuos de tu conjunto.",
              id_referencia: 42,
              nombre_conjunto: "Conjunto Los Alpes",
              leida: false,
              created_at: "2026-08-27T10:00:00Z",
            },
          ],
        });
      }
      return Promise.resolve(respuestaPorDefecto(url));
    });
    renderPage();

    const titulos = [
      await screen.findByText("El SHUT está lleno"),
      await screen.findByText("Nueva auditoría de tu conjunto"),
      screen.getByRole("heading", { name: "Reportar SHUT lleno" }),
      screen.getByRole("heading", { name: "Actividad reciente" }),
      screen.getByRole("heading", { name: "Mi conjunto" }),
      screen.getByRole("heading", { name: "Historial de auditorías" }),
    ];
    for (let i = 0; i < titulos.length - 1; i++) {
      expect(titulos[i].compareDocumentPosition(titulos[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("el aviso de error de carga va después del aviso de auditoría y antes de reportar", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("estado-shut")) return Promise.reject(new Error("Network Error"));
      if (url.includes("mis-notificaciones")) {
        return Promise.resolve({
          data: [
            {
              id: 5,
              tipo: "AUDITORIA_PUBLICADA",
              mensaje: "El reciclador auditó la separación de residuos de tu conjunto.",
              id_referencia: 42,
              nombre_conjunto: "Conjunto Los Alpes",
              leida: false,
              created_at: "2026-08-27T10:00:00Z",
            },
          ],
        });
      }
      return Promise.resolve(respuestaPorDefecto(url));
    });
    renderPage();

    const auditoria = await screen.findByText("Nueva auditoría de tu conjunto");
    const error = screen.getByText("No se pudo cargar la información. Intenta de nuevo más tarde.");
    const reportar = screen.getByRole("heading", { name: "Reportar SHUT lleno" });
    expect(auditoria.compareDocumentPosition(error) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(error.compareDocumentPosition(reportar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("muestra un aviso de error si falla la carga (issue #223, f9 del diagnóstico)", async () => {
    mockGet.mockRejectedValue(new Error("Network Error"));
    renderPage();
    expect(await screen.findByText("No se pudo cargar la información. Intenta de nuevo más tarde.")).toBeInTheDocument();
  });

  it("si falla el estado del SHUT, igual pinta las notificaciones y avisa del error (issue #406)", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("estado-shut")) return Promise.reject(new Error("Network Error"));
      if (url.includes("mis-notificaciones")) {
        return Promise.resolve({
          data: [
            {
              id: 5,
              tipo: "AUDITORIA_PUBLICADA",
              mensaje: "El reciclador auditó la separación de residuos de tu conjunto.",
              id_referencia: 42,
              nombre_conjunto: "Conjunto Los Alpes",
              leida: false,
              created_at: "2026-08-27T10:00:00Z",
            },
          ],
        });
      }
      return Promise.resolve(respuestaPorDefecto(url));
    });
    renderPage();

    expect(await screen.findByText("Nueva auditoría de tu conjunto")).toBeInTheDocument();
    expect(screen.getByText("No se pudo cargar la información. Intenta de nuevo más tarde.")).toBeInTheDocument();
  });

  it("carga el estado del SHUT y las notificaciones al montar", async () => {
    renderPage();
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/notificaciones/estado-shut"));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/notificaciones/mis-notificaciones"));
    });
  });

  it("muestra el feed vacío cuando no hay notificaciones", async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText("No tienes notificaciones aún. Aparecerán aquí cuando el reciclador envíe avisos.")
      ).toBeInTheDocument();
    });
  });

  it("muestra el banner de SHUT lleno cuando el estado lo indica", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("estado-shut")) {
        return Promise.resolve({ data: { lleno: true, created_at: "2026-08-24T10:00:00Z" } });
      }
      return Promise.resolve(respuestaPorDefecto(url));
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("El SHUT está lleno")).toBeInTheDocument();
    });
  });

  it("reporta SHUT lleno al hacer clic en el botón y muestra confirmación", async () => {
    const user = userEvent.setup();
    renderPage();

    const boton = await screen.findByRole("button", { name: "Reportar" });
    await user.click(boton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/notificaciones/enviar"),
        { tipo: "SHUT_LLENO" }
      );
    });
    expect(await screen.findByText("Enviado")).toBeInTheDocument();
  });

  // ¿Qué? Issue #414: el motivo exacto del rechazo llega a la pantalla.
  it("si el backend rechaza el reporte de SHUT lleno, muestra su motivo exacto", async () => {
    mockPost.mockRejectedValue({
      response: { status: 400, data: { detail: "El SHUT de tu conjunto ya está reportado como lleno." } },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Reportar" }));

    expect(await screen.findByText("El SHUT de tu conjunto ya está reportado como lleno.")).toBeInTheDocument();
  });

  it("muestra el aviso de auditoría publicada, aparte del feed normal, y su detalle al hacer clic en Ver", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("estado-shut")) return Promise.resolve({ data: { lleno: false, created_at: null } });
      if (url.includes("mis-notificaciones")) {
        return Promise.resolve({
          data: [
            {
              id: 5,
              tipo: "AUDITORIA_PUBLICADA",
              mensaje: "El reciclador auditó la separación de residuos de tu conjunto.",
              id_referencia: 42,
              nombre_conjunto: "Conjunto Los Alpes",
              leida: false,
              created_at: "2026-08-27T10:00:00Z",
            },
          ],
        });
      }
      if (url.includes("/auditorias-conjunto/42")) {
        return Promise.resolve({
          data: {
            id_auditoria: 42,
            id_conjunto_residencial: 1,
            nombre_conjunto: "Conjunto Los Alpes",
            nivel_desempeno: "DEFICIENTE",
            tema_educativo: "Separación en la fuente y código de colores",
            descripcion: "El material llegó mezclado.",
            ruta_evidencia: "/uploads/evidencias-auditoria/foto.jpg",
            created_at: "2026-08-27T10:00:00Z",
            nombre_reciclador: "Carlos Gómez",
          },
        });
      }
      return Promise.resolve(respuestaPorDefecto(url));
    });
    const user = userEvent.setup();
    renderPage();

    // ¿Qué? El aviso debe verse aparte, no como una fila más del feed normal.
    await screen.findByText("Nueva auditoría de tu conjunto");
    expect(
      screen.queryByText("El reciclador auditó la separación de residuos de tu conjunto.", { selector: "li p" })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ver" }));

    expect(await screen.findByText("Resultado de la auditoría")).toBeInTheDocument();
    expect(screen.getByText("Malo")).toBeInTheDocument();
    expect(screen.getByText("El material llegó mezclado.")).toBeInTheDocument();
    expect(screen.getByText("Carlos Gómez")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cerrar" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(expect.stringContaining("/notificaciones/5/leer"), {});
    });
  });

  it("muestra el historial de auditorías y abre el detalle al hacer clic en una fila", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("estado-shut")) return Promise.resolve({ data: { lleno: false, created_at: null } });
      if (url.includes("/auditorias-conjunto/historial")) {
        return Promise.resolve({
          data: {
            items: [
              {
                id_auditoria: 7,
                id_conjunto_residencial: 1,
                nombre_conjunto: "Conjunto Los Alpes",
                nivel_desempeno: "BUENA",
                tema_educativo: "Economía circular y aprovechamiento",
                descripcion: null,
                ruta_evidencia: "/uploads/evidencias-auditoria/foto7.jpg",
                created_at: "2026-08-20T10:00:00Z",
                nombre_reciclador: "Carlos Gómez",
              },
            ],
            total: 1,
          },
        });
      }
      if (url.includes("/auditorias-conjunto/7")) {
        return Promise.resolve({
          data: {
            id_auditoria: 7,
            id_conjunto_residencial: 1,
            nombre_conjunto: "Conjunto Los Alpes",
            nivel_desempeno: "BUENA",
            tema_educativo: "Economía circular y aprovechamiento",
            descripcion: null,
            ruta_evidencia: "/uploads/evidencias-auditoria/foto7.jpg",
            created_at: "2026-08-20T10:00:00Z",
            nombre_reciclador: "Carlos Gómez",
          },
        });
      }
      return Promise.resolve(respuestaPorDefecto(url));
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Historial de auditorías");
    await user.click(screen.getByText("Economía circular y aprovechamiento"));

    expect(await screen.findByText("Resultado de la auditoría")).toBeInTheDocument();
    expect(screen.getAllByText("Bueno").length).toBeGreaterThan(0);
  });

  // ¿Qué? HU-053 (issue #488): el Residente ve el mismo panel de desempeño que el Admin de
  //       Conjunto (PanelDesempeno, ya probado a fondo en PanelDesempeno.test.tsx), sin selector.
  describe("desempeño semanal de mi conjunto", () => {
    const semana = (lunes: string, bueno = 0, regular = 0, malo = 0) => ({ lunes, bueno, regular, malo });
    const DESEMPENO = {
      id_conjunto_residencial: "c1",
      total: 6,
      semanas: [
        semana("2026-09-28"),
        semana("2026-10-05", 1),
        semana("2026-10-12", 1, 1),
        semana("2026-10-19", 2, 0, 1),
      ],
      temas: [{ tema: "Cantidad de basura generada", bueno: 2, regular: 2, malo: 2 }],
    };

    function responderDesempeno(datos: unknown) {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("estado-shut")) return Promise.resolve({ data: { lleno: false, created_at: null } });
        if (url.endsWith("/auditorias-conjunto/desempeno")) return Promise.resolve({ data: datos });
        return Promise.resolve(respuestaPorDefecto(url));
      });
    }

    it("muestra la sección con la gráfica de su conjunto, sin selector de conjunto", async () => {
      responderDesempeno(DESEMPENO);
      renderPage();

      expect(screen.getByRole("heading", { name: "Mi conjunto" })).toBeInTheDocument();
      // ¿Qué? Plazo de 5 s: es la primera prueba de este archivo que descarga la gráfica (carga bajo demanda)
      //       y con la cobertura activa la importación de recharts tarda más que el 1 s por defecto.
      expect(
        await screen.findByRole("button", { name: /^Semana en curso, del .*: Bueno 2, Regular 0, Malo 1$/ }, { timeout: 5000 }),
      ).toBeInTheDocument();
      expect(screen.getByRole("region", { name: "Temas del período" })).toBeInTheDocument();
      // ¿Qué? Dos botones: uno para la gráfica y otro para el ranking de temas.
      expect(screen.getAllByRole("button", { name: "Ver como tabla" })).toHaveLength(2);
      expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Período")).not.toBeInTheDocument();
    });

    it("pide el desempeño sin id_conjunto y con 8 semanas: el backend resuelve su único conjunto", async () => {
      responderDesempeno(DESEMPENO);
      renderPage();

      await screen.findByRole("button", { name: /^Semana en curso/ });
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/auditorias-conjunto/desempeno"),
        { params: { id_conjunto: undefined, semanas: 8 } },
      );
    });

    it("con menos de 4 auditorías avisa que faltan datos y la lista de auditorías sigue visible", async () => {
      responderDesempeno({ ...DESEMPENO, total: 2, semanas: [semana("2026-10-12", 1), semana("2026-10-19", 1)] });
      renderPage();

      expect(await screen.findByText(/Todavía no hay suficientes auditorías para mostrar la gráfica/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Semana/ })).not.toBeInTheDocument();
      expect(screen.getByText("Historial de auditorías")).toBeInTheDocument();
    });

    it("si falla el desempeño lo avisa en su sección y el resto del panel sigue funcionando", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("estado-shut")) return Promise.resolve({ data: { lleno: false, created_at: null } });
        if (url.endsWith("/auditorias-conjunto/desempeno")) return Promise.reject(new Error("falló"));
        return Promise.resolve(respuestaPorDefecto(url));
      });
      renderPage();

      expect(await screen.findByText("No se pudo cargar el desempeño.")).toBeInTheDocument();
      expect(screen.getByText("Historial de auditorías")).toBeInTheDocument();
      expect(screen.getByText("Panel del Residente")).toBeInTheDocument();
    });
  });
});
