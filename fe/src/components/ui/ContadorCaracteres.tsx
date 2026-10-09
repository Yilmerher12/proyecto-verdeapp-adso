import { useTranslation } from "react-i18next";

/**
 * ¿Qué? Issue #352 — "123/2000 caracteres" debajo de un texto largo.
 * ¿Para qué? El maxLength del textarea corta en silencio al llegar al
 *           máximo; el contador avisa antes de que eso pase.
 * ¿Impacto? Pasar su `id` en el aria-describedby del textarea para que el
 *          lector de pantalla también lo lea.
 */
export function ContadorCaracteres({ id, actual, max }: { id: string; actual: number; max: number }) {
  const { t } = useTranslation();
  return (
    <p id={id} className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">
      {t("common.charCount", { actual, max })}
    </p>
  );
}
