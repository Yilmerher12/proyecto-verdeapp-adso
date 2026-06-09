/**
 * Archivo: components/layout/LegalLayout.tsx
 * Descripción: Layout estructural para documentos legales del sistema.
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
}

export function LegalLayout({ children, title, lastUpdated, version }: LegalLayoutProps) {
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 flex flex-col selection:bg-green-200 selection:text-green-900">
      
      {/* HEADER DE DOCUMENTOS */}
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
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </nav>
      </header>

      {/* CONTENIDO PRINCIPAL */}
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

          <div className="space-y-8 max-w-none">
            {children}
          </div>
        </article>
      </main>

      {/* FOOTER */}
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

// 🛠️ CORREGIDO: Interfaz ajustada exactamente a como el profesor la construyó originalmente
interface LegalSectionProps {
  id?: string;
  number?: string | number;
  heading?: string;
  title?: string;
  children: ReactNode;
}

/**
 * ¿Qué? Sub-componente requerido para fragmentar los párrafos de las normativas legales.
 */
export function LegalSection({ id, number, heading, title, children }: LegalSectionProps) {
  // Maneja tanto el formato nuevo (title) como el viejo (heading + number)
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