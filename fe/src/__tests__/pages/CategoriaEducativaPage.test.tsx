/**
 * Archivo: __tests__/pages/CategoriaEducativaPage.test.tsx
 * Descripción: Tests de la vista de detalle de una categoría educativa.
 * ¿Para qué? Verificar que filtra correctamente por categoría (decodificando
 *            la URL) y muestra el video/guía de cada tema.
 */

import { screen, waitFor } from "@testing-library/react";
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
    id_contenido: 1,
    modulo_categoria: "Puntos limpios y Ecopuntos",
    titulo_tema: "Dónde llevar escombros",
    cuerpo_texto: "Los Ecopuntos reciben residuos voluminosos.",
    url_video: "https://www.youtube.com/watch?v=abc12345678",
    url_guia: "https://bogota.gov.co/ecopuntos",
    fecha_publicacion: "2026-08-18",
  },
  {
    id_contenido: 2,
    modulo_categoria: "Otra categoría",
    titulo_tema: "No debería aparecer",
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
      authContext: { user: mockUser, isAuthenticated: true, accessToken: "token" },
      initialRoute: `/catalogo-educativo/${encodeURIComponent(categoria)}`,
    }
  );
}

describe("CategoriaEducativaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarContenido.mockResolvedValue(modulos);
  });

  it("muestra el título de la categoría decodificada de la URL", async () => {
    renderConRuta("Puntos limpios y Ecopuntos");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Puntos limpios y Ecopuntos" })).toBeInTheDocument();
    });
  });

  it("solo muestra los temas de esa categoría", async () => {
    renderConRuta("Puntos limpios y Ecopuntos");

    await waitFor(() => {
      expect(screen.getByText("Dónde llevar escombros")).toBeInTheDocument();
    });
    expect(screen.queryByText("No debería aparecer")).not.toBeInTheDocument();
  });

  it("muestra el link de guía cuando existe", async () => {
    renderConRuta("Puntos limpios y Ecopuntos");

    await waitFor(() => {
      const link = screen.getByRole("link", { name: /ver guía de apoyo/i });
      expect(link).toHaveAttribute("href", "https://bogota.gov.co/ecopuntos");
    });
  });

  it("muestra un mensaje si la categoría no tiene contenido", async () => {
    renderConRuta("Categoría inexistente");

    await waitFor(() => {
      expect(screen.getByText("No se encontró contenido para esta categoría.")).toBeInTheDocument();
    });
  });
});
