/**
 * Archivo: __tests__/pages/LandingPage.test.tsx
 * Descripción: Tests del hero y de la sección "¿Cómo funciona?" de la landing.
 * ¿Para qué? Verificar que los 3 pasos salen en orden, como lista ordenada,
 *           con su título, y que ya no dependen de imágenes PNG.
 * ¿Impacto? Sin estos tests, un cambio en PASOS_META podría dejar un paso
 *           sin texto o volver a meter las imágenes que se quitaron.
 */

import { screen, within } from "@testing-library/react";
import { LandingPage } from "@/pages/LandingPage";
import { renderWithProviders } from "../helpers";

describe("LandingPage — ¿Cómo funciona?", () => {
  const seccion = () => screen.getByRole("region", { name: "Tres pasos, un ciclo completo" });

  it("muestra los 3 pasos en orden dentro de una lista ordenada", () => {
    renderWithProviders(<LandingPage />, { initialRoute: "/" });

    const lista = within(seccion()).getByRole("list");
    expect(lista.tagName).toBe("OL");

    const titulos = within(lista)
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(titulos).toEqual(["El conjunto se afilia", "Los residentes participan", "El reciclador actúa"]);
  });

  // ¿Qué? Cada paso lleva un ícono SVG (lucide) y ninguna imagen <img>.
  it("usa íconos SVG en lugar de imágenes", () => {
    renderWithProviders(<LandingPage />, { initialRoute: "/" });

    const pasos = within(seccion()).getAllByRole("listitem");
    expect(pasos).toHaveLength(3);
    for (const paso of pasos) {
      expect(paso.querySelector("svg")).not.toBeNull();
      expect(paso.querySelector("img")).toBeNull();
    }
  });
});

describe("LandingPage — hero", () => {
  // ¿Qué? El hero muestra solo el nombre como título animado; el eslogan
  //       "Cambiando el mundo" se quitó por ser texto de más.
  it("muestra VerdeApp como título y ya no muestra el eslogan", () => {
    renderWithProviders(<LandingPage />, { initialRoute: "/" });

    expect(screen.getByRole("heading", { level: 1, name: "VerdeApp" })).toBeInTheDocument();
    expect(screen.queryByText("Cambiando el mundo")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Cambiando el mundo")).not.toBeInTheDocument();
  });

  // ¿Qué? El hero ya no ocupa el 100% del alto de la pantalla.
  // ¿Para qué? Si lo ocupa todo, no asoma la siguiente sección y el visitante
  //           no sabe que puede bajar (issue #453).
  // ¿Impacto? Si alguien vuelve a poner `min-h-screen`, esta prueba falla.
  it("no ocupa toda la pantalla, para que asome la sección de abajo", () => {
    renderWithProviders(<LandingPage />, { initialRoute: "/" });

    const hero = screen.getByRole("region", { name: "VerdeApp" });
    expect(hero).not.toHaveClass("min-h-screen");
    expect(hero.className).toContain("min-h-[75svh]");
  });

  it("lleva los botones a login y registro, con jerarquía distinta", () => {
    renderWithProviders(<LandingPage />, { initialRoute: "/" });

    const registro = screen.getByRole("link", { name: /Unirse a VerdeApp/ });
    const login = screen.getByRole("link", { name: "Ya tengo cuenta" });
    expect(registro).toHaveAttribute("href", "/register");
    expect(login).toHaveAttribute("href", "/login");
    // El principal va relleno de blanco; el secundario solo con borde.
    expect(registro).toHaveClass("bg-white");
    expect(login).not.toHaveClass("bg-white");
  });

  // ¿Qué? En modo oscuro el botón principal usa verde claro, no blanco puro.
  // ¿Impacto? Si se quitan las clases `dark:`, el botón vuelve a encandilar de noche.
  it("adapta los colores de los botones al modo oscuro", () => {
    renderWithProviders(<LandingPage />, { initialRoute: "/" });

    expect(screen.getByRole("link", { name: /Unirse a VerdeApp/ })).toHaveClass("dark:bg-accent-300", "dark:text-accent-950");
    expect(screen.getByRole("link", { name: "Ya tengo cuenta" })).toHaveClass("dark:border-accent-200", "dark:text-accent-50");
  });
});
