/**
 * Archivo: __tests__/pages/ResidenteDashboard.test.tsx
 * Descripción: Tests del panel del Residente (issue #23) — carga de estado del
 *              SHUT y notificaciones, y el reporte de "SHUT lleno".
 */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { ResidenteDashboard } from "@/pages/dashboards/ResidenteDashboard";
import { renderWithProviders, mockUser } from "../helpers";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock("axios", () => {
  const instance = {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    patch: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
  return { default: { ...instance, create: () => instance } };
});

function renderPage() {
  return renderWithProviders(<ResidenteDashboard />, {
    authContext: { user: mockUser, isAuthenticated: true, accessToken: "token" },
  });
}

describe("ResidenteDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
      if (url.includes("estado-shut")) {
        return Promise.resolve({ data: { lleno: false, created_at: null } });
      }
      return Promise.resolve({ data: [] });
    });
    mockPost.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: {} });
  });

  it("muestra el título del panel y el nombre del residente", async () => {
    renderPage();
    expect(screen.getByText("Panel del Residente")).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("carga el estado del SHUT y las notificaciones al montar", async () => {
    renderPage();
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/notificaciones/estado-shut"),
        expect.objectContaining({ headers: { Authorization: "Bearer token" } })
      );
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/notificaciones/mis-notificaciones"),
        expect.anything()
      );
    });
  });

  it("muestra el feed vacío cuando no hay notificaciones", async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText("No tienes notificaciones aún. Aparecerán aquí cuando el reciclador envíe avisos.")
      ).toBeInTheDocument();
    });
  });

  it("muestra el banner de SHUT lleno cuando el estado lo indica", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("estado-shut")) {
        return Promise.resolve({ data: { lleno: true, created_at: "2026-08-24T10:00:00Z" } });
      }
      return Promise.resolve({ data: [] });
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("El SHUT está lleno")).toBeInTheDocument();
    });
  });

  it("reporta SHUT lleno al hacer clic en el botón y muestra confirmación", async () => {
    const user = userEvent.setup();
    renderPage();

    const boton = await screen.findByRole("button", { name: "Reportar" });
    await user.click(boton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/notificaciones/enviar"),
        { tipo: "SHUT_LLENO" },
        expect.objectContaining({ headers: { Authorization: "Bearer token" } })
      );
    });
    expect(await screen.findByText("Enviado")).toBeInTheDocument();
  });
});
