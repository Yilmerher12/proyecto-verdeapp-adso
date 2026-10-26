/**
 * Archivo: __tests__/components/NotificationBell.test.tsx
 * Descripción: Tests de la campanita del encabezado y su menú de notificaciones (issue #516).
 * ¿Para qué? Antes la campanita llevaba al panel principal; ahora abre un menú con la lista,
 *           y marcar leída / marcar todas / limpiar leídas se hacen desde ahí mismo.
 */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { Route, Routes, useLocation } from "react-router-dom";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { onCambioDesdeCampanita, onCualquierCambioDeNotificaciones, onNotificacionesActualizadas } from "@/lib/notificationEvents";
import { rutaDeContenidoRecomendado } from "@/lib/contenidoRecomendado";
import { renderWithProviders } from "../helpers";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/api/axios", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/api/axios")>();
  return {
    ...original,
    default: {
      get: (...args: unknown[]) => mockGet(...args),
      post: (...args: unknown[]) => mockPost(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  };
});

vi.mock("@/lib/contenidoRecomendado", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/contenidoRecomendado")>();
  return { ...original, rutaDeContenidoRecomendado: vi.fn() };
});

const aviso = (id: string, extra: object = {}) => ({
  id,
  tipo: "SHUT_LLENO",
  mensaje: `Mensaje ${id}`,
  id_referencia: null,
  nombre_conjunto: "Conjunto Los Alpes",
  id_conjunto_residencial: "c-1",
  leida: false,
  created_at: new Date().toISOString(),
  ...extra,
});

function Destino() {
  const { pathname } = useLocation();
  return <p>destino:{pathname}</p>;
}

function renderBell(noLeidas = 2) {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<NotificationBell noLeidas={noLeidas} dashboardHref="/dashboard/residente" />} />
      <Route path="/dashboard/residente" element={<Destino />} />
      <Route path="/catalogo-educativo/:categoria" element={<Destino />} />
    </Routes>,
  );
}

function responderCon(notificaciones: object[]) {
  mockGet.mockResolvedValue({ data: notificaciones });
}

async function abrirMenu() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Notificaciones/ }));
  return user;
}

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: {} });
    responderCon([aviso("a1"), aviso("a2", { leida: true, nombre_conjunto: null, id_conjunto_residencial: null })]);
  });

  it("arranca cerrada: no pide la lista y dice cuántas notificaciones hay sin leer", () => {
    renderBell(3);

    const campanita = screen.getByRole("button", { name: "Notificaciones, 3 sin leer" });
    expect(campanita).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", { name: "Notificaciones" })).not.toBeInTheDocument();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("al tocarla abre el menú con la lista: mensaje, conjunto o VerdeApp, y si es nueva o leída", async () => {
    renderBell();
    await abrirMenu();

    const menu = await screen.findByRole("region", { name: "Notificaciones" });
    expect(await within(menu).findByText("Mensaje a1")).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith("/api/v1/notificaciones/mis-notificaciones");
    expect(screen.getByRole("button", { name: /Notificaciones/ })).toHaveAttribute("aria-expanded", "true");
    // ¿Qué? La nueva trae su conjunto y "Nueva"; la leída, de plataforma, trae "VerdeApp" y "Leída".
    expect(within(menu).getByText("Conjunto Los Alpes")).toBeInTheDocument();
    expect(within(menu).getByText("Nueva")).toBeInTheDocument();
    expect(within(menu).getByText("VerdeApp")).toBeInTheDocument();
    expect(within(menu).getByText("Leída")).toBeInTheDocument();
  });

  it("sin notificaciones muestra el mensaje de lista vacía", async () => {
    responderCon([]);
    renderBell(0);
    await abrirMenu();

    expect(await screen.findByText("Todavía no tienes notificaciones.")).toBeInTheDocument();
  });

  it("si falla la carga muestra un aviso de error", async () => {
    mockGet.mockRejectedValue(new Error("Network Error"));
    renderBell();
    await abrirMenu();

    expect(await screen.findByText("No se pudo cargar la información. Intenta de nuevo más tarde.")).toBeInTheDocument();
  });

  it("marcar una como leída llama al servidor, la deja como Leída y avisa para que se actualicen el contador y los paneles", async () => {
    const alCambiarContador = vi.fn();
    const alCambiarDesdeCampanita = vi.fn();
    const alCambiarDesdePanel = vi.fn();
    const cancelarContador = onCualquierCambioDeNotificaciones(alCambiarContador);
    const cancelarPaneles = onCambioDesdeCampanita(alCambiarDesdeCampanita);
    const cancelarPanel = onNotificacionesActualizadas(alCambiarDesdePanel);
    renderBell();
    const user = await abrirMenu();

    await user.click(await screen.findByText("Mensaje a1"));

    expect(mockPost).toHaveBeenCalledWith("/api/v1/notificaciones/a1/leer", {});
    await waitFor(() => expect(screen.queryByText("Nueva")).not.toBeInTheDocument());
    // ¿Qué? Se dispara el evento de la campanita (lo oyen AppShell y los paneles), no el de los paneles.
    expect(alCambiarDesdeCampanita).toHaveBeenCalled();
    expect(alCambiarContador).toHaveBeenCalled();
    expect(alCambiarDesdePanel).not.toHaveBeenCalled();
    cancelarContador();
    cancelarPaneles();
    cancelarPanel();
  });

  it("'Marcar leídas' marca todas, y 'Limpiar leídas' quita las ya leídas", async () => {
    renderBell();
    const user = await abrirMenu();
    await screen.findByText("Mensaje a1");

    await user.click(screen.getByRole("button", { name: "Marcar leídas" }));
    expect(mockPost).toHaveBeenCalledWith("/api/v1/notificaciones/marcar-todas-leidas", {});
    await waitFor(() => expect(screen.queryByText("Nueva")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Limpiar leídas" }));
    expect(mockDelete).toHaveBeenCalledWith("/api/v1/notificaciones/limpiar-leidas");
    await waitFor(() => expect(screen.queryByText("Mensaje a1")).not.toBeInTheDocument());
  });

  it("si falla una acción muestra un aviso de error y no cambia la lista", async () => {
    mockPost.mockRejectedValue(new Error("falló"));
    renderBell();
    const user = await abrirMenu();

    await user.click(await screen.findByText("Mensaje a1"));

    expect(await screen.findByText("No se pudo completar la acción. Inténtalo de nuevo.")).toBeInTheDocument();
    expect(screen.getByText("Nueva")).toBeInTheDocument();
  });

  it("Escape cierra el menú y devuelve el foco a la campanita", async () => {
    renderBell();
    const user = await abrirMenu();
    await screen.findByRole("region", { name: "Notificaciones" });

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("region", { name: "Notificaciones" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Notificaciones/ })).toHaveFocus();
  });

  it("un clic fuera del menú lo cierra", async () => {
    renderBell();
    const user = await abrirMenu();
    await screen.findByRole("region", { name: "Notificaciones" });

    await user.click(document.body);

    expect(screen.queryByRole("region", { name: "Notificaciones" })).not.toBeInTheDocument();
  });

  it("tocar el aviso de una auditoría lleva al panel y NO la marca como leída (su banner sigue visible)", async () => {
    responderCon([aviso("au1", { tipo: "AUDITORIA_PUBLICADA", mensaje: "El reciclador auditó tu conjunto." })]);
    renderBell(1);
    const user = await abrirMenu();

    await user.click(await screen.findByText("El reciclador auditó tu conjunto."));

    expect(screen.getByText("destino:/dashboard/residente")).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("tocar un contenido recomendado lo marca como leído y lleva a esa categoría de Aprender", async () => {
    vi.mocked(rutaDeContenidoRecomendado).mockResolvedValue("/catalogo-educativo/Vidrio");
    responderCon([aviso("c1", { tipo: "CONTENIDO_RECOMENDADO", mensaje: "Te recomendamos aprender sobre vidrio.", id_referencia: "aud-1" })]);
    renderBell(1);
    const user = await abrirMenu();

    await user.click(await screen.findByText("Te recomendamos aprender sobre vidrio."));

    expect(mockPost).toHaveBeenCalledWith("/api/v1/notificaciones/c1/leer", {});
    expect(await screen.findByText("destino:/catalogo-educativo/Vidrio")).toBeInTheDocument();
  });

  it("una notificación ya leída que no tiene acción no es un botón", async () => {
    renderBell();
    await abrirMenu();
    await screen.findByText("Mensaje a1");

    expect(screen.queryByRole("button", { name: /Mensaje a2/ })).not.toBeInTheDocument();
  });
});
