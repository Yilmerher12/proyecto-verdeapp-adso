/**
 * Archivo: lib/passwordStrength.ts
 * Descripción: Cálculo de fortaleza de contraseña y del código de requisito
 *              que falta, compartidos entre los 4 formularios que piden una
 *              contraseña nueva (Registro, Cambiar, Restablecer, Aceptar
 *              invitación).
 * ¿Para qué? Issue #225 — antes vivían dentro de PasswordStrengthIndicator.tsx,
 *           que además exporta un componente de React. ESLint (regla
 *           react-refresh/only-export-components) avisa que un archivo así
 *           no puede recargarse en caliente (Fast Refresh) de forma
 *           confiable — el aviso estaba silenciado con un comentario en vez
 *           de resolverse. Separar el tipo/las funciones a su propio archivo
 *           deja PasswordStrengthIndicator.tsx exportando SOLO el componente.
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
 * Devuelve un código (no un texto) para que cada pantalla lo traduzca con
 * sus propias claves de i18next (todas los 4 formularios ya usan i18n).
 */
export type PasswordRequirementError = "too_short" | "no_uppercase" | "no_lowercase" | "no_digit";

export function getPasswordRequirementError(password: string): PasswordRequirementError | null {
  if (password.length < 8) return "too_short";
  if (!/[A-Z]/.test(password)) return "no_uppercase";
  if (!/[a-z]/.test(password)) return "no_lowercase";
  if (!/\d/.test(password)) return "no_digit";
  return null;
}
