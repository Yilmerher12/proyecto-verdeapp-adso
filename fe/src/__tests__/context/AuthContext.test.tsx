/**
 * Archivo: __tests__/context/AuthContext.test.tsx
 * Descripción: Tests del AuthProvider real (HU-037) — restaurar el idioma guardado
 *              del usuario al iniciar sesión, sin importar el idioma que tenía
 *              el navegador antes.
 * ¿Para qué? Los demás tests de auth (useAuth.test.tsx, LanguageSwitcher.test.tsx)
 *            simulan el AuthContext con un valor fijo — nunca ejercitan el
 *            AuthProvider real, así que la lógica de login()/verifySession()
 *            nunca se probaba. Aquí sí se renderiza el AuthProvider de verdad.
 * ¿Impacto? Sin este test, un cambio futuro podría romper la restauración de
 *           idioma (CA-037.2) sin que ninguna prueba lo detectara.
 */

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import type { UserResponse } from "@/types/auth";

const mockChangeLanguage = vi.fn().mockResolvedValue(undefined);

vi.mock("@/i18n", () => ({
  default: { changeLanguage: (locale: string) => mockChangeLanguage(locale) },
}));

const mockLoginUser = vi.fn();
const mockGetMe = vi.fn();

vi.mock("@/api/auth", () => ({
  loginUser: (...args: unknown[]) => mockLoginUser(...args),
  getMe: () => mockGetMe(),
}));

const usuarioConIngles: UserResponse = {
  id: 1,
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
  role_id: 2,
  is_active: true,
  locale: "en",
};

// ¿Qué? Componente mínimo que expone la acción login() para poder dispararla
//       desde el test (useAuth solo se puede llamar dentro de un componente).
function LoginTrigger() {
  const { login } = useAuth();
  return (
    <button onClick={() => void login({ email: "test@example.com", password: "x" })}>
      Entrar
    </button>
  );
}

describe("AuthProvider — restaurar idioma al iniciar sesión (HU-037)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("aplica el idioma guardado del usuario al hacer login (CA-037.2)", async () => {
    mockLoginUser.mockResolvedValue({ access_token: "a", refresh_token: "r" });
    mockGetMe.mockResolvedValue(usuarioConIngles);

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <LoginTrigger />
      </AuthProvider>,
    );

    await user.click(screen.getByText("Entrar"));

    await waitFor(() => {
      expect(mockChangeLanguage).toHaveBeenCalledWith("en");
    });
  });

  it("restaura el idioma guardado al reabrir sesión existente (CA-037.2)", async () => {
    // ¿Qué? Simula que ya había una sesión activa (token en sessionStorage)
    //       antes de que el componente se montara — el mismo caso de "abrir
    //       la app desde otro dispositivo/navegador con sesión guardada".
    sessionStorage.setItem("access_token", "token-existente");
    mockGetMe.mockResolvedValue(usuarioConIngles);

    await act(async () => {
      render(
        <AuthProvider>
          <div />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(mockChangeLanguage).toHaveBeenCalledWith("en");
    });
  });

  it("no cambia el idioma si el usuario no tiene locale guardado", async () => {
    mockLoginUser.mockResolvedValue({ access_token: "a", refresh_token: "r" });
    mockGetMe.mockResolvedValue({ ...usuarioConIngles, locale: undefined });

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <LoginTrigger />
      </AuthProvider>,
    );

    await user.click(screen.getByText("Entrar"));

    await waitFor(() => {
      expect(mockGetMe).toHaveBeenCalled();
    });
    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });
});
