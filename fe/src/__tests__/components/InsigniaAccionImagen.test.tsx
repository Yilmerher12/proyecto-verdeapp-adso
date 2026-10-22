/**
 * Archivo: __tests__/components/InsigniaAccionImagen.test.tsx
 * Descripción: Pruebas del ícono que marca una imagen como clicable.
 * ¿Para qué? Issue #501: una foto que abre algo debe verse distinta de una
 *           decorativa también en celular, donde no hay mouse.
 * ¿Impacto? Si la insignia se anunciara a un lector de pantalla, repetiría el
 *           nombre del botón que ya la contiene.
 */
import { render } from "@testing-library/react";
import { Maximize2 } from "lucide-react";
import { InsigniaAccionImagen } from "@/components/ui/InsigniaAccionImagen";

describe("InsigniaAccionImagen", () => {
  it("dibuja el ícono recibido, siempre visible y oculto para lectores de pantalla", () => {
    const { container } = render(<InsigniaAccionImagen icono={Maximize2} />);
    const insignia = container.firstElementChild as HTMLElement;

    expect(insignia).toHaveAttribute("aria-hidden", "true");
    expect(insignia.querySelector("svg")).toBeInTheDocument();
    // ¿Qué? No depende de :hover (en celular no existe) ni captura el clic del botón.
    expect(insignia.className).not.toContain("opacity-0");
    expect(insignia).toHaveClass("pointer-events-none");
  });
});
