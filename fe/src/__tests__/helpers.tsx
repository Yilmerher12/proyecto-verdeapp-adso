/**
 * Archivo: __tests__/helpers.tsx
 * Descripción: Utilidades compartidas para tests — wrappers de renderizado con providers.
 * ¿Para qué? Proveer AuthContext y Router a los componentes bajo test.
 * ¿Impacto? Sin estos helpers, cada test tendría que configurar providers manualmente,
 * causando duplicación y posibles inconsistencias.
 */

import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "@/context/authContextDef";
import type { AuthContextType, UserResponse } from "@/types/auth";
import type { ReactNode } from "react";

// ¿Qué? Usuario fake para tests que necesitan sesión activa.
// ¿Para qué? Simular un usuario autenticado sin llamar al backend.
// ¿Impacto? Se adaptaron las propiedades para que coincidan con el UserResponse de VerdeApp.
export const mockUser: UserResponse = {
  id: 1,
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
  role_id: 2, // Añadido: Rol de residente por defecto para las pruebas
  is_active: true,
  locale: "es",
};

// ¿Qué? Valor por defecto del AuthContext para tests.
// ¿Para qué? Proveer un contexto de auth controlado por cada test.
export const defaultAuthContext: AuthContextType = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  changePassword: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
};

/**
 * ¿Qué? Opciones de renderizado personalizadas para tests.
 * ¿Para qué? Permitir inyectar un AuthContext custom y una ruta inicial.
 */
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  authContext?: Partial<AuthContextType>;
  initialRoute?: string;
}

/**
 * ¿Qué? Función de render personalizada que envuelve el componente con providers.
 * ¿Para qué? Simplificar los tests — no es necesario repetir AuthContext.Provider + MemoryRouter.
 */
export function renderWithProviders(
  ui: ReactNode,
  { authContext = {}, initialRoute = "/", ...options }: CustomRenderOptions = {},
) {
  const value: AuthContextType = { ...defaultAuthContext, ...authContext };

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
      </MemoryRouter>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    authContext: value,
  };
}