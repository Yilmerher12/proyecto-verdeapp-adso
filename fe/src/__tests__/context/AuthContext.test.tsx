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
const mockRegisterUser = vi.fn();

vi.mock("@/api/auth", () => ({
  loginUser: (...args: unknown[]) => mockLoginUser(...args),
  getMe: () => mockGetMe(),
  registerUser: (...args: unknown[]) => mockRegisterUser(...args),
}));

const usuarioConIngles: UserResponse = {
  id: "00000000-0000-7000-8000-000000000002",
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
    localStorage.clear();
  });

  it("aplica el idioma guardado del usuario al hacer login (CA-037.2)", async () => {
    // ¿Qué? RNF-001.9: loginUser() ya no devuelve los tokens — el backend
    //       los deja en cookies httpOnly. Lo único que le importa a
    //       AuthContext es que la promesa se resuelva sin error.
    mockLoginUser.mockResolvedValue({ message: "Sesión iniciada correctamente" });
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
    // ¿Qué? Simula que ya había una sesión activa (la cookie httpOnly del
    //       backend, invisible para este test) antes de que el componente
    //       se montara — el mismo caso de "recargar la página con sesión
    //       ya iniciada". La marca en localStorage es lo único que
    //       AuthContext puede leer para saberlo (RNF-001.9).
    localStorage.setItem("verdeapp:sesion-activa", "1");
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
    mockLoginUser.mockResolvedValue({ message: "Sesión iniciada correctamente" });
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

// ¿Qué? Muestra si el AuthProvider tiene usuario, para leerlo desde el test.
function EstadoSesion() {
  const { isAuthenticated } = useAuth();
  return <p>{isAuthenticated ? "con sesión" : "sin sesión"}</p>;
}

// ¿Qué? Muestra el correo del usuario en sesión, para ver cuál cuenta tiene
//       esta pestaña después de un cambio de cuenta en otra.
function UsuarioActual() {
  const { user } = useAuth();
  return <p>{user?.email ?? "sin usuario"}</p>;
}

// ¿Qué? Lo que el navegador le avisa a ESTA pestaña cuando otra pestaña
//       cambia localStorage (jsdom no lo dispara solo entre "pestañas").
function cambioEnOtraPestana(key: string | null, newValue: string | null) {
  act(() => {
    window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
  });
}

describe("AuthProvider — sesión compartida entre pestañas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetMe.mockResolvedValue(usuarioConIngles);
  });

  async function montarConSesion() {
    localStorage.setItem("verdeapp:sesion-activa", "1");
    await act(async () => {
      render(
        <AuthProvider>
          <EstadoSesion />
        </AuthProvider>,
      );
    });
    await waitFor(() => expect(screen.getByText("con sesión")).toBeInTheDocument());
  }

  it("el login deja la marca en localStorage, donde la ven las demás pestañas", async () => {
    mockLoginUser.mockResolvedValue({ message: "Sesión iniciada correctamente" });

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <LoginTrigger />
      </AuthProvider>,
    );
    await user.click(screen.getByText("Entrar"));

    await waitFor(() => expect(localStorage.getItem("verdeapp:sesion-activa")).not.toBeNull());
    expect(sessionStorage.getItem("verdeapp:sesion-activa")).toBeNull();
  });

  it("si otra pestaña cierra sesión, esta también queda sin usuario", async () => {
    await montarConSesion();

    cambioEnOtraPestana("verdeapp:sesion-activa", null);

    expect(screen.getByText("sin sesión")).toBeInTheDocument();
    expect(mockGetMe).toHaveBeenCalledTimes(1);
  });

  it("un cambio de otra clave de localStorage (ej. el tema) no cierra la sesión", async () => {
    await montarConSesion();

    cambioEnOtraPestana("theme", "dark");

    expect(screen.getByText("con sesión")).toBeInTheDocument();
    expect(mockGetMe).toHaveBeenCalledTimes(1);
  });

  // ¿Qué? Issue #404 (CN-064): la otra pestaña entra con OTRA cuenta.
  // ¿Para qué? Las cookies son compartidas, así que esta pestaña ya habla con
  //           el backend como la cuenta nueva; la pantalla tiene que alcanzarla.
  it("si otra pestaña inicia sesión con otra cuenta, esta pasa a mostrar la cuenta nueva", async () => {
    localStorage.setItem("verdeapp:sesion-activa", "codigo-anterior");
    await act(async () => {
      render(
        <AuthProvider>
          <UsuarioActual />
        </AuthProvider>,
      );
    });
    await waitFor(() => expect(screen.getByText("test@example.com")).toBeInTheDocument());

    mockGetMe.mockResolvedValue({
      ...usuarioConIngles,
      email: "reciclador@example.com",
      role_id: 3,
      locale: "es",
    });
    await act(async () => {
      cambioEnOtraPestana("verdeapp:sesion-activa", "codigo-nuevo");
    });

    await waitFor(() => expect(screen.getByText("reciclador@example.com")).toBeInTheDocument());
    expect(mockChangeLanguage).toHaveBeenLastCalledWith("es");
  });
});

describe("AuthProvider — registro (issue #373)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ¿Qué? Antes register() intentaba un login automático justo después;
  //       ahora solo llama al endpoint de registro.
  // ¿Para qué? Ese login ya no distingue nada: el backend responde igual
  //           aunque el correo ya tuviera cuenta.
  it("registra sin intentar iniciar sesión después", async () => {
    mockRegisterUser.mockResolvedValue({ message: "Registro recibido." });

    function RegisterTrigger() {
      const { register } = useAuth();
      return (
        <button onClick={() => void register({ email: "nuevo@example.com", password: "x" } as never)}>
          Registrar
        </button>
      );
    }

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <RegisterTrigger />
      </AuthProvider>,
    );
    await user.click(screen.getByText("Registrar"));

    await waitFor(() => expect(mockRegisterUser).toHaveBeenCalledTimes(1));
    expect(mockLoginUser).not.toHaveBeenCalled();
  });
});
