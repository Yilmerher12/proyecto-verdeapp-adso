/**
 * Archivo: __tests__/components/PanelPestana.test.tsx
 * Descripción: Pruebas del panel que acompaña a las pestañas (issue #643).
 * ¿Para qué? Fijar que el panel lleva su rol y su vínculo con la pestaña, que se desvanece al cambiar de pestaña y que, sin
 *            `claveActiva`, no se vuelve a crear (los paneles que ocultan vistas con `hidden` conservan su estado).
 * ¿Impacto? Sin esta prueba, quitar la `key` o el desvanecimiento dejaría el contenido cambiando de golpe sin que nada falle.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PanelPestana } from "@/components/ui/PanelPestana";

describe("PanelPestana (issue #643)", () => {
  it("lleva el rol tabpanel, su id y el vínculo con la pestaña activa", () => {
    render(
      <PanelPestana id="panel-x" labelledBy="tab-a" claveActiva="a">
        Contenido
      </PanelPestana>,
    );
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("id", "panel-x");
    expect(panel).toHaveAttribute("aria-labelledby", "tab-a");
    expect(panel).toHaveClass("animate-fade-in");
  });

  it("con claveActiva, al cambiar de pestaña se crea un panel nuevo (así se vuelve a desvanecer)", () => {
    const { rerender } = render(
      <PanelPestana labelledBy="tab-a" claveActiva="a">
        A
      </PanelPestana>,
    );
    const antes = screen.getByRole("tabpanel");
    rerender(
      <PanelPestana labelledBy="tab-b" claveActiva="b">
        B
      </PanelPestana>,
    );
    expect(screen.getByRole("tabpanel")).not.toBe(antes);
  });

  it("sin claveActiva no se anima ni se vuelve a crear", () => {
    const { rerender } = render(<PanelPestana labelledBy="tab-a">A</PanelPestana>);
    const antes = screen.getByRole("tabpanel");
    expect(antes).not.toHaveClass("animate-fade-in");
    rerender(<PanelPestana labelledBy="tab-b">B</PanelPestana>);
    expect(screen.getByRole("tabpanel")).toBe(antes);
  });

  it("acepta una clase extra y la suma a la del desvanecimiento", () => {
    render(
      <PanelPestana labelledBy="tab-a" claveActiva="a" className="p-6">
        A
      </PanelPestana>,
    );
    expect(screen.getByRole("tabpanel")).toHaveClass("animate-fade-in", "p-6");
  });
});
