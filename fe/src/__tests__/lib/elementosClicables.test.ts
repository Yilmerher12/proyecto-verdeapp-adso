/**
 * Archivo: __tests__/lib/elementosClicables.test.ts
 * Descripción: Revisa el código fuente de todas las pantallas y componentes
 *              para que lo clicable se reconozca a simple vista (issue #501).
 * ¿Para qué? La regla "un enlace se ve como enlace y un ícono que actúa lleva
 *           una pista" no la puede comprobar una prueba de un solo componente:
 *           hay 160 botones y 50 enlaces repartidos en 90 archivos. Esta prueba
 *           lee los archivos con el compilador de TypeScript y falla si aparece
 *           uno nuevo que no la cumple.
 * ¿Impacto? Sin ella, el próximo enlace escrito "solo en verde, sin subrayado"
 *           o el próximo botón de solo ícono sin `title` vuelve a pasar sin que
 *           nada avise (ver "Elementos clicables" en docs/requisitos/restricciones.md).
 */

import ts from "typescript";

const archivos = import.meta.glob(["/src/**/*.tsx", "!/src/__tests__/**"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

type Hallazgo = string;

// ¿Qué? Texto de los hijos sin comentarios JSX ni etiquetas, para saber si el
//       control muestra texto o es solo un ícono/imagen.
function textoVisible(hijos: string): boolean {
  const limpio = hijos
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/className=\{?"[^"]*"\}?/g, "");
  return /\{t\(|\{[a-zA-Z]+\}|[A-Za-zÁ-ú]{3,}/.test(limpio);
}

function atributos(elemento: ts.JsxOpeningElement | ts.JsxSelfClosingElement) {
  const mapa: Record<string, string> = {};
  elemento.attributes.properties.forEach((a) => {
    if (ts.isJsxAttribute(a)) mapa[a.name.getText()] = a.initializer ? a.initializer.getText() : "true";
  });
  return mapa;
}

function revisar(): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];

  for (const [ruta, codigo] of Object.entries(archivos)) {
    const sf = ts.createSourceFile(ruta, codigo, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    const visitar = (nodo: ts.Node) => {
      if (ts.isJsxElement(nodo) || ts.isJsxSelfClosingElement(nodo)) {
        const apertura = ts.isJsxElement(nodo) ? nodo.openingElement : nodo;
        const etiqueta = apertura.tagName.getText();
        const attrs = atributos(apertura);
        const clases = attrs.className ?? "";
        const hijos = ts.isJsxElement(nodo) ? nodo.children.map((c) => c.getText()).join("") : "";
        const linea = sf.getLineAndCharacterOfPosition(nodo.getStart()).line + 1;
        const lugar = `${ruta}:${linea}`;

        // Regla 1: un botón de solo ícono lleva nombre accesible Y una pista visible (title).
        if (etiqueta === "button" && !textoVisible(hijos)) {
          const tieneNombre = "aria-label" in attrs || "aria-labelledby" in attrs;
          if (!tieneNombre) hallazgos.push(`${lugar} <button> sin texto ni aria-label`);
          else if (!("title" in attrs) && !("aria-labelledby" in attrs)) {
            hallazgos.push(`${lugar} <button> de solo ícono sin title (no hay pista al pasar el mouse o enfocar)`);
          }
        }

        // Regla 2: un enlace de texto se distingue del texto normal sin mouse.
        if ((etiqueta === "a" || etiqueta === "Link") && clases) {
          const esImagenOLogo = /<img|BrandLogo/.test(hijos);
          const pareceBoton = /\brounded/.test(clases) && /\b(bg-|border|px-)/.test(clases);
          const sePareceAEnlace = /\b(link-text|underline)\b/.test(clases);
          if (!esImagenOLogo && !pareceBoton && !sePareceAEnlace) {
            hallazgos.push(`${lugar} <${etiqueta}> de texto sin subrayado (usar la clase link-text)`);
          }
        }

        // Regla 3: una imagen clicable lleva una insignia visible en la esquina.
        if ((etiqueta === "button" || etiqueta === "a") && /<img/.test(hijos) && !/InsigniaAccionImagen|Play|bg-black/.test(hijos)) {
          hallazgos.push(`${lugar} <${etiqueta}> con imagen sin InsigniaAccionImagen`);
        }
      }
      ts.forEachChild(nodo, visitar);
    };
    visitar(sf);
  }
  return hallazgos;
}

describe("Elementos clicables (issue #501)", () => {
  it("revisa los archivos del frontend (la lectura funciona)", () => {
    expect(Object.keys(archivos).length).toBeGreaterThan(50);
  });

  it("ningún botón de solo ícono ni enlace de texto pasa desapercibido", () => {
    expect(revisar()).toEqual([]);
  });
});
