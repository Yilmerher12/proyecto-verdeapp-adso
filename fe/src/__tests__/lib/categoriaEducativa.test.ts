/**
 * Archivo: __tests__/lib/categoriaEducativa.test.ts
 * Descripción: Tests de la comparación de nombres de categoría del editor de módulos (issue #620).
 */
import { describe, expect, it } from "vitest";
import { categoriaDuplicada, normalizarCategoria } from "@/lib/categoriaEducativa";

const CATEGORIAS = ["Separación en la fuente", "Economía circular y aprovechamiento"];

describe("normalizarCategoria", () => {
  it("quita tildes y mayúsculas y junta los espacios", () => {
    expect(normalizarCategoria("  Separación   EN la Fuente ")).toBe("separacion en la fuente");
  });
});

describe("categoriaDuplicada", () => {
  it("encuentra la categoría ya creada sin importar mayúsculas, tildes ni espacios de más", () => {
    expect(categoriaDuplicada("separacion  en la FUENTE", CATEGORIAS)).toBe("Separación en la fuente");
    expect(categoriaDuplicada("economia circular y aprovechamiento", CATEGORIAS)).toBe("Economía circular y aprovechamiento");
  });

  it("devuelve null con un nombre distinto o vacío", () => {
    expect(categoriaDuplicada("Compostaje en casa", CATEGORIAS)).toBeNull();
    expect(categoriaDuplicada("   ", CATEGORIAS)).toBeNull();
    expect(categoriaDuplicada("Separación", CATEGORIAS)).toBeNull();
  });
});
