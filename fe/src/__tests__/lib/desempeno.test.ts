/**
 * Archivo: __tests__/lib/desempeno.test.ts
 * Descripción: Cálculos del desempeño semanal (issue #487): totales, ranking de
 *              temas, porcentaje Bueno, semana por defecto y rango de fechas.
 */
import { describe, expect, it } from "vitest";
import type { DesempenoConjunto, SemanaDesempeno, TemaDesempeno } from "@/lib/auditoriaConjuntoApi";
import {
  lunesInicial,
  porcentajeBueno,
  rangoSemana,
  rankingTemas,
  regularOMalo,
  temaAReforzar,
  totalSemana,
  totalTema,
} from "@/lib/desempeno";

const semana = (lunes: string, bueno = 0, regular = 0, malo = 0): SemanaDesempeno => ({ lunes, bueno, regular, malo });
const tema = (nombre: string, bueno = 0, regular = 0, malo = 0): TemaDesempeno => ({ tema: nombre, bueno, regular, malo });

describe("totales", () => {
  it("suma los tres niveles de una semana y de un tema", () => {
    expect(totalSemana(semana("2026-10-19", 3, 1, 2))).toBe(6);
    expect(totalTema(tema("Vidrio", 1, 3, 1))).toBe(5);
    expect(regularOMalo(tema("Vidrio", 1, 3, 1))).toBe(4);
  });
});

describe("rankingTemas", () => {
  it("ordena por Regular o Malo, de más a menos", () => {
    const orden = rankingTemas([tema("A", 5), tema("B", 1, 3, 1), tema("C", 0, 1, 1)]);
    expect(orden.map((t) => t.tema)).toEqual(["B", "C", "A"]);
  });

  it("a igual cantidad de Regular o Malo, va primero el que tiene más auditorías, y luego el nombre", () => {
    const orden = rankingTemas([tema("Z", 0, 2), tema("Y", 4, 2), tema("X", 0, 2)]);
    expect(orden.map((t) => t.tema)).toEqual(["Y", "X", "Z"]);
  });

  it("no cambia la lista que recibe", () => {
    const original = [tema("A", 5), tema("B", 0, 3)];
    rankingTemas(original);
    expect(original.map((t) => t.tema)).toEqual(["A", "B"]);
  });
});

describe("temaAReforzar", () => {
  it("es el primero del ranking", () => {
    expect(temaAReforzar([tema("A", 5), tema("B", 1, 3)])?.tema).toBe("B");
  });

  it("es null si ningún tema tiene Regular ni Malo, o si no hay temas", () => {
    expect(temaAReforzar([tema("A", 5), tema("B", 2)])).toBeNull();
    expect(temaAReforzar([])).toBeNull();
  });
});

describe("porcentajeBueno", () => {
  const desempeno = (semanas: SemanaDesempeno[], total: number): DesempenoConjunto => ({
    id_conjunto_residencial: "c1",
    total,
    semanas,
    temas: [],
  });

  it("redondea al entero más cercano", () => {
    expect(porcentajeBueno(desempeno([semana("2026-10-12", 1, 2), semana("2026-10-19", 1)], 4))).toBe(50);
    expect(porcentajeBueno(desempeno([semana("2026-10-19", 2, 1)], 3))).toBe(67);
  });

  it("es null sin auditorías", () => {
    expect(porcentajeBueno(desempeno([semana("2026-10-19")], 0))).toBeNull();
  });
});

describe("lunesInicial", () => {
  it("es la semana más reciente que tiene auditorías", () => {
    const semanas = [semana("2026-10-05", 1), semana("2026-10-12", 2), semana("2026-10-19")];
    expect(lunesInicial(semanas)).toBe("2026-10-12");
  });

  it("sin auditorías en ninguna, es la semana en curso (la última)", () => {
    expect(lunesInicial([semana("2026-10-12"), semana("2026-10-19")])).toBe("2026-10-19");
  });

  it("es null si no hay semanas", () => {
    expect(lunesInicial([])).toBeNull();
  });
});

describe("rangoSemana", () => {
  it("da el lunes y el domingo de la semana, aunque cruce de mes", () => {
    // ¿Qué? Se compara con Date en UTC (no con texto) porque el nombre del mes depende del idioma del equipo.
    const { desde, hasta } = rangoSemana("2026-09-28", "es");
    expect(desde).toBe(new Date(Date.UTC(2026, 8, 28)).toLocaleDateString("es", { day: "numeric", month: "short", timeZone: "UTC" }));
    expect(hasta).toBe(new Date(Date.UTC(2026, 9, 4)).toLocaleDateString("es", { day: "numeric", month: "short", timeZone: "UTC" }));
    expect(desde).toMatch(/^28 /);
    expect(hasta).toMatch(/^4 /);
  });
});
