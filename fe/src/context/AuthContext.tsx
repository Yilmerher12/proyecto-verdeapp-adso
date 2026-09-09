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

// ¿Qué? RNF-001.9: el token de sesión vive en una cookie httpOnly — por
//       diseño, JavaScript no puede leer su valor bajo ninguna
//       circunstancia (esa es justo la protección contra XSS). Esta
//       banderita en sessionStorage NO es una credencial ni un secreto:
//       solo dice "la última vez que se supo, este navegador tenía una
//       sesión iniciada", para poder decidir sin adivinar si vale la pena
//       llamar a getMe() al abrir la app, y para que axios.ts distinga un
//       401 de "la sesión venció" de un 401 de "nunca hubo sesión".
// ¿Impacto? Aunque un script malicioso la leyera o la modificara, no
//           obtiene ningún token ni gana ningún acceso — en el peor caso,
//           la app llama a getMe() una vez de más o de menos.
const CLAVE_SESION_ACTIVA = "verdeapp:sesion-activa";

export function AuthProvider({ children }: AuthProviderProps) {
  // El estado ahora maneja directamente el tipo UserResponse corregido
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isAuthenticated = !!user;

  const clearAuth = useCallback(() => {
    sessionStorage.removeItem(CLAVE_SESION_ACTIVA);
    // ¿Qué? También se borra la posición de scroll guardada del Landing.
    // ¿Para qué? AppShell hace un recargue completo hacia "/" al cerrar
    //           sesión, y el Landing (useRestoreScroll) restaura esta clave
    //           si existe — sin este borrado, el usuario vuelve a caer en el
    //           punto donde estaba desplazado ANTES de haber iniciado sesión.
    // ¿Impacto? Sin esto, cerrar sesión se sentía "roto": la página parecía
    //           recordar un scroll viejo que no tenía nada que ver con la
    //           sesión que se acaba de cerrar.
    sessionStorage.removeItem("landing-scroll-y");
    setUser(null);
  }, []);

  useEffect(() => {
    const verifySession = async () => {
      const huboSesion = sessionStorage.getItem(CLAVE_SESION_ACTIVA) === "1";
      if (!huboSesion) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await authApi.getMe();
        setUser(userData);
        if (userData.locale) {
          await i18n.changeLanguage(userData.locale);
        }
      } catch (err) {
        // ¿Qué? Antes CUALQUIER error de /users/me (401, 500, timeout, sin
        //       red) borraba los tokens guardados.
        // ¿Para qué? Solo un 401/403 significa que el token realmente ya no
        //           sirve (expiró, o la cuenta se desactivó). Un error de
        //           red o una caída puntual del servidor no dice nada sobre
        //           si el token sigue siendo válido.
        // ¿Impacto? Si el backend responde lento o hay un corte de red justo
        //           al abrir la app, el usuario ya no pierde una sesión que
        //           seguía siendo válida — solo se cierra sesión de verdad
        //           cuando el servidor confirma que el token no sirve.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const status = (err as any)?.response?.status;
        if (status === 401 || status === 403) {
          clearAuth();
        }
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
  const login = useCallback(async (data: LoginRequest) => {
    // ¿Qué? El backend ya deja el access y el refresh token guardados como
    //       cookies httpOnly en esta misma respuesta — no hay nada que
    //       leer ni guardar aquí (RNF-001.9).
    await authApi.loginUser(data);
    sessionStorage.setItem(CLAVE_SESION_ACTIVA, "1");

    const userData = await authApi.getMe();
    setUser(userData);

    if (userData.locale) {
      await i18n.changeLanguage(userData.locale);
    }
    return userData;
  }, []);

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