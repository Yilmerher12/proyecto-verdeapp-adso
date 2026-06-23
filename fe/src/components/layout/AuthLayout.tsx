/**
 * Archivo: components/layout/AuthLayout.tsx
 * Descripción: Layout para páginas de autenticación (login, register, forgot, reset).
 * ¿Para qué? Proveer un diseño centrado y consistente para todos los formularios de auth.
 * ¿Impacto? Sin este layout, cada página de auth tendría que implementar su propio centrado
 *           y estructura, causando inconsistencias visuales.
 */

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  wide?: boolean;
  notice?: React.ReactNode;
}

export function AuthLayout({ children, title, subtitle, wide = false, notice }: AuthLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <div className="flex justify-end gap-2 p-4">
        {/* <LanguageSwitcher /> */}
        <ThemeToggle />
      </div>

      <main className="flex flex-1 items-center justify-center px-4 pb-8">
        <div className={`w-full ${wide ? "max-w-xl" : "max-w-md"}`}>
          <div className="mb-5 text-center">
            <Link
              to="/"
              className="inline-block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              aria-label="VerdeApp — volver al inicio"
            >
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 transition-colors hover:text-accent-600 dark:text-white dark:hover:text-accent-400">
                VerdeApp
              </h1>
            </Link>
          </div>

          {notice && <div className="mb-4">{notice}</div>}

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
              {subtitle && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
              )}
            </div>

            {children}
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 px-6 py-5 dark:border-gray-800">
        <nav
          className="mb-3 flex flex-wrap justify-center gap-x-5 gap-y-1"
          aria-label="Información legal"
        >
          <Link
            to="/terminos-de-uso"
            className="text-xs text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-500 dark:hover:text-gray-300"
          >
            {t("landing.footer.terms")}
          </Link>
          <Link
            to="/privacidad"
            className="text-xs text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-500 dark:hover:text-gray-300"
          >
            {t("landing.footer.privacy")}
          </Link>
          <Link
            to="/politica-cookies"
            className="text-xs text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-500 dark:hover:text-gray-300"
          >
            {t("landing.footer.cookies")}
          </Link>
          <Link
            to="/contacto"
            className="text-xs text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-500 dark:hover:text-gray-300"
          >
            {t("landing.footer.contact")}
          </Link>
        </nav>
        <p className="text-center text-xs text-gray-400 dark:text-gray-600">
          VerdeApp &middot; {t("landing.footer.credit")} &middot; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}