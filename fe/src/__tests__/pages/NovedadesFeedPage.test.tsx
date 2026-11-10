/**
 * Archivo: __tests__/pages/NovedadesFeedPage.test.tsx
 * Descripción: Tests del feed de novedades que ven Residente, Reciclador y
 *              Admin de Conjunto (RQF-015, HU-033), dentro de la tarjeta de Soporte técnico (issue #632).
 * ¿Para qué? El Admin Sistema ahora puede adjuntar un enlace de video a una
 *           novedad — sin este test, el campo podría guardarse bien y aun
 *           así no verse nunca en el feed.
 */
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { API_BASE_URL } from "@/api/axios";
import { NovedadesFeedPage } from "@/pages/NovedadesFeedPage";
import { renderWithProviders, mockUser } from "../helpers";
import { RoleId } from "@/types/auth";
import type { Novedad } from "@/lib/novedadesApi";

const mockFeed = vi.fn();

// ¿Qué? El feed responde { items, total }, de 10 en 10 (issue #632).
const pagina = (items: Novedad[], total = items.length) => ({ items, total });

vi.mock("@/lib/novedadesApi", () => ({
  verFeedNovedades: (...args: unknown[]) => mockFeed(...args),
}));

const NOVEDAD: Novedad = {
  id_novedad: "00000000-0000-7000-8000-000000000031",
  alcance: "TODOS",
  texto: "Mira este video sobre cómo separar el vidrio.",
  url_adjunto: null,
  url_video: null,
  conjuntos: [],
  fecha_expiracion: "2099-11-30T23:59:59Z",
  created_at: "2026-02-10T08:00:00Z",
  editado: false,
  archivada: false,
};

function renderPage() {
  return renderWithProviders(<NovedadesFeedPage />, {
    authContext: { user: mockUser, isAuthenticated: true },
  });
}

describe("NovedadesFeedPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFeed.mockResolvedValue(pagina([]));
  });

  it("muestra el video de una novedad que lo trae", async () => {
    mockFeed.mockResolvedValue(pagina([{ ...NOVEDAD, url_video: "https://www.youtube.com/watch?v=abc123DEF45" }]));
    renderPage();

    expect(await screen.findByText(NOVEDAD.texto)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reproducir video/ })).toBeInTheDocument();
  });

  it("no muestra ningún reproductor si la novedad no trae video", async () => {
    mockFeed.mockResolvedValue(pagina([NOVEDAD]));
    renderPage();

    expect(await screen.findByText(NOVEDAD.texto)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reproducir video/ })).not.toBeInTheDocument();
  });

  // ¿Qué? Issue #400 (CN-048): el adjunto pasa por enlaceAdjuntoSeguro.
  it("pinta el adjunto subido a VerdeApp con la URL del backend", async () => {
    mockFeed.mockResolvedValue(pagina([{ ...NOVEDAD, url_adjunto: "/uploads/adjuntos/circular.pdf" }]));
    renderPage();

    expect(await screen.findByRole("link", { name: "Ver adjunto" })).toHaveAttribute(
      "href",
      `${API_BASE_URL}/uploads/adjuntos/circular.pdf`
    );
  });

  it.each(["javascript:alert(1)", "/uploads/%2e%2e/api/v1/users/me", "http://sitio-malo.com/f.pdf"])(
    "no pinta el adjunto %s",
    async (url) => {
      mockFeed.mockResolvedValue(pagina([{ ...NOVEDAD, url_adjunto: url }]));
      renderPage();

      expect(await screen.findByText(NOVEDAD.texto)).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Ver adjunto" })).not.toBeInTheDocument();
    }
  );

  describe("una sola tarjeta con las pestañas dentro (issue #632)", () => {
    it("las tres pestañas son subrayadas y viven dentro de la misma tarjeta que la lista", async () => {
      mockFeed.mockResolvedValue(pagina([NOVEDAD]));
      renderPage();

      const aviso = await screen.findByText(NOVEDAD.texto);
      const pestanas = screen.getByRole("tablist", { name: "Soporte técnico" });
      expect(screen.getAllByRole("tab").map((p) => p.textContent)).toEqual([
        "Avisos del sistema",
        "Escribir novedad",
        "Historial de novedades",
      ]);
      expect(pestanas).toHaveClass("border-b");
      // ¿Qué? Pestañas y aviso comparten tarjeta: el panel de la pestaña está dentro del mismo contenedor.
      expect(pestanas.parentElement).toContainElement(aviso);
      expect(screen.getByRole("tabpanel")).toContainElement(aviso);
    });

    it("cada novedad es una fila de una lista, no una tarjeta suelta", async () => {
      mockFeed.mockResolvedValue(pagina([NOVEDAD, { ...NOVEDAD, id_novedad: "2", texto: "Segunda novedad." }]));
      renderPage();

      await screen.findByText(NOVEDAD.texto);
      const filas = within(screen.getByRole("tabpanel")).getAllByRole("listitem");
      expect(filas).toHaveLength(2);
      expect(screen.queryByRole("article")).not.toBeInTheDocument();
    });

    it("el subtítulo dice que se escribe al equipo y se revisan las novedades", async () => {
      renderPage();

      expect(
        await screen.findByText("Escribe al equipo de VerdeApp y revisa las novedades de la plataforma."),
      ).toBeInTheDocument();
    });
  });

  describe("paginación desde el servidor (issue #632)", () => {
    it("pide la primera página de 10 y, con 10 o menos, la barra se ve igual con las flechas apagadas", async () => {
      mockFeed.mockResolvedValue(pagina([NOVEDAD], 10));
      renderPage();

      await screen.findByText(NOVEDAD.texto);
      expect(mockFeed).toHaveBeenCalledWith(10, 0);
      expect(screen.getByText("Mostrando 1–10 de 10")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Página siguiente" })).toBeDisabled();
    });

    it("con más de 10 muestra la barra al pie y pide la página siguiente con su offset", async () => {
      const novedad = (id: string) => ({ ...NOVEDAD, id_novedad: id, texto: `Novedad ${id}` });
      mockFeed.mockImplementation((_limit: number, offset: number) =>
        Promise.resolve(pagina([novedad(offset === 0 ? "primera" : "segunda")], 25)),
      );
      const user = userEvent.setup();
      renderPage();

      expect(await screen.findByText("Novedad primera")).toBeInTheDocument();
      expect(screen.getByText("Mostrando 1–10 de 25")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Página siguiente" }));

      expect(await screen.findByText("Novedad segunda")).toBeInTheDocument();
      expect(mockFeed).toHaveBeenLastCalledWith(10, 10);
    });

    it("la barra de paginación está dentro de la misma tarjeta que las filas", async () => {
      mockFeed.mockResolvedValue(pagina([NOVEDAD], 25));
      renderPage();

      const aviso = await screen.findByText(NOVEDAD.texto);
      expect(screen.getByRole("tabpanel")).toContainElement(aviso);
      expect(screen.getByRole("tabpanel")).toContainElement(screen.getByText("Mostrando 1–10 de 25"));
    });

    it("sin novedades muestra el mensaje de lista vacía", async () => {
      renderPage();

      expect(await screen.findByText("No hay novedades activas por ahora.")).toBeInTheDocument();
    });

    it("si falla la carga muestra un aviso de error, no el de lista vacía", async () => {
      mockFeed.mockRejectedValue(new Error("Network Error"));
      renderPage();

      expect(await screen.findByText("No se pudo cargar la información. Intenta de nuevo más tarde.")).toBeInTheDocument();
      expect(screen.queryByText("No hay novedades activas por ahora.")).not.toBeInTheDocument();
    });
  });

  // ¿Qué? Issue #632 — el ancho de Soporte técnico depende del rol, para ser igual al de la pantalla vecina en su menú.
  describe("ancho según el rol (issue #632)", () => {
    const anchoDe = async (roleId: RoleId) => {
      renderWithProviders(<NovedadesFeedPage />, {
        authContext: { user: { ...mockUser, role_id: roleId }, isAuthenticated: true },
      });
      return (await screen.findByRole("heading", { level: 1 })).closest(".space-y-6")!;
    };

    it("el Residente lo ve en ancho de lectura (48 rem), como su Comunicados", async () => {
      mockFeed.mockResolvedValue(pagina([NOVEDAD], 1));
      expect(await anchoDe(RoleId.RESIDENTE)).toHaveClass("max-w-3xl");
    });

    it("el Reciclador lo ve en ancho de lectura (48 rem), como su Comunicados", async () => {
      mockFeed.mockResolvedValue(pagina([NOVEDAD], 1));
      expect(await anchoDe(RoleId.RECICLADOR)).toHaveClass("max-w-3xl");
    });

    it("el Admin de Conjunto lo ve en ancho normal (80 rem), como su Comunicados y su Agenda", async () => {
      mockFeed.mockResolvedValue(pagina([NOVEDAD], 1));
      expect(await anchoDe(RoleId.ADMIN_CONJUNTO)).not.toHaveClass("max-w-3xl");
    });
  });
});
