/**
 * Archivo: __tests__/components/AppShell.test.tsx
 * Descripción: Tests de la foto de perfil de la tarjeta lateral del AppShell.
 * ¿Para qué? Issue #400 (CN-048): la foto pasa por enlaceAdjuntoSeguro — una
 *           ruta insegura ("..", "%2e%2e") no se pinta y se ve la inicial.
 */
import { act, waitFor } from "@testing-library/react";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { API_BASE_URL } from "@/api/axios";
import { AppShell } from "@/components/layout/AppShell";
import { RoleId } from "@/types/auth";
import { renderWithProviders, mockUser } from "../helpers";

const mockGet = vi.fn();

// ¿Qué? Solo se reemplaza la instancia de axios (default); API_BASE_URL
//       sigue siendo la real, porque enlaceAdjuntoSeguro la importa de ahí.
vi.mock("@/api/axios", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/api/axios")>();
  return { ...original, default: { get: (...args: unknown[]) => mockGet(...args) } };
});

function responderConFoto(fotoPerfilUrl: string | null) {
  mockGet.mockImplementation((url: string) =>
    Promise.resolve({ data: url.includes("/users/me") ? { foto_perfil_url: fotoPerfilUrl } : { count: 0 } })
  );
}

function renderShell() {
  return renderWithProviders(
    <AppShell>
      <p>contenido</p>
    </AppShell>,
    { authContext: { user: mockUser, isAuthenticated: true } }
  );
}

describe("AppShell — foto de perfil", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pinta la foto subida con la URL del backend", async () => {
    responderConFoto("/uploads/perfiles/ana.png");
    const { container } = renderShell();

    await waitFor(() => {
      expect(container.querySelector(`img[src="${API_BASE_URL}/uploads/perfiles/ana.png"]`)).toBeInTheDocument();
    });
  });

  it("no pinta la foto si la ruta guardada no es segura", async () => {
    responderConFoto("/uploads/%2e%2e/api/ana.png");
    const { container } = renderShell();

    // ¿Qué? Se espera a que la petición de la foto se haga y a que React
    //       termine de aplicar su respuesta, antes de comprobar que no hay foto.
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith("/api/v1/users/me"));
    await act(async () => {});
    expect(container.querySelector('img[src*="/uploads/"]')).not.toBeInTheDocument();
  });
});

// ¿Qué? Menú lateral por rol: "Puntos de Acopio" va suelto bajo "Panel
//       Principal" (grupo "principal", sin encabezado), no dentro de "Recursos".
// ¿Para qué? Issue #456: no es un recurso de consulta sino un lugar al que se
//           lleva el material.
// ¿Impacto? Si alguien lo vuelve a meter en "recursos", estas pruebas fallan.
describe("AppShell — grupo de Puntos de Acopio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    responderConFoto(null);
  });

  function renderComo(role_id: RoleId) {
    return renderWithProviders(
      <AppShell>
        <p>contenido</p>
      </AppShell>,
      { authContext: { user: { ...mockUser, role_id }, isAuthenticated: true } }
    );
  }

  const enlacesDelMenu = (container: HTMLElement) =>
    Array.from(container.querySelectorAll("nav a")).map((a) => a.textContent);

  it("Reciclador: Puntos de Acopio va justo bajo Panel Principal y no hay grupo Recursos", () => {
    const { container, queryByText } = renderComo(RoleId.RECICLADOR);

    expect(enlacesDelMenu(container).slice(0, 2)).toEqual(["Panel Principal", "Puntos de Acopio"]);
    expect(queryByText("Recursos")).not.toBeInTheDocument();
  });

  it("Administrador del Sistema: Puntos de Acopio va bajo Panel Principal y Recursos solo tiene Contenido Educativo", () => {
    const { container, getByText } = renderComo(RoleId.ADMIN_SISTEMA);

    expect(enlacesDelMenu(container).slice(0, 2)).toEqual(["Panel Principal", "Puntos de Acopio"]);
    expect(getByText("Recursos")).toBeInTheDocument();
    const gruposRecursos = getByText("Recursos").parentElement as HTMLElement;
    expect(Array.from(gruposRecursos.querySelectorAll("a")).map((a) => a.textContent)).toEqual(["Contenido Educativo"]);
  });

  it("Residente: el menú no cambia, Directorio General sigue en Recursos", () => {
    const { container, getByText } = renderComo(RoleId.RESIDENTE);

    expect(enlacesDelMenu(container)).not.toContain("Puntos de Acopio");
    const gruposRecursos = getByText("Recursos").parentElement as HTMLElement;
    expect(Array.from(gruposRecursos.querySelectorAll("a")).map((a) => a.textContent)).toEqual([
      "Aprende a Reciclar",
      "Directorio General",
    ]);
  });
});
