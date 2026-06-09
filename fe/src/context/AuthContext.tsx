/**
 * Archivo: context/AuthContext.tsx
 * Descripción: Contexto de React adaptado para la gestión de roles de VerdeApp.
 * ¿Para qué? Proveer el estado de autenticación extendido y decodificar claims de roles.
 * ¿Impacto? Permite que las pantallas verifiquen los datos del perfil extendido provistos por el Backend.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as authApi from "@/api/auth";
import { AuthContext } from "@/context/authContextDef";
import i18n from "@/i18n";
import type {
  AuthContextType,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UserResponse, // Importamos el modelo global unificado
} from "@/types/auth";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // El estado ahora maneja directamente el tipo UserResponse corregido
  const [user, setUser] = useState<UserResponse | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    sessionStorage.getItem("access_token"),
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(() =>
    sessionStorage.getItem("refresh_token"),
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isAuthenticated = !!user && !!accessToken;

  const saveTokens = useCallback((access: string, refresh: string) => {
    sessionStorage.setItem("access_token", access);
    sessionStorage.setItem("refresh_token", refresh);
    setAccessToken(access);
    setRefreshToken(refresh);
  }, []);

  const clearAuth = useCallback(() => {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const verifySession = async () => {
      const storedToken = sessionStorage.getItem("access_token");
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await authApi.getMe();
        setUser(userData);
        if (userData.locale) {
          await i18n.changeLanguage(userData.locale);
        }
      } catch {
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, [clearAuth]);

  /**
   * Acción de Login adaptada
   * Sincroniza las credenciales y el estado expandido del perfil para el Dashboard.
   */
  const login = useCallback(
    async (data: LoginRequest) => {
      const tokens = await authApi.loginUser(data);
      saveTokens(tokens.access_token, tokens.refresh_token);
      
      const userData = await authApi.getMe();
      setUser(userData);
      
      if (userData.locale) {
        await i18n.changeLanguage(userData.locale);
      }
      return userData;
    },
    [saveTokens],
  );

  /**
   * Acción de Registro adaptada
   * Recibe la estructura de datos unificada del formulario por pasos de Figma.
   */
  const register = useCallback(
    async (data: RegisterRequest) => {
      await authApi.registerUser(data);
      try {
        await login({ email: data.email, password: data.password });
      } catch (loginErr) {
        const err = new Error(loginErr instanceof Error ? loginErr.message : String(loginErr));
        (err as Error & { requiresEmailVerification: boolean }).requiresEmailVerification = true;
        throw err;
      }
    },
    [login],
  );

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const changePassword = useCallback(async (data: ChangePasswordRequest) => {
    await authApi.changePassword(data);
  }, []);

  const forgotPassword = useCallback(async (data: ForgotPasswordRequest) => {
    await authApi.forgotPassword(data);
  }, []);

  const resetPasswordAction = useCallback(async (data: ResetPasswordRequest) => {
    await authApi.resetPassword(data);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      accessToken,
      refreshToken,
      isAuthenticated,
      isLoading,
      login,
      register,
      logout,
      changePassword,
      forgotPassword,
      resetPassword: resetPasswordAction,
    }),
    [
      user,
      accessToken,
      refreshToken,
      isAuthenticated,
      isLoading,
      login,
      register,
      logout,
      changePassword,
      forgotPassword,
      resetPasswordAction,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}