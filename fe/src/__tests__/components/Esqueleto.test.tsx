/**
 * Archivo: __tests__/components/Esqueleto.test.tsx
 * Descripción: Pruebas de la silueta de carga (issue #644).
 * ¿Para qué? Fijar lo decidido con prototipos: el aviso para lectores de pantalla está desde el primer instante, las formas
 *            aparecen tras 100 ms (y antes ya ocupan su espacio) y cada variante dibuja la cantidad pedida.
 * ¿Impacto? Sin esta prueba, quitar la espera o el aviso dejaría un destello gris o una pantalla muda sin que nada falle.
 */
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Esqueleto, RETRASO_ESQUELETO_MS } from "@/components/ui/Esqueleto";

describe("Esqueleto (issue #644)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("anuncia el mensaje a los lectores de pantalla desde el primer instante", () => {
    render(<Esqueleto mensaje="Cargando comunicados…" />);
    const estado = screen.getByRole("status");
    expect(estado).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Cargando comunicados…")).toHaveClass("sr-only");
  });

  it("las formas están ocultas (pero ocupan su espacio) hasta que pasan 100 ms", () => {
    const { container } = render(<Esqueleto mensaje="Cargando…" />);
    const formas = container.querySelector("[data-esqueleto]") as HTMLElement;
    expect(formas).toHaveClass("invisible");
    act(() => {
      vi.advanceTimersByTime(RETRASO_ESQUELETO_MS - 1);
    });
    expect(formas).toHaveClass("invisible");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(formas).not.toHaveClass("invisible");
    expect(formas).toHaveClass("animate-latido");
  });

  it("si se quita antes de los 100 ms no deja ningún temporizador pendiente", () => {
    const { unmount } = render(<Esqueleto mensaje="Cargando…" />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("dibuja 5 filas, 3 tarjetas, 4 campos o 1 bloque por omisión, o la cantidad pedida", () => {
    const { container, rerender } = render(<Esqueleto mensaje="x" variante="filas" />);
    expect(container.querySelectorAll(".divide-y > div")).toHaveLength(5);
    rerender(<Esqueleto mensaje="x" variante="filas" cantidad={2} />);
    expect(container.querySelectorAll(".divide-y > div")).toHaveLength(2);
    rerender(<Esqueleto mensaje="x" variante="tarjetas" />);
    expect(container.querySelectorAll(".grid > div")).toHaveLength(3);
    rerender(<Esqueleto mensaje="x" variante="campos" />);
    expect(container.querySelectorAll(".space-y-4 > div")).toHaveLength(4);
    rerender(<Esqueleto mensaje="x" variante="bloque" />);
    expect(container.querySelector("[data-esqueleto='bloque']")?.children).toHaveLength(1);
  });

  it("el alto pedido llega a la tarjeta y al bloque, y enTarjeta envuelve las filas con borde", () => {
    const { container, rerender } = render(<Esqueleto mensaje="x" variante="bloque" alto="h-72" />);
    expect(container.querySelector("[data-esqueleto='bloque'] > div")).toHaveClass("h-72");
    rerender(<Esqueleto mensaje="x" variante="tarjetas" alto="h-56" />);
    expect(container.querySelector(".grid > div")).toHaveClass("h-56");
    rerender(<Esqueleto mensaje="x" variante="filas" enTarjeta />);
    expect(container.querySelector(".divide-y")).toHaveClass("rounded-2xl", "border");
  });

  it("acepta una clase extra en el contenedor", () => {
    render(<Esqueleto mensaje="x" className="mt-4" />);
    expect(screen.getByRole("status")).toHaveClass("mt-4");
  });
});
