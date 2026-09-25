/**
 * Archivo: components/ui/PasswordRequirementsChecklist.tsx
 * Descripción: Lista de las 4 reglas de la contraseña nueva, cada una con un ✓ al cumplirse.
 * ¿Para qué? El usuario ve en vivo qué le falta, en vez de descubrirlo al pulsar "Guardar".
 * ¿Impacto? Solo presentacional. Las reglas son las mismas de getPasswordRequirementError
 *           (8+ caracteres, mayúscula, minúscula, número); si el backend cambia la regla,
 *           hay que cambiar ambos sitios.
 */

import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

const RULES = [
  { key: "minLength", test: (p: string) => p.length >= 8 },
  { key: "uppercase", test: (p: string) => /[A-Z]/.test(p) },
  { key: "lowercase", test: (p: string) => /[a-z]/.test(p) },
  { key: "number", test: (p: string) => /\d/.test(p) },
] as const;

export function PasswordRequirementsChecklist({ password }: { password: string }) {
  const { t } = useTranslation();

  return (
    <ul className="-mt-2 mb-4 grid grid-cols-2 gap-x-4 gap-y-1.5" aria-label={t("auth.changePassword.requirements.title")}>
      {RULES.map(({ key, test }) => {
        const ok = test(password);
        return (
          <li
            key={key}
            data-met={ok}
            className={`flex items-center gap-2 text-xs ${
              ok ? "font-semibold text-accent-700 dark:text-accent-500" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full ${
                ok ? "bg-accent-600 text-white" : "bg-gray-200 dark:bg-[#0c1a12]"
              }`}
              aria-hidden="true"
            >
              {ok && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
            </span>
            {t(`auth.changePassword.requirements.${key}`)}
          </li>
        );
      })}
    </ul>
  );
}
