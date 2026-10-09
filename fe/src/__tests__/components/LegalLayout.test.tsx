/**
 * Archivo: __tests__/components/LegalLayout.test.tsx
 * Descripción: Encabezado de los documentos legales (versión y fecha).
 * ¿Impacto? Antes "Versión" y "Última actualización" estaban escritos en
 *           español a mano y la fecha salía cruda; estas pruebas fallan si
 *           vuelve a pasar.
 */

import { render, screen } from "@testing-library/react";
import { LegalLayout } from "@/components/layout/LegalLayout";
import { formatearFechaUTC } from "@/lib/dateFormat";

describe("LegalLayout", () => {
  it("muestra la versión y la fecha formateada con el texto traducido", () => {
    render(
      <LegalLayout title="Política" lastUpdated="2026-10-06" version="1.1">
        <p>contenido</p>
      </LegalLayout>,
    );

    expect(screen.getByText("Versión 1.1")).toBeInTheDocument();
    expect(screen.getByText(`Última actualización: ${formatearFechaUTC("2026-10-06")}`)).toBeInTheDocument();
    expect(screen.queryByText(/2026-10-06/)).not.toBeInTheDocument();
  });
});
