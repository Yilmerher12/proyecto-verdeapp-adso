/**
 * Archivo: __tests__/components/BrandLogo.test.tsx
 * Descripción: Tests del componente BrandLogo — qué SVG muestra según variant y tone.
 * ¿Para qué? Verificar que cada combinación apunte a un archivo que existe en
 *           public/logos y que el logo siempre tenga texto alternativo.
 * ¿Impacto? Sin estos tests, un cambio de nombre de archivo dejaría el logo roto
 *           en todas las páginas sin que ninguna prueba lo detecte.
 */

import { render, screen } from "@testing-library/react";
import { BrandLogo } from "@/components/ui/BrandLogo";

// ¿Qué? Lista de los SVG que existen en public/logos (Vite la arma al compilar).
const existentes = Object.keys(import.meta.glob("/public/logos/*.svg")).map((k) => k.replace("/public", ""));

const srcs = () => screen.getAllByAltText("VerdeApp").map((img) => img.getAttribute("src"));

describe("BrandLogo", () => {
  it("tone light muestra solo la versión blanca", () => {
    render(<BrandLogo tone="light" />);
    expect(srcs()).toEqual(["/logos/logo-white.svg"]);
  });

  it("tone auto muestra las dos versiones, una por modo", () => {
    render(<BrandLogo variant="mark" />);
    const imgs = screen.getAllByAltText("VerdeApp");
    expect(imgs.map((i) => i.getAttribute("src"))).toEqual(["/logos/logo-mark.svg", "/logos/logo-mark-white.svg"]);
    expect(imgs[0]).toHaveClass("dark:hidden");
    expect(imgs[1]).toHaveClass("hidden", "dark:block");
  });

  it("aplica el alto recibido por className", () => {
    render(<BrandLogo tone="light" className="h-20" />);
    expect(screen.getByAltText("VerdeApp")).toHaveClass("h-20");
  });

  // ¿Qué? Cada src que puede generar el componente existe de verdad en public/.
  it.each([
    ["full", "auto"],
    ["full", "light"],
    ["mark", "auto"],
    ["mark", "light"],
  ] as const)("variant=%s tone=%s apunta a archivos existentes", (variant, tone) => {
    render(<BrandLogo variant={variant} tone={tone} />);
    for (const src of srcs()) {
      expect(existentes).toContain(src);
    }
  });
});
