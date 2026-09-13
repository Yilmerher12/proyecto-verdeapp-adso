import { Spinner } from "./Spinner";

/**
 * Archivo: components/ui/LoadingState.tsx
 * Descripción: Texto "cargando" con un spinner, para reemplazar los
 *              `<p>{t("common.loading")}</p>` sueltos que había repartidos
 *              por varias pantallas (sin ícono, sin forma de avisarle a un
 *              lector de pantalla que algo está cargando).
 * ¿Para qué? role="status" + aria-live="polite" es el mismo criterio que
 *           ya usan Button.tsx y ProtectedRoute.tsx — se extiende ese
 *           criterio a los estados de carga de listas/tarjetas, que hoy
 *           no anunciaban nada.
 * ¿Impacto? message llega ya traducido — este componente no conoce i18n.
 */
interface LoadingStateProps {
  message: string;
}

export function LoadingState({ message }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500 dark:text-gray-400"
    >
      <Spinner size="sm" />
      <span>{message}</span>
    </div>
  );
}
