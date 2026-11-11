/**
 * Archivo: __tests__/lib/estandaresVisuales.test.ts
 * Descripción: Cuenta cuántos lugares de `fe/src/` se apartan del estándar de texto, íconos y botones, y falla si el número sube.
 * ¿Para qué? Issue #640 — la escala tipográfica y el componente `Button` se aplicaron solo a las pantallas que se rehicieron (#595,
 *           #632, #633); el resto del proyecto, incluidas las páginas que se suelen olvidar (recuperar contraseña, invitación,
 *           ventanas de formulario), sigue escrito a mano. Esta prueba recorre TODOS los archivos, no una lista: una pantalla
 *           nueva o olvidada que no cumpla hace fallar la prueba, sin que nadie tenga que acordarse de sumarla.
 * ¿Impacto? Es un trinquete: el conteo de partida (BASE) solo puede BAJAR. Si el conteo sube, la prueba falla y lista
 *           dónde está cada caso. Si baja, también falla hasta que se baje la constante BASE: así el avance queda fijo, igual
 *           que el umbral de cobertura del proyecto (solo sube). Al terminar el issue, cada BASE llega a 0.
 *           El análisis usa el compilador de TypeScript (no expresiones regulares sobre el texto) para leer bien los `className`
 *           de varias líneas y las funciones flecha dentro de los atributos.
 */
import { describe, expect, it } from "vitest";
import * as ts from "typescript";

const archivos = import.meta.glob("/src/**/*.tsx", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

// ¿Qué? El conteo de partida de cada regla (medido el 2026-11-11, antes de empezar a corregir).
// ¿Para qué? Fijar el avance: cada tanda de pantallas que se corrige baja el número. Al terminar el issue, todos llegan a 0.
const BASE = {
  botonesAMano: 68,
  iconosConMedidaSuelta: 2,
  textoGrandeFueraDeLaPortada: 7,
  titulosFueraDeLaEscala: 42,
};

// ¿Qué? Páginas que tienen su propio diseño y no siguen la escala (decisión del issue #640: solo la portada y los textos legales).
// ¿Impacto? Ingreso, registro, recuperar y restablecer contraseña, verificar correo e invitación NO están aquí: siguen la escala.
const EXCEPCIONES = [
  "/src/pages/LandingPage.tsx",
  "/src/pages/TerminosDeUsoPage.tsx",
  "/src/pages/PoliticaPrivacidadPage.tsx",
  "/src/pages/PoliticaCookiesPage.tsx",
  "/src/pages/TerminosModalPage.tsx",
  "/src/pages/CookiesModalPage.tsx",
  "/src/pages/PrivacidadModalPage.tsx",
  "/src/pages/ContactoModalPage.tsx",
  "/src/components/layout/LegalLayout.tsx",
];

// ¿Qué? Tamaño que corresponde a cada nivel de título (escala de docs/requisitos/restricciones.md).
const TAMANO_DE_TITULO: Record<string, string[]> = {
  h1: ["text-2xl"],
  h2: ["text-lg"],
  h3: ["text-base", "text-sm"],
  h4: ["text-sm"],
};
// ¿Qué? El texto del className empieza con comilla, comilla invertida o llave: el tamaño puede ir pegado a ella y no solo después de un espacio.
// ¿Para qué? Sin esto, el primer tamaño de cada className ("text-sm font-bold") no se reconocía y todo título parecía de 16 px.
const TAMANOS_GRANDES = /(?:^|[\s"'`{])text-(?:3xl|4xl|5xl|6xl)(?=[\s"'`}]|$)/;
const TAMANO_DE_TEXTO = /(?:^|[\s"'`{])text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)(?=[\s"'`}]|$)/;

interface Hallazgo {
  regla: keyof typeof BASE;
  donde: string;
}

// ¿Qué? El texto de un atributo `className` (cadena, plantilla o expresión): lo que se pueda leer sin ejecutar el código.
function textoDeClase(atributos: ts.JsxAttributes): string {
  for (const p of atributos.properties) {
    if (ts.isJsxAttribute(p) && p.name.getText() === "className" && p.initializer) return p.initializer.getText();
  }
  return "";
}

function analizar(ruta: string, codigo: string): Hallazgo[] {
  const salida: Hallazgo[] = [];
  const sf = ts.createSourceFile(ruta, codigo, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const esExcepcion = EXCEPCIONES.includes(ruta);
  const esButton = ruta.endsWith("/components/ui/Button.tsx");

  // ¿Qué? Los nombres importados de lucide-react en este archivo (son los íconos).
  const iconos = new Set<string>();
  sf.forEachChild((n) => {
    if (ts.isImportDeclaration(n) && n.moduleSpecifier.getText().includes("lucide-react")) {
      const enlaces = n.importClause?.namedBindings;
      if (enlaces && ts.isNamedImports(enlaces)) enlaces.elements.forEach((e) => iconos.add(e.name.getText()));
    }
  });

  const linea = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
  const dondeEsta = (n: ts.Node) => `${ruta.replace("/src/", "")}:${linea(n)}`;

  const visitar = (nodo: ts.Node) => {
    if (ts.isJsxOpeningElement(nodo) || ts.isJsxSelfClosingElement(nodo)) {
      const etiqueta = nodo.tagName.getText();
      const clase = textoDeClase(nodo.attributes);

      // Regla 1: botón primario, secundario o de peligro escrito a mano (debe ser el componente Button).
      if (etiqueta === "button" && !esButton) {
        const esPestana = nodo.attributes.properties.some((p) => ts.isJsxAttribute(p) && p.name.getText() === "role");
        const soloIcono = nodo.attributes.properties.some((p) => ts.isJsxAttribute(p) && p.name.getText() === "aria-label") && !/\bpx-(?:[3-9]|2\.5)\b/.test(clase);
        const primario = /bg-accent-700/.test(clase);
        const peligro = /bg-red-[67]00|(?:border|bg|text)-red-/.test(clase);
        const secundario = /\bborder\b/.test(clase) && /\bpx-/.test(clase);
        if (!esPestana && !soloIcono && (primario || peligro || secundario)) salida.push({ regla: "botonesAMano", donde: dondeEsta(nodo) });
      }

      // Regla 2: ícono (de lucide-react o de un ícono de rol) con medida suelta en vez de icon-sm/md/lg/xl.
      const esIcono = iconos.has(etiqueta) || /(?:^|\.)(?:[A-Za-z]*Icon)$/.test(etiqueta);
      if (esIcono && /\bh-\d+(?:\.\d+)?\b/.test(clase) && /\bw-\d+(?:\.\d+)?\b/.test(clase)) {
        salida.push({ regla: "iconosConMedidaSuelta", donde: dondeEsta(nodo) });
      }

      // Regla 3: texto de 3xl o más fuera de la portada y de los textos legales.
      if (!esExcepcion && TAMANOS_GRANDES.test(clase)) salida.push({ regla: "textoGrandeFueraDeLaPortada", donde: dondeEsta(nodo) });

      // Regla 4: título (h1 a h4) con un tamaño que no es el de su nivel.
      if (!esExcepcion && /^h[1-4]$/.test(etiqueta)) {
        const m = clase.match(TAMANO_DE_TEXTO);
        // ¿Qué? Un título sin tamaño escrito hereda 16 px, y eso se cuenta como desvío de h1 y h2 (el tamaño debe ser explícito).
        // ¿Impacto? Excepción: un título que solo envuelve el logo (`className="flex justify-center"`, como en AuthLayout) no tiene texto.
        const tamano = m ? `text-${m[1]}` : "text-base";
        const envuelveElLogo = !m && /\bflex\b/.test(clase);
        if (!envuelveElLogo && !TAMANO_DE_TITULO[etiqueta].includes(tamano)) salida.push({ regla: "titulosFueraDeLaEscala", donde: `${dondeEsta(nodo)} <${etiqueta}> ${tamano}` });
      }
    }
    ts.forEachChild(nodo, visitar);
  };
  visitar(sf);
  return salida;
}

const todos: Hallazgo[] = Object.entries(archivos)
  .filter(([ruta]) => !ruta.includes("/__tests__/"))
  .flatMap(([ruta, codigo]) => analizar(ruta, codigo));

const de = (regla: keyof typeof BASE) => todos.filter((h) => h.regla === regla).map((h) => h.donde);

describe("estándar de texto, íconos y botones (issue #640)", () => {
  it.each(Object.keys(BASE) as (keyof typeof BASE)[])("%s no sube del conteo de partida", (regla) => {
    const lugares = de(regla);
    expect(
      lugares.length,
      `Hay ${lugares.length} casos de "${regla}" y el conteo de partida es ${BASE[regla]}. Corrige los nuevos:\n${lugares.join("\n")}`,
    ).toBeLessThanOrEqual(BASE[regla]);
  });

  it.each(Object.keys(BASE) as (keyof typeof BASE)[])("%s: si bajó, la constante BASE se baja también (el avance queda fijo)", (regla) => {
    const lugares = de(regla);
    expect(lugares.length, `"${regla}" bajó a ${lugares.length}: cambia BASE.${regla} de ${BASE[regla]} a ${lugares.length}.`).toBe(BASE[regla]);
  });

  it("la prueba analiza archivos reales (no se queda vacía si cambia la carpeta)", () => {
    expect(Object.keys(archivos).filter((r) => !r.includes("/__tests__/")).length).toBeGreaterThan(80);
  });

  it("reconoce un botón verde escrito a mano y un título fuera de la escala", () => {
    const muestra = analizar(
      "/src/pages/Muestra.tsx",
      `import { Plus } from "lucide-react";
       export const X = () => (
         <div>
           <h2 className="text-sm font-bold">Título</h2>
           <button className="rounded-xl bg-accent-700 px-4 py-2" onClick={() => go()}><Plus className="h-4 w-4" /></button>
         </div>
       );`,
    ).map((h) => h.regla);
    expect(muestra).toEqual(expect.arrayContaining(["titulosFueraDeLaEscala", "botonesAMano", "iconosConMedidaSuelta"]));
  });
});
