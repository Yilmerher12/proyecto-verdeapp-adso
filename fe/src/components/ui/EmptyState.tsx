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
 *           fondo sólido que el resto de las tarjetas (bg-[#f7f9f3] claro
 *           / bg-[#1c341b] oscuro), que da 4.56:1 y 5.31:1 — texto seguro
 *           sin importar qué tan vívida quede la foto detrás.
 *           message llega ya traducido (t("...")) — este componente no
 *           conoce i18n, solo recibe el texto final.
 */
interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
}

export function EmptyState({ icon: Icon, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-[#f7f9f3] py-16 text-center dark:border-[#2a4d34] dark:bg-[#1c341b]">
      <Icon className="h-8 w-8 text-gray-300 dark:text-gray-600" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}
