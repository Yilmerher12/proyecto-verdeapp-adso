/**
 * Archivo: __tests__/pages/CatalogoEducativoPage.test.tsx
 * Descripción: Tests de la grilla de categorías del catálogo educativo (HU-005).
 * ¿Para qué? Ahora esta página solo muestra tarjetas por categoría (no el
 *            contenido completo) — el detalle vive en CategoriaEducativaPage.
 */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { CatalogoEducativoPage } from "@/pages/CatalogoEducativoPage";
import { renderWithProviders, mockUser } from "../helpers";
import type { ContenidoEducativo } from "@/lib/contenidoEducativoApi";

const mockListarContenido = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@/lib/contenidoEducativoApi", () => ({
  listarContenido: (...args: unknown[]) => mockListarContenido(...args),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const modulos: ContenidoEducativo[] = [
  {
    id_contenido: "00000000-0000-7000-8000-000000000001",
    modulo_categoria: "Separación en la fuente y código de colores",
    titulo_tema: "Código de colores",
    cuerpo_texto: "Blanco, negro y verde.",
    url_video: null,
    url_guia: null,
    fecha_publicacion: "2026-08-18",
  },
  {
    id_contenido: "00000000-0000-7000-8000-000000000002",
    modulo_categoria: "Separación en la fuente y código de colores",
    titulo_tema: "Cómo preparar el material",
    cuerpo_texto: "Aplanar botellas, escurrir líquidos.",
    url_video: null,
    url_guia: null,
    fecha_publicacion: "2026-08-18",
  },
  {
    id_contenido: "00000000-0000-7000-8000-000000000003",
    modulo_categoria: "Puntos limpios y Ecopuntos",
    titulo_tema: "Dónde llevar escombros",
    cuerpo_texto: "Los Ecopuntos reciben...",
    url_video: null,
    url_guia: null,
    fecha_publicacion: "2026-08-18",
  },
];

describe("CatalogoEducativoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra un estado vacío cuando no hay contenido", async () => {
    mockListarContenido.mockResolvedValue([]);
    renderWithProviders(<CatalogoEducativoPage />, {
      authContext: { user: mockUser, isAuthenticated: true, accessToken: "token" },
    });

    await waitFor(() => {
      expect(screen.getByText("Todavía no hay contenido educativo publicado.")).toBeInTheDocument();
    });
  });

  it("muestra una tarjeta por categoría, sin repetir", async () => {
    mockListarContenido.mockResolvedValue(modulos);
    renderWithProviders(<CatalogoEducativoPage />, {
      authContext: { user: mockUser, isAuthenticated: true, accessToken: "token" },
    });

    await waitFor(() => {
      expect(screen.getAllByText("Separación en la fuente y código de colores")).toHaveLength(1);
      expect(screen.getByText("Puntos limpios y Ecopuntos")).toBeInTheDocument();
    });
  });

  it("muestra cuántos temas tiene cada categoría", async () => {
    mockListarContenido.mockResolvedValue(modulos);
    renderWithProviders(<CatalogoEducativoPage />, {
      authContext: { user: mockUser, isAuthenticated: true, accessToken: "token" },
    });

    await waitFor(() => {
      expect(screen.getByText("2 temas")).toBeInTheDocument();
      expect(screen.getByText("1 tema")).toBeInTheDocument();
    });
  });

  it("al hacer clic en una tarjeta navega a su categoría", async () => {
    mockListarContenido.mockResolvedValue(modulos);
    const user = userEvent.setup();
    renderWithProviders(<CatalogoEducativoPage />, {
      authContext: { user: mockUser, isAuthenticated: true, accessToken: "token" },
    });

    await waitFor(() => screen.getByText("Puntos limpios y Ecopuntos"));
    await user.click(screen.getByText("Puntos limpios y Ecopuntos"));

    expect(mockNavigate).toHaveBeenCalledWith(
      `/catalogo-educativo/${encodeURIComponent("Puntos limpios y Ecopuntos")}`
    );
  });
});
