/**
 * Archivo: __tests__/hooks/useAvisoCerradoEnSesion.test.tsx
 * ¿Para qué? Un aviso informativo cerrado se recuerda solo durante la sesión: al cerrar sesión debe
 *           volver a mostrarse (por eso limpiarAvisosCerrados lo olvida).
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { limpiarAvisosCerrados, useAvisoCerradoEnSesion } from "@/hooks/useAvisoCerradoEnSesion";

describe("useAvisoCerradoEnSesion", () => {
  beforeEach(() => sessionStorage.clear());

  it("arranca abierto, se cierra y se vuelve a abrir", () => {
    const { result } = renderHook(() => useAvisoCerradoEnSesion("eca"));
    expect(result.current.cerrado).toBe(false);

    act(() => result.current.cerrar());
    expect(result.current.cerrado).toBe(true);

    act(() => result.current.reabrir());
    expect(result.current.cerrado).toBe(false);
  });

  it("lo recuerda en un montaje nuevo mientras dure la sesión", () => {
    const primero = renderHook(() => useAvisoCerradoEnSesion("eca"));
    act(() => primero.result.current.cerrar());
    primero.unmount();

    const segundo = renderHook(() => useAvisoCerradoEnSesion("eca"));
    expect(segundo.result.current.cerrado).toBe(true);
  });

  it("cada aviso tiene su propia memoria", () => {
    const eca = renderHook(() => useAvisoCerradoEnSesion("eca"));
    act(() => eca.result.current.cerrar());

    const otro = renderHook(() => useAvisoCerradoEnSesion("otro"));
    expect(otro.result.current.cerrado).toBe(false);
  });

  it("limpiarAvisosCerrados los olvida todos y no toca otras claves de sessionStorage", () => {
    const hook = renderHook(() => useAvisoCerradoEnSesion("eca"));
    act(() => hook.result.current.cerrar());
    sessionStorage.setItem("otra-clave", "x");

    limpiarAvisosCerrados();

    expect(renderHook(() => useAvisoCerradoEnSesion("eca")).result.current.cerrado).toBe(false);
    expect(sessionStorage.getItem("otra-clave")).toBe("x");
  });
});
