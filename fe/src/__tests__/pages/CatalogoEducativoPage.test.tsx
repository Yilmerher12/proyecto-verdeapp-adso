/**
 * Archivo: __tests__/pages/CatalogoEducativoPage.test.tsx
 * Descripción: Tests de "Aprende a reciclar" (HU-005): tarjetas por categoría con
 *              dibujo, video destacado y bloque "Tu semana".
 * ¿Para qué? La página junta dos fuentes (contenido y la última auditoría) y debe
 *            seguir sirviendo aunque la segunda falle.
 */

import { screen, within } from "@testing-library/react";
import { vi, beforeEach } from "vitest";
import { CatalogoEducativoPage } from "@/pages/CatalogoEducativoPage";
import { renderWithProviders, mockUser } from "../helpers";
import type { ContenidoEducativo } from "@/lib/contenidoEducativoApi";

const mockListarContenido = vi.fn();
const mockListarHistorial = vi.fn();

vi.mock("@/lib/contenidoEducativoApi", () => ({
  listarContenido: (...args: unknown[]) => mockListarContenido(...args),
}));

vi.mock("@/lib/auditoriaConjuntoApi", () => ({
  listarHistorial: (...args: unknown[]) => mockListarHistorial(...args),
}));

const base = { url_video: null, url_guia: null, fecha_publicacion: "2026-08-18" };
const modulos: ContenidoEducativo[] = [
  {
    ...base,
    id_contenido: "00000000-0000-7000-8000-000000000001",
    modulo_categoria: "Separación en la fuente y código de colores",
    titulo_tema: "Código de colores",
    cuerpo_texto: "Blanco, negro y verde.",
    url_video: "https://www.youtube.com/watch?v=abcdefghijk",
  },
  {
    ...base,
    id_contenido: "00000000-0000-7000-8000-000000000002",
    modulo_categoria: "Separación en la fuente y código de colores",
    titulo_tema: "Cómo preparar el material",
    cuerpo_texto: "Aplanar botellas, escurrir líquidos.",
  },
  {
    ...base,
    id_contenido: "00000000-0000-7000-8000-000000000003",
    modulo_categoria: "Puntos limpios y Ecopuntos",
    titulo_tema: "Dónde llevar escombros",
    cuerpo_texto: "Los Ecopuntos reciben...",
  },
];

const auditoria = (nivel: string, tema = "Puntos limpios y Ecopuntos") => ({
  items: [{ id_auditoria: "a1", nivel_desempeno: nivel, tema_educativo: tema, created_at: new Date().toISOString() }],
  total: 1,
});

// ¿Qué? Una tarjeta de categoría, buscada por el nombre de la categoría: el título de una
//       lección también puede salir en "Video destacado", así que no se busca por ese texto.
async function tarjetaDe(categoria: string) {
  const seccion = (await screen.findByRole("heading", { name: "Categorías de aprendizaje" })).closest("section")!;
  return within(seccion).getByText(categoria).closest("a")!;
}

function renderPagina() {
  return renderWithProviders(<CatalogoEducativoPage />, {
    authContext: { user: mockUser, isAuthenticated: true },
  });
}

describe("CatalogoEducativoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarContenido.mockResolvedValue(modulos);
    mockListarHistorial.mockResolvedValue({ items: [], total: 0 });
  });

  it("muestra un estado vacío cuando no hay contenido", async () => {
    mockListarContenido.mockResolvedValue([]);
    renderPagina();

    expect(await screen.findByText("Todavía no hay contenido educativo publicado.")).toBeInTheDocument();
  });

  it("muestra una tarjeta por categoría, con el título de su lección más reciente", async () => {
    renderPagina();

    const tarjeta = await tarjetaDe("Separación en la fuente y código de colores");
    expect(within(tarjeta).getByText("Código de colores")).toBeInTheDocument();
    const otra = await tarjetaDe("Puntos limpios y Ecopuntos");
    expect(within(otra).getByText("Dónde llevar escombros")).toBeInTheDocument();
  });

  it("cada tarjeta lleva a su categoría", async () => {
    renderPagina();

    const tarjeta = (await screen.findByText("Dónde llevar escombros")).closest("a")!;
    expect(tarjeta).toHaveAttribute(
      "href",
      `/catalogo-educativo/${encodeURIComponent("Puntos limpios y Ecopuntos")}`
    );
  });

  it("cada categoría muestra su dibujo", async () => {
    renderPagina();

    const tarjeta = await tarjetaDe("Separación en la fuente y código de colores");
    expect(tarjeta.querySelector("svg[viewBox='0 0 320 150']")).not.toBeNull();
    expect(tarjeta.querySelector("img")).toBeNull();
  });

  it("una categoría sin dibujo propio usa el genérico", async () => {
    mockListarContenido.mockResolvedValue([{ ...modulos[2], modulo_categoria: "Una categoría nueva" }]);
    renderPagina();

    const tarjeta = await tarjetaDe("Una categoría nueva");
    expect(tarjeta.querySelector("svg[viewBox='0 0 320 150']")).not.toBeNull();
  });

  it("no muestra marcas de lección vista ni avance (eso llega en otra tarjeta)", async () => {
    renderPagina();

    await screen.findByText("Dónde llevar escombros");
    expect(screen.queryByText("Visto")).not.toBeInTheDocument();
    expect(screen.queryByText("Sin ver")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  describe("video destacado", () => {
    it("muestra el módulo más reciente que tenga video, con su portada de YouTube", async () => {
      renderPagina();

      const destacado = (await screen.findByRole("heading", { name: "Video destacado" })).closest("section")!;
      expect(within(destacado).getByText("Código de colores")).toBeInTheDocument();
      expect(destacado.querySelector("img")?.getAttribute("src")).toBe("https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg");
    });

    it("no aparece si ningún módulo tiene video", async () => {
      mockListarContenido.mockResolvedValue([modulos[1], modulos[2]]);
      renderPagina();

      await screen.findByText("Dónde llevar escombros");
      expect(screen.queryByRole("heading", { name: "Video destacado" })).not.toBeInTheDocument();
    });
  });

  describe("tu semana", () => {
    it("con una auditoría Regular muestra el resultado y la lección recomendada", async () => {
      mockListarHistorial.mockResolvedValue(auditoria("REGULAR"));
      renderPagina();

      expect(await screen.findByText(/tu conjunto salió regular en «Puntos limpios y Ecopuntos»/i)).toBeInTheDocument();
      expect(screen.getByText("Por eso te recomendamos esta lección.")).toBeInTheDocument();
      const recomendada = screen.getByText("Recomendado para ti").closest("a")!;
      expect(recomendada).toHaveAttribute("href", `/catalogo-educativo/${encodeURIComponent("Puntos limpios y Ecopuntos")}`);
      expect(within(recomendada).getByText("Dónde llevar escombros")).toBeInTheDocument();
    });

    it("con una auditoría Buena felicita y no recomienda nada", async () => {
      mockListarHistorial.mockResolvedValue(auditoria("BUENA"));
      renderPagina();

      expect(await screen.findByText(/¡Sigue así!/)).toBeInTheDocument();
      expect(screen.queryByText("Recomendado para ti")).not.toBeInTheDocument();
    });

    it("sin auditorías lo dice en vez de quedar vacío", async () => {
      renderPagina();

      expect(await screen.findByText(/Todavía no hay una auditoría de tu conjunto/)).toBeInTheDocument();
    });

    it("si la auditoría no coincide con ninguna categoría, no inventa una recomendación", async () => {
      mockListarHistorial.mockResolvedValue(auditoria("DEFICIENTE", "Un tema que ya no existe"));
      renderPagina();

      expect(await screen.findByText(/salió malo en «Un tema que ya no existe»/i)).toBeInTheDocument();
      expect(screen.queryByText("Recomendado para ti")).not.toBeInTheDocument();
    });

    it("si no se puede consultar la auditoría, el resto del catálogo se ve igual", async () => {
      mockListarHistorial.mockRejectedValue(new Error("falló"));
      renderPagina();

      expect(await screen.findByText("Dónde llevar escombros")).toBeInTheDocument();
      expect(screen.queryByLabelText("Tu semana")).not.toBeInTheDocument();
    });
  });
});
