/**
 * Archivo: __tests__/lib/dateFormat.test.ts
 * Descripción: Cuál es la semana "de hoy" para las auditorías: lunes en hora de
 *              Bogotá (lunesBogota) frente al lunes en UTC (lunesUTC).
 */
import { describe, expect, it } from "vitest";
import { etiquetaMes, lunesBogota, lunesUTC, mesBogota, moverMes, rangoDeMes } from "@/lib/dateFormat";

describe("lunesBogota", () => {
  it("a mitad de semana es el mismo lunes que da lunesUTC", () => {
    const jueves = new Date("2026-10-22T15:00:00Z");
    expect(lunesBogota(jueves)).toBe("2026-10-19");
    expect(lunesUTC(jueves)).toBe("2026-10-19");
  });

  it("el domingo a las 9 p. m. en Bogotá (lunes 2 a. m. UTC) todavía es la semana que termina ese domingo", () => {
    const domingoNoche = new Date("2026-09-21T02:00:00Z");
    expect(lunesBogota(domingoNoche)).toBe("2026-09-14");
    // ¿Qué? Con lunesUTC la semana ya habría cambiado: por eso la pantalla usa lunesBogota.
    expect(lunesUTC(domingoNoche)).toBe("2026-09-21");
  });

  it("el límite es la medianoche de Bogotá: 04:59 UTC aún es domingo, 05:00 UTC ya es lunes", () => {
    expect(lunesBogota(new Date("2026-09-21T04:59:00Z"))).toBe("2026-09-14");
    expect(lunesBogota(new Date("2026-09-21T05:00:00Z"))).toBe("2026-09-21");
  });
});

// ¿Qué? Issue #618 — el modo Mes del periodo de Calificaciones.
describe("meses", () => {
  it("mesBogota usa el mes que marca el reloj de Bogotá, no el de UTC", () => {
    // 1 de octubre a las 2 a. m. UTC todavía es 30 de septiembre en Bogotá.
    expect(mesBogota(new Date("2026-10-01T02:00:00Z"))).toBe("2026-09");
    expect(mesBogota(new Date("2026-10-01T05:00:00Z"))).toBe("2026-10");
  });

  it("moverMes cruza el cambio de año hacia los dos lados", () => {
    expect(moverMes("2026-01", -1)).toBe("2025-12");
    expect(moverMes("2026-12", 1)).toBe("2027-01");
    expect(moverMes("2026-09", 0)).toBe("2026-09");
  });

  it("rangoDeMes da el primer y el último día, incluido febrero de un año bisiesto", () => {
    expect(rangoDeMes("2026-09")).toEqual({ desde: "2026-09-01", hasta: "2026-09-30" });
    expect(rangoDeMes("2028-02")).toEqual({ desde: "2028-02-01", hasta: "2028-02-29" });
  });

  it("etiquetaMes escribe el mes y el año en el idioma pedido", () => {
    expect(etiquetaMes("2026-09", "es")).toMatch(/septiembre.*2026/i);
    expect(etiquetaMes("2026-09", "en")).toMatch(/September.*2026/);
  });
});
