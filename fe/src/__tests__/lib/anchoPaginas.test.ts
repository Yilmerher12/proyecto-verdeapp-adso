/**
 * Archivo: __tests__/lib/anchoPaginas.test.ts
 * Descripción: Falla si una página de la lista vuelve a escribir su propio ancho o relleno lateral.
 * ¿Para qué? Las páginas usan tres anchos fijos (`ANCHO_PAGINA`, ver config/anchoPagina.ts y
 *           docs/gestion-proyecto/decision-ancho-de-paginas.md). Antes cada una escribía su `max-w-*` y los
 *           paneles sumaban `sm:p-6`: unas páginas llegaban al borde y a otras les sobraba espacio.
 * ¿Impacto? Sin esta prueba, el próximo `max-w-5xl 2xl:max-w-6xl` suelto vuelve a colarse sin que nada
 *           avise. Si se agrega una página nueva con contenedor principal, súmala a PAGINAS.
 */
import { describe, expect, it } from "vitest";
import { ANCHO_PAGINA } from "@/config/anchoPagina";

const archivos = import.meta.glob("/src/pages/**/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// ¿Qué? Páginas con el contenedor estándar (las públicas y los modales tienen su propio diseño).
const PAGINAS = [
  "AdminConjuntoAgendaPage",
  "AdminConjuntoComunicadosPage",
  "AdminConjuntoDesempenoPage",
  "AdminContenidoEducativoPage",
  "AdminNovedadesPage",
  "AdminPuntosAcopioPage",
  "CatalogoEducativoPage",
  "CategoriaEducativaPage",
  "ChangePasswordPage",
  "ComunicadosFeedPage",
  "DirectorioPage",
  "NovedadesFeedPage",
  "ProfilePage",
  "dashboards/AdminConjuntoDashboard",
  "dashboards/AdminDashboard",
  "dashboards/RecicladorDashboard",
  "dashboards/ResidenteDashboard",
];

const codigoDe = (pagina: string) => archivos[`/src/pages/${pagina}.tsx`];

describe("ancho de las páginas", () => {
  it("define tres anchos y 'normal' no lleva un tope propio", () => {
    expect(Object.keys(ANCHO_PAGINA)).toEqual(["normal", "lectura", "formulario"]);
    expect(ANCHO_PAGINA.normal).not.toContain("max-w-");
  });

  it.each(PAGINAS)("%s usa ANCHO_PAGINA", (pagina) => {
    const codigo = codigoDe(pagina);
    expect(codigo, `no se encontró ${pagina}`).toBeDefined();
    expect(codigo).toContain("ANCHO_PAGINA");
  });

  it("ninguna escribe un tope de ancho 'un paso más desde 2xl' ni relleno lateral propio en el contenedor", () => {
    const hallazgos: string[] = [];
    for (const pagina of PAGINAS) {
      const codigo = codigoDe(pagina) ?? "";
      // El patrón viejo: `max-w-5xl 2xl:max-w-6xl`
      if (/max-w-\d?[a-z]*xl\s+2xl:max-w-/.test(codigo)) hallazgos.push(`${pagina}: tope de ancho propio con 2xl`);
      // El relleno doble de los paneles: `px-0 py-6 sm:p-6`
      if (/px-0\s+py-6\s+sm:p-6/.test(codigo)) hallazgos.push(`${pagina}: relleno lateral propio (sm:p-6)`);
    }
    expect(hallazgos).toEqual([]);
  });
});
