/**
 * Archivo: __tests__/pages/RecicladorDashboard.test.tsx
 * Descripción: Tests del panel del Reciclador (issue #23) — invitaciones
 *              pendientes, conjuntos autorizados y envío de notificaciones.
 */

import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { RecicladorDashboard } from "@/pages/dashboards/RecicladorDashboard";
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

const conjuntoAutorizado = {
  id_conjunto_residencial: 1,
  nombre_conjunto: "Conjunto Los Alpes",
  direccion: "Cra 10 # 20-30",
  nombre_localidad: "Suba",
};

// ¿Qué? Respuesta de relleno para las peticiones que cada prueba no mira.
// ¿Para qué? El historial de auditorías llega paginado ({items, total}); las demás listas, como arreglo vacío.
//           "/mias/ultimas" (una fecha por conjunto) también es un arreglo vacío.
function respuestaPorDefecto(url: string) {
  return { data: url.endsWith("/auditorias-conjunto/mias") ? { items: [], total: 0 } : [] };
}

function mockRespuestasVacias() {
  mockGet.mockImplementation((url: string) => {
    if (url.includes("mis-invitaciones")) return Promise.resolve({ data: [] });
    if (url.includes("mis-conjuntos-autorizados")) return Promise.resolve({ data: [] });
    return Promise.resolve(respuestaPorDefecto(url));
  });
}

function renderPage() {
  return renderWithProviders(<RecicladorDashboard />, {
    authContext: { user: mockUser, isAuthenticated: true },
  });
}

describe("RecicladorDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRespuestasVacias();
    mockPost.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: {} });
  });

  it("muestra el título del panel y el nombre del reciclador", () => {
    renderPage();
    expect(screen.getByText("Panel del Reciclador")).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("muestra un aviso de error si falla la carga (issue #223, f9 del diagnóstico)", async () => {
    mockGet.mockRejectedValue(new Error("Network Error"));
    renderPage();
    expect(await screen.findByText("No se pudo cargar la información. Intenta de nuevo más tarde.")).toBeInTheDocument();
  });

  it("si falla una de las 5 cargas, pinta las otras y avisa del error (issue #406)", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("mis-notificaciones")) return Promise.reject(new Error("Network Error"));
      if (url.includes("mis-invitaciones")) {
        return Promise.resolve({
          data: [
            {
              id: "inv-1",
              nombre_conjunto: "Conjunto Los Alpes",
              direccion_conjunto: "Cra 10 # 20-30",
              invitado_por_nombre: "Ana Admin",
              estado: "PENDIENTE",
              expires_at: "2026-09-01T00:00:00Z",
            },
          ],
        });
      }
      return Promise.resolve(respuestaPorDefecto(url));
    });
    renderPage();

    expect(await screen.findByText("Conjunto Los Alpes")).toBeInTheDocument();
    expect(screen.getByText("No se pudo cargar la información. Intenta de nuevo más tarde.")).toBeInTheDocument();
  });

  it("carga invitaciones, conjuntos y notificaciones al montar", async () => {
    renderPage();
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/reciclador-conjunto/mis-invitaciones"));
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/reciclador-conjunto/mis-conjuntos-autorizados")
      );
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/notificaciones/mis-notificaciones"));
    });
  });

  it("no muestra botones de notificación cuando no hay conjuntos autorizados", async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText("Todavía no tienes ningún conjunto autorizado. Cuando un administrador te invite y aceptes, aparecerá aquí.")
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Llegué al conjunto" })).not.toBeInTheDocument();
  });

  it("permite responder una invitación pendiente", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("mis-invitaciones")) {
        return Promise.resolve({
          data: [
            {
              id: "inv-1",
              nombre_conjunto: "Conjunto Los Alpes",
              direccion_conjunto: "Cra 10 # 20-30",
              invitado_por_nombre: "Ana Admin",
              estado: "PENDIENTE",
              expires_at: "2026-09-01T00:00:00Z",
            },
          ],
        });
      }
      if (url.includes("mis-conjuntos-autorizados")) return Promise.resolve({ data: [] });
      return Promise.resolve(respuestaPorDefecto(url));
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Conjunto Los Alpes");
    await user.click(screen.getByRole("button", { name: "Aceptar" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/reciclador-conjunto/invitaciones/inv-1/responder"),
        { aceptar: true }
      );
    });
  });

  it("abre el modal y envía una notificación cuando hay un conjunto autorizado", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("mis-invitaciones")) return Promise.resolve({ data: [] });
      if (url.includes("mis-conjuntos-autorizados")) return Promise.resolve({ data: [conjuntoAutorizado] });
      return Promise.resolve(respuestaPorDefecto(url));
    });
    const user = userEvent.setup();
    renderPage();

    const boton = await screen.findByRole("button", { name: "Llegué al conjunto" });
    await user.click(boton);

    expect(screen.getByText("¿A qué conjunto notificas?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Enviar aviso" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/notificaciones/enviar"),
        { tipo: "LLEGADA_RECICLADOR", id_conjunto_residencial: 1 }
      );
    });
  });

  // ¿Qué? Issue #414: el motivo exacto del rechazo sale DENTRO del modal.
  async function abrirModalLlegada() {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("mis-conjuntos-autorizados")) return Promise.resolve({ data: [conjuntoAutorizado] });
      return Promise.resolve(respuestaPorDefecto(url));
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Llegué al conjunto" }));
    await user.click(screen.getByRole("button", { name: "Enviar aviso" }));
  }

  it("si el backend rechaza el aviso, muestra su motivo exacto dentro del modal", async () => {
    mockPost.mockRejectedValue({
      response: { status: 400, data: { detail: "Ya enviaste este aviso a este conjunto hace menos de 5 minutos." } },
    });
    await abrirModalLlegada();

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Ya enviaste este aviso a este conjunto hace menos de 5 minutos.");
    expect(screen.getByText("¿A qué conjunto notificas?")).toBeInTheDocument();
  });

  it("si el rechazo no trae motivo, muestra el aviso genérico dentro del modal", async () => {
    mockPost.mockRejectedValue(new Error("Network Error"));
    await abrirModalLlegada();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo completar la acción. Inténtalo de nuevo.");
  });

  it("muestra el aviso de auditoría pendiente y envía la auditoría con evidencia", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("mis-invitaciones")) return Promise.resolve({ data: [] });
      if (url.includes("mis-conjuntos-autorizados")) return Promise.resolve({ data: [conjuntoAutorizado] });
      if (url.includes("/contenido-educativo")) {
        return Promise.resolve({
          data: [{ id_contenido: 1, modulo_categoria: "Separación en la fuente y código de colores" }],
        });
      }
      return Promise.resolve(respuestaPorDefecto(url));
    });
    mockPost.mockResolvedValue({ data: { id_auditoria: 1 } });
    const user = userEvent.setup();
    renderPage();

    // ¿Qué? Nunca se ha auditado este conjunto, así que el aviso debe verse.
    await screen.findByText("Ya puedes calificar la separación de residuos de Conjunto Los Alpes.");
    await user.click(screen.getByRole("button", { name: "Auditar ahora" }));

    expect(screen.getByText("Auditar conjunto")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Bueno" }));

    const selectTema = await screen.findByRole("combobox");
    await user.selectOptions(selectTema, "Separación en la fuente y código de colores");

    const archivo = new File(["contenido"], "evidencia.jpg", { type: "image/jpeg" });
    const inputArchivo = screen.getByLabelText(/JPG, PNG o WEBP/);
    await user.upload(inputArchivo, archivo);

    await user.click(screen.getByRole("button", { name: "Enviar auditoría" }));

    // ¿Qué? Issue #9 — enviar ya no dispara la petición directo, primero
    //       pide confirmar (ConfirmModal apilado sobre el formulario).
    expect(screen.getByText("¿Enviar esta auditoría?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sí, enviar" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/auditorias-conjunto"),
        expect.any(FormData),
        expect.anything()
      );
    });
    const formData = mockPost.mock.calls.find(([url]) => url.includes("/auditorias-conjunto"))?.[1] as FormData;
    expect(formData.get("id_conjunto_residencial")).toBe("1");
    expect(formData.get("nivel_desempeno")).toBe("BUENA");
    expect(formData.get("tema_educativo")).toBe("Separación en la fuente y código de colores");
    expect(formData.get("evidencias")).toBeInstanceOf(File);
  });

  // ¿Qué? En Chrome, `input.files` es una lista "viva": al hacer `input.value = ""` queda vacía.
  //       El formulario leía esa lista DESPUÉS de vaciar el campo (React ejecuta la función
  //       de `setEvidencias` más tarde), así que nunca agregaba la foto y el botón se quedaba
  //       en "Completa el formulario".
  // ¿Para qué? Es un error real que se encontró en #459: en jsdom no se nota porque ahí la lista
  //           no es viva. Esta prueba imita el comportamiento de Chrome.
  // ¿Impacto? Si alguien vuelve a leer la lista después de vaciar el campo, esta prueba falla.
  it("adjunta la foto aunque el navegador vacíe la lista de archivos al limpiar el campo (Chrome)", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("mis-invitaciones")) return Promise.resolve({ data: [] });
      if (url.includes("mis-conjuntos-autorizados")) return Promise.resolve({ data: [conjuntoAutorizado] });
      if (url.includes("/contenido-educativo")) {
        return Promise.resolve({
          data: [{ id_contenido: 1, modulo_categoria: "Separación en la fuente y código de colores" }],
        });
      }
      return Promise.resolve(respuestaPorDefecto(url));
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Ya puedes calificar la separación de residuos de Conjunto Los Alpes.");
    await user.click(screen.getByRole("button", { name: "Auditar ahora" }));
    await user.click(screen.getByRole("radio", { name: "Bueno" }));
    await user.selectOptions(await screen.findByRole("combobox"), "Separación en la fuente y código de colores");

    const archivo = new File(["contenido"], "evidencia.jpg", { type: "image/jpeg" });
    const input = screen.getByLabelText(/JPG, PNG o WEBP/) as HTMLInputElement;
    const listaViva: File[] = [archivo];
    Object.defineProperty(input, "files", { get: () => listaViva, configurable: true });
    Object.defineProperty(input, "value", {
      get: () => "",
      set: () => {
        listaViva.length = 0; // lo que hace Chrome al vaciar el campo
      },
      configurable: true,
    });
    fireEvent.change(input);

    expect(await screen.findByAltText("evidencia.jpg")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar auditoría" })).toBeEnabled();
  });

  // ¿Qué? El aviso "ya puedes calificar" sale de la fecha de la última auditoría de cada conjunto
  //       (GET /auditorias-conjunto/mias/ultimas), no de la lista paginada del historial.
  // ¿Para qué? Con la lista paginada, la auditoría más reciente de un conjunto puede quedar fuera
  //           de la primera página y el panel avisaría "pendiente" aunque se auditó hace poco.
  describe("aviso de auditoría pendiente", () => {
    const haceDias = (dias: number) => new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
    const AVISO = "Ya puedes calificar la separación de residuos de Conjunto Los Alpes.";

    function mockConUltima(ultima: string | null) {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("mis-conjuntos-autorizados")) return Promise.resolve({ data: [conjuntoAutorizado] });
        if (url.endsWith("/auditorias-conjunto/mias/ultimas")) {
          return Promise.resolve({
            data: ultima ? [{ id_conjunto_residencial: 1, ultima_auditoria: ultima }] : [],
          });
        }
        return Promise.resolve(respuestaPorDefecto(url));
      });
    }

    it("no avisa un conjunto auditado hace menos de 7 días", async () => {
      mockConUltima(haceDias(2));
      renderPage();

      // ¿Qué? El conjunto ya se pintó (terminó la carga), y aun así el aviso no está.
      await screen.findAllByText("Conjunto Los Alpes");
      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/auditorias-conjunto/mias/ultimas"));
      });
      expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
    });

    it("avisa un conjunto cuya última auditoría tiene 7 días o más", async () => {
      mockConUltima(haceDias(8));
      renderPage();

      expect(await screen.findByText(AVISO)).toBeInTheDocument();
    });

    it("avisa un conjunto que nunca se ha auditado", async () => {
      mockConUltima(null);
      renderPage();

      expect(await screen.findByText(AVISO)).toBeInTheDocument();
    });
  });

  describe("historial de auditorías enviadas", () => {
    const auditoria = (n: number) => ({
      id_auditoria: `a${n}`,
      id_conjunto_residencial: 1,
      nombre_conjunto: "Conjunto Los Alpes",
      nivel_desempeno: "BUENA",
      tema_educativo: `Tema número ${n}`,
      descripcion: null,
      ruta_evidencia: "/x.jpg",
      ruta_evidencia_2: null,
      ruta_evidencia_3: null,
      created_at: "2026-10-20T10:00:00Z",
      nombre_reciclador: "Juan",
    });

    it("pide el historial de a 10 y pasa a la página siguiente con el offset correcto", async () => {
      mockGet.mockImplementation((url: string, config?: { params?: { limit: number; offset: number } }) => {
        if (url.endsWith("/auditorias-conjunto/mias")) {
          const desde = config?.params?.offset ?? 0;
          const items = Array.from({ length: Math.min(10, 25 - desde) }, (_, i) => auditoria(desde + i + 1));
          return Promise.resolve({ data: { items, total: 25 } });
        }
        return Promise.resolve(respuestaPorDefecto(url));
      });
      const user = userEvent.setup();
      renderPage();

      expect(await screen.findByText("Conjunto Los Alpes — Tema número 1")).toBeInTheDocument();
      expect(screen.getByText("Mostrando 1–10 de 25")).toBeInTheDocument();
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/auditorias-conjunto/mias"), {
        params: { limit: 10, offset: 0 },
      });

      await user.click(screen.getByRole("button", { name: "Página siguiente" }));

      expect(await screen.findByText("Conjunto Los Alpes — Tema número 11")).toBeInTheDocument();
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/auditorias-conjunto/mias"), {
        params: { limit: 10, offset: 10 },
      });
    });
  });
});
