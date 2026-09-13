/**
 * Archivo: components/ui/PasswordStrengthIndicator.tsx
 * Descripción: Indicador visual de fortaleza de contraseña con barras de colores y etiqueta.
 * ¿Para qué? Dar retroalimentación inmediata al usuario sobre la seguridad de su contraseña
 *            mientras escribe, fomentando el uso de contraseñas fuertes.
 * ¿Impacto? Sin este indicador, el usuario no sabe si su contraseña es segura hasta que el
 *           formulario falla — este componente educa en tiempo real.
 */

import { useTranslation } from "react-i18next";
import { calculatePasswordStrength, type PasswordStrength } from "@/lib/passwordStrength";

// ¿Qué? Solo colores — la etiqueta de texto ahora viene de translation.json
//       (clave "passwordStrength.1".."passwordStrength.5") para que cambie
//       con el idioma activo.
const STRENGTH_META: Record<
  Exclude<PasswordStrength, 0>,
  { labelColor: string; barColor: string }
> = {
  1: { labelColor: "text-red-600 dark:text-red-400",     barColor: "bg-red-500" },
  2: { labelColor: "text-red-500 dark:text-red-400",     barColor: "bg-red-400" },
  3: { labelColor: "text-orange-500 dark:text-orange-400", barColor: "bg-orange-400" },
  4: { labelColor: "text-yellow-600 dark:text-yellow-400", barColor: "bg-yellow-400" },
  5: { labelColor: "text-accent-600 dark:text-accent-500", barColor: "bg-accent-500" },
};

interface PasswordStrengthIndicatorProps {
  /** ¿Qué? Contraseña actual del campo de entrada.
   *  ¿Para qué? Calcular la fortaleza en tiempo real mientras el usuario escribe.
   *  ¿Impacto? El componente es puramente presentacional — no modifica el estado del padre. */
  password: string;
}

/**
 * ¿Qué? Componente que muestra 4 barras de progreso y una etiqueta indicando
 *       la fortaleza de la contraseña ingresada.
 * ¿Para qué? Guiar al usuario para que construya contraseñas seguras de forma intuitiva.
 * ¿Impacto? No se renderiza si la contraseña está vacía — evita ruido visual innecesario.
 *           Las barras cambian de color progresivamente a medida que se cumplen criterios.
 */
export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { t } = useTranslation();
  const strength = calculatePasswordStrength(password);

  // ¿Qué? No renderizar nada si el campo está vacío.
  // ¿Para qué? Evitar mostrar el indicador antes de que el usuario empiece a escribir.
  // ¿Impacto? Mejora la UX — el formulario se ve limpio al cargarse.
  if (strength === 0) return null;

  const meta = STRENGTH_META[strength];
  const label = t(`passwordStrength.${strength}`);

  return (
    <div className="-mt-2 mb-4" role="status" aria-label={t("passwordStrength.ariaLabel", { label })}>
      {/* ¿Qué? Fila de 4 barras de colores donde las activas son del color del nivel actual. */}
      {/* ¿Para qué? Representación visual inmediata — más barras = más fuerte. */}
      {/* ¿Impacto? Las barras inactivas (grises) muestran cuánto falta para el siguiente nivel. */}
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((bar) => (
          <div
            key={bar}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              bar <= strength ? meta.barColor : "bg-gray-200 dark:bg-[#0d2116]"
            }`}
          />
        ))}
      </div>

      {/* ¿Qué? Etiqueta textual del nivel de fortaleza para accesibilidad y lectura rápida. */}
      {/* ¿Para qué? El color solo no es suficiente para accesibilidad (WCAG 1.4.1). */}
      {/* ¿Impacto? Usuarios con daltonismo pueden leer la etiqueta textual. */}
      <p className={`mt-1 text-xs font-medium ${meta.labelColor}`}>{label}</p>
    </div>
  );
}
