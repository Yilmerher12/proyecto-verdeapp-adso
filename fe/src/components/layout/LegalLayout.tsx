/**
 * Archivo: components/layout/LegalLayout.tsx
 * Descripción: Layout de los documentos legales (Términos, Privacidad, Cookies).
 * ¿Para qué? Las tres páginas legales se muestran siempre dentro de un <Modal>
 *           (desde el footer de la landing o desde el registro): este layout
 *           pone el encabezado del documento y un área con scroll interno.
 * ¿Impacto? Antes tenía además un modo "página completa" (con su propio
 *           header, footer y logo) que ninguna ruta usaba; se quitó junto con
 *           el prop embedded, que ya siempre valía true.
 */

import type { ReactNode } from "react";

interface LegalLayoutProps {
  children: ReactNode;
  title: string;
  lastUpdated: string;
  version: string;
}

export function LegalLayout({ children, title, lastUpdated, version }: LegalLayoutProps) {
  // El Modal ya pone el botón de cerrar y el fondo: aquí solo va el contenido,
  // con un área de scroll acotada en altura (no toda la pantalla).
  return (
    <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-8">
      <header className="mb-6 text-center border-b border-gray-100 dark:border-night-line pb-6">
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