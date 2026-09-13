/**
 * Archivo: components/ui/Paginacion.tsx
 * Descripción: Barra de "mostrando X–Y de Z" con flechas para pasar de
 *              página, para listados que el backend entrega de a pedazos.
 * ¿Para qué? Issue #227 — el mismo bloque visual (flechas + contador) ya
 *           existía escrito a mano dentro de AdminDashboard.tsx. Se extrae
 *           aquí para que los nuevos listados paginados (novedades) se
 *           vean exactamente igual, sin copiar el JSX de nuevo.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PaginacionProps {
  desde: number;
  hasta: number;
  total: number;
  pagina: number;
  totalPaginas: number;
  puedeAnterior: boolean;
  puedeSiguiente: boolean;
  onAnterior: () => void;
  onSiguiente: () => void;
}

export function Paginacion({
  desde,
  hasta,
  total,
  pagina,
  totalPaginas,
  puedeAnterior,
  puedeSiguiente,
  onAnterior,
  onSiguiente,
}: PaginacionProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-[#2a4d34]">
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {t("common.pagination.showing", { from: desde, to: hasta, total })}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onAnterior}
          disabled={!puedeAnterior}
          className="cursor-pointer rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-[#2a4d34]"
          aria-label={t("common.pagination.prev")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-2 text-xs text-gray-500 dark:text-gray-400">
          {pagina + 1} / {totalPaginas}
        </span>
        <button
          type="button"
          onClick={onSiguiente}
          disabled={!puedeSiguiente}
          className="cursor-pointer rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-[#2a4d34]"
          aria-label={t("common.pagination.next")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
