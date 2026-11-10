/**
 * Archivo: __tests__/lib/tamanoTexto.test.ts
 * Descripción: Falla si algún componente vuelve a escribir un texto de menos de 11 px.
 * ¿Para qué? Issue #633 — la escala tipográfica (docs/requisitos/restricciones.md) fija que nada mide menos de 11 px: las pastillas y
 *           los contadores miden 11 px y los textos que se leen, 12 px. Antes había textos de 10 px y 56 de 11 px, entre ellos
 *           ayudas y fechas que costaba leer.
 * ¿Impacto? Sin esta prueba, el próximo \`text-[0.625rem]\` suelto se cuela sin que nada avise.
 */
import { describe, expect, it } from "vitest";

const archivos = import.meta.glob("/src/**/*.tsx", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

const PX_POR_REM = 16;
// ¿Qué? Cualquier tamaño de letra escrito a mano: text-[0.625rem], text-[10px]...
const TAMANO_A_MANO = /text-\[(\d+(?:\.\d+)?)(px|rem)\]/g;
const MINIMO_PX = 11;

describe("tamaño mínimo del texto", () => {
  it("ningún componente escribe un texto de menos de 11 px", () => {
    const hallazgos: string[] = [];
    for (const [ruta, codigo] of Object.entries(archivos)) {
      if (ruta.includes("/__tests__/")) continue;
      for (const [texto, valor, unidad] of codigo.matchAll(TAMANO_A_MANO)) {
        const px = unidad === "rem" ? Number(valor) * PX_POR_REM : Number(valor);
        if (px < MINIMO_PX) hallazgos.push(`${ruta}: ${texto} (${px} px)`);
      }
    }
    expect(hallazgos).toEqual([]);
  });

  it("la prueba reconoce un texto de 10 px escrito en rem o en px", () => {
    const chico = "<span className=\"text-[0.625rem]\" /> <i className=\"text-[10px]\" />";
    const tamanos = [...chico.matchAll(TAMANO_A_MANO)].map(([, valor, unidad]) => (unidad === "rem" ? Number(valor) * PX_POR_REM : Number(valor)));
    expect(tamanos).toEqual([10, 10]);
  });
});
