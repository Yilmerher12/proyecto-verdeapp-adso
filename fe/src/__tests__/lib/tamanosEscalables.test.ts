/**
 * Archivo: __tests__/lib/tamanosEscalables.test.ts
 * Descripción: Falla si una pantalla o componente escribe un tamaño de Tailwind
 *              en px fijo (`text-[11px]`, `min-w-[820px]`).
 * ¿Para qué? El tamaño base de la letra crece en pantallas grandes (`html` en
 *           index.css, pensado para el televisor 4K de la feria) y solo lo que
 *           está en rem crece con él. Un px fijo se ve diminuto junto al resto.
 * ¿Impacto? Sin esta prueba, el próximo `text-[11px]` vuelve a colarse sin que
 *           nada avise (ver "Pantallas grandes" en docs/requisitos/restricciones.md).
 */

const archivos = import.meta.glob(["/src/**/*.tsx", "!/src/__tests__/**"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// ¿Qué? Los 3 px del cursor de escritura del Landing no se agrandan a propósito
//       (es una línea fina, no un tamaño de texto ni de caja).
const EXCEPCIONES = ["w-[3px]"];

describe("tamaños en rem", () => {
  it("ninguna clase de Tailwind usa un valor en px fijo", () => {
    const hallazgos: string[] = [];
    for (const [ruta, codigo] of Object.entries(archivos)) {
      for (const [clase] of codigo.matchAll(/[\w:-]+-\[-?\d+(?:\.\d+)?px\]/g)) {
        if (!EXCEPCIONES.includes(clase)) hallazgos.push(`${ruta}: ${clase}`);
      }
    }
    expect(hallazgos).toEqual([]);
  });
});
