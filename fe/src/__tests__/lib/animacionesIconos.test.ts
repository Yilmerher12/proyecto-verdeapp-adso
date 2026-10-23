/**
 * Archivo: __tests__/lib/animacionesIconos.test.ts
 * Descripción: Revisa el código fuente para que las animaciones de íconos sigan
 *              el estándar de 3 (issue #502): icon-draw para lo tocable, icon-hop
 *              y icon-shake solo para mensajes que aparecen.
 * ¿Para qué? Hay más de 30 íconos animados repartidos en 20 archivos; antes cada
 *           pantalla elegía la suya (el menú animaba cada ítem distinto, un
 *           ícono de aviso dentro de un botón reaccionaba al mouse). Una prueba de
 *           un solo componente no puede vigilar eso.
 * ¿Impacto? Sin ella, la próxima pantalla vuelve a inventar su animación y la app
 *           otra vez se mueve "de distintas formas" sin que nada avise (ver
 *           "Animación de íconos" en docs/requisitos/restricciones.md).
 */

/// <reference types="node" />
import ts from "typescript";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const archivos = import.meta.glob(["/src/**/*.tsx", "!/src/__tests__/**"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// ¿Qué? Cada cadena de clases del código con su lugar.
function cadenas(): { lugar: string; ruta: string; clases: string[] }[] {
  const salida: { lugar: string; ruta: string; clases: string[] }[] = [];
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
        salida.push({ lugar: `${ruta}:${linea}`, ruta, clases: nodo.text.split(/\s+/).filter(Boolean) });
      }
      ts.forEachChild(nodo, visitar);
    };
    visitar(sf);
  }
  return salida;
}

// ¿Qué? index.css se lee como archivo: con ?raw Vitest procesa el CSS y devuelve vacío.
const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8").split(String.fromCharCode(13)).join("");

describe("Animaciones de íconos (issue #502)", () => {
  const todas = cadenas();
  const conIcono = (c: { clases: string[] }, re: RegExp) => c.clases.some((x) => re.test(x));

  it("lee las cadenas de clases del frontend (la lectura funciona)", () => {
    expect(todas.length).toBeGreaterThan(1000);
    expect(todas.filter((c) => conIcono(c, /^icon-draw$/)).length).toBeGreaterThan(5);
  });

  it("icon-ring e icon-nudge ya no existen: el estándar es draw, hop y shake", () => {
    const malas = todas.filter((c) => conIcono(c, /^icon-(ring|nudge)$/)).map((c) => c.lugar);
    expect(malas).toEqual([]);
    expect(css).not.toMatch(/@keyframes icon-(ring|nudge)/);
  });

  // ¿Qué? hop y shake son de MENSAJES que aparecen; siempre junto a icon-appear.
  // ¿Impacto? Sin icon-appear, el CSS no los dispara (ya no reaccionan al mouse): el
  //           ícono quedaría quieto y la clase sería código muerto. Alert.tsx las
  //           guarda en un mapa y las junta con icon-appear al dibujar.
  it("icon-hop e icon-shake solo se usan junto a icon-appear", () => {
    const malas = todas
      .filter((c) => !c.ruta.endsWith("/components/ui/Alert.tsx"))
      .filter((c) => conIcono(c, /^icon-(hop|shake)$/) && !conIcono(c, /^icon-appear$/))
      .map((c) => c.lugar);
    expect(malas).toEqual([]);
  });

  it("un ícono que se toca (icon-draw) nunca es a la vez un aviso (icon-appear)", () => {
    const malas = todas.filter((c) => conIcono(c, /^icon-draw$/) && conIcono(c, /^icon-appear$/)).map((c) => c.lugar);
    expect(malas).toEqual([]);
  });

  // ¿Qué? Cada regla de `animation: icon-…` está dentro de `no-preference`.
  // ¿Para qué? Con "reducir movimiento" ningún ícono debe moverse (criterio del issue).
  it("todas las animaciones de íconos están dentro de prefers-reduced-motion: no-preference", () => {
    let medio = "";
    const fuera: string[] = [];
    css.split("\n").forEach((linea, i) => {
      const m = linea.match(/@media \(prefers-reduced-motion: (no-preference|reduce)\)/);
      if (m) medio = m[1];
      else if (/^@media|^@layer|^@keyframes/.test(linea.trim()) && !/^@layer utilities/.test(linea.trim())) medio = "";
      if (/animation:\s*icon-/.test(linea) && medio !== "no-preference") fuera.push(`index.css:${i + 1}`);
    });
    expect(fuera).toEqual([]);
  });

  it("icon-draw se dispara también al enfocar con el teclado, no solo con el mouse", () => {
    expect(css).toMatch(/:is\(:hover, :focus-visible\) > \.icon-draw/);
  });

  it("con reducir movimiento las flechas de los acordeones no giran", () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.transition-transform\s*\{\s*transition: none;/);
  });
});
