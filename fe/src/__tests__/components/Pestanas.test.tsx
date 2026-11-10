/**
 * Archivo: __tests__/components/Pestanas.test.tsx
 * Descripción: Pestañas compartidas (Soporte técnico y "Mi conjunto") — roles, selección, ids y cómo se reparten
 *              en un espacio angosto; y la variante subrayada del panel de cada conjunto (issue #595).
 * ¿Para qué? Issue #603: las dos pantallas armaban sus pestañas a mano con `flex-wrap` y en una ventana
 *           angosta una pestaña quedaba sola en la segunda fila.
 * ¿Impacto? Si alguien cambia las clases de reparto (partes iguales o dos columnas), estas pruebas fallan.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { Pestanas } from "@/components/ui/Pestanas";

const TRES = [
  { id: "a", etiqueta: "Avisos del sistema" },
  { id: "b", etiqueta: "Escribir novedad" },
  { id: "c", etiqueta: "Historial de novedades" },
];

describe("Pestanas", () => {
  it("dibuja una pestaña por opción dentro de un tablist con nombre y marca la activa", () => {
    render(<Pestanas pestanas={TRES} activa="b" onCambiar={() => {}} ariaLabel="Soporte técnico" />);

    const lista = screen.getByRole("tablist", { name: "Soporte técnico" });
    expect(lista).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((p) => p.textContent)).toEqual([
      "Avisos del sistema",
      "Escribir novedad",
      "Historial de novedades",
    ]);
    expect(screen.getByRole("tab", { name: "Escribir novedad" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Avisos del sistema" })).toHaveAttribute("aria-selected", "false");
  });

  it("al tocar una pestaña avisa cuál se eligió", async () => {
    const user = userEvent.setup();
    const onCambiar = vi.fn();
    render(<Pestanas pestanas={TRES} activa="a" onCambiar={onCambiar} ariaLabel="x" />);

    await user.click(screen.getByRole("tab", { name: "Historial de novedades" }));

    expect(onCambiar).toHaveBeenCalledWith("c");
  });

  it("con idBase e idPanel enlaza cada pestaña con su panel", () => {
    render(<Pestanas pestanas={TRES} activa="a" onCambiar={() => {}} ariaLabel="x" idBase="tab" idPanel="panel" />);

    const pestana = screen.getByRole("tab", { name: "Avisos del sistema" });
    expect(pestana).toHaveAttribute("id", "tab-a");
    expect(pestana).toHaveAttribute("aria-controls", "panel");
  });

  it("en espacio angosto reparte las pestañas en partes iguales (una columna por pestaña)", () => {
    render(<Pestanas pestanas={TRES} activa="a" onCambiar={() => {}} ariaLabel="x" />);

    const lista = screen.getByRole("tablist");
    expect(lista).toHaveClass("grid", "grid-cols-3", "@xl:flex");
  });

  it("con dos pestañas usa dos columnas", () => {
    render(<Pestanas pestanas={TRES.slice(0, 2)} activa="a" onCambiar={() => {}} ariaLabel="x" />);

    expect(screen.getByRole("tablist")).toHaveClass("grid-cols-2");
  });

  it("con dosColumnas y tres pestañas, la tercera ocupa todo el ancho de la segunda fila", () => {
    render(<Pestanas dosColumnas pestanas={TRES} activa="a" onCambiar={() => {}} ariaLabel="x" />);

    expect(screen.getByRole("tablist")).toHaveClass("grid-cols-2");
    const [, , tercera] = screen.getAllByRole("tab");
    // ¿Qué? Todas llevan la clase, pero `last:odd:` solo actúa sobre la última cuando el total es impar.
    expect(tercera).toHaveClass("last:odd:col-span-2");
    // ¿Qué? En una fila ancha (@xl) ya no hace falta ocupar dos columnas.
    expect(tercera).toHaveClass("@xl:last:odd:col-span-1");
  });

  it("acepta clases extra para la fila", () => {
    render(<Pestanas pestanas={TRES} activa="a" onCambiar={() => {}} ariaLabel="x" className="border-t pt-5" />);

    expect(screen.getByRole("tablist")).toHaveClass("border-t", "pt-5");
  });

  describe("variante subrayadas (issue #595)", () => {
    it("dibuja una fila con una línea debajo (no una cuadrícula de píldoras)", () => {
      render(<Pestanas variante="subrayadas" pestanas={TRES} activa="a" onCambiar={() => {}} ariaLabel="x" />);

      const lista = screen.getByRole("tablist");
      expect(lista).toHaveClass("flex", "border-b");
      expect(lista).not.toHaveClass("grid");
      expect(screen.getAllByRole("tab")).toHaveLength(3);
    });

    it("marca la activa con el color de acento y deja las demás sin subrayar", () => {
      render(<Pestanas variante="subrayadas" pestanas={TRES} activa="b" onCambiar={() => {}} ariaLabel="x" />);

      expect(screen.getByRole("tab", { name: "Escribir novedad" })).toHaveClass("border-accent-600");
      expect(screen.getByRole("tab", { name: "Escribir novedad" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tab", { name: "Avisos del sistema" })).toHaveClass("border-transparent");
      expect(screen.getByRole("tab", { name: "Avisos del sistema" })).toHaveAttribute("aria-selected", "false");
    });

    it("avisa cuál se eligió y enlaza cada pestaña con su panel", async () => {
      const user = userEvent.setup();
      const onCambiar = vi.fn();
      render(
        <Pestanas variante="subrayadas" pestanas={TRES} activa="a" onCambiar={onCambiar} ariaLabel="x" idBase="tab" idPanel="panel" />,
      );

      const pestana = screen.getByRole("tab", { name: "Historial de novedades" });
      expect(pestana).toHaveAttribute("id", "tab-c");
      expect(pestana).toHaveAttribute("aria-controls", "panel");
      await user.click(pestana);
      expect(onCambiar).toHaveBeenCalledWith("c");
    });

    it("ignora dosColumnas y compacta, que son de las píldoras", () => {
      render(<Pestanas variante="subrayadas" dosColumnas compacta pestanas={TRES} activa="a" onCambiar={() => {}} ariaLabel="x" />);

      expect(screen.getByRole("tablist")).not.toHaveClass("grid-cols-2");
      expect(screen.getAllByRole("tab")[2]).not.toHaveClass("last:odd:col-span-2");
    });

    it("acepta clases extra para la fila", () => {
      render(<Pestanas variante="subrayadas" pestanas={TRES} activa="a" onCambiar={() => {}} ariaLabel="x" className="mt-4" />);

      expect(screen.getByRole("tablist")).toHaveClass("mt-4");
    });

    it("por omisión, desde 640 px cada pestaña mide lo que su texto (no se estira a todo el ancho)", () => {
      render(<Pestanas variante="subrayadas" pestanas={TRES} activa="a" onCambiar={() => {}} ariaLabel="x" />);

      for (const pestana of screen.getAllByRole("tab")) expect(pestana).toHaveClass("sm:flex-none");
    });

    it("con repartidas se reparten el ancho en partes iguales también en ventana ancha (pestañas de conjunto)", () => {
      render(<Pestanas variante="subrayadas" repartidas pestanas={TRES} activa="a" onCambiar={() => {}} ariaLabel="x" />);

      for (const pestana of screen.getAllByRole("tab")) {
        expect(pestana).toHaveClass("flex-1");
        expect(pestana).not.toHaveClass("sm:flex-none");
      }
    });
  });
});
