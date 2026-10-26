/**
 * Archivo: __tests__/lib/dateFormat.test.ts
 * Descripción: Cuál es la semana "de hoy" para las auditorías: lunes en hora de
 *              Bogotá (lunesBogota) frente al lunes en UTC (lunesUTC).
 */
import { describe, expect, it } from "vitest";
import { lunesBogota, lunesUTC } from "@/lib/dateFormat";

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
