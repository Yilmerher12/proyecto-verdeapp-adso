/**
 * Archivo: __tests__/hooks/usePolling.test.tsx
 * Descripción: Tests del hook usePolling — pide al montar, repite cada intervalo y se reinicia con `reiniciarCon`.
 * ¿Para qué? Issue #595: la pestaña Avisos pide una página distinta del servidor al cambiar de página; el hook
 *           tiene que volver a pedir al instante y rearmar el temporizador, sin pedir dos veces por ciclo.
 */
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePolling } from "@/hooks/usePolling";

describe("usePolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("pide al montar y repite cada intervalo", () => {
    const pedir = vi.fn();
    renderHook(() => usePolling(pedir, { intervalMs: 1000 }));

    expect(pedir).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(3000);
    expect(pedir).toHaveBeenCalledTimes(4);
  });

  it("con enabled=false no hace nada", () => {
    const pedir = vi.fn();
    renderHook(() => usePolling(pedir, { intervalMs: 1000, enabled: false }));

    vi.advanceTimersByTime(5000);
    expect(pedir).not.toHaveBeenCalled();
  });

  it("deja de repetir al desmontar", () => {
    const pedir = vi.fn();
    const { unmount } = renderHook(() => usePolling(pedir, { intervalMs: 1000 }));
    unmount();

    vi.advanceTimersByTime(5000);
    expect(pedir).toHaveBeenCalledTimes(1);
  });

  it("sin reiniciarCon, volver a dibujar no vuelve a pedir ni reinicia el temporizador", () => {
    const pedir = vi.fn();
    const { rerender } = renderHook(() => usePolling(pedir, { intervalMs: 1000 }));
    vi.advanceTimersByTime(500);
    rerender();
    rerender();

    expect(pedir).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(500);
    expect(pedir).toHaveBeenCalledTimes(2);
  });

  it("al cambiar reiniciarCon vuelve a pedir al instante y rearma el temporizador", () => {
    const pedir = vi.fn();
    const { rerender } = renderHook(({ pagina }) => usePolling(pedir, { intervalMs: 1000, reiniciarCon: pagina }), {
      initialProps: { pagina: 0 },
    });
    vi.advanceTimersByTime(600);
    expect(pedir).toHaveBeenCalledTimes(1);

    rerender({ pagina: 1 });
    expect(pedir).toHaveBeenCalledTimes(2);

    // ¿Qué? El temporizador empezó de nuevo: faltan 1000 ms desde el cambio, no 400 de los 1000 anteriores.
    vi.advanceTimersByTime(600);
    expect(pedir).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(400);
    expect(pedir).toHaveBeenCalledTimes(3);
  });

  it("pide de inmediato cuando se dispara el evento externo, y deja de escucharlo al desmontar", () => {
    const pedir = vi.fn();
    let disparar: () => void = () => {};
    const cancelar = vi.fn();
    const suscribir = (ejecutar: () => void) => {
      disparar = ejecutar;
      return cancelar;
    };
    const { unmount } = renderHook(() => usePolling(pedir, { intervalMs: 10000, onExternalTrigger: suscribir }));

    disparar();
    expect(pedir).toHaveBeenCalledTimes(2);

    unmount();
    expect(cancelar).toHaveBeenCalledTimes(1);
  });
});
