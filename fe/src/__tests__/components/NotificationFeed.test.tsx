/**
 * Archivo: __tests__/components/NotificationFeed.test.tsx
 * Descripción: Tests de accesibilidad de la fila de notificación no leída.
 * ¿Para qué? Antes la fila solo respondía a onClick — un usuario que navega
 *           solo con teclado no podía marcarla como leída (issue #16).
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationFeed, type NotificacionItem } from "@/components/dashboard/NotificationFeed";

const notificacionNoLeida: NotificacionItem = {
  id: "1",
  tipo: "SHUT_LLENO",
  mensaje: "El SHUT está lleno",
  id_referencia: null,
  nombre_conjunto: "AGRUPACION QUINTAS DE ARANJUEZ",
  leida: false,
  created_at: new Date().toISOString(),
};

function renderFeed(onMarkRead = vi.fn()) {
  render(
    <NotificationFeed
      title="Notificaciones"
      notifications={[notificacionNoLeida]}
      emptyMessage="Sin notificaciones"
      accentBg="bg-green-600"
      accentHighlight="bg-green-50"
      onMarkRead={onMarkRead}
      onMarkAllRead={vi.fn()}
      onClearRead={vi.fn()}
    />,
  );
  return onMarkRead;
}

describe("NotificationFeed — accesibilidad de la fila no leída", () => {
  it("expone la fila como role=button, enfocable, con el mensaje en su aria-label", () => {
    renderFeed();
    const fila = screen.getByRole("button", { name: /El SHUT está lleno/ });
    expect(fila).toHaveAttribute("tabIndex", "0");
  });

  it("marca como leída al presionar Enter, sin necesitar el mouse", async () => {
    const onMarkRead = renderFeed();
    const user = userEvent.setup();
    const fila = screen.getByRole("button", { name: /El SHUT está lleno/ });

    fila.focus();
    await user.keyboard("{Enter}");

    expect(onMarkRead).toHaveBeenCalledWith("1");
  });

  it("marca como leída al presionar la barra espaciadora", async () => {
    const onMarkRead = renderFeed();
    const user = userEvent.setup();
    const fila = screen.getByRole("button", { name: /El SHUT está lleno/ });

    fila.focus();
    await user.keyboard(" ");

    expect(onMarkRead).toHaveBeenCalledWith("1");
  });

  it("una notificación ya leída no es interactiva (sin role/tabIndex)", () => {
    render(
      <NotificationFeed
        title="Notificaciones"
        notifications={[{ ...notificacionNoLeida, leida: true }]}
        emptyMessage="Sin notificaciones"
        accentBg="bg-green-600"
        accentHighlight="bg-green-50"
        onMarkRead={vi.fn()}
        onMarkAllRead={vi.fn()}
        onClearRead={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /El SHUT está lleno/ })).not.toBeInTheDocument();
    expect(screen.getByText("El SHUT está lleno")).toBeInTheDocument();
  });
});
