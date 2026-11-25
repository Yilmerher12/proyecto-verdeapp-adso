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
 *           Issue #640: acepta también los atributos normales de un botón (aria-*, title, onBlur, id, ref...) para poder
 *           reemplazar los botones escritos a mano, pero NO className ni style: el aspecto sale solo de variant y size.
 */
interface ButtonProps extends Omit<React.ComponentPropsWithRef<"button">, "className" | "style" | "children" | "type"> {
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "danger" | "dangerOutline" | "warning";
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
    // ¿Qué? El secundario se parece a un campo: mismo color que su contenedor y borde de control
    //       (3:1 o más). En oscuro ya no lleva relleno propio (antes night-inset, casi igual al fondo).
    // ¿Para qué? Decisión 5 de docs/gestion-proyecto/investigacion-paleta-colores.md: un secundario
    //            que se distinga de la tarjeta, del modal y del menú lateral.
    // ¿Impacto? Al pasar el mouse toma un relleno suave: night-hover (se nota tanto sobre la tarjeta
    //           como sobre el modal).
    secondary:
      "bg-white text-gray-900 border border-edge hover:bg-accent-50 dark:bg-transparent dark:text-gray-100 dark:border-night-edge dark:hover:bg-night-hover",
    danger:
      "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700",
    // ¿Qué? Acción delicada pero reversible (ámbar sólido): la de las confirmaciones de tipo "warning". accent: amber-700 con texto blanco
    //       cumple el contraste (amber-600 no llega a 4.5:1).
    warning:
      "bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-300 dark:text-amber-950 dark:hover:bg-amber-200",
    // ¿Qué? Peligro de menos peso: texto red-700 y borde red-600 (claro); texto red-300 y borde red-400
    //       sólido (oscuro).
    // ¿Para qué? Decisión 5 de la investigación de paleta: el borde rojo debe verse. En oscuro el borde
    //            era red-400 al 30 % (1.60:1 sobre la tarjeta); sólido da 5.06:1.
    // ¿Impacto? El rojo sólido (variante danger) queda para el botón de confirmar dentro del modal.
    dangerOutline:
      "bg-white text-red-700 border border-red-600 hover:bg-red-50 dark:bg-transparent dark:text-red-300 dark:border-red-400 dark:hover:bg-red-400/15",
  };

  // ¿Qué? Aspecto de un botón desactivado: neutro, nunca el color de la variante atenuado.
  // ¿Para qué? Decisión 13 de la investigación de paleta: un primario desactivado no debe verse como un
  //            verde pálido sino como un botón inactivo. WCAG no exige contraste a los controles inactivos.
  // ¿Impacto? Reemplaza al aspecto normal (incluido el hover) cuando el botón está desactivado o lleva
  //           aria-disabled. Mientras carga (isLoading) conserva su color y se atenúa, para que el
  //           spinner siga leyéndose como "trabajando" y no como "inactivo".
  const inactivoLleno = "bg-gray-200 text-gray-600 dark:bg-night-soft dark:text-gray-400";
  const inactivoBorde = "bg-transparent text-gray-500 border border-gray-200 dark:text-gray-400 dark:border-night-line";
  const inactivoClasses = {
    primary: inactivoLleno,
    danger: inactivoLleno,
    warning: inactivoLleno,
    secondary: inactivoBorde,
    dangerOutline: inactivoBorde,
  };
  const inactivo = !isLoading && (disabled || resto["aria-disabled"] === true || resto["aria-disabled"] === "true");

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
      aria-label={ariaLabel ?? (isLoading ? t("common.processing") : undefined)}
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors duration-200 focus-ring disabled:cursor-not-allowed aria-disabled:cursor-not-allowed ${isLoading ? "opacity-60" : ""} ${inactivo ? inactivoClasses[variant] : variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : "whitespace-nowrap"}`}
    >
      {/* ¿Qué? Spinner SVG animado que aparece durante la carga. */}
      {/* ¿Para qué? Feedback visual de que la acción está procesándose. */}
      {/* ¿Impacto? Sin loading state, el usuario podría hacer clic varias veces. */}
      {isLoading && <Spinner size="sm" tone="current" className="-ml-1" />}
      {children}
    </button>
  );
}
