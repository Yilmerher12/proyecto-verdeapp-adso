/**
 * Archivo: __tests__/lib/pantallasMedianas.test.ts
 * Descripción: Guardas del barrido de adaptación en pantallas medianas (issue #602, 640 a 1100 px).
 * ¿Para qué? En ese rango el menú lateral ya ocupa 16 rem y el contenido queda angosto. El barrido encontró que
 *           el texto oculto (`sr-only`) de la última columna de una tabla escapaba del contenedor con scroll y
 *           ensanchaba toda la página (hasta 377 px en el panel del Admin del Sistema).
 * ¿Impacto? Si alguien quita la regla de index.css o agrega una tabla sin contenedor con scroll, esta prueba
 *           falla antes de que el desborde llegue a una pantalla.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ¿Qué? Se lee con fs y no con `?raw`: Vitest procesa el CSS y devolvía el texto vacío.
const indexCss = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");

const archivos = import.meta.glob(["/src/**/*.tsx", "!/src/__tests__/**"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

describe("pantallas medianas", () => {
  it("las celdas de tabla son 'posicionadas' para contener el texto sr-only de su columna", () => {
    expect(indexCss.replace(/\s+/g, " ")).toMatch(/th, td \{ position: relative; \}/);
  });

  it("toda tabla va dentro de un contenedor con scroll horizontal (overflow-x-auto)", () => {
    const sinContenedor = Object.entries(archivos)
      .filter(([, codigo]) => codigo.includes("<table"))
      .filter(([, codigo]) => !codigo.includes("overflow-x-auto"))
      .map(([ruta]) => ruta);
    expect(sinContenedor).toEqual([]);
  });
});
