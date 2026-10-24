/**
 * Archivo: __tests__/pages/CategoriaEducativaPage.test.tsx
 * Descripción: Tests de una categoría de "Aprende a reciclar" dibujada como muro.
 * ¿Para qué? Verificar que filtra por categoría (decodificando la URL), que parte el
 *            texto en tarjetas y que solo pinta enlaces seguros y ninguna imagen
 *            escrita dentro del texto.
 */

import { screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { vi, beforeEach } from "vitest";
import { CategoriaEducativaPage } from "@/pages/CategoriaEducativaPage";
import { renderWithProviders, mockUser } from "../helpers";
import type { ContenidoEducativo } from "@/lib/contenidoEducativoApi";

const mockListarContenido = vi.fn();

vi.mock("@/lib/contenidoEducativoApi", () => ({
  listarContenido: (...args: unknown[]) => mockListarContenido(...args),
}));

const modulos: ContenidoEducativo[] = [
  {
    id_contenido: "00000000-0000-7000-8000-000000000001",
    modulo_categoria: "Puntos limpios y Ecopuntos",
    titulo_tema: "Dónde llevar escombros",
    cuerpo_texto: "Los Ecopuntos reciben residuos voluminosos.",
    url_video: "https://www.youtube.com/watch?v=abc12345678",
    url_guia: "https://bogota.gov.co/ecopuntos",
    fecha_publicacion: "2026-08-18",
  },
  {
    id_contenido: "00000000-0000-7000-8000-000000000002",
    modulo_categoria: "Otra categoría",
    titulo_tema: "Lección de otra categoría",
    cuerpo_texto: "...",
    url_video: null,
    url_guia: null,
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

    it("una imagen escrita dentro del texto no se pinta, sea de VerdeApp o de otro sitio", async () => {
      mockListarContenido.mockResolvedValue([
        {
          ...modulos[0],
          cuerpo_texto:
            "Introducción.\n\n![propia](/uploads/adjuntos/0b9c1a0e-3f4d-4c52-9b57-6f1f2a3b4c5d.png)\n\n![rastreo](https://sitio-malo.com/pixel.png)\n\nBolsa blanca: material limpio.",
        },
      ]);
      renderConRuta("Puntos limpios y Ecopuntos");

      const tarjeta = (await screen.findByRole("heading", { name: "Bolsa blanca" })).closest("article")!;
      expect(tarjeta.querySelector("img")).toBeNull();
      expect(document.querySelector("img[src*='sitio-malo']")).toBeNull();
      expect(document.querySelector("img[src*='uploads']")).toBeNull();
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

  it("no marca nada como visto ni muestra la etiqueta (eso llega en otra tarjeta)", async () => {
    renderConRuta("Puntos limpios y Ecopuntos");

    await screen.findByRole("heading", { level: 1, name: "Dónde llevar escombros" });
    expect(screen.queryByText("Visto")).not.toBeInTheDocument();
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
