/**
 * Archivo: __tests__/pages/AdminContenidoEducativoPage.test.tsx
 * Descripción: Tests del panel de administración del catálogo educativo
 *              (HU-012 crear, HU-013 editar, HU-014 eliminar).
 */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { AdminContenidoEducativoPage } from "@/pages/AdminContenidoEducativoPage";
import { renderWithProviders, mockUser } from "../helpers";
import type { ContenidoEducativo } from "@/lib/contenidoEducativoApi";

const mockListar = vi.fn();
const mockCrear = vi.fn();
const mockEditar = vi.fn();
const mockEliminar = vi.fn();

vi.mock("@/lib/contenidoEducativoApi", () => ({
  listarContenido: (...args: unknown[]) => mockListar(...args),
  crearContenido: (...args: unknown[]) => mockCrear(...args),
  editarContenido: (...args: unknown[]) => mockEditar(...args),
  eliminarContenido: (...args: unknown[]) => mockEliminar(...args),
}));

const moduloExistente: ContenidoEducativo = {
  id_contenido: 1,
  modulo_categoria: "Separación en la fuente",
  titulo_tema: "Código de colores",
  cuerpo_texto: "Blanco, negro y verde.",
  url_video: null,
  url_guia: null,
  fecha_publicacion: "2026-08-18",
};

function renderPage() {
  return renderWithProviders(<AdminContenidoEducativoPage />, {
    authContext: { user: mockUser, isAuthenticated: true, accessToken: "token" },
  });
}

describe("AdminContenidoEducativoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListar.mockResolvedValue([]);
  });

  it("muestra un estado vacío cuando no hay módulos", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Todavía no hay módulos creados.")).toBeInTheDocument();
    });
  });

  it("lista los módulos existentes", async () => {
    mockListar.mockResolvedValue([moduloExistente]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Código de colores")).toBeInTheDocument();
    });
  });

  it("crea un módulo nuevo con datos válidos", async () => {
    mockCrear.mockResolvedValue({ ...moduloExistente, id_contenido: 2 });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /nuevo módulo/i }));

    await user.type(screen.getByPlaceholderText("Ej: Separación en la fuente"), "Puntos limpios");
    await user.type(screen.getByPlaceholderText("Ej: Código de colores de bolsas"), "Dónde llevar escombros");
    // El textarea de contenido no tiene placeholder de ejemplo — se ubica por su label.
    const textarea = screen.getByText("Contenido").closest("div")?.querySelector("textarea");
    expect(textarea).toBeTruthy();
    await user.type(textarea as HTMLTextAreaElement, "Los Ecopuntos reciben residuos voluminosos.");

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockCrear).toHaveBeenCalledWith(
        expect.objectContaining({
          modulo_categoria: "Puntos limpios",
          titulo_tema: "Dónde llevar escombros",
        }),
        "token"
      );
    });
  });

  it("no envía el formulario si faltan campos obligatorios", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /nuevo módulo/i }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(screen.getByText("Categoría, título y contenido son obligatorios.")).toBeInTheDocument();
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it("edita un módulo existente", async () => {
    mockListar.mockResolvedValue([moduloExistente]);
    mockEditar.mockResolvedValue(moduloExistente);
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText("Código de colores"));
    await user.click(screen.getByRole("button", { name: /editar código de colores/i }));

    const inputTitulo = screen.getByDisplayValue("Código de colores");
    await user.clear(inputTitulo);
    await user.type(inputTitulo, "Código de colores actualizado");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockEditar).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ titulo_tema: "Código de colores actualizado" }),
        "token"
      );
    });
  });

  it("elimina un módulo tras confirmar", async () => {
    mockListar.mockResolvedValue([moduloExistente]);
    mockEliminar.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText("Código de colores"));
    await user.click(screen.getByRole("button", { name: /eliminar código de colores/i }));

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Sí, eliminar" }));

    await waitFor(() => {
      expect(mockEliminar).toHaveBeenCalledWith(1, "token");
    });
  });
});
