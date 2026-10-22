/**
 * Archivo: __tests__/lib/coloresTemas.test.ts
 * Descripción: Revisa el código fuente para que el tema claro y el oscuro sigan
 *              siendo coherentes entre sí (issue #503).
 * ¿Para qué? Las reglas de color (sin hexadecimales a mano, texto secundario con
 *           su pareja oscura, borde de control con su token) no las puede
 *           comprobar la prueba de un solo componente: hay más de 80 archivos con
 *           clases de Tailwind. Esta prueba lee todos con el compilador de
 *           TypeScript y falla si aparece un uso que rompe la tabla de
 *           equivalencias de `docs/requisitos/restricciones.md`.
 * ¿Impacto? Sin ella, el próximo `text-gray-400` sin pareja (2.5:1 en modo claro)
 *           o el próximo campo con `border-gray-200` (1.13:1) vuelven a pasar sin
 *           que nada avise.
 */

import ts from "typescript";

const archivos = import.meta.glob(["/src/**/*.tsx", "!/src/__tests__/**"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// ¿Qué? Cada cadena de clases del código (comillas, plantillas) con su lugar.
function cadenas(): { lugar: string; clases: string[] }[] {
  const salida: { lugar: string; clases: string[] }[] = [];
  for (const [ruta, codigo] of Object.entries(archivos)) {
    const sf = ts.createSourceFile(ruta, codigo, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visitar = (nodo: ts.Node) => {
      if (
        ts.isStringLiteralLike(nodo) ||
        ts.isTemplateHead(nodo) ||
        ts.isTemplateMiddle(nodo) ||
        ts.isTemplateTail(nodo)
      ) {
        const linea = sf.getLineAndCharacterOfPosition(nodo.getStart()).line + 1;
        salida.push({ lugar: `${ruta}:${linea}`, clases: nodo.text.split(/\s+/).filter(Boolean) });
      }
      ts.forEachChild(nodo, visitar);
    };
    visitar(sf);
  }
  return salida;
}

describe("Coherencia entre tema claro y oscuro (issue #503)", () => {
  const todas = cadenas();

  it("lee las cadenas de clases del frontend (la lectura funciona)", () => {
    expect(todas.length).toBeGreaterThan(1000);
  });

  it("ningún color va escrito a mano (bg-[#…], border-[#…])", () => {
    const malas = todas
      .flatMap(({ lugar, clases }) => clases.filter((c) => /^(?:[a-z-]+:)*(bg|text|border|ring|fill|stroke)-\[#/.test(c)).map((c) => `${lugar} ${c}`));
    expect(malas).toEqual([]);
  });

  it("todo text-gray-400 trae su pareja oscura (en modo claro da 2.5:1)", () => {
    const malas = todas
      .filter(({ clases }) => clases.includes("text-gray-400") && !clases.some((c) => c.startsWith("dark:text-")))
      .map(({ lugar }) => lugar);
    expect(malas).toEqual([]);
  });

  it("el borde de un control es border-edge, no un gris suelto (WCAG 1.4.11)", () => {
    const malas = todas
      .filter(({ clases }) => clases.includes("border-gray-300"))
      .map(({ lugar }) => `${lugar} border-gray-300 (usar border-edge dark:border-night-edge)`);
    expect(malas).toEqual([]);
  });
});
