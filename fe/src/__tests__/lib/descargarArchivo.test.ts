/**
 * Archivo: __tests__/lib/descargarArchivo.test.ts
 * Descripción: Tests de bajar un archivo en memoria a disco y del nombre del CSV
 *              del historial de la agenda (issue #479, HU-049).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { descargarArchivo } from "@/lib/descargarArchivo";
import { nombreArchivoHistorialAgenda } from "@/lib/conjuntoPanelApi";

describe("descargarArchivo", () => {
  const crearUrl = vi.fn(() => "blob:archivo-de-prueba");
  const liberarUrl = vi.fn();

  beforeEach(() => {
    // ¿Qué? jsdom no trae estas dos funciones del navegador.
    URL.createObjectURL = crearUrl;
    URL.revokeObjectURL = liberarUrl;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("pulsa un enlace temporal con el nombre pedido, lo quita y libera la URL del archivo", () => {
    const clic = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("historial.csv");
      expect(this.href).toBe("blob:archivo-de-prueba");
      expect(document.body.contains(this)).toBe(true);
    });
    const archivo = new Blob(["a;b"], { type: "text/csv" });

    descargarArchivo(archivo, "historial.csv");

    expect(crearUrl).toHaveBeenCalledWith(archivo);
    expect(clic).toHaveBeenCalledTimes(1);
    expect(document.querySelector("a[download]")).toBeNull();
    expect(liberarUrl).toHaveBeenCalledWith("blob:archivo-de-prueba");
  });
});

describe("nombreArchivoHistorialAgenda", () => {
  it("lleva el conjunto en minúsculas, sin tildes ni signos, y el rango de fechas", () => {
    expect(nombreArchivoHistorialAgenda("Portal de Capellanía (Etapa 2)", "2026-10-01", "2026-10-31")).toBe(
      "historial-agenda-portal-de-capellania-etapa-2-2026-10-01_2026-10-31.csv"
    );
  });

  it("sin fechas usa 'inicio' y 'hoy', igual que el backend", () => {
    expect(nombreArchivoHistorialAgenda("Torres de Prueba", "", "")).toBe("historial-agenda-torres-de-prueba-inicio_hoy.csv");
  });
});
