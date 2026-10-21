/**
 * Archivo: __tests__/lib/periodosDescarga.test.ts
 * Descripción: Tests de las fechas de cada período de descarga de la agenda
 *              (issue #480, HU-049): "Todo", "Este mes", "Mes pasado" y "Personalizado".
 */
import { describe, expect, it } from "vitest";
import { hoyEnBogota, rangoDelPeriodo } from "@/lib/periodosDescarga";

const SIN_FECHAS = { desde: "", hasta: "" };

describe("rangoDelPeriodo", () => {
  it("'Todo' no manda fechas", () => {
    expect(rangoDelPeriodo("TODO", { desde: "2026-01-01", hasta: "2026-01-02" }, "2026-10-21")).toEqual(SIN_FECHAS);
  });

  it("'Este mes' va del primer al último día del mes de hoy", () => {
    expect(rangoDelPeriodo("ESTE_MES", SIN_FECHAS, "2026-10-21")).toEqual({ desde: "2026-10-01", hasta: "2026-10-31" });
  });

  it("'Mes pasado' va del primer al último día del mes anterior", () => {
    expect(rangoDelPeriodo("MES_PASADO", SIN_FECHAS, "2026-10-21")).toEqual({ desde: "2026-09-01", hasta: "2026-09-30" });
  });

  it("'Mes pasado' en enero es diciembre del año anterior", () => {
    expect(rangoDelPeriodo("MES_PASADO", SIN_FECHAS, "2027-01-05")).toEqual({ desde: "2026-12-01", hasta: "2026-12-31" });
  });

  it("calcula bien febrero, también en año bisiesto", () => {
    expect(rangoDelPeriodo("ESTE_MES", SIN_FECHAS, "2027-02-10").hasta).toBe("2027-02-28");
    expect(rangoDelPeriodo("ESTE_MES", SIN_FECHAS, "2028-02-10").hasta).toBe("2028-02-29");
    expect(rangoDelPeriodo("MES_PASADO", SIN_FECHAS, "2028-03-01")).toEqual({ desde: "2028-02-01", hasta: "2028-02-29" });
  });

  it("'Personalizado' usa las fechas escritas", () => {
    const fechas = { desde: "2026-10-03", hasta: "2026-10-09" };
    expect(rangoDelPeriodo("PERSONALIZADO", fechas, "2026-10-21")).toEqual(fechas);
  });
});

describe("hoyEnBogota", () => {
  it("usa la hora de Bogotá (UTC-5), no la de UTC: a las 02:00 UTC del lunes todavía es domingo", () => {
    expect(hoyEnBogota(new Date("2026-10-19T02:00:00Z"))).toBe("2026-10-18");
    expect(hoyEnBogota(new Date("2026-10-19T05:00:00Z"))).toBe("2026-10-19");
  });
});
