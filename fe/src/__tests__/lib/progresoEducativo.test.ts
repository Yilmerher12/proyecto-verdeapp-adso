/**
 * Archivo: __tests__/lib/progresoEducativo.test.ts
 * Descripción: Tests de las reglas de "Aprende a reciclar" (issue #705): orden de categorías, primera
 *              lección sin ver, avance, anterior/siguiente y a dónde lleva cada enlace.
 */
import { describe, expect, it } from "vitest";
import {
  agruparPorCategoria,
  destinoDeCategoria,
  modulosDe,
  primeraSinVer,
  progresoDe,
  rutaCategoria,
  rutaLeccion,
  vecinosDe,
} from "@/lib/progresoEducativo";
import type { ContenidoEducativo } from "@/lib/contenidoEducativoApi";

function modulo(id: string, categoria: string, orden: number): ContenidoEducativo {
  return {
    id_contenido: id,
    modulo_categoria: categoria,
    titulo_tema: `Lección ${id}`,
    cuerpo_texto: "texto",
    url_video: null,
    url_guia: null,
    url_imagen: null,
    fecha_publicacion: "2026-11-26",
    orden,
  };
}

const PELIGROSOS = "Residuos peligrosos del hogar";
const SEPARACION = "Separación en la fuente y código de colores";
const NUEVA = "Compostaje en casa";

const CONTENIDO = [
  modulo("p2", PELIGROSOS, 2),
  modulo("s1", SEPARACION, 1),
  modulo("p1", PELIGROSOS, 1),
  modulo("n1", NUEVA, 1),
  modulo("p3", PELIGROSOS, 3),
];

describe("rutas", () => {
  it("la categoría lleva su nombre codificado y la lección lleva su id", () => {
    expect(rutaCategoria("Puntos limpios y Ecopuntos")).toBe("/catalogo-educativo/Puntos%20limpios%20y%20Ecopuntos");
    expect(rutaLeccion("abc")).toBe("/catalogo-educativo/leccion/abc");
  });
});

describe("modulosDe", () => {
  it("devuelve solo los de esa categoría, en su orden de lectura", () => {
    expect(modulosDe(CONTENIDO, PELIGROSOS).map((m) => m.id_contenido)).toEqual(["p1", "p2", "p3"]);
  });

  it("no modifica la lista original", () => {
    const copia = [...CONTENIDO];
    modulosDe(CONTENIDO, PELIGROSOS);
    expect(CONTENIDO).toEqual(copia);
  });
});

describe("agruparPorCategoria", () => {
  it("usa el orden de las categorías conocidas y deja las nuevas al final", () => {
    expect(agruparPorCategoria(CONTENIDO).map((c) => c.nombre)).toEqual([SEPARACION, PELIGROSOS, NUEVA]);
  });

  it("cada categoría trae sus módulos en orden", () => {
    const peligrosos = agruparPorCategoria(CONTENIDO).find((c) => c.nombre === PELIGROSOS)!;
    expect(peligrosos.modulos.map((m) => m.orden)).toEqual([1, 2, 3]);
  });

  it("las categorías nuevas se ordenan por nombre entre ellas", () => {
    const lista = [modulo("b", "Zeta", 1), modulo("a", "Alfa", 1)];
    expect(agruparPorCategoria(lista).map((c) => c.nombre)).toEqual(["Alfa", "Zeta"]);
  });
});

describe("primeraSinVer y progresoDe", () => {
  const modulos = modulosDe(CONTENIDO, PELIGROSOS);

  it("la primera sin ver sigue el orden de lectura, aunque haya vistas más adelante", () => {
    expect(primeraSinVer(modulos, new Set(["p2"]))?.id_contenido).toBe("p1");
    expect(primeraSinVer(modulos, new Set(["p1"]))?.id_contenido).toBe("p2");
  });

  it("no hay primera sin ver cuando ya vio todas", () => {
    expect(primeraSinVer(modulos, new Set(["p1", "p2", "p3"]))).toBeUndefined();
  });

  it("sin ninguna vista está sin empezar", () => {
    expect(progresoDe(modulos, new Set())).toEqual({ vistos: 0, total: 3, estado: "sinEmpezar" });
  });

  it("con algunas vistas está en curso", () => {
    expect(progresoDe(modulos, new Set(["p1"]))).toEqual({ vistos: 1, total: 3, estado: "enCurso" });
  });

  it("con todas vistas está completa", () => {
    expect(progresoDe(modulos, new Set(["p1", "p2", "p3"]))).toEqual({ vistos: 3, total: 3, estado: "completa" });
  });

  it("no cuenta vistas de otras categorías", () => {
    expect(progresoDe(modulos, new Set(["s1", "n1"])).vistos).toBe(0);
  });
});

describe("vecinosDe", () => {
  const modulos = modulosDe(CONTENIDO, PELIGROSOS);

  it("la primera lección no tiene anterior", () => {
    expect(vecinosDe(modulos, "p1")).toEqual({ anterior: undefined, siguiente: modulos[1] });
  });

  it("una lección del medio tiene anterior y siguiente", () => {
    const { anterior, siguiente } = vecinosDe(modulos, "p2");
    expect(anterior?.id_contenido).toBe("p1");
    expect(siguiente?.id_contenido).toBe("p3");
  });

  it("la última no tiene siguiente", () => {
    expect(vecinosDe(modulos, "p3").siguiente).toBeUndefined();
  });

  it("un id que no está en la categoría no tiene vecinos", () => {
    expect(vecinosDe(modulos, "otra")).toEqual({ anterior: undefined, siguiente: undefined });
  });
});

describe("destinoDeCategoria", () => {
  it("lleva a la primera lección sin ver", () => {
    expect(destinoDeCategoria(CONTENIDO, PELIGROSOS, new Set(["p1"]))).toBe("/catalogo-educativo/leccion/p2");
  });

  it("si ya vio todas, lleva a la lista de la categoría", () => {
    expect(destinoDeCategoria(CONTENIDO, PELIGROSOS, new Set(["p1", "p2", "p3"]))).toBe(rutaCategoria(PELIGROSOS));
  });

  it("si la categoría no tiene módulos, lleva a la lista (que lo dice)", () => {
    expect(destinoDeCategoria(CONTENIDO, "No existe", new Set())).toBe(rutaCategoria("No existe"));
  });
});
