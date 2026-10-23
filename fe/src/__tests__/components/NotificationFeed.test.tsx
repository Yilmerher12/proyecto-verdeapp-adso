/**
 * Archivo: __tests__/components/NotificationFeed.test.tsx
 * Descripción: Tests de accesibilidad de la fila de notificación no leída.
 * ¿Para qué? Antes la fila solo respondía a onClick — un usuario que navega
 *           solo con teclado no podía marcarla como leída (issue #16).
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationFeed } from "@/components/dashboard/NotificationFeed";
import type { NotificacionItem } from "@/lib/notificaciones";

const notificacionNoLeida: NotificacionItem = {
  id: "1",
  tipo: "SHUT_LLENO",
  mensaje: "El SHUT está lleno",
  id_referencia: null,
  nombre_conjunto: "AGRUPACION QUINTAS DE ARANJUEZ",
  id_conjunto_residencial: "c-1",
  leida: false,
  created_at: new Date().toISOString(),
};

function renderFeed(onMarkRead = vi.fn()) {
  render(
    <NotificationFeed
      title="Notificaciones"
      notifications={[notificacionNoLeida]}
      emptyMessage="Sin notificaciones"
      accentBg="bg-accent-600"
      accentHighlight="bg-accent-50"
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

  // ¿Qué? Issue #516 — cada notificación dice de qué conjunto es (o VerdeApp), cuándo y si es nueva.
  it("muestra el conjunto, la hora y la palabra 'Nueva' en una no leída", () => {
    renderFeed();
    expect(screen.getByText("AGRUPACION QUINTAS DE ARANJUEZ")).toBeInTheDocument();
    // ¿Qué? tiempoRelativo() usa la instancia global de i18n, que en este test puede estar en inglés.
    expect(screen.getByText(/hace un momento|just now/)).toBeInTheDocument();
    expect(screen.getByText("Nueva")).toBeInTheDocument();
  });

  it("una de la plataforma (sin conjunto) dice VerdeApp, y una leída dice 'Leída'", () => {
    render(
      <NotificationFeed
        title="Notificaciones"
        notifications={[{ ...notificacionNoLeida, leida: true, nombre_conjunto: null, id_conjunto_residencial: null }]}
        emptyMessage="Sin notificaciones"
        accentBg="bg-accent-600"
        accentHighlight="bg-accent-50"
        onMarkRead={vi.fn()}
        onMarkAllRead={vi.fn()}
        onClearRead={vi.fn()}
      />,
    );
    expect(screen.getByText("VerdeApp")).toBeInTheDocument();
    expect(screen.getByText("Leída")).toBeInTheDocument();
    expect(screen.queryByText("Nueva")).not.toBeInTheDocument();
  });

  it("con esAccionable, una leída sin acción deja de ser botón y una leída con acción sigue siéndolo", async () => {
    const onItemClick = vi.fn();
    const leidas = [
      { ...notificacionNoLeida, id: "1", mensaje: "Sin acción", leida: true },
      { ...notificacionNoLeida, id: "2", mensaje: "Con acción", leida: true },
    ];
    render(
      <NotificationFeed
        title="Notificaciones"
        notifications={leidas}
        emptyMessage="Sin notificaciones"
        accentBg="bg-accent-600"
        accentHighlight="bg-accent-50"
        onMarkRead={vi.fn()}
        onMarkAllRead={vi.fn()}
        onClearRead={vi.fn()}
        onItemClick={onItemClick}
        esAccionable={(n) => n.id === "2"}
      />,
    );
    expect(screen.queryByRole("button", { name: "Sin acción" })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Con acción" }));
    expect(onItemClick).toHaveBeenCalledWith(expect.objectContaining({ id: "2" }));
  });

  it("una notificación ya leída no es interactiva (sin role/tabIndex)", () => {
    render(
      <NotificationFeed
        title="Notificaciones"
        notifications={[{ ...notificacionNoLeida, leida: true }]}
        emptyMessage="Sin notificaciones"
        accentBg="bg-accent-600"
        accentHighlight="bg-accent-50"
        onMarkRead={vi.fn()}
        onMarkAllRead={vi.fn()}
        onClearRead={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /El SHUT está lleno/ })).not.toBeInTheDocument();
    expect(screen.getByText("El SHUT está lleno")).toBeInTheDocument();
  });
});
