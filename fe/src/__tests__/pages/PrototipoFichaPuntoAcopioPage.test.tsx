/**
 * Archivo: __tests__/pages/PrototipoFichaPuntoAcopioPage.test.tsx
 * Descripción: Tests del prototipo de la ficha del punto de acopio (tres modelos, datos fijos).
 * ¿Para qué? Que el prototipo siga funcionando (cambiar de modelo, abrir y elegir un punto, enlace a Maps)
 *           mientras el equipo decide cuál modelo se construye de verdad.
 */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrototipoFichaPuntoAcopioPage } from "@/pages/PrototipoFichaPuntoAcopioPage";
import { renderWithProviders } from "../helpers";

describe("PrototipoFichaPuntoAcopioPage", () => {
  it("arranca con el Modelo C: lista a la izquierda y la ficha del primer punto", () => {
    renderWithProviders(<PrototipoFichaPuntoAcopioPage />);

    expect(screen.getByRole("tab", { name: /C · Lista y panel/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("article", { name: "Ficha de ECA Kennedy" })).toBeInTheDocument();
  });

  it("al elegir otro punto en el Modelo C, la ficha cambia y enlaza a Google Maps con sus coordenadas", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PrototipoFichaPuntoAcopioPage />);

    // ¿Qué? El nombre accesible del botón trae también la localidad y la etiqueta de estado;
    //       "(?! 2)" evita confundirlo con "ECA Engativá 2 (Las Ferias)".
    await user.click(screen.getByRole("button", { name: /^ECA Engativá(?! 2)/ }));

    const ficha = screen.getByRole("article", { name: "Ficha de ECA Engativá" });
    expect(within(ficha).getByText(/Activa en inventario/)).toBeInTheDocument();
    expect(within(ficha).getByRole("link", { name: /Cómo llegar/ })).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=4.706658,-74.105517"
    );
  });

  it("Modelo A: muestra una tarjeta por cada una de las 9 ECA", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PrototipoFichaPuntoAcopioPage />);

    await user.click(screen.getByRole("tab", { name: /A · Tarjetas/ }));

    expect(screen.getAllByRole("article")).toHaveLength(9);
  });

  it("Modelo B: la ficha de un punto se abre y se cierra al tocar su fila", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PrototipoFichaPuntoAcopioPage />);

    await user.click(screen.getByRole("tab", { name: /B · Lista que se abre/ }));

    const fila = screen.getByRole("button", { name: /ECA Kennedy/ });
    expect(fila).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: /Cómo llegar/ })).toBeInTheDocument();

    await user.click(fila);
    expect(fila).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: /Cómo llegar/ })).not.toBeInTheDocument();
  });

  it("nunca afirma que una ECA sigue activa si no coincide con una activa del inventario", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PrototipoFichaPuntoAcopioPage />);

    await user.click(screen.getByRole("tab", { name: /A · Tarjetas/ }));

    // Solo Engativá y Puente Aranda 2 coinciden con una ECA activa (investigación #460).
    expect(screen.getAllByText("Activa en inventario")).toHaveLength(2);
    expect(screen.getAllByText("Por confirmar")).toHaveLength(7);
  });
});
