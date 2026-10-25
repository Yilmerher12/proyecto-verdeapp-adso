/**
 * Archivo: __tests__/pages/CategoriaEducativaPage.test.tsx
 * Descripción: Tests de una categoría de "Aprende a reciclar" dibujada como muro.
 * ¿Para qué? Verificar que filtra por categoría (decodificando la URL), que parte el
 *            texto en tarjetas, que solo pinta enlaces seguros y ninguna imagen
 *            escrita dentro del texto, y que marca la lección como vista.
 */

import { screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { vi, beforeEach } from "vitest";
import { CategoriaEducativaPage } from "@/pages/CategoriaEducativaPage";
import { renderWithProviders, mockUser } from "../helpers";
import type { ContenidoEducativo } from "@/lib/contenidoEducativoApi";

const mockListarContenido = vi.fn();
const mockMarcarVistos = vi.fn();

vi.mock("@/lib/contenidoEducativoApi", () => ({
  listarContenido: (...args: unknown[]) => mockListarContenido(...args),
  marcarVistos: (...args: unknown[]) => mockMarcarVistos(...args),
}));

const IMAGEN = "/uploads/adjuntos/0b9c1a0e-3f4d-4c52-9b57-6f1f2a3b4c5d.png";

const modulos: ContenidoEducativo[] = [
  {
    id_contenido: "00000000-0000-7000-8000-000000000001",
    modulo_categoria: "Puntos limpios y Ecopuntos",
    titulo_tema: "Dónde llevar escombros",
    cuerpo_texto: "Los Ecopuntos reciben residuos voluminosos.",
    url_video: "https://www.youtube.com/watch?v=abc12345678",
    url_guia: "https://bogota.gov.co/ecopuntos",
    url_imagen: null,
    fecha_publicacion: "2026-08-18",
  },
  {
    id_contenido: "00000000-0000-7000-8000-000000000002",
    modulo_categoria: "Otra categoría",
    titulo_tema: "Lección de otra categoría",
    cuerpo_texto: "...",
    url_video: null,
    url_guia: null,
    url_imagen: null,
    fecha_publicacion: "2026-08-18",
  },
];

function renderConRuta(categoria: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/catalogo-educativo/:categoria" element={<CategoriaEducativaPage />} />
    </Routes>,
    {
      authContext: { user: mockUser, isAuthenticated: true },
      initialRoute: `/catalogo-educativo/${encodeURIComponent(categoria)}`,
    }
  );
}

describe("CategoriaEducativaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarContenido.mockResolvedValue(modulos);
    mockMarcarVistos.mockResolvedValue([]);
  });

  it("muestra el nombre de la categoría decodificado de la URL y el título de la lección", async () => {
    renderConRuta("Puntos limpios y Ecopuntos");

    expect(await screen.findByRole("heading", { level: 1, name: "Dónde llevar escombros" })).toBeInTheDocument();
    expect(screen.getAllByText("Puntos limpios y Ecopuntos").length).toBeGreaterThan(0);
  });

  it("solo muestra los temas de esa categoría; las demás van en 'Sigue aprendiendo'", async () => {
    renderConRuta("Puntos limpios y Ecopuntos");

    await screen.findByRole("heading", { level: 1, name: "Dónde llevar escombros" });
    const seguir = screen.getByRole("heading", { name: "Sigue aprendiendo" }).closest("section")!;
    expect(within(seguir).getByText("Lección de otra categoría")).toBeInTheDocument();
    expect(within(seguir).queryByText("Dónde llevar escombros")).not.toBeInTheDocument();
  });

  it("cuenta lecciones, videos y guías de la categoría", async () => {
    renderConRuta("Puntos limpios y Ecopuntos");

    expect(await screen.findByText(/1 lección · 1 video · 1 guía/)).toBeInTheDocument();
  });

  describe("el texto como muro", () => {
    const texto = [
      "Los Ecopuntos son puntos fijos de la UAESP para voluminosos.",
      "Qué se puede llevar: muebles viejos, colchones y escombros.",
      "Qué NO se puede llevar: llantas ni electrodomésticos.",
      "Usar los Ecopuntos evita que estos elementos terminen abandonados.",
    ].join("\n\n");

    beforeEach(() => {
      mockListarContenido.mockResolvedValue([{ ...modulos[0], cuerpo_texto: texto }]);
    });

    it("el primer párrafo es 'De qué trata' y cada párrafo con título es una tarjeta", async () => {
      renderConRuta("Puntos limpios y Ecopuntos");

      expect(await screen.findByText("De qué trata")).toBeInTheDocument();
      expect(screen.getByText(/puntos fijos de la UAESP/)).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 3, name: "Qué se puede llevar" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 3, name: "Qué NO se puede llevar" })).toBeInTheDocument();
    });

    it("el último párrafo sin título se muestra como cierre", async () => {
      renderConRuta("Puntos limpios y Ecopuntos");

      const cierre = (await screen.findByText(/evita que estos elementos terminen abandonados/)).closest("div")!;
      expect(cierre.closest("article")).toBeNull();
    });

    it("la imagen escrita antes de un párrafo se muestra en su tarjeta, y el resto no tiene imagen", async () => {
      mockListarContenido.mockResolvedValue([
        {
          ...modulos[0],
          cuerpo_texto: `Introducción.\n\nBolsa blanca: limpio.\n\n![foto](${IMAGEN})\n\nBolsa negra: ordinarios.\n\nGracias por separar.`,
        },
      ]);
      renderConRuta("Puntos limpios y Ecopuntos");

      const conImagen = (await screen.findByRole("heading", { name: "Bolsa negra" })).closest("article")!;
      expect(conImagen.querySelector("img")?.getAttribute("src")).toMatch(/\/uploads\/adjuntos\/0b9c1a0e.*\.png$/);
      const sinImagen = screen.getByRole("heading", { name: "Bolsa blanca" }).closest("article")!;
      expect(sinImagen.querySelector("img")).toBeNull();
    });

    it("una tarjeta con imagen no se toma como cierre de la lección", async () => {
      mockListarContenido.mockResolvedValue([
        {
          ...modulos[0],
          cuerpo_texto: `Introducción.\n\nBolsa blanca: limpio.\n\n![foto](${IMAGEN})\n\nUn párrafo final con su imagen.`,
        },
      ]);
      renderConRuta("Puntos limpios y Ecopuntos");

      const tarjeta = (await screen.findByText("Un párrafo final con su imagen.")).closest("article");
      expect(tarjeta?.querySelector("img")).not.toBeNull();
    });

    it("una imagen de otro sitio dentro del texto no se pinta, y una suelta dentro de un párrafo tampoco", async () => {
      mockListarContenido.mockResolvedValue([
        {
          ...modulos[0],
          cuerpo_texto:
            "Introducción.\n\n![rastreo](https://sitio-malo.com/pixel.png)\n\nBolsa blanca: limpio ![pixel](/uploads/adjuntos/7d1e2f3a-4b5c-4d6e-8f70-a1b2c3d4e5f6.jpg) y seco.",
        },
      ]);
      renderConRuta("Puntos limpios y Ecopuntos");

      const tarjeta = (await screen.findByRole("heading", { name: "Bolsa blanca" })).closest("article")!;
      expect(tarjeta.querySelector("img")).toBeNull();
      expect(document.querySelector("img[src*='sitio-malo']")).toBeNull();
      expect(document.querySelector("img[src*='7d1e2f3a']")).toBeNull();
    });
  });

  describe("guía de apoyo", () => {
    it("muestra el botón de la guía cuando existe", async () => {
      renderConRuta("Puntos limpios y Ecopuntos");

      const link = await screen.findByRole("link", { name: /abrir la guía oficial/i });
      expect(link).toHaveAttribute("href", "https://bogota.gov.co/ecopuntos");
    });

    // ¿Qué? Si la guía viene de un archivo subido a VerdeApp (ruta relativa), el href debe
    //       completarse con la URL del backend; si no, el navegador la busca en el frontend.
    it("completa con la URL del backend cuando la guía es un archivo subido", async () => {
      mockListarContenido.mockResolvedValue([{ ...modulos[0], url_guia: "/uploads/adjuntos/guia123.pdf" }]);
      renderConRuta("Puntos limpios y Ecopuntos");

      const link = await screen.findByRole("link", { name: /abrir la guía oficial/i });
      expect(link.getAttribute("href")).toMatch(/\/uploads\/adjuntos\/guia123\.pdf$/);
      expect(link.getAttribute("href")).not.toBe("/uploads/adjuntos/guia123.pdf");
    });

    // ¿Qué? Issue #400 (CN-048): una guía con un enlace inseguro no se pinta.
    it.each(["javascript:alert(1)", "/uploads/%2e%2e/api/v1/users/me", "http://sitio-malo.com/guia.pdf"])(
      "no pinta el link de guía %s",
      async (url) => {
        mockListarContenido.mockResolvedValue([{ ...modulos[0], url_guia: url }]);
        renderConRuta("Puntos limpios y Ecopuntos");

        expect(await screen.findByRole("heading", { level: 1, name: "Dónde llevar escombros" })).toBeInTheDocument();
        expect(screen.queryByRole("link", { name: /abrir la guía oficial/i })).not.toBeInTheDocument();
      }
    );
  });

  describe("portada", () => {
    it("con portada y sin video, la lección la muestra arriba en vez del dibujo", async () => {
      mockListarContenido.mockResolvedValue([{ ...modulos[0], url_video: null, url_imagen: IMAGEN }]);
      renderConRuta("Puntos limpios y Ecopuntos");

      const lección = (await screen.findByRole("region", { name: "Dónde llevar escombros" })) as HTMLElement;
      expect(lección.querySelector("img")?.getAttribute("src")).toMatch(/\/uploads\/adjuntos\/0b9c1a0e.*\.png$/);
    });

    it("«Sigue aprendiendo» usa la portada de la otra categoría", async () => {
      mockListarContenido.mockResolvedValue([modulos[0], { ...modulos[1], url_imagen: IMAGEN }]);
      renderConRuta("Puntos limpios y Ecopuntos");

      const seguir = (await screen.findByRole("heading", { name: "Sigue aprendiendo" })).closest("section")!;
      expect(seguir.querySelector("img")?.getAttribute("src")).toMatch(/\/uploads\/adjuntos\/0b9c1a0e.*\.png$/);
    });

    it("una portada que no es de la app no se pinta", async () => {
      mockListarContenido.mockResolvedValue([modulos[0], { ...modulos[1], url_imagen: "https://sitio-malo.com/pixel.png" }]);
      renderConRuta("Puntos limpios y Ecopuntos");

      const seguir = (await screen.findByRole("heading", { name: "Sigue aprendiendo" })).closest("section")!;
      expect(seguir.querySelector("img")).toBeNull();
    });
  });

  describe("lecciones vistas", () => {
    it("al abrir la categoría marca sus módulos como vistos y muestra Visto", async () => {
      renderConRuta("Puntos limpios y Ecopuntos");

      await waitFor(() => expect(mockMarcarVistos).toHaveBeenCalledWith([modulos[0].id_contenido]));
      expect(await screen.findByText("Visto")).toBeInTheDocument();
    });

    it("si no se puede guardar lo visto, la página se ve igual, sin la marca", async () => {
      mockMarcarVistos.mockRejectedValue(new Error("falló"));
      renderConRuta("Puntos limpios y Ecopuntos");

      expect(await screen.findByRole("heading", { level: 1, name: "Dónde llevar escombros" })).toBeInTheDocument();
      await waitFor(() => expect(mockMarcarVistos).toHaveBeenCalled());
      expect(screen.queryByText("Visto")).not.toBeInTheDocument();
    });

    it("una categoría sin contenido no marca nada", async () => {
      renderConRuta("Categoría inexistente");

      expect(await screen.findByText("No se encontró contenido para esta categoría.")).toBeInTheDocument();
      expect(mockMarcarVistos).not.toHaveBeenCalled();
    });
  });

  it("con varias lecciones, cada una lleva su título y el encabezado es la categoría", async () => {
    mockListarContenido.mockResolvedValue([
      modulos[0],
      { ...modulos[0], id_contenido: "00000000-0000-7000-8000-000000000009", titulo_tema: "Segunda lección" },
    ]);
    renderConRuta("Puntos limpios y Ecopuntos");

    expect(await screen.findByRole("heading", { level: 1, name: "Puntos limpios y Ecopuntos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Dónde llevar escombros" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Segunda lección" })).toBeInTheDocument();
  });
});
