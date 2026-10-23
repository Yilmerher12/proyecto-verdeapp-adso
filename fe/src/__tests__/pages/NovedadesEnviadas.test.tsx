/**
 * Archivo: __tests__/pages/NovedadesEnviadas.test.tsx
 * Descripción: Tests de las novedades que Residente, Reciclador y Admin de
 *              Conjunto le ENVÍAN al Admin Sistema, desde las pestañas
 *              "Escribir novedad" e "Historial de novedades" de la página de Novedades.
 */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { NovedadesFeedPage } from "@/pages/NovedadesFeedPage";
import { RoleId } from "@/types/auth";
import { renderWithProviders, mockUser } from "../helpers";

const mockEnviar = vi.fn();
const mockMias = vi.fn();
const mockConjuntos = vi.fn();

vi.mock("@/lib/novedadesApi", () => ({
  verFeedNovedades: () => Promise.resolve([]),
}));
vi.mock("@/lib/novedadesEnviadasApi", () => ({
  enviarNovedad: (...args: unknown[]) => mockEnviar(...args),
  misNovedadesEnviadas: (...args: unknown[]) => mockMias(...args),
}));
vi.mock("@/lib/conjuntoPanelApi", () => ({
  obtenerMisConjuntos: (...args: unknown[]) => mockConjuntos(...args),
}));

function renderPage(roleId: RoleId = RoleId.RESIDENTE) {
  return renderWithProviders(<NovedadesFeedPage />, {
    authContext: { user: { ...mockUser, role_id: roleId }, isAuthenticated: true },
  });
}

describe("Novedades enviadas al Admin Sistema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnviar.mockResolvedValue({});
    mockMias.mockResolvedValue({ items: [], total: 0 });
    mockConjuntos.mockResolvedValue([]);
  });

  const LOGIN = "No puedo iniciar sesión o recuperar mi contraseña";

  async function abrirFormulario(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("tab", { name: "Escribir novedad" }));
  }

  it("envía un motivo de la lista sin escribir nada (el botón se habilita al elegirlo)", async () => {
    const user = userEvent.setup();
    renderPage();

    await abrirFormulario(user);
    const enviar = screen.getByRole("button", { name: "Enviar consulta" });
    expect(enviar).toBeDisabled();
    expect(screen.getByText("Elige un motivo para poder enviar.")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: LOGIN }));
    expect(enviar).toBeEnabled();
    await user.click(enviar);

    await waitFor(() => {
      // ¿Qué? Issue #512: además del texto viaja la clave del motivo, de donde el backend saca la prioridad.
      expect(mockEnviar).toHaveBeenCalledWith({ texto: LOGIN, motivo: "login", url_imagen: null, id_conjunto_residencial: null });
    });
    expect(await screen.findByText("Consulta enviada. El Administrador del Sistema la revisará.")).toBeInTheDocument();
  });

  it("el comentario está bloqueado con cualquier motivo que no sea Otros", async () => {
    const user = userEvent.setup();
    renderPage();

    await abrirFormulario(user);
    expect(screen.getByLabelText("Comentario")).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: LOGIN }));
    expect(screen.getByLabelText("Comentario")).toBeDisabled();
    expect(screen.getByText("Se activa solo cuando eliges Otros.")).toBeInTheDocument();
  });

  it("con Otros se activa el comentario y es obligatorio para enviar", async () => {
    const user = userEvent.setup();
    renderPage();

    await abrirFormulario(user);
    await user.click(screen.getByRole("radio", { name: "Otros" }));
    const comentario = screen.getByLabelText("Comentario (obligatorio con Otros)");
    const enviar = screen.getByRole("button", { name: "Enviar consulta" });
    expect(comentario).toBeEnabled();
    expect(enviar).toBeDisabled();
    expect(screen.getByText("Con Otros, el comentario es obligatorio.")).toBeInTheDocument();

    await user.type(comentario, "El mapa se queda en blanco.");
    expect(enviar).toBeEnabled();
    await user.click(enviar);

    await waitFor(() => {
      expect(mockEnviar).toHaveBeenCalledWith({
        texto: "Otros: El mapa se queda en blanco.",
        motivo: "otros",
        url_imagen: null,
        id_conjunto_residencial: null,
      });
    });
  });

  it("al volver de Otros a otro motivo se envía el motivo, no el comentario", async () => {
    const user = userEvent.setup();
    renderPage();

    await abrirFormulario(user);
    await user.click(screen.getByRole("radio", { name: "Otros" }));
    await user.type(screen.getByLabelText("Comentario (obligatorio con Otros)"), "algo");
    await user.click(screen.getByRole("radio", { name: LOGIN }));
    await user.click(screen.getByRole("button", { name: "Enviar consulta" }));

    await waitFor(() => {
      expect(mockEnviar).toHaveBeenCalledWith(expect.objectContaining({ texto: LOGIN }));
    });
  });

  it("tras enviar, el formulario queda limpio", async () => {
    const user = userEvent.setup();
    renderPage();

    await abrirFormulario(user);
    await user.click(screen.getByRole("radio", { name: LOGIN }));
    await user.click(screen.getByRole("button", { name: "Enviar consulta" }));

    await screen.findByText("Consulta enviada. El Administrador del Sistema la revisará.");
    expect(screen.getByRole("radio", { name: LOGIN })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Enviar consulta" })).toBeDisabled();
  });

  describe("la lista de motivos cambia según el rol", () => {
    const RESIDENTE = "Mi conjunto, torre o apartamento no es el correcto";
    const RECICLADOR = "No puedo enviar una auditoría o mis fotos no se suben";
    const ADMIN = "Los datos de mi conjunto están mal (NIT, dirección o total de apartamentos)";

    it.each([
      ["Residente", RoleId.RESIDENTE, RESIDENTE, [RECICLADOR, ADMIN]],
      ["Reciclador", RoleId.RECICLADOR, RECICLADOR, [RESIDENTE, ADMIN]],
      ["Admin de Conjunto", RoleId.ADMIN_CONJUNTO, ADMIN, [RESIDENTE, RECICLADOR]],
    ])("%s ve los suyos, los comunes y Otros, pero no los de otros roles", async (_rol, roleId, propio, ajenos) => {
      const user = userEvent.setup();
      renderPage(roleId);

      await abrirFormulario(user);
      expect(screen.getByRole("radio", { name: propio })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: LOGIN })).toBeInTheDocument();
      ajenos.forEach((ajeno) => expect(screen.queryByRole("radio", { name: ajeno })).not.toBeInTheDocument());
      const radios = screen.getAllByRole("radio");
      expect(radios[radios.length - 1]).toHaveAccessibleName("Otros");
    });
  });

  it("un Residente no ve el selector de conjunto", async () => {
    const user = userEvent.setup();
    renderPage(RoleId.RESIDENTE);

    await abrirFormulario(user);
    expect(screen.queryByLabelText("¿De qué conjunto hablas?")).not.toBeInTheDocument();
  });

  it("un Admin de Conjunto con 2 conjuntos elige de cuál habla", async () => {
    mockConjuntos.mockResolvedValue([
      { id_conjunto_residencial: "c-1", nombre_conjunto: "Quintas de Aranjuez" },
      { id_conjunto_residencial: "c-2", nombre_conjunto: "Portal de Capellanía" },
    ]);
    const user = userEvent.setup();
    renderPage(RoleId.ADMIN_CONJUNTO);

    await abrirFormulario(user);
    await user.selectOptions(await screen.findByLabelText("¿De qué conjunto hablas?"), "c-2");
    await user.click(screen.getByRole("radio", { name: LOGIN }));
    await user.click(screen.getByRole("button", { name: "Enviar consulta" }));

    await waitFor(() => {
      expect(mockEnviar).toHaveBeenCalledWith(expect.objectContaining({ id_conjunto_residencial: "c-2" }));
    });
  });

  it("muestra el error si falla el envío", async () => {
    mockEnviar.mockRejectedValue(new Error("Servidor caído"));
    const user = userEvent.setup();
    renderPage();

    await abrirFormulario(user);
    await user.click(screen.getByRole("radio", { name: LOGIN }));
    await user.click(screen.getByRole("button", { name: "Enviar consulta" }));

    expect(await screen.findByText("Servidor caído")).toBeInTheDocument();
  });

  it("Historial de novedades lista lo enviado con su estado", async () => {
    mockMias.mockResolvedValue({
      items: [
        {
          id: "n-1", texto: "Pared rayada.", url_imagen: null, estado: "RESUELTA", nombre_conjunto: "Quintas",
          respuesta: "Ya mandamos a pintarla.", respondida_at: "2026-09-24T10:00:00Z", created_at: "2026-09-22T10:00:00Z",
        },
        { id: "n-2", texto: "Punto cerrado.", url_imagen: null, estado: "NUEVA", nombre_conjunto: null, respuesta: null, respondida_at: null, created_at: "2026-09-23T10:00:00Z" },
        { id: "n-3", texto: "Sin sonido.", url_imagen: null, estado: "EN_REVISION", nombre_conjunto: null, respuesta: null, respondida_at: null, created_at: "2026-09-23T11:00:00Z" },
      ],
      total: 3,
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: "Historial de novedades" }));

    expect(await screen.findByText("Pared rayada.")).toBeInTheDocument();
    expect(screen.getByText("Resuelta")).toBeInTheDocument();
    expect(screen.getByText("Enviada")).toBeInTheDocument();
    expect(screen.getByText("En revisión")).toBeInTheDocument();
    // ¿Qué? Issue #512: el autor ve la respuesta del Admin Sistema solo en la que la tiene.
    expect(screen.getByText("Ya mandamos a pintarla.")).toBeInTheDocument();
    expect(screen.getAllByText(/Respuesta del Administrador del Sistema/)).toHaveLength(1);
    expect(mockMias).toHaveBeenCalledWith(10, 0);
  });

  it("Historial de novedades pide la página siguiente con el offset correcto", async () => {
    const item = (id: string) => ({
      id, texto: `Novedad ${id}`, url_imagen: null, estado: "NUEVA", nombre_conjunto: null, created_at: "2026-09-22T10:00:00Z",
    });
    mockMias.mockImplementation((_limit: number, offset: number) =>
      Promise.resolve({ items: [item(offset === 0 ? "primera" : "segunda")], total: 12 })
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: "Historial de novedades" }));
    expect(await screen.findByText("Novedad primera")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 1–10 de 12")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Página siguiente" }));

    expect(await screen.findByText("Novedad segunda")).toBeInTheDocument();
    expect(mockMias).toHaveBeenLastCalledWith(10, 10);
  });

  it("Historial de novedades muestra el estado vacío", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: "Historial de novedades" }));
    expect(await screen.findByText("Todavía no has enviado ninguna novedad.")).toBeInTheDocument();
  });
});
