/* eslint-disable react-refresh/only-export-components */
/**
 * Archivo: components/ui/PasswordStrengthIndicator.tsx
 * Descripción: Indicador visual de fortaleza de contraseña con barras de colores y etiqueta.
 * ¿Para qué? Dar retroalimentación inmediata al usuario sobre la seguridad de su contraseña
 *            mientras escribe, fomentando el uso de contraseñas fuertes.
 * ¿Impacto? Sin este indicador, el usuario no sabe si su contraseña es segura hasta que el
 *           formulario falla — este componente educa en tiempo real.
 */

/**
 * ¿Qué? Nivel de fortaleza calculado a partir de los criterios de la contraseña.
 * ¿Para qué? Tipado explícito para evitar valores inválidos en el cálculo de fortaleza.
 * ¿Impacto? TypeScript garantiza que solo se usen los cuatro valores definidos.
 */
export type PasswordStrength = 0 | 1 | 2 | 3 | 4 | 5;

export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) score++;
  return score as PasswordStrength;
}

/**
 * Antes cada uno de los 4 formularios que piden una contraseña nueva
 * (Registro, Cambiar contraseña, Restablecer contraseña, Aceptar invitación)
 * traía su propia versión de "¿esta contraseña sirve?" copiada y pegada —
 * y no siempre decían lo mismo: Registro exigía además un símbolo especial
 * que el backend nunca pidió, y Aceptar invitación solo revisaba el largo,
 * sin mayúscula/minúscula/número. Esta función es la única fuente de verdad
 * de ahora en adelante, y refleja EXACTAMENTE la regla real del backend
 * (be/app/schemas/user.py: 8+ caracteres, mayúscula, minúscula, número — el
 * símbolo especial es un extra que suma puntos en la barra, pero nunca es
 * obligatorio para poder enviar el formulario).
 *
 * Devuelve un código (no un texto) para que cada pantalla pueda traducirlo
 * a su propio idioma/formato — las que ya usan i18n, y las que todavía no.
 */
export type PasswordRequirementError = "too_short" | "no_uppercase" | "no_lowercase" | "no_digit";

export function getPasswordRequirementError(password: string): PasswordRequirementError | null {
  if (password.length < 8) return "too_short";
  if (!/[A-Z]/.test(password)) return "no_uppercase";
  if (!/[a-z]/.test(password)) return "no_lowercase";
  if (!/\d/.test(password)) return "no_digit";
  return null;
}

/** Mensajes en español listos para usar en pantallas que todavía no tienen i18n conectado. */
export const PASSWORD_ERROR_MESSAGES_ES: Record<PasswordRequirementError, string> = {
  too_short: "La contraseña debe tener al menos 8 caracteres.",
  no_uppercase: "La contraseña debe contener al menos una mayúscula.",
  no_lowercase: "La contraseña debe contener al menos una minúscula.",
  no_digit: "La contraseña debe contener al menos un número.",
};

const STRENGTH_META: Record<
  Exclude<PasswordStrength, 0>,
  { label: string; labelColor: string; barColor: string }
> = {
  1: { label: "Muy débil",  labelColor: "text-red-600 dark:text-red-400",     barColor: "bg-red-500" },
  2: { label: "Débil",      labelColor: "text-red-500 dark:text-red-400",     barColor: "bg-red-400" },
  3: { label: "Regular",    labelColor: "text-orange-500 dark:text-orange-400", barColor: "bg-orange-400" },
  4: { label: "Buena",      labelColor: "text-yellow-600 dark:text-yellow-400", barColor: "bg-yellow-400" },
  5: { label: "Fuerte",     labelColor: "text-green-600 dark:text-green-500", barColor: "bg-green-500" },
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
  const strength = calculatePasswordStrength(password);

  // ¿Qué? No renderizar nada si el campo está vacío.
  // ¿Para qué? Evitar mostrar el indicador antes de que el usuario empiece a escribir.
  // ¿Impacto? Mejora la UX — el formulario se ve limpio al cargarse.
  if (strength === 0) return null;

  const meta = STRENGTH_META[strength];

  return (
    <div className="-mt-2 mb-4" role="status" aria-label={`Fortaleza de contraseña: ${meta.label}`}>
      {/* ¿Qué? Fila de 4 barras de colores donde las activas son del color del nivel actual. */}
      {/* ¿Para qué? Representación visual inmediata — más barras = más fuerte. */}
      {/* ¿Impacto? Las barras inactivas (grises) muestran cuánto falta para el siguiente nivel. */}
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((bar) => (
          <div
            key={bar}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              bar <= strength ? meta.barColor : "bg-gray-200 dark:bg-gray-700"
            }`}
          />
        ))}
      </div>

      {/* ¿Qué? Etiqueta textual del nivel de fortaleza para accesibilidad y lectura rápida. */}
      {/* ¿Para qué? El color solo no es suficiente para accesibilidad (WCAG 1.4.1). */}
      {/* ¿Impacto? Usuarios con daltonismo pueden leer la etiqueta textual. */}
      <p className={`mt-1 text-xs font-medium ${meta.labelColor}`}>{meta.label}</p>
    </div>
  );
}
