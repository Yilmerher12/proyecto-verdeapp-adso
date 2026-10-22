/**
 * Archivo: __tests__/components/ThemeToggle.test.tsx
 * Descripción: Tests del componente ThemeToggle — cambio entre dark/light mode.
 * ¿Para qué? Verificar que el toggle cambia la clase "dark" en html y persiste en localStorage.
 * ¿Impacto? Sin estos tests, un cambio en ThemeToggle podría romper todo el dark mode.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    // ¿Qué? Limpia la clase dark del html antes de cada test.
    document.documentElement.classList.remove("dark");
    localStorage.clear();
  });

  // ¿Qué? Verifica que el botón se renderiza.
  it("renderiza el botón de toggle de tema", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  // ¿Qué? Verifica que tiene aria-label descriptivo.
  it("tiene aria-label accesible", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    // El aria-label depende del estado (oscuro/claro).
    expect(
      button.getAttribute("aria-label") === "Cambiar a tema oscuro" ||
        button.getAttribute("aria-label") === "Cambiar a tema claro",
    ).toBe(true);
  });

  // ¿Qué? WCAG 4.1.2 — un botón de dos estados debe comunicar cuál está
  //       activo con aria-pressed, no solo con su ícono/aria-label.
  it("comunica el estado activo con aria-pressed", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const button = screen.getByRole("button");

    expect(button.getAttribute("aria-pressed")).toBe("false");
    await user.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    await user.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  // ¿Qué? Verifica que al hacer clic se alterna el tema.
  it("alterna la clase 'dark' en html al hacer clic", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = screen.getByRole("button");

    // Inicialmente light (sin dark), clic → dark.
    await user.click(button);
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // Segundo clic → vuelve a light.
    await user.click(button);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  // ¿Qué? Verifica que guarda la preferencia en localStorage.
  it("persiste la preferencia de tema en localStorage", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("button"));
    expect(localStorage.getItem("theme")).toBe("dark");

    await user.click(screen.getByRole("button"));
    expect(localStorage.getItem("theme")).toBe("light");
  });

  // ¿Qué? Sobre una barra que es oscura en los dos modos (la del Landing) el
  //       botón usa texto claro, no el gris del modo claro.
  // ¿Para qué? Issue #503: con `text-gray-600` la luna casi no se veía sobre el
  //           verde oscuro de esa barra en modo claro.
  // ¿Impacto? Si se pierde `onDark`, el botón vuelve a desaparecer en el Landing.
  it("con onDark usa texto claro; sin onDark, el gris del modo claro", () => {
    const { rerender } = render(<ThemeToggle onDark />);
    expect(screen.getByRole("button")).toHaveClass("text-white/80");
    expect(screen.getByRole("button")).not.toHaveClass("text-gray-600");

    rerender(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveClass("text-gray-600");
    expect(screen.getByRole("button")).not.toHaveClass("text-white/80");
  });
});
