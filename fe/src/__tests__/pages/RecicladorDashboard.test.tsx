/**
 * Archivo: __tests__/pages/RecicladorDashboard.test.tsx
 * Descripción: Tests del panel del Reciclador (issue #23) — invitaciones
 *              pendientes, conjuntos autorizados y envío de notificaciones.
 */

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { Route, Routes } from "react-router-dom";
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

  // ¿Qué? Issue #515: sin conjuntos, los botones se ven apagados y un aviso corto explica por qué;
  //       también el vacío de "Notificaciones recibidas" aclara que los avisos llegan de los conjuntos.
  it("sin conjuntos autorizados apaga los botones de aviso y lo explica", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText("Todavía no tienes ningún conjunto autorizado. Cuando un administrador te invite y aceptes, aparecerá aquí.")
      ).toBeInTheDocument();
    });

    const aviso = screen.getByText("Los botones se activan cuando tengas un conjunto autorizado.");
    expect(aviso).toBeInTheDocument();
    const boton = screen.getByRole("button", { name: "Llegué al conjunto" });
    expect(boton).toHaveAttribute("aria-disabled", "true");
    expect(boton).toHaveAttribute("aria-describedby", "reciclador-sin-conjuntos");

    // Apagado no abre la confirmación del aviso.
    await user.click(boton);
    expect(screen.queryByText("¿Enviar este aviso?")).not.toBeInTheDocument();

    expect(
      screen.getByText(/Los avisos de los residentes \(como SHUT lleno\) llegan de los conjuntos donde estés autorizado/)
    ).toBeInTheDocument();
  });

  it("con un conjunto autorizado no muestra el aviso de sin conjuntos y los botones quedan activos", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("mis-conjuntos-autorizados")) return Promise.resolve({ data: [conjuntoAutorizado] });
      return Promise.resolve(respuestaPorDefecto(url));
    });
    renderPage();

    const boton = await screen.findByRole("button", { name: "Llegué al conjunto" });
    expect(boton).toHaveAttribute("aria-disabled", "false");
    expect(screen.queryByText("Los botones se activan cuando tengas un conjunto autorizado.")).not.toBeInTheDocument();
    expect(screen.queryByText(/llegan de los conjuntos donde estés autorizado/)).not.toBeInTheDocument();
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

    // ¿Qué? El conjunto ya está elegido arriba: el modal solo confirma, sin volver a preguntar cuál.
    expect(screen.getByText("¿Enviar este aviso?")).toBeInTheDocument();
    expect(screen.getByText(/Vas a avisar "Llegué al conjunto" a los residentes y al administrador de Conjunto Los Alpes/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Enviar aviso" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/notificaciones/enviar"),
        { tipo: "LLEGADA_RECICLADOR", id_conjunto_residencial: 1 }
      );
    });
  });

  // ¿Qué? Orden de los bloques — invitaciones, mis conjuntos (el selector), avisos, auditoría
  //       pendiente, notificaciones recibidas y, al final, el historial.
  // ¿Impacto? Si alguien reordena el panel sin querer (o el aviso de auditoría vuelve a
  //           empujar los botones hacia abajo), esta prueba falla. El selector va ARRIBA de los
  //           botones porque los botones dependen del conjunto elegido (issue #515 y rediseño por conjunto).
  it("muestra los bloques en orden: invitaciones, conjuntos, avisos, auditoría pendiente, notificaciones e historial", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("mis-invitaciones")) {
        return Promise.resolve({
          data: [
            {
              id: "inv-1",
              nombre_conjunto: "Conjunto Las Flores",
              direccion_conjunto: "Cra 5 # 6-7",
              invitado_por_nombre: "Ana Admin",
              estado: "PENDIENTE",
              expires_at: "2026-09-01T00:00:00Z",
            },
          ],
        });
      }
      if (url.includes("mis-conjuntos-autorizados")) return Promise.resolve({ data: [conjuntoAutorizado] });
      return Promise.resolve(respuestaPorDefecto(url));
    });
    renderPage();

    const titulos = [
      await screen.findByRole("heading", { name: "Invitaciones pendientes" }),
      await screen.findByRole("heading", { name: "Mis conjuntos autorizados" }),
      screen.getByRole("heading", { name: "Enviar notificación" }),
      await screen.findByRole("heading", { name: "Auditoría semanal pendiente" }),
      screen.getByRole("heading", { name: "Notificaciones recibidas" }),
      screen.getByRole("heading", { name: "Historial de auditorías" }),
    ];
    for (let i = 0; i < titulos.length - 1; i++) {
      expect(titulos[i].compareDocumentPosition(titulos[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("el mensaje de aviso enviado aparece dentro del bloque de los botones", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("mis-conjuntos-autorizados")) return Promise.resolve({ data: [conjuntoAutorizado] });
      return Promise.resolve(respuestaPorDefecto(url));
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Llegué al conjunto" }));
    await user.click(screen.getByRole("button", { name: "Enviar aviso" }));

    const bloque = screen.getByRole("region", { name: "Enviar notificación" });
    expect(await within(bloque).findByText(/Notificación enviada/)).toBeInTheDocument();
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
    expect(screen.getByText("¿Enviar este aviso?")).toBeInTheDocument();
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

  // ¿Qué? Tocar el aviso de un comunicado lleva a la página de Comunicados y lo marca leído
  //       (antes solo lo marcaba leído y no pasaba nada más).
  describe("notificaciones recibidas que llevan a otra página", () => {
    const notificacion = (id: string, tipo: string, mensaje: string, leida = false) => ({
      id,
      tipo,
      mensaje,
      id_referencia: null,
      nombre_conjunto: "Conjunto Los Alpes",
      id_conjunto_residencial: 1,
      leida,
      created_at: new Date().toISOString(),
    });

    function renderConRutas(notificaciones: object[]) {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("mis-conjuntos-autorizados")) return Promise.resolve({ data: [conjuntoAutorizado] });
        if (url.includes("mis-notificaciones")) return Promise.resolve({ data: notificaciones });
        return Promise.resolve(respuestaPorDefecto(url));
      });
      return renderWithProviders(
        <Routes>
          <Route path="/" element={<RecicladorDashboard />} />
          <Route path="/comunicados" element={<p>Página de comunicados</p>} />
          <Route path="/novedades" element={<p>Página de soporte técnico</p>} />
        </Routes>,
        { authContext: { user: mockUser, isAuthenticated: true } }
      );
    }

    it("tocar un comunicado nuevo lo marca como leído y lleva a Comunicados", async () => {
      const user = userEvent.setup();
      renderConRutas([notificacion("n1", "COMUNICADO_NUEVO", "Nuevo comunicado: asamblea el jueves.")]);

      await user.click(await screen.findByText("Nuevo comunicado: asamblea el jueves."));

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(expect.stringContaining("/notificaciones/n1/leer"), {});
      });
      expect(await screen.findByText("Página de comunicados")).toBeInTheDocument();
    });

    it("un comunicado ya leído sigue llevando a Comunicados", async () => {
      const user = userEvent.setup();
      renderConRutas([notificacion("n2", "COMUNICADO_NUEVO", "Comunicado ya leído.", true)]);

      await user.click(await screen.findByText("Comunicado ya leído."));

      expect(await screen.findByText("Página de comunicados")).toBeInTheDocument();
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("una respuesta de soporte lleva a Soporte técnico", async () => {
      const user = userEvent.setup();
      renderConRutas([notificacion("n3", "RESPUESTA_SOPORTE", "Respondieron tu consulta.")]);

      await user.click(await screen.findByText("Respondieron tu consulta."));

      expect(await screen.findByText("Página de soporte técnico")).toBeInTheDocument();
    });

    it("un aviso de SHUT ya leído no es un botón: no tiene otra página", async () => {
      renderConRutas([notificacion("n4", "SHUT_LLENO", "El SHUT está lleno.", true)]);

      await screen.findByText("El SHUT está lleno.");
      expect(screen.queryByRole("button", { name: /El SHUT está lleno/ })).not.toBeInTheDocument();
    });
  });

  // ¿Qué? Con varios conjuntos el panel muestra UNO a la vez, el que se elige en las pastillas de
  //       "Mis conjuntos autorizados": estado, botones de aviso, auditoría, actividad e historial.
  // ¿Para qué? Antes, con 2 o más conjuntos los 4 botones quedaban siempre activos porque no se sabía
  //           cuál elegiría el Reciclador; ahora se encienden y se apagan según el conjunto elegido.
  describe("varios conjuntos: el panel sigue al conjunto elegido", () => {
    const alpes = { id_conjunto_residencial: "c-alpes", nombre_conjunto: "Conjunto Los Alpes", direccion: "Cra 10 # 20-30", nombre_localidad: "Suba" };
    const flores = { id_conjunto_residencial: "c-flores", nombre_conjunto: "Conjunto Las Flores", direccion: "Cra 5 # 6-7", nombre_localidad: "Usaquén" };
    const estado = (id: string, presente: boolean, shutLleno = false) => ({
      id_conjunto_residencial: id,
      presente,
      shut_lleno: shutLleno,
      puede_avisar_llegada: !presente,
    });
    const notif = (id: string, mensaje: string, idConjunto: string | null) => ({
      id,
      tipo: "SHUT_LLENO",
      mensaje,
      id_referencia: null,
      nombre_conjunto: null,
      id_conjunto_residencial: idConjunto,
      leida: false,
      created_at: new Date().toISOString(),
    });

    // ¿Qué? Alpes: no ha llegado. Flores: ya llegó y el SHUT está libre.
    function mockDosConjuntos() {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("mis-conjuntos-autorizados")) return Promise.resolve({ data: [alpes, flores] });
        if (url.includes("mi-estado-reciclador")) {
          return Promise.resolve({ data: [estado("c-alpes", false), estado("c-flores", true)] });
        }
        return Promise.resolve(respuestaPorDefecto(url));
      });
    }

    const pastilla = (nombre: string) => screen.getByRole("button", { name: new RegExp(`^${nombre}`) });
    const apagado = (nombre: string) => screen.getByRole("button", { name: nombre }).getAttribute("aria-disabled") === "true";

    it("arranca en el conjunto donde ya está presente y sus botones reflejan ese estado", async () => {
      mockDosConjuntos();
      renderPage();

      await screen.findByText("Estás en el conjunto");
      expect(pastilla("Conjunto Las Flores")).toHaveAttribute("aria-pressed", "true");
      expect(pastilla("Conjunto Los Alpes")).toHaveAttribute("aria-pressed", "false");

      // Ya llegó a Las Flores: no puede volver a llegar, puede avisar SHUT lleno y que finalizó.
      expect(apagado("Llegué al conjunto")).toBe(true);
      expect(apagado("SHUT está lleno")).toBe(false);
      expect(apagado("SHUT ya está libre")).toBe(true);
      expect(apagado("Finalicé separación")).toBe(false);
    });

    it("al elegir otro conjunto, los botones pasan al estado de ese conjunto", async () => {
      mockDosConjuntos();
      const user = userEvent.setup();
      renderPage();
      await screen.findByText("Estás en el conjunto");

      await user.click(pastilla("Conjunto Los Alpes"));

      // En Los Alpes todavía no llegó: solo "Llegué" está activo.
      expect(screen.getByText("No has llegado")).toBeInTheDocument();
      expect(apagado("Llegué al conjunto")).toBe(false);
      expect(apagado("SHUT está lleno")).toBe(true);
      expect(apagado("SHUT ya está libre")).toBe(true);
      expect(apagado("Finalicé separación")).toBe(true);
    });

    it("con el SHUT lleno se apaga 'lleno' y se enciende 'libre'", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("mis-conjuntos-autorizados")) return Promise.resolve({ data: [alpes, flores] });
        if (url.includes("mi-estado-reciclador")) {
          return Promise.resolve({ data: [estado("c-alpes", false), estado("c-flores", true, true)] });
        }
        return Promise.resolve(respuestaPorDefecto(url));
      });
      renderPage();

      await screen.findByText("SHUT lleno");
      expect(apagado("SHUT está lleno")).toBe(true);
      expect(apagado("SHUT ya está libre")).toBe(false);
    });

    it("apagado explica el motivo al tocarlo y no abre la confirmación", async () => {
      mockDosConjuntos();
      const user = userEvent.setup();
      renderPage();
      await screen.findByText("Estás en el conjunto");

      await user.click(screen.getByRole("button", { name: "SHUT ya está libre" }));

      // ¿Qué? El motivo se ve en el aviso visible (role="status"); el mismo texto también va oculto
      //       dentro del botón, para lectores de pantalla.
      expect(
        await within(await screen.findByRole("status")).findByText("El SHUT de este conjunto ya está reportado como libre.")
      ).toBeInTheDocument();
      expect(screen.queryByText("¿Enviar este aviso?")).not.toBeInTheDocument();
    });

    it("el aviso se envía al conjunto elegido", async () => {
      mockDosConjuntos();
      const user = userEvent.setup();
      renderPage();
      await screen.findByText("Estás en el conjunto");

      await user.click(pastilla("Conjunto Los Alpes"));
      await user.click(screen.getByRole("button", { name: "Llegué al conjunto" }));
      expect(screen.getByText(/Vas a avisar "Llegué al conjunto" a los residentes y al administrador de Conjunto Los Alpes/)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Enviar aviso" }));

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          expect.stringContaining("/notificaciones/enviar"),
          { tipo: "LLEGADA_RECICLADOR", id_conjunto_residencial: "c-alpes" }
        );
      });
    });

    it("muestra las notificaciones del conjunto elegido y las generales, no las de otro conjunto", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("mis-conjuntos-autorizados")) return Promise.resolve({ data: [alpes, flores] });
        if (url.includes("mi-estado-reciclador")) {
          return Promise.resolve({ data: [estado("c-alpes", false), estado("c-flores", true)] });
        }
        if (url.includes("mis-notificaciones")) {
          return Promise.resolve({
            data: [
              notif("n1", "Aviso de Los Alpes", "c-alpes"),
              notif("n2", "Aviso de Las Flores", "c-flores"),
              notif("n3", "Aviso general de la plataforma", null),
            ],
          });
        }
        return Promise.resolve(respuestaPorDefecto(url));
      });
      const user = userEvent.setup();
      renderPage();

      // Arranca en Las Flores (ya está presente).
      expect(await screen.findByText("Aviso de Las Flores")).toBeInTheDocument();
      expect(screen.getByText("Aviso general de la plataforma")).toBeInTheDocument();
      expect(screen.queryByText("Aviso de Los Alpes")).not.toBeInTheDocument();

      await user.click(pastilla("Conjunto Los Alpes"));

      expect(screen.getByText("Aviso de Los Alpes")).toBeInTheDocument();
      expect(screen.getByText("Aviso general de la plataforma")).toBeInTheDocument();
      expect(screen.queryByText("Aviso de Las Flores")).not.toBeInTheDocument();
    });

    it("pide el historial solo del conjunto elegido y vuelve a pedirlo al cambiar", async () => {
      mockDosConjuntos();
      const user = userEvent.setup();
      renderPage();
      await screen.findByText("Estás en el conjunto");

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/auditorias-conjunto/mias"), {
          params: { limit: 10, offset: 0, id_conjunto: "c-flores" },
        });
      });

      await user.click(pastilla("Conjunto Los Alpes"));

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/auditorias-conjunto/mias"), {
          params: { limit: 10, offset: 0, id_conjunto: "c-alpes" },
        });
      });
    });

    it("marca con un aviso la pastilla del conjunto que necesita auditoría", async () => {
      const reciente = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      mockGet.mockImplementation((url: string) => {
        if (url.includes("mis-conjuntos-autorizados")) return Promise.resolve({ data: [alpes, flores] });
        if (url.endsWith("/auditorias-conjunto/mias/ultimas")) {
          return Promise.resolve({ data: [{ id_conjunto_residencial: "c-flores", ultima_auditoria: reciente }] });
        }
        return Promise.resolve(respuestaPorDefecto(url));
      });
      renderPage();

      // Los Alpes nunca se auditó; Las Flores se auditó ayer.
      expect(await screen.findByRole("button", { name: "Conjunto Los Alpes, Necesita auditoría" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Conjunto Las Flores" })).toBeInTheDocument();
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
