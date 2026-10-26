import type { LucideIcon } from "lucide-react";

/**
 * Archivo: components/ui/EmptyState.tsx
 * Descripción: Caja con ícono + texto centrado para cuando una lista no
 *              tiene datos que mostrar.
 * ¿Para qué? Este mismo patrón (ícono gris + caja con borde punteado +
 *           texto) ya existía, pero copiado a mano en varias páginas
 *           distintas — cada una con su propio ícono y su propia clave de
 *           texto, nunca extraído a un componente.
 * ¿Impacto? La versión original no tenía fondo propio (quedaba
 *           transparente, apoyada directo sobre el fondo de la página).
 *           Con la foto de fondo del panel eso dejó de ser seguro: medido
 *           con la fórmula WCAG, el texto caía hasta 2.8:1 de contraste en
 *           la zona más clara de la foto — por debajo del mínimo 4.5:1
 *           para texto normal. Este componente ahora sí lleva el mismo
 *           fondo sólido que el resto de las tarjetas (bg-white claro
 *           / bg-night-card oscuro), que da 4.56:1 y 5.31:1 — texto seguro
 *           sin importar qué tan vívida quede la foto detrás.
 *           message llega ya traducido (t("...")) — este componente no
 *           conoce i18n, solo recibe el texto final.
 *           Issue #514: se agregó margen lateral (px-6) y un ancho máximo al
 *           texto (max-w-md). Sin eso, un mensaje largo (ej. "pocosDatos" del
 *           desempeño) llegaba pegado a los bordes de la caja y en escritorio
 *           se estiraba en una sola línea de más de 100 caracteres.
 */
interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
}

export function EmptyState({ icon: Icon, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center dark:border-night-line dark:bg-night-card">
      <Icon className="icon-xl text-gray-300 dark:text-gray-600" />
      <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}
