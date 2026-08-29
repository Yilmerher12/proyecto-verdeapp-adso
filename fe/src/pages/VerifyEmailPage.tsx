/**
 * Archivo: VerifyEmailPage.tsx
 * Descripción: Página de verificación de email — procesa el token del enlace enviado al registrarse.
 * ¿Para qué? Capturar el token UUID de la URL (?token=...), llamar al backend y mostrar el resultado.
 * ¿Impacto? Sin esta página, el enlace del email de verificación lleva a un 404 y el usuario
 * nunca puede activar su cuenta ni iniciar sesión.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { verifyEmail } from "@/api/auth";

type VerifyStatus = "loading" | "success" | "error";

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token");

  // 🛠️ OPTIMIZACIÓN: Evaluamos el token en el nacimiento del estado para evitar renders en cascada
  const [status, setStatus] = useState<VerifyStatus>(tokenFromUrl ? "loading" : "error");

  const hasCalled = useRef(false);

  useEffect(() => {
    if (hasCalled.current) return;
    hasCalled.current = true;

    // Si desde el inicio nació con error por falta de token, no ejecutamos nada más
    if (!tokenFromUrl) return;

    async function verify() {
      try {
        // Ejecución asíncrona contra el backend (Llamada limpia)
        await verifyEmail(tokenFromUrl as string);
        setStatus("success");
      } catch (err) {
        console.error("Fallo en verificación:", err);
        setStatus("error");
      }
    }

    verify();
  }, [tokenFromUrl]);

  // ¿Qué? El mensaje se calcula en cada render (no se guarda en estado) para
  //       que cambie de idioma en vivo si el usuario cambia de idioma
  //       mientras está viendo esta página.
  const message =
    status === "success"
      ? t("verifyEmail.successMessage")
      : !tokenFromUrl
        ? t("verifyEmail.noTokenError")
        : t("verifyEmail.errorMessage");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#03130b] px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-[#132a1c] rounded-2xl border border-gray-200 dark:border-[#2a4d34] p-8 shadow-sm text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t("verifyEmail.title")}
          </h1>

          {/* ──── Estado: cargando ──── */}
          {status === "loading" && (
            <div className="mt-6">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-accent-600 border-t-transparent" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">{t("verifyEmail.verifying")}</p>
            </div>
          )}

          {/* ──── Estado: éxito ──── */}
          {status === "success" && (
            <div className="mt-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <svg
                  className="h-7 w-7 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="mt-4 text-gray-700 dark:text-gray-300">{message}</p>
              <div className="mt-6 flex justify-end">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-white bg-accent-700 hover:bg-accent-800 dark:bg-accent-700 dark:hover:bg-accent-800 rounded-lg transition-colors"
                >
                  {t("landing.nav.login")}
                </Link>
              </div>
            </div>
          )}

          {/* ──── Estado: error ──── */}
          {status === "error" && (
            <div className="mt-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <svg
                  className="h-7 w-7 text-red-600 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="mt-4 text-gray-700 dark:text-gray-300">{message}</p>
              <div className="mt-6 flex justify-end gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1f4029] border border-gray-300 dark:border-[#2a4d34] rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a4d34] transition-colors"
                >
                  {t("verifyEmail.goToLogin")}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-accent-700 hover:bg-accent-800 dark:bg-accent-700 dark:hover:bg-accent-800 rounded-lg transition-colors"
                >
                  {t("auth.register.submit")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}