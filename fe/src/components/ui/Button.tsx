/**
 * Archivo: components/ui/Button.tsx
 * Descripción: Botón reutilizable con variantes de estilo y estado de carga.
 * ¿Para qué? Estandarizar la apariencia y comportamiento de todos los botones de la app.
 * ¿Impacto? Sin este componente, cada botón tendría estilos diferentes,
 *           rompiendo la consistencia visual del diseño.
 */

import { useTranslation } from "react-i18next";
import { Spinner } from "./Spinner";

/**
 * ¿Qué? Props del componente Button.
 * ¿Para qué? Configurar variante (primary, secondary, danger, dangerOutline), tamaño, loading, etc.
 * ¿Impacto? TypeScript garantiza que solo se usen variantes válidas.
 *           Issue #640: acepta también los atributos normales de un botón (aria-*, title, onBlur, id...) para poder
 *           reemplazar los botones escritos a mano, pero NO className ni style: el aspecto sale solo de variant y size.
 */
interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "style" | "children" | "type"> {
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "danger" | "dangerOutline";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  isLoading?: boolean;
}

/**
 * ¿Qué? Componente de botón con variantes de color, tamaño y estado de carga.
 * ¿Para qué? Reutilizar en formularios, modales, acciones del dashboard, etc.
 * ¿Impacto? Diseño: colores sólidos (sin degradados), transiciones suaves, sans-serif.
 *           El spinner aparece automáticamente cuando isLoading=true.
 */
export function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  fullWidth = false,
  isLoading = false,
  disabled = false,
  "aria-label": ariaLabel,
  "aria-busy": ariaBusy,
  ...resto
}: ButtonProps) {
  // ¿Qué? Clases CSS según la variante elegida (primary, secondary, danger, dangerOutline).
  // ¿Para qué? Cada variante tiene colores distintos para comunicar intención.
  // ¿Impacto? primary = acción principal (verde), secondary = acción secundaria (borde gris),
  //           danger = acción destructiva (rojo sólido), dangerOutline = acción destructiva
  //           de menos peso (borde rojo, p. ej. "Rechazar" junto a un "Aceptar").
  const variantClasses = {
    // ¿Qué? accent-700 en vez de accent-600 — con texto blanco, accent-600 solo
    //       llega a 3.22:1 de contraste (falla el mínimo 4.5:1 de WCAG AA para
    //       texto normal); accent-700 llega a 4.94:1. Verificado con la fórmula
    //       oficial de contraste WCAG durante la auditoría RNF-003.
    primary:
      "bg-accent-700 text-white hover:bg-accent-800 dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200",
    secondary:
      "bg-white text-gray-700 border border-edge hover:bg-gray-50 dark:bg-night-inset dark:text-gray-300 dark:border-night-edge dark:hover:bg-night-hover",
    danger:
      "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700",
    // ¿Qué? Mismos colores que ya usaban a mano los botones de borde rojo (issue #640): texto red-700, borde red-300 y,
    //       en modo oscuro, borde translúcido y texto red-300.
    dangerOutline:
      "bg-white text-red-700 border border-red-300 hover:bg-red-50 dark:bg-transparent dark:text-red-300 dark:border-red-400/30 dark:hover:bg-red-400/10",
  };

  // ¿Qué? Clases CSS según el tamaño elegido.
  // ¿Para qué? Permitir botones de diferentes tamaños según el contexto.
  const sizeClasses = {
    sm: "touch-target-h px-3 py-1.5 text-xs",
    md: "touch-target-h px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  // ¿Qué? aria-busy comunica a tecnologías asistivas que el botón está procesando.
  // ¿Para qué? WCAG 4.1.3 Status Messages: cuando isLoading=true, un usuario de lector
  //            de pantalla no puede ver el spinner visual. aria-busy="true" + aria-label
  //            dinámico le informan que la acción está en progreso.
  // ¿Impacto? Sin esto, un usuario ciego haría clic repetidamente al no recibir feedback.
  //           El texto sale de i18n: antes estaba fijo en español.
  const { t } = useTranslation();

  return (
    <button
      {...resto}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading ? true : (ariaBusy ?? false)}
      aria-label={isLoading ? t("common.processing") : ariaLabel}
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors duration-200 focus-ring disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : "whitespace-nowrap"}`}
    >
      {/* ¿Qué? Spinner SVG animado que aparece durante la carga. */}
      {/* ¿Para qué? Feedback visual de que la acción está procesándose. */}
      {/* ¿Impacto? Sin loading state, el usuario podría hacer clic varias veces. */}
      {isLoading && <Spinner size="sm" tone="current" className="-ml-1" />}
      {children}
    </button>
  );
}
