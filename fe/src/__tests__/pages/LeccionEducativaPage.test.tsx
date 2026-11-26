/**
 * Archivo: __tests__/pages/LeccionEducativaPage.test.tsx
 * Descripción: Tests de la página de una lección de "Aprende a reciclar" (issue #705).
 * ¿Para qué? Verificar que dibuja la lección como una sola tarjeta con su ruta, que marca como vista SOLO la
 *            lección que se abre, que "Anterior / Siguiente" siguen el orden de la categoría, que solo pinta
 *            enlaces seguros y que avisa cuando la lección ya no existe.
 */

import { screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { vi, beforeEach } from "vitest";
import { LeccionEducativaPage } from "@/pages/LeccionEducativaPage";
import { renderWithProviders, mockUser } from "../helpers";
import type { ContenidoEducativo } from "@/lib/contenidoEducativoApi";

const mockListarContenido = vi.fn();
const mockMarcarVistos = vi.fn();

vi.mock("@/lib/contenidoEducativoApi", () => ({
  listarContenido: (...args: unknown[]) => mockListarContenido(...args),
  marcarVistos: (...args: unknown[]) => mockMarcarVistos(...args),
}));

const CATEGORIA = "Residuos peligrosos del hogar";
const ID1 = "00000000-0000-7000-8000-000000000001";
const ID2 = "00000000-0000-7000-8000-000000000002";
const ID3 = "00000000-0000-7000-8000-000000000003";
const base = { url_imagen: null, fecha_publicacion: "2026-11-26", modulo_categoria: CATEGORIA };

const modulos: ContenidoEducativo[] = [
  {
    ...base,
    id_contenido: ID1,
    titulo_tema: "Pilas: ¿qué hago con las del control remoto?",
    cuerpo_texto: "Las pilas no van a la basura.\n\nQué hacer: junta las pilas en una bolsa plástica.",
    url_video: "https://www.youtube.com/watch?v=abc12345678",
    url_guia: "https://bogota.gov.co/guia-pilas",
    orden: 1,
  },
  {
    ...base,
    id_contenido: ID2,
    titulo_tema: "Bombillas ahorradoras: ¿qué hago cuando se funden?",
    cuerpo_texto:
      "Tienen mercurio. Se entregan en puntos de posconsumo.\n\n**Cómo llevarlas**\n- Guárdalas en una caja de cartón\n- Evita que se rompan\n- Busca el punto en el [Visor Ambiental](https://visorgeo.ambientebogota.gov.co/)\n- Si es un aparato, mira [Aparatos](/catalogo-educativo/Aparatos%2C%20llantas)\n\nFuente: Guía de posconsumo (abril de 2026).",
    url_video: null,
    url_guia: "javascript:alert(1)",
    orden: 2,
  },
  {
    ...base,
    id_contenido: ID3,
    titulo_tema: "Jeringas y agujas: ¿a dónde van?",
    cuerpo_texto: "Pueden lastimar a quien recoge la basura.",
    url_video: null,
    url_guia: null,
    orden: 3,
  },
];

function renderLeccion(id: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/catalogo-educativo/leccion/:id" element={<LeccionEducativaPage />} />
    </Routes>,
    {
      authContext: { user: mockUser, isAuthenticated: true },
      initialRoute: `/catalogo-educativo/leccion/${id}`,
    }
  );
}

describe("LeccionEducativaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarContenido.mockResolvedValue(modulos);
    mockMarcarVistos.mockResolvedValue([]);
  });

  describe("la lección", () => {
    it("muestra su título como el único h1, con la introducción y sus secciones adentro de una sola tarjeta", async () => {
      renderLeccion(ID2);

      const titulo = await screen.findByRole("heading", { level: 1, name: "Bombillas ahorradoras: ¿qué hago cuando se funden?" });
      const tarjeta = titulo.closest("article")!;
      expect(within(tarjeta).getByText("Tienen mercurio. Se entregan en puntos de posconsumo.")).toBeInTheDocument();
      expect(within(tarjeta).getByRole("heading", { level: 3, name: "Cómo llevarlas" })).toBeInTheDocument();
      expect(within(tarjeta).getByText("Guárdalas en una caja de cartón")).toBeInTheDocument();
    });

    it("la 'Fuente' va como una línea al pie y no como una sección", async () => {
      renderLeccion(ID2);

      const tarjeta = (await screen.findByRole("heading", { level: 1 })).closest("article")!;
      expect(within(tarjeta).queryByRole("heading", { name: "Fuente" })).not.toBeInTheDocument();
      const pie = tarjeta.querySelector("footer")!;
      expect(within(pie).getByText(/Guía de posconsumo \(abril de 2026\)/)).toBeInTheDocument();
    });

    it("un enlace que empieza con / abre en la misma pestaña y uno externo en una pestaña nueva", async () => {
      renderLeccion(ID2);

      const tarjeta = (await screen.findByRole("heading", { level: 1 })).closest("article")!;
      const interno = within(tarjeta).getByRole("link", { name: "Aparatos" });
      expect(interno).toHaveAttribute("href", "/catalogo-educativo/Aparatos%2C%20llantas");
      expect(interno).not.toHaveAttribute("target");
      const externo = within(tarjeta).getByRole("link", { name: "Visor Ambiental" });
      expect(externo).toHaveAttribute("href", "https://visorgeo.ambientebogota.gov.co/");
      expect(externo).toHaveAttribute("target", "_blank");
    });

    it("con video dibuja el reproductor y con guía segura muestra el botón", async () => {
      renderLeccion(ID1);

      expect(await screen.findByRole("button", { name: /Reproducir video/ })).toBeInTheDocument();
      const guia = screen.getByRole("link", { name: /Abrir la guía oficial/ });
      expect(guia).toHaveAttribute("href", "https://bogota.gov.co/guia-pilas");
      expect(guia).toHaveAttribute("rel", expect.stringContaining("noopener"));
    });

    it("una guía con un enlace inseguro no se pinta", async () => {
      renderLeccion(ID2);

      await screen.findByRole("heading", { level: 1 });
      expect(screen.queryByRole("link", { name: /Abrir la guía oficial/ })).not.toBeInTheDocument();
    });
  });

  describe("marca de visto", () => {
    it("marca como vista solo la lección que se abre", async () => {
      renderLeccion(ID2);

      await screen.findByRole("heading", { level: 1 });
      await waitFor(() => expect(mockMarcarVistos).toHaveBeenCalledTimes(1));
      expect(mockMarcarVistos).toHaveBeenCalledWith([ID2]);
    });

    it("si falla la llamada que marca, la lección se ve igual", async () => {
      mockMarcarVistos.mockRejectedValue(new Error("falló"));
      renderLeccion(ID2);

      expect(await screen.findByRole("heading", { level: 1, name: /Bombillas ahorradoras/ })).toBeInTheDocument();
    });
  });

  describe("ruta de navegación", () => {
    it("muestra Aprende a reciclar › categoría › lección, con los dos primeros como enlaces", async () => {
      renderLeccion(ID2);

      const ruta = await screen.findByRole("navigation", { name: "Ruta de navegación" });
      const enlaces = within(ruta).getAllByRole("link");
      const catalogo = enlaces.find((a) => a.textContent === "Aprende a reciclar")!;
      expect(catalogo).toHaveAttribute("href", "/catalogo-educativo");
      const categoria = enlaces.find((a) => a.getAttribute("href") === `/catalogo-educativo/${encodeURIComponent(CATEGORIA)}`)!;
      expect(categoria).toBeInTheDocument();
      expect(within(ruta).getByText("Bombillas ahorradoras: ¿qué hago cuando se funden?", { selector: "li" })).toHaveAttribute(
        "aria-current",
        "page"
      );
    });
  });

  describe("anterior y siguiente", () => {
    it("una lección del medio tiene las dos, en el orden de su categoría", async () => {
      renderLeccion(ID2);

      const vecinos = await screen.findByRole("navigation", { name: "Anterior y siguiente lección" });
      const [anterior, siguiente] = within(vecinos).getAllByRole("link");
      expect(anterior).toHaveAttribute("href", `/catalogo-educativo/leccion/${ID1}`);
      expect(within(anterior).getByText("Anterior")).toBeInTheDocument();
      expect(siguiente).toHaveAttribute("href", `/catalogo-educativo/leccion/${ID3}`);
      expect(within(siguiente).getByText("Siguiente")).toBeInTheDocument();
    });

    it("la primera lección no tiene 'Anterior'", async () => {
      renderLeccion(ID1);

      const vecinos = await screen.findByRole("navigation", { name: "Anterior y siguiente lección" });
      expect(within(vecinos).queryByText("Anterior")).not.toBeInTheDocument();
      expect(within(vecinos).getByText("Siguiente")).toBeInTheDocument();
    });

    it("la última lección no tiene 'Siguiente'", async () => {
      renderLeccion(ID3);

      const vecinos = await screen.findByRole("navigation", { name: "Anterior y siguiente lección" });
      expect(within(vecinos).getByText("Anterior")).toBeInTheDocument();
      expect(within(vecinos).queryByText("Siguiente")).not.toBeInTheDocument();
    });

    it("si la categoría tiene una sola lección, no hay ninguna de las dos", async () => {
      mockListarContenido.mockResolvedValue([modulos[0]]);
      renderLeccion(ID1);

      await screen.findByRole("heading", { level: 1 });
      expect(screen.queryByRole("navigation", { name: "Anterior y siguiente lección" })).not.toBeInTheDocument();
    });
  });

  describe("casos de respaldo", () => {
    it("una lección que ya no existe lo dice, con un enlace al catálogo, y no marca nada", async () => {
      renderLeccion("00000000-0000-7000-8000-0000000000ff");

      expect(await screen.findByText("Esta lección ya no está disponible.")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Volver a Aprende a reciclar/ })).toHaveAttribute("href", "/catalogo-educativo");
      expect(mockMarcarVistos).not.toHaveBeenCalled();
    });

    it("si no se puede cargar el catálogo, muestra un aviso y el enlace para volver", async () => {
      mockListarContenido.mockRejectedValue(new Error("falló"));
      renderLeccion(ID1);

      expect(await screen.findByText("No se pudo cargar la lección.")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Volver a Aprende a reciclar/ })).toBeInTheDocument();
    });
  });
});
