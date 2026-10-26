/**
 * Archivo: __tests__/pages/CatalogoEducativoPage.test.tsx
 * Descripción: Tests de "Aprende a reciclar" (HU-005): tarjetas por categoría con
 *              dibujo, marca "Visto", avance, video destacado y bloque "Tu semana".
 * ¿Para qué? La página junta tres fuentes (contenido, lecciones vistas y la última
 *            auditoría) y debe seguir sirviendo aunque una de las dos últimas falle.
 */

import { screen, waitFor, within } from "@testing-library/react";
import { vi, beforeEach } from "vitest";
import { CatalogoEducativoPage } from "@/pages/CatalogoEducativoPage";
import { renderWithProviders, mockUser } from "../helpers";
import type { ContenidoEducativo } from "@/lib/contenidoEducativoApi";

const mockListarContenido = vi.fn();
const mockListarVistos = vi.fn();
const mockListarHistorial = vi.fn();

vi.mock("@/lib/contenidoEducativoApi", () => ({
  listarContenido: (...args: unknown[]) => mockListarContenido(...args),
  listarVistos: (...args: unknown[]) => mockListarVistos(...args),
}));

vi.mock("@/lib/auditoriaConjuntoApi", () => ({
  listarHistorial: (...args: unknown[]) => mockListarHistorial(...args),
}));

const base = { url_video: null, url_guia: null, url_imagen: null, fecha_publicacion: "2026-08-18" };
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
    mockListarVistos.mockResolvedValue([]);
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

  it("usa la imagen de portada del módulo cuando la tiene y el dibujo de la categoría cuando no", async () => {
    mockListarContenido.mockResolvedValue([
      { ...modulos[2], url_imagen: "/uploads/adjuntos/0b9c1a0e-3f4d-4c52-9b57-6f1f2a3b4c5d.png" },
      modulos[0],
    ]);
    renderPagina();

    const conImagen = await tarjetaDe("Puntos limpios y Ecopuntos");
    expect(conImagen.querySelector("img")?.getAttribute("src")).toMatch(/\/uploads\/adjuntos\/0b9c1a0e.*\.png$/);
    expect(conImagen.querySelector("svg[viewBox='0 0 320 150']")).toBeNull();
    const sinImagen = await tarjetaDe("Separación en la fuente y código de colores");
    expect(sinImagen.querySelector("svg[viewBox='0 0 320 150']")).not.toBeNull();
  });

  it("una imagen de portada que no es de la app no se pinta", async () => {
    mockListarContenido.mockResolvedValue([{ ...modulos[2], url_imagen: "https://sitio-malo.com/pixel.png" }]);
    renderPagina();

    const tarjeta = await tarjetaDe("Puntos limpios y Ecopuntos");
    expect(tarjeta.querySelector("img")).toBeNull();
    expect(tarjeta.querySelector("svg[viewBox='0 0 320 150']")).not.toBeNull();
  });

  it("una categoría sin dibujo propio usa el genérico", async () => {
    mockListarContenido.mockResolvedValue([{ ...modulos[2], modulo_categoria: "Una categoría nueva" }]);
    renderPagina();

    const tarjeta = await tarjetaDe("Una categoría nueva");
    expect(tarjeta.querySelector("svg[viewBox='0 0 320 150']")).not.toBeNull();
  });

  describe("lecciones vistas", () => {
    it("una categoría con todos sus módulos vistos dice Visto, y las demás Sin ver", async () => {
      mockListarVistos.mockResolvedValue([modulos[0].id_contenido, modulos[1].id_contenido]);
      renderPagina();

      const vista = await tarjetaDe("Separación en la fuente y código de colores");
      await waitFor(() => expect(within(vista).getByText("Visto")).toBeInTheDocument());
      const pendiente = await tarjetaDe("Puntos limpios y Ecopuntos");
      expect(within(pendiente).getByText("Sin ver")).toBeInTheDocument();
    });

    it("una categoría con solo algunos módulos vistos todavía dice Sin ver", async () => {
      mockListarVistos.mockResolvedValue([modulos[0].id_contenido]);
      renderPagina();

      const tarjeta = await tarjetaDe("Separación en la fuente y código de colores");
      await waitFor(() => expect(within(tarjeta).getByText("Sin ver")).toBeInTheDocument());
    });

    it("muestra el avance con su barra", async () => {
      mockListarVistos.mockResolvedValue([modulos[0].id_contenido]);
      renderPagina();

      const barra = await screen.findByRole("progressbar", { name: "Tu avance" });
      await waitFor(() => expect(barra).toHaveAttribute("aria-valuenow", "1"));
      expect(barra).toHaveAttribute("aria-valuemin", "0");
      expect(barra).toHaveAttribute("aria-valuemax", "3");
      expect(screen.getByText(/de 3 lecciones vistas/)).toBeInTheDocument();
    });

    it("si no se pueden consultar las vistas, el catálogo se ve igual", async () => {
      mockListarVistos.mockRejectedValue(new Error("falló"));
      renderPagina();

      expect(await screen.findByText("Dónde llevar escombros")).toBeInTheDocument();
      expect(screen.getAllByText("Sin ver")).toHaveLength(2);
    });
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

    it("la lección recomendada usa la portada del módulo cuando la tiene", async () => {
      mockListarHistorial.mockResolvedValue(auditoria("REGULAR"));
      mockListarContenido.mockResolvedValue([
        { ...modulos[2], url_imagen: "/uploads/adjuntos/0b9c1a0e-3f4d-4c52-9b57-6f1f2a3b4c5d.png" },
        modulos[0],
      ]);
      renderPagina();

      const recomendada = (await screen.findByText("Recomendado para ti")).closest("a")!;
      expect(recomendada.querySelector("img")?.getAttribute("src")).toMatch(/\/uploads\/adjuntos\/0b9c1a0e.*\.png$/);
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
