/**
 * Archivo: __tests__/components/FechaEnPalabras.test.tsx
 * Descripción: Issue #633 — la frase con el mes en palabras que va debajo de los campos de fecha.
 */
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FechaEnPalabras } from "@/components/ui/FechaEnPalabras";
import { renderWithProviders } from "../helpers";

describe("FechaEnPalabras", () => {
  it("escribe la fecha con el mes en palabras", () => {
    renderWithProviders(<FechaEnPalabras valor="2026-11-20" />);

    expect(screen.getByText("20 de noviembre de 2026")).toBeInTheDocument();
  });

  it("con una frase la usa y le pone la fecha", () => {
    renderWithProviders(<FechaEnPalabras valor="2026-11-20" frase="comunicados.admin.expiraEl" />);

    expect(screen.getByText("Expira el 20 de noviembre de 2026")).toBeInTheDocument();
  });

  it("no dibuja nada si el campo está vacío", () => {
    const { container } = renderWithProviders(<FechaEnPalabras valor="" frase="comunicados.admin.expiraEl" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("avisa el cambio a un lector de pantalla", () => {
    renderWithProviders(<FechaEnPalabras valor="2026-11-20" />);

    expect(screen.getByText("20 de noviembre de 2026")).toHaveAttribute("aria-live", "polite");
  });
});
