/**
 * Archivo: __tests__/hooks/useRestoreScroll.test.tsx
 * Descripción: Tests de useRestoreScroll — guardar y restaurar la posición
 *              de scroll de una página entre montajes distintos.
 */

import { renderHook } from "@testing-library/react";
import { vi, beforeEach, afterEach } from "vitest";
import { useRestoreScroll } from "@/hooks/useRestoreScroll";

const KEY = "test-scroll-y";

describe("useRestoreScroll", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("no restaura nada si no hay posición guardada", () => {
    renderHook(() => useRestoreScroll(KEY));

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("restaura la posición guardada al montar, sin esperar nada", () => {
    sessionStorage.setItem(KEY, "850");

    renderHook(() => useRestoreScroll(KEY));

    expect(window.scrollTo).toHaveBeenCalledWith(0, 850);
  });

  it("guarda la posición de scroll 150ms después de que el usuario deja de hacer scroll", () => {
    renderHook(() => useRestoreScroll(KEY));

    Object.defineProperty(window, "scrollY", { value: 420, configurable: true });
    window.dispatchEvent(new Event("scroll"));

    // Todavía no debería haberse guardado — el debounce no cumplió los 150ms.
    expect(sessionStorage.getItem(KEY)).toBeNull();

    vi.advanceTimersByTime(150);

    expect(sessionStorage.getItem(KEY)).toBe("420");
  });

  it("reinicia el debounce si el usuario sigue haciendo scroll", () => {
    renderHook(() => useRestoreScroll(KEY));

    Object.defineProperty(window, "scrollY", { value: 100, configurable: true });
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(100);

    // Otro scroll antes de que se cumplieran los 150ms reinicia el conteo.
    Object.defineProperty(window, "scrollY", { value: 200, configurable: true });
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(100);
    expect(sessionStorage.getItem(KEY)).toBeNull();

    vi.advanceTimersByTime(50);
    expect(sessionStorage.getItem(KEY)).toBe("200");
  });

  it("dos claves distintas no se pisan entre sí", () => {
    sessionStorage.setItem("otra-clave", "999");

    renderHook(() => useRestoreScroll(KEY));

    Object.defineProperty(window, "scrollY", { value: 100, configurable: true });
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(150);

    expect(sessionStorage.getItem(KEY)).toBe("100");
    expect(sessionStorage.getItem("otra-clave")).toBe("999");
  });

  it("guarda la posición actual al desmontarse, sin esperar el debounce", () => {
    // ¿Qué? Antes, si el usuario se iba (ej: clic en un link del footer)
    //       antes de que pasaran los 150ms del debounce, la posición se
    //       perdía por completo — el cleanup solo cancelaba el guardado
    //       pendiente, nunca lo llegaba a escribir.
    // ¿Impacto? Ahora desmontar guarda la posición de inmediato, sin
    //           importar el debounce.
    Object.defineProperty(window, "scrollY", { value: 642, configurable: true });
    const { unmount } = renderHook(() => useRestoreScroll(KEY));

    unmount();

    expect(sessionStorage.getItem(KEY)).toBe("642");
  });

  it("deja de escuchar scroll después de desmontarse", () => {
    Object.defineProperty(window, "scrollY", { value: 300, configurable: true });
    const { unmount } = renderHook(() => useRestoreScroll(KEY));
    unmount();

    // El desmontaje ya guardó "300" — un scroll disparado DESPUÉS de
    // desmontar no debe cambiar nada, porque el listener ya se quitó.
    Object.defineProperty(window, "scrollY", { value: 777, configurable: true });
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(150);

    expect(sessionStorage.getItem(KEY)).toBe("300");
  });
});
