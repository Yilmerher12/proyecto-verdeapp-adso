/**
 * Archivo: __tests__/components/MenuAcciones.test.tsx
 * Descripción: Tests del kebab con menú de acciones (components/ui/MenuAcciones.tsx).
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { Eye } from "lucide-react";
import { MenuAcciones } from "@/components/ui/MenuAcciones";

function renderMenu(onVer = vi.fn(), onBorrar = vi.fn()) {
  render(
    <MenuAcciones
      ariaLabel="Acciones de Ana"
      grupos={[
        [{ id: "ver", label: "Ver información", icon: Eye, onSelect: onVer }],
        [{ id: "borrar", label: "Desactivar", peligrosa: true, onSelect: onBorrar }],
      ]}
    />,
  );
  return { onVer, onBorrar };
}

describe("MenuAcciones", () => {
  it("empieza cerrado y declara que abre un menú", () => {
    renderMenu();
    const kebab = screen.getByRole("button", { name: "Acciones de Ana" });
    expect(kebab).toHaveAttribute("aria-haspopup", "menu");
    expect(kebab).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("al pulsar el kebab muestra las opciones, con una línea entre grupos", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Acciones de Ana" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Ver información", "Desactivar"]);
    expect(screen.getAllByRole("separator")).toHaveLength(1);
  });

  it("elegir una opción llama a su acción y cierra el menú", async () => {
    const user = userEvent.setup();
    const { onVer, onBorrar } = renderMenu();

    await user.click(screen.getByRole("button", { name: "Acciones de Ana" }));
    await user.click(screen.getByRole("menuitem", { name: "Ver información" }));

    expect(onVer).toHaveBeenCalledTimes(1);
    expect(onBorrar).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("las flechas mueven el foco entre las opciones", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Acciones de Ana" }));
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Ver información" })).toHaveFocus());

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Desactivar" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Ver información" })).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Desactivar" })).toHaveFocus();
  });

  it("Escape cierra el menú y devuelve el foco al kebab", async () => {
    const user = userEvent.setup();
    renderMenu();
    const kebab = screen.getByRole("button", { name: "Acciones de Ana" });

    await user.click(kebab);
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    expect(kebab).toHaveFocus();
  });

  it("un clic fuera del menú lo cierra", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Acciones de Ana" }));
    await user.click(document.body);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("volver a pulsar el kebab cierra el menú", async () => {
    const user = userEvent.setup();
    renderMenu();
    const kebab = screen.getByRole("button", { name: "Acciones de Ana" });

    await user.click(kebab);
    await user.click(kebab);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("sin opciones no dibuja nada", () => {
    const { container } = render(<MenuAcciones ariaLabel="Acciones" grupos={[[]]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
