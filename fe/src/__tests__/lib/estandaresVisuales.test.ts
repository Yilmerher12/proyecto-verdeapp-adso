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

// ¿Qué? El conteo permitido de cada regla. Partió de 68 botones, 2 íconos, 7 textos grandes, 42 títulos y 34 pesos (medido el 2026-11-11) y
//       bajó tanda por tanda hasta 0: desde el cierre del issue #640, cualquier caso nuevo hace fallar la prueba.
// ¿Para qué? Fijar el avance: cada tanda de pantallas que se corrige baja el número. Al terminar el issue, todos llegan a 0.
const BASE = {
  botonesAMano: 0,
  iconosConMedidaSuelta: 0,
  textoGrandeFueraDeLaPortada: 0,
  titulosFueraDeLaEscala: 0,
  pesosFueraDeLaRegla: 0,
  // Issue #641 — dimensiones: relleno de las tarjetas, esquina de los campos y separación entre los bloques de una página.
  tarjetasConRellenoPropio: 0,
  camposConEsquinaGrande: 0,
  paginasConSeparacionPropia: 0,
  // Issue #642 — colores y efectos: foco con teclado y colores permitidos.
  focoDelAnilloAMano: 0,
  coloresFueraDeLaLista: 0,
  // Issue #643 — movimiento: panel de pestañas con PanelPestana y una sola duración "normal" (200 ms).
  panelesDePestanaAMano: 0,
  duracionesFueraDeLaRegla: 0,
  // Issue #644 — estados de carga: una lista, tarjeta o formulario que espera datos muestra una silueta (Esqueleto), no un círculo.
  estadosDeCargaConCirculo: 0,
};

// ¿Qué? Páginas de Aprende a reciclar: tienen su propio estilo (esquinas más redondeadas y más espacio), documentado en restricciones.md.
const PAGINAS_CON_SEPARACION_PROPIA = ["/src/pages/CatalogoEducativoPage.tsx", "/src/pages/CategoriaEducativaPage.tsx"];

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
// ¿Qué? Peso (grosor) de la letra que corresponde a cada función (docs/requisitos/restricciones.md): títulos grueso (bold), nombres de campo medio (medium).
const PESO_DE_TEXTO = /\bfont-(normal|medium|semibold|bold|extrabold)\b/;
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
        const tiene = (nombre: string) => nodo.attributes.properties.some((p) => ts.isJsxAttribute(p) && p.name.getText() === nombre);
        const esPestana = tiene("role");
        // ¿Qué? Controles de selección (pestañas, chips de filtro, tarjetas que hacen de botón): su estilo cambia según estén o no
        //       elegidos, así que su className es una expresión con condiciones y no un texto fijo, o llevan aria-pressed. No son
        //       acciones y no se reemplazan por Button: quedan fuera de esta regla.
        const atributoClase = nodo.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText() === "className") as ts.JsxAttribute | undefined;
        // ¿Qué? También quedan fuera una fila o tarjeta que hace de botón (texto alineado a la izquierda) y un enlace con forma de botón (subrayado).
        const esControlDeSeleccion =
          tiene("aria-pressed") ||
          (!!atributoClase?.initializer && !ts.isStringLiteral(atributoClase.initializer)) ||
          /\btext-left\b|\bunderline\b/.test(clase);
        // ¿Qué? Un botón de solo ícono tiene su nombre en aria-label o en title, y no lleva relleno horizontal de texto.
        const soloIcono = (tiene("aria-label") || tiene("title")) && !/\bpx-(?:[3-9]|2\.5)\b/.test(clase);
        const primario = /bg-accent-700/.test(clase);
        const peligro = /bg-red-[67]00|border-red-/.test(clase); // un botón que solo tiene texto rojo (sin fondo ni borde) es un enlace, no un Button
        const secundario = /(?:^|[\s"'`])border(?=[\s"'`])/.test(clase) && /\bpx-|\bflex-1\b|\bw-full\b/.test(clase);
        // ¿Qué? Un botón cuyo className sale de una constante o de un estilo de variante (CLASE_BOTON_..., estilo.boton) también es un botón de
        //       acción escrito a mano, aunque su className no sea un texto fijo: así no se escapa (por ejemplo el de confirmar de ConfirmModal).
        const claseDeConstante = !!atributoClase?.initializer && /CLASE_BOTON|estilo\.boton/.test(atributoClase.initializer.getText());
        if ((!esPestana && !esControlDeSeleccion && !soloIcono && (primario || peligro || secundario)) || claseDeConstante) {
          salida.push({ regla: "botonesAMano", donde: dondeEsta(nodo) });
        }
      }

      // Regla 2: ícono (de lucide-react o de un ícono de rol) con medida suelta en vez de icon-sm/md/lg/xl.
      const esIcono = iconos.has(etiqueta) || /(?:^|\.)(?:[A-Za-z]*Icon)$/.test(etiqueta);
      if (esIcono && /\bh-\d+(?:\.\d+)?\b/.test(clase) && /\bw-\d+(?:\.\d+)?\b/.test(clase)) {
        salida.push({ regla: "iconosConMedidaSuelta", donde: dondeEsta(nodo) });
      }

      // Regla 3: texto de 3xl o más fuera de la portada y de los textos legales.
      if (!esExcepcion && TAMANOS_GRANDES.test(clase)) salida.push({ regla: "textoGrandeFueraDeLaPortada", donde: dondeEsta(nodo) });

      // Regla 5: peso de la letra. Un título lleva bold y el nombre de un campo (label) lleva medium. Solo cuenta si el peso está
      //          escrito: un label sin peso es un texto corriente (por ejemplo, el de una casilla de términos), no un nombre de campo.
      if (!esExcepcion && (/^h[1-4]$/.test(etiqueta) || etiqueta === "label")) {
        const peso = clase.match(PESO_DE_TEXTO)?.[1];
        const debe = etiqueta === "label" ? "medium" : "bold";
        const logo = etiqueta !== "label" && !peso && /\bflex\b/.test(clase); // título que solo envuelve el logo
        // ¿Qué? Un label con borde o relleno horizontal hace de botón (por ejemplo "Insertar imagen" o una opción CSV/PDF): no es el nombre de un campo.
        const haceDeBoton = etiqueta === "label" && (/\bborder\b/.test(clase) || /\bpx-/.test(clase));
        const aislado = logo || haceDeBoton;
        if (peso && peso !== debe && !aislado) salida.push({ regla: "pesosFueraDeLaRegla", donde: `${dondeEsta(nodo)} <${etiqueta}> ${peso} (debe ser ${debe})` });
      }

      // Regla 4: título (h1 a h4) con un tamaño que no es el de su nivel.
      if (!esExcepcion && /^h[1-4]$/.test(etiqueta)) {
        const m = clase.match(TAMANO_DE_TEXTO);
        // ¿Qué? Un título sin tamaño escrito hereda 16 px, y eso se cuenta como desvío de h1 y h2 (el tamaño debe ser explícito).
        // ¿Impacto? Excepción: un título que solo envuelve el logo (`className="flex justify-center"`, como en AuthLayout) no tiene texto.
        const tamano = m ? `text-${m[1]}` : "text-base";
        const envuelveElLogo = !m && /\bflex\b/.test(clase);
        if (!envuelveElLogo && !TAMANO_DE_TITULO[etiqueta].includes(tamano)) salida.push({ regla: "titulosFueraDeLaEscala", donde: `${dondeEsta(nodo)} <${etiqueta}> ${tamano}` });
      }

      // Regla 6 (issue #641): una tarjeta de página (esquina de 16 px y borde, con fondo de tarjeta o de aviso) lleva 24 px de relleno (p-6), no 20 (p-5).
      // ¿Qué? Los elementos de lista (p-4) y las barras de filtros (p-3) son más compactos a propósito y no se cuentan.
      const esTarjeta = /\brounded-2xl\b/.test(clase) && /\bborder\b/.test(clase);
      if (!esExcepcion && esTarjeta && /(?:^|[\s"'`])p-5(?=[\s"'`])/.test(clase)) salida.push({ regla: "tarjetasConRellenoPropio", donde: dondeEsta(nodo) });

      // Regla 7 (issue #641): un campo de formulario escrito a mano lleva esquina de 8 px (rounded-lg), igual que InputField y Button.
      if (["input", "select", "textarea"].includes(etiqueta) && /\brounded-xl\b/.test(clase)) salida.push({ regla: "camposConEsquinaGrande", donde: dondeEsta(nodo) });

      // Regla 8 (issue #641): los bloques de una página se separan 24 px (space-y-6); Aprende a reciclar tiene su estilo propio.
      if (/ANCHO_PAGINA/.test(clase) && !PAGINAS_CON_SEPARACION_PROPIA.includes(ruta)) {
        const separacion = clase.match(/space-y-[\d.]+/)?.[0];
        if (separacion && separacion !== "space-y-6") salida.push({ regla: "paginasConSeparacionPropia", donde: `${dondeEsta(nodo)} ${separacion}` });
      }

      // Regla 9 (issue #642): el anillo de foco verde sale de la clase focus-ring, no se escribe a mano en cada control. El anillo ROJO de un
      //          campo con error sí se escribe a mano (debe seguir rojo) y no se cuenta.
      if (/(?:dark:)?focus(?:-visible)?:ring-accent-\d+/.test(clase) && !/(?<![\w:-])focus-ring(?![\w-])/.test(clase)) {
        salida.push({ regla: "focoDelAnilloAMano", donde: dondeEsta(nodo) });
      }

      // Regla 10 (issue #642): solo hay colores de acento (accent), de estado (red y amber) y de categoría (purple, indigo y teal); nada de
      //           blue, yellow, orange, green, etc. (los de modo oscuro con prefijo dark: acompañan siempre a uno de claro).
      const fuera = clase.match(/(?<![:\w-])(?:bg|text|border|ring|fill|stroke)-(?:blue|yellow|orange|green|emerald|sky|cyan|violet|pink|rose|lime)-\d+/);
      if (fuera) salida.push({ regla: "coloresFueraDeLaLista", donde: `${dondeEsta(nodo)} ${fuera[0]}` });

      // Regla 13 (issue #644): el círculo "Cargando…" (LoadingState) ya no se usa para esperar datos de una pantalla; para eso está Esqueleto.
      //           Un círculo dentro de un botón (Button con isLoading) no usa este componente y no se cuenta.
      if (etiqueta === "LoadingState" && !ruta.endsWith("/components/ui/LoadingState.tsx")) salida.push({ regla: "estadosDeCargaConCirculo", donde: dondeEsta(nodo) });

      // Regla 11 (issue #643): el panel de una fila de pestañas es el componente PanelPestana (rol, vínculo con la pestaña y desvanecimiento
      //           de entrada), no un elemento con role="tabpanel" escrito a mano.
      const rolEscrito = nodo.attributes.properties.some((p) => ts.isJsxAttribute(p) && p.name.getText() === "role" && p.initializer?.getText() === '"tabpanel"');
      if (rolEscrito && !ruta.endsWith("/components/ui/PanelPestana.tsx")) salida.push({ regla: "panelesDePestanaAMano", donde: dondeEsta(nodo) });

      // Regla 12 (issue #643): las duraciones son dos, rápida (150 ms, la de transition-colors sin duración) y normal (duration-200). Cualquier
      //           otra duration-N escrita fuera de la portada se cuenta.
      const duracion = clase.match(/(?<![:\w-])duration-(\d+)/);
      if (!esExcepcion && duracion && duracion[1] !== "200") salida.push({ regla: "duracionesFueraDeLaRegla", donde: `${dondeEsta(nodo)} ${duracion[0]}` });
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

  it("reconoce una tarjeta con relleno de 20 px, un campo con esquina de 12 px y una página con otra separación", () => {
    const muestra = analizar(
      "/src/pages/Muestra.tsx",
      `export const X = () => (
         <div className={\`\${ANCHO_PAGINA.normal} space-y-5 pt-6\`}>
           <div className="rounded-2xl border border-gray-100 bg-white p-5">
             <input className="rounded-xl border px-3 py-2" />
           </div>
         </div>
       );`,
    ).map((h) => h.regla);
    expect(muestra).toEqual(expect.arrayContaining(["tarjetasConRellenoPropio", "camposConEsquinaGrande", "paginasConSeparacionPropia"]));
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

  it("reconoce un nombre de campo grueso y un título semigrueso", () => {
    const muestra = analizar(
      "/src/pages/Muestra.tsx",
      `export const X = () => (
         <div>
           <h2 className="text-lg font-semibold">Título</h2>
           <label className="text-xs font-bold">Nombre</label>
           <label className="text-sm">Acepto los términos</label>
         </div>
       );`,
    ).filter((h) => h.regla === "pesosFueraDeLaRegla");
    expect(muestra).toHaveLength(2);
  });

  it("reconoce un anillo de foco verde escrito a mano y un color fuera de la lista", () => {
    const muestra = analizar(
      "/src/pages/Muestra.tsx",
      `export const X = () => (
         <div>
           <input className="focus:ring-2 focus:ring-accent-500" />
           <span className="bg-blue-50 text-blue-800">N</span>
           <input className="focus-ring" />
         </div>
       );`,
    ).map((h) => h.regla);
    expect(muestra.filter((r) => r === "focoDelAnilloAMano")).toHaveLength(1);
    expect(muestra).toContain("coloresFueraDeLaLista");
  });

  it("reconoce el círculo de carga usado en una pantalla", () => {
    const muestra = analizar(
      "/src/pages/Muestra.tsx",
      `export const X = () => (cargando ? <LoadingState message="Cargando" /> : <Lista />);`,
    ).map((h) => h.regla);
    expect(muestra).toContain("estadosDeCargaConCirculo");
  });

  it("reconoce un panel de pestañas escrito a mano y una duración distinta de 200 ms", () => {
    const muestra = analizar(
      "/src/pages/Muestra.tsx",
      `export const X = () => (
         <div>
           <div role="tabpanel" aria-labelledby="x">A</div>
           <div className="transition-colors duration-300">B</div>
           <div className="transition-colors duration-200">C</div>
         </div>
       );`,
    ).map((h) => h.regla);
    expect(muestra.filter((r) => r === "panelesDePestanaAMano")).toHaveLength(1);
    expect(muestra.filter((r) => r === "duracionesFueraDeLaRegla")).toHaveLength(1);
  });
});
