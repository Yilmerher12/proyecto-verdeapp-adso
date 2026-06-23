/**
 * Archivo: components/layout/LegalLayout.tsx
 * Descripción: Layout estructural para documentos legales del sistema.
 * ¿Para qué? Un solo componente sirve tanto para las páginas legales completas
 *           (/terminos-de-uso, /privacidad, /cookies) como para mostrarse
 *           embebido dentro de un Modal (ej: desde RegisterPage o LandingPage),
 *           sin duplicar el contenido legal en dos lugares distintos.
 * ¿Impacto? Cohesión: el contenido legal vive en un solo sitio. Desacoplamiento:
 *           quien usa <TerminosDeUsoPage /> no necesita saber si está en una
 *           página completa o dentro de un modal — solo pasa embedded={true}.
 */

import { type ReactNode, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Leaf } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

interface LegalLayoutProps {
  children: ReactNode;
  title: string;
  lastUpdated: string;
  version: string;
  /**
   * ¿Qué? Cuando es true, omite el <header> de navegación y el <footer> propios,
   *       y aplica un padding/scroll pensado para vivir dentro de un <Modal>.
   * ¿Para qué? Evitar duplicar el botón de cerrar y el encabezado cuando este
   *           layout se renderiza DENTRO de un componente <Modal>, que ya
   *           provee su propio botón de cierre.
   * ¿Impacto? Como página independiente (ruta /terminos-de-uso, etc.) se omite
   *           esta prop y todo se ve exactamente igual que antes (sin cambios).
   */
  embedded?: boolean;
}

export function LegalLayout({
  children,
  title,
  lastUpdated,
  version,
  embedded = false,
}: LegalLayoutProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!embedded) {
      window.scrollTo(0, 0);
    }
  }, [embedded]);

  // ¿Qué? Modo embebido: el propio Modal ya tiene su botón de cerrar (X) y
  //       su backdrop — aquí solo necesitamos el contenido con buen padding
  //       y un área de scroll interna acotada en altura (no toda la pantalla).
  if (embedded) {
    return (
      <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-8">
        <header className="mb-6 text-center border-b border-gray-100 dark:border-gray-800 pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-2 pr-8">
            {title}
          </h1>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <p>Versión {version}</p>
            <span>&middot;</span>
            <p>Última actualización: {lastUpdated}</p>
          </div>
        </header>

        <div className="space-y-8">{children}</div>
      </div>
    );
  }

  // ¿Qué? Modo página completa: header de navegación + artículo + footer.
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 flex flex-col selection:bg-green-200 selection:text-green-900">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 dark:border-gray-800 dark:bg-gray-950/80 backdrop-blur-md shadow-sm">
        <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-green-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-md"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.backToHome")}
          </Link>

          <div className="flex items-center gap-2">
            {/* <LanguageSwitcher /> */}
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <main className="flex-1 py-12 px-6">
        <article className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-8 sm:p-12 shadow-sm dark:border-gray-800 dark:bg-gray-900 animate-fade-in">
          <header className="mb-10 text-center border-b border-gray-100 dark:border-gray-800 pb-8">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
              <Leaf className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
              {title}
            </h1>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
              <p>Versión {version}</p>
              <span>&middot;</span>
              <p>Última actualización: {lastUpdated}</p>
            </div>
          </header>

          <div className="space-y-8 max-w-none">{children}</div>
        </article>
      </main>

      <footer className="border-t border-gray-200 py-8 text-center dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Leaf className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="font-semibold text-gray-700 dark:text-gray-300">VerdeApp</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} ADSO - SENA
        </p>
      </footer>
    </div>
  );
}

interface LegalSectionProps {
  id?: string;
  number?: string | number;
  heading?: string;
  title?: string;
  children: ReactNode;
}

export function LegalSection({ id, number, heading, title, children }: LegalSectionProps) {
  const displayTitle = title || (number ? `${number}. ${heading}` : heading);

  return (
    <section id={id} className="space-y-3">
      <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
        {displayTitle}
      </h2>
      <div className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 space-y-4">
        {children}
      </div>
    </section>
  );
}