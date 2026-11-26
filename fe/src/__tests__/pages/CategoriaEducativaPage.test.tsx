/**
 * Archivo: __tests__/pages/CategoriaEducativaPage.test.tsx
 * Descripción: Tests de una categoría de "Aprende a reciclar" dibujada como lista de lecciones (issue #705).
 * ¿Para qué? Verificar que filtra por categoría (decodificando la URL), que muestra las lecciones en su orden
 *            de lectura con su avance, que el botón "Empezar / Continuar" lleva a la primera sin ver y que
 *            entrar a la categoría ya NO marca nada como visto.
 */

import { screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { vi, beforeEach } from "vitest";
import { CategoriaEducativaPage } from "@/pages/CategoriaEducativaPage";
import { renderWithProviders, mockUser } from "../helpers";
import type { ContenidoEducativo } from "@/lib/contenidoEducativoApi";

const mockListarContenido = vi.fn();
const mockListarVistos = vi.fn();
const mockMarcarVistos = vi.fn();

vi.mock("@/lib/contenidoEducativoApi", () => ({
  listarContenido: (...args: unknown[]) => mockListarContenido(...args),
  listarVistos: (...args: unknown[]) => mockListarVistos(...args),
  marcarVistos: (...args: unknown[]) => mockMarcarVistos(...args),
}));

const ECOPUNTOS = "Puntos limpios y Ecopuntos";
const ID1 = "00000000-0000-7000-8000-000000000001";
const ID2 = "00000000-0000-7000-8000-000000000002";
const ID3 = "00000000-0000-7000-8000-000000000003";

const base = { url_guia: null, url_imagen: null, fecha_publicacion: "2026-08-18" };

// ¿Qué? Llegan desordenados a propósito: la lista debe salir por `orden`, no por cómo llegaron.
const modulos: ContenidoEducativo[] = [
  {
    ...base,
    id_contenido: ID2,
    modulo_categoria: ECOPUNTOS,
    titulo_tema: "Cuándo pasan los Ecopuntos",
    cuerpo_texto: "La UAESP atiende cada zona más o menos cada cuatro semanas.",
    url_video: null,
    orden: 2,
  },
  {
    ...base,
    id_contenido: ID1,
    modulo_categoria: ECOPUNTOS,
    titulo_tema: "Qué son los Ecopuntos",
    cuerpo_texto: "Puntos gratuitos para lo que no cabe en la recolección normal.\n\nQué reciben: muebles y escombros.",
    url_video: "https://www.youtube.com/watch?v=abc12345678",
    orden: 1,
  },
  {
    ...base,
    id_contenido: ID3,
    modulo_categoria: "Otra categoría",
    titulo_tema: "Lección de otra categoría",
    cuerpo_texto: "...",
    url_video: null,
    orden: 1,
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
    mockListarVistos.mockResolvedValue([]);
    mockMarcarVistos.mockResolvedValue([]);
  });

  it("muestra el nombre de la categoría decodificado de la URL y su frase", async () => {
    renderConRuta(ECOPUNTOS);

    expect(await screen.findByRole("heading", { level: 1, name: ECOPUNTOS })).toBeInTheDocument();
    expect(screen.getByText("Dónde llevar muebles, colchones y escombros")).toBeInTheDocument();
  });

  it("lista solo las lecciones de esa categoría, en su orden de lectura", async () => {
    renderConRuta(ECOPUNTOS);

    await screen.findByRole("heading", { level: 1, name: ECOPUNTOS });
    const filas = screen.getAllByRole("listitem");
    expect(filas).toHaveLength(2);
    expect(within(filas[0]).getByText("Qué son los Ecopuntos")).toBeInTheDocument();
    expect(within(filas[1]).getByText("Cuándo pasan los Ecopuntos")).toBeInTheDocument();
    expect(screen.queryByText("Lección de otra categoría", { selector: "li *" })).not.toBeInTheDocument();
  });

  it("cada fila lleva a la página de su lección y muestra la primera frase como resumen", async () => {
    renderConRuta(ECOPUNTOS);

    const fila = (await screen.findByText("Qué son los Ecopuntos")).closest("a")!;
    expect(fila).toHaveAttribute("href", `/catalogo-educativo/leccion/${ID1}`);
    expect(within(fila).getByText("Puntos gratuitos para lo que no cabe en la recolección normal.")).toBeInTheDocument();
  });

  it("marca las lecciones con video", async () => {
    renderConRuta(ECOPUNTOS);

    const conVideo = (await screen.findByText("Qué son los Ecopuntos")).closest("a")!;
    expect(within(conVideo).getByText("Con video")).toBeInTheDocument();
    const sinVideo = screen.getByText("Cuándo pasan los Ecopuntos").closest("a")!;
    expect(within(sinVideo).queryByText("Con video")).not.toBeInTheDocument();
  });

  it("entrar a la categoría NO marca ninguna lección como vista", async () => {
    renderConRuta(ECOPUNTOS);

    await screen.findByRole("heading", { level: 1, name: ECOPUNTOS });
    expect(mockMarcarVistos).not.toHaveBeenCalled();
  });

  describe("avance y botón principal", () => {
    it("sin lecciones vistas: 'Empezar' lleva a la primera y esa fila dice 'Sigue por aquí'", async () => {
      renderConRuta(ECOPUNTOS);

      const boton = await screen.findByRole("link", { name: /Empezar: Qué son los Ecopuntos/ });
      expect(boton).toHaveAttribute("href", `/catalogo-educativo/leccion/${ID1}`);
      expect(screen.getByText("2 lecciones · 0 vistas")).toBeInTheDocument();
      const primera = screen.getByText("Qué son los Ecopuntos", { selector: "span" }).closest("a")!;
      expect(within(primera).getByText("Sigue por aquí")).toBeInTheDocument();
    });

    it("con algunas vistas: 'Continuar' lleva a la primera sin ver y las vistas llevan su marca", async () => {
      mockListarVistos.mockResolvedValue([ID1]);
      renderConRuta(ECOPUNTOS);

      const boton = await screen.findByRole("link", { name: /Continuar: Cuándo pasan los Ecopuntos/ });
      expect(boton).toHaveAttribute("href", `/catalogo-educativo/leccion/${ID2}`);
      await waitFor(() => expect(screen.getByText("2 lecciones · 1 vista")).toBeInTheDocument());
      const barra = screen.getByRole("progressbar");
      expect(barra).toHaveAttribute("aria-valuenow", "1");
      expect(barra).toHaveAttribute("aria-valuemax", "2");
      const vista = screen.getByText("Qué son los Ecopuntos", { selector: "span" }).closest("a")!;
      expect(within(vista).getByLabelText("Visto")).toBeInTheDocument();
    });

    it("con todas vistas: dice 'Categoría completa' y no ofrece 'Continuar', pero se puede abrir cualquiera", async () => {
      mockListarVistos.mockResolvedValue([ID1, ID2]);
      renderConRuta(ECOPUNTOS);

      expect(await screen.findByText("Categoría completa")).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /Continuar|Empezar/ })).not.toBeInTheDocument();
      expect(screen.getByText("Qué son los Ecopuntos").closest("a")).toHaveAttribute("href", `/catalogo-educativo/leccion/${ID1}`);
    });

    it("si no se pueden consultar las vistas, la lista se ve igual, sin marcas", async () => {
      mockListarVistos.mockRejectedValue(new Error("falló"));
      renderConRuta(ECOPUNTOS);

      expect(await screen.findByRole("link", { name: /Empezar: Qué son los Ecopuntos/ })).toBeInTheDocument();
    });
  });

  it("las otras categorías van en 'Sigue aprendiendo'", async () => {
    renderConRuta(ECOPUNTOS);

    await screen.findByRole("heading", { level: 1, name: ECOPUNTOS });
    const seguir = screen.getByRole("heading", { name: "Sigue aprendiendo" }).closest("section")!;
    const enlace = within(seguir).getByText("Otra categoría").closest("a")!;
    expect(enlace).toHaveAttribute("href", `/catalogo-educativo/${encodeURIComponent("Otra categoría")}`);
  });

  it("una categoría que no existe lo dice", async () => {
    renderConRuta("Categoría inexistente");

    expect(await screen.findByText("No se encontró contenido para esta categoría.")).toBeInTheDocument();
  });

  it("tiene un enlace para volver a Aprende a reciclar", async () => {
    renderConRuta(ECOPUNTOS);

    const volver = await screen.findByRole("link", { name: /Volver a Aprende a reciclar/ });
    expect(volver).toHaveAttribute("href", "/catalogo-educativo");
  });
});
