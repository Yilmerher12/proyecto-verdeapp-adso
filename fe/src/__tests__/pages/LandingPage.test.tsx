/**
 * Archivo: __tests__/pages/LandingPage.test.tsx
 * Descripción: Tests de la sección "¿Cómo funciona?" de la landing.
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
