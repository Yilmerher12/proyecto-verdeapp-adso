/**
 * Archivo: __tests__/components/AppShell.test.tsx
 * Descripción: Tests de la foto de perfil de la tarjeta lateral del AppShell.
 * ¿Para qué? Issue #400 (CN-048): la foto pasa por enlaceAdjuntoSeguro — una
 *           ruta insegura ("..", "%2e%2e") no se pinta y se ve la inicial.
 */
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useNavigate } from "react-router-dom";
import { vi, afterEach, beforeEach, describe, it, expect } from "vitest";
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

// ¿Qué? Al cerrar sesión se olvidan los avisos que el usuario cerró con la X.
// ¿Para qué? AppShell no pasa por clearAuth() (recarga la página directo), y el aviso de la ECA quedaba
//           cerrado para la siguiente cuenta que entrara en el mismo navegador.
// ¿Impacto? Si alguien quita limpiarAvisosCerrados() de handleLogout, esta prueba falla.
describe("AppShell — cerrar sesión", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    responderConFoto(null);
    // jsdom no implementa la navegación: se cambia window.location por un objeto simple.
    vi.stubGlobal("location", { ...window.location, href: "" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("borra los avisos cerrados de la sesión", async () => {
    sessionStorage.setItem("verdeapp:aviso-cerrado:directorio-eca", "1");
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getAllByRole("button", { name: "Cerrar sesión" })[0]);
    await user.click(screen.getByRole("button", { name: "Sí, cerrar sesión" }));

    await waitFor(() => expect(window.location.href).toBe("/"));
    expect(sessionStorage.getItem("verdeapp:aviso-cerrado:directorio-eca")).toBeNull();
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

  it("Reciclador: Puntos de acopio va justo bajo Panel principal y no hay grupo Recursos", () => {
    const { container, queryByText } = renderComo(RoleId.RECICLADOR);

    expect(enlacesDelMenu(container).slice(0, 2)).toEqual(["Panel principal", "Puntos de acopio"]);
    expect(queryByText("Recursos")).not.toBeInTheDocument();
  });

  it("Administrador del Sistema: Puntos de acopio va bajo Panel principal y Recursos solo tiene Contenido educativo", () => {
    const { container, getByText } = renderComo(RoleId.ADMIN_SISTEMA);

    // ¿Qué? Issue #596: "Solicitudes" (con su contador) va justo bajo el panel principal.
    expect(enlacesDelMenu(container).slice(0, 3)).toEqual(["Panel principal", "Solicitudes", "Puntos de acopio"]);
    expect(getByText("Recursos")).toBeInTheDocument();
    const gruposRecursos = getByText("Recursos").parentElement as HTMLElement;
    expect(Array.from(gruposRecursos.querySelectorAll("a")).map((a) => a.textContent)).toEqual(["Contenido educativo"]);
  });

  // ¿Qué? Issue #487: "Desempeño" es solo del Admin de Conjunto, junto a Agenda.
  it("Admin de Conjunto: tiene la opción Desempeño y los demás roles no", () => {
    const admin = renderComo(RoleId.ADMIN_CONJUNTO);
    const enlaceDesempeno = Array.from(admin.container.querySelectorAll("nav a")).find((a) => a.textContent === "Desempeño");
    expect(enlaceDesempeno).toHaveAttribute("href", "/admin-conjunto/desempeno");
    admin.unmount();

    for (const rol of [RoleId.RESIDENTE, RoleId.RECICLADOR, RoleId.ADMIN_SISTEMA]) {
      const otro = renderComo(rol);
      expect(enlacesDelMenu(otro.container)).not.toContain("Desempeño");
      otro.unmount();
    }
  });

  it("Residente: el menú no cambia, Directorio general sigue en Recursos", () => {
    const { container, getByText } = renderComo(RoleId.RESIDENTE);

    expect(enlacesDelMenu(container)).not.toContain("Puntos de acopio");
    const gruposRecursos = getByText("Recursos").parentElement as HTMLElement;
    expect(Array.from(gruposRecursos.querySelectorAll("a")).map((a) => a.textContent)).toEqual([
      "Aprende a reciclar",
      "Directorio general",
    ]);
  });
});

// ¿Qué? Menú lateral en celular (menos de 640 px): arranca colapsado y se
//       cierra solo al cambiar de página.
// ¿Para qué? Issue #454: abierto ocupaba entre el 65% y el 75% del alto de un
//           celular y no se cerraba al elegir una opción del menú.
// ¿Impacto? En escritorio el menú sigue abierto, como siempre.
describe("AppShell — menú en celular", () => {
  const mediaDeCelular = (esCelular: boolean) =>
    (window.matchMedia as unknown as ReturnType<typeof vi.fn>).mockImplementation((query: string) => ({
      matches: esCelular && query === "(max-width: 639px)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

  beforeEach(() => {
    vi.clearAllMocks();
    responderConFoto(null);
  });

  afterEach(() => mediaDeCelular(false));

  function IrAOtraPagina() {
    const navigate = useNavigate();
    return <button onClick={() => navigate("/otra")}>ir a otra página</button>;
  }

  const renderConBoton = () =>
    renderWithProviders(
      <AppShell>
        <IrAOtraPagina />
      </AppShell>,
      { authContext: { user: mockUser, isAuthenticated: true } }
    );

  it("en escritorio el menú arranca abierto", () => {
    mediaDeCelular(false);
    renderConBoton();

    expect(screen.getAllByLabelText("Colapsar menú").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Expandir menú")).not.toBeInTheDocument();
  });

  it("en celular el menú arranca colapsado", () => {
    mediaDeCelular(true);
    renderConBoton();

    expect(screen.getAllByLabelText("Expandir menú").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Colapsar menú")).not.toBeInTheDocument();
  });

  it("en celular el menú se cierra solo al cambiar de página", async () => {
    mediaDeCelular(true);
    const user = userEvent.setup();
    renderConBoton();

    await user.click(screen.getAllByLabelText("Expandir menú")[0]);
    expect(screen.getAllByLabelText("Colapsar menú").length).toBeGreaterThan(0);

    await user.click(screen.getByText("ir a otra página"));
    expect(screen.getAllByLabelText("Expandir menú").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Colapsar menú")).not.toBeInTheDocument();
  });

  // ¿Qué? Issue #632 — el área principal reserva siempre el espacio de la barra de scroll.
  // ¿Para qué? Con barras clásicas (Windows), una pestaña más alta que la pantalla hacía aparecer la barra y la tarjeta se
  //           achicaba unos 17 px solo en esa pestaña: el ancho "saltaba" al cambiar de pestaña.
  it("el área principal reserva el espacio de la barra de scroll para que el ancho no salte", () => {
    const { container } = renderShell();

    expect(container.querySelector("main")).toHaveClass("[scrollbar-gutter:stable]");
  });
});
