import { useTranslation } from "react-i18next";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Archivo: components/ErrorFallback.tsx
 * Descripción: Pantalla de recuperación que muestra ErrorBoundary cuando una
 *              página falla al dibujarse (issue #378).
 * ¿Para qué? Separada de ErrorBoundary porque un componente de clase no puede
 *           usar el hook useTranslation, y la regla de Fast Refresh de ESLint
 *           no permite mezclar la clase con otro componente en el mismo archivo.
 * ¿Impacto? Ambos botones recargan la página completa (window.location) en vez
 *           de navegar con React Router: así se descarta todo el estado que
 *           pudo quedar corrupto, y funcionan aunque el error venga del router.
 *           No muestra detalles técnicos del error (podrían revelar datos
 *           internos); esos quedan solo en la consola del navegador.
 */
export function ErrorFallback() {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className="mx-auto my-16 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center dark:border-night-line dark:bg-night-card"
    >
      <TriangleAlert className="icon-xl text-amber-700 dark:text-amber-500" aria-hidden="true" />
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {t("errorBoundary.title")}
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">{t("errorBoundary.message")}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button onClick={() => window.location.reload()}>{t("errorBoundary.reload")}</Button>
        <Button variant="secondary" onClick={() => window.location.assign("/dashboard")}>
          {t("errorBoundary.goHome")}
        </Button>
      </div>
    </div>
  );
}
