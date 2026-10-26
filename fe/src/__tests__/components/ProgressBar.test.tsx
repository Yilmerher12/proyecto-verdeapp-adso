/**
 * Archivo: __tests__/components/ProgressBar.test.tsx
 * Descripción: Pruebas de la barra de progreso de las subidas y del Spinner único.
 * ¿Para qué? Issue #458 (RNF-004.3): toda subida muestra una barra con su
 *           porcentaje, y un solo dibujo de "cargando" en toda la aplicación.
 * ¿Impacto? Si la barra deja de anunciar su valor, o el Spinner pierde su
 *           color, una subida lenta se vuelve a ver igual que una colgada.
 */
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Spinner } from "@/components/ui/Spinner";

describe("ProgressBar", () => {
  it("con valor muestra el porcentaje y lo anuncia al lector de pantalla", () => {
    render(<ProgressBar value={42} label="Subiendo foto…" />);

    const barra = screen.getByRole("progressbar", { name: "Subiendo foto…" });
    expect(barra).toHaveAttribute("aria-valuenow", "42");
    expect(barra).toHaveAttribute("aria-valuemin", "0");
    expect(barra).toHaveAttribute("aria-valuemax", "100");
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("limita el valor entre 0 y 100 y lo redondea", () => {
    const { rerender } = render(<ProgressBar value={137} label="Subiendo" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");

    rerender(<ProgressBar value={-5} label="Subiendo" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");

    rerender(<ProgressBar value={33.6} label="Subiendo" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "34");
  });

  it("sin valor es indeterminada: no inventa un porcentaje", () => {
    render(<ProgressBar label="Subiendo foto…" />);

    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});

describe("Spinner", () => {
  it("por defecto usa el verde de marca", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector("svg")).toHaveClass("animate-spin", "text-accent-600", "h-4", "w-4");
  });

  it("con tone='current' hereda el color del texto (botones de relleno)", () => {
    const { container } = render(<Spinner tone="current" size="lg" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toHaveClass("text-accent-600");
    expect(svg).toHaveClass("h-8", "w-8");
  });

  it("no se anuncia solo: el texto que lo acompaña es quien avisa", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
