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
import { ROLE_THEME } from "@/config/roleTheme";

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

  // ¿Qué? En el tema oscuro el acento es el menta (accent-300) con texto oscuro.
  // ¿Para qué? Un botón sólido verde con texto blanco y sin pareja oscura queda
  //           como verde oscuro sobre verde oscuro (1.86:1 contra la tarjeta): el
  //           problema que originó el rediseño del tema oscuro (issue #503).
  // ¿Impacto? Todo botón nuevo con bg-accent-700 + text-white debe traer su pareja.
  it("todo botón verde sólido con texto blanco trae su pareja menta en oscuro", () => {
    const malas = todas
      .filter(
        ({ clases }) =>
          clases.some((c) => /^bg-accent-(600|700)$/.test(c)) &&
          clases.includes("text-white") &&
          !clases.some((c) => /^dark:(hover:)?bg-accent-/.test(c)) &&
          !clases.includes("h-20"), // el avatar de perfil es la excepción
      )
      .map(({ lugar }) => lugar);
    expect(malas).toEqual([]);
  });

  it("los fondos de estado en oscuro son translúcidos (X-400/10), no bloques oscuros sólidos", () => {
    const malas = todas
      .flatMap(({ lugar, clases }) =>
        clases
          .filter((c) => /^dark:(hover:)?bg-(amber|red|purple|indigo|teal|blue|yellow)-(900|950)/.test(c))
          .map((c) => `${lugar} ${c}`),
      );
    expect(malas).toEqual([]);
  });

  it("el borde de un control es border-edge, no un gris suelto (WCAG 1.4.11)", () => {
    const malas = todas
      .filter(({ clases }) => clases.includes("border-gray-300"))
      .map(({ lugar }) => `${lugar} border-gray-300 (usar border-edge dark:border-night-edge)`);
    expect(malas).toEqual([]);
  });

  // ¿Qué? Los 4 roles comparten el mismo acento; el rol se distingue por ícono y nombre.
  // ¿Para qué? Con colores por rol (pizarra, lima, naranja, cielo) el tema oscuro no
  //           combinaba: el acento único es menta (decisión del issue #503).
  // ¿Impacto? Si alguien vuelve a darle un color propio a un rol, esta prueba falla.
  it("los 4 roles usan el mismo acento de sidebar y de badge", () => {
    const temas = Object.values(ROLE_THEME);
    for (const clave of ["sidebarAccentText", "sidebarActiveNav", "badgeText", "badgeBg"] as const) {
      expect(new Set(temas.map((t) => t[clave])).size).toBe(1);
    }
  });
});
