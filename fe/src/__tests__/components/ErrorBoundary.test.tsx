/**
 * Archivo: __tests__/components/ErrorBoundary.test.tsx
 * Descripción: Tests del ErrorBoundary — pantalla de recuperación cuando una
 *              página falla al dibujarse (issue #378, CN-043).
 * ¿Para qué? Verificar que un error al dibujar muestra la pantalla de
 *            recuperación en vez de dejar la app en blanco, y que sus
 *            botones hacen lo que dicen.
 * ¿Impacto? Sin estos tests, un cambio en ErrorBoundary podría volver a dejar
 *           la app en blanco ante cualquier error sin que nadie lo note.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, afterEach } from "vitest";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function PaginaRota(): never {
  throw new Error("fecha inválida");
}

describe("ErrorBoundary", () => {
  const reload = vi.fn();
  const assign = vi.fn();

  // ¿Qué? Silenciar console.error y reemplazar window.location.
  // ¿Para qué? React y componentDidCatch escriben el error en la consola (ruido
  //            en la salida del test), y jsdom no implementa reload/assign.
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("location", { ...window.location, reload, assign });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    reload.mockClear();
    assign.mockClear();
  });

  it("dibuja los hijos normalmente si no hay error", () => {
    render(
      <ErrorBoundary>
        <p>contenido normal</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("contenido normal")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("muestra la pantalla de recuperación si un hijo lanza un error", () => {
    render(
      <ErrorBoundary>
        <PaginaRota />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Algo salió mal en esta pantalla")).toBeInTheDocument();
  });

  it("el botón Recargar página recarga la página", async () => {
    render(
      <ErrorBoundary>
        <PaginaRota />
      </ErrorBoundary>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Recargar página" }));
    expect(reload).toHaveBeenCalledOnce();
  });

  it("el botón Volver al panel principal va a /dashboard", async () => {
    render(
      <ErrorBoundary>
        <PaginaRota />
      </ErrorBoundary>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Volver al panel principal" }));
    expect(assign).toHaveBeenCalledWith("/dashboard");
  });
});
