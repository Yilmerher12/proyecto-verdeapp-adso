/**
 * Archivo: components/dashboard/DesvinculacionAprobadaBanner.tsx
 * ¿Qué? Aviso de "tu solicitud de desvinculación fue aprobada" (RQF-016) en el
 *       panel del Admin de Conjunto.
 * ¿Para qué? Issue #436 — los avisos de un conjunto viven dentro de su
 *           pestaña. Al aprobarse la desvinculación el Admin ya no administra
 *           ese conjunto, así que no tiene pestaña donde ver este aviso: sin
 *           este banner dejaría de verlo en el panel.
 * ¿Impacto? Solo recibe las notificaciones que ya carga el dashboard — no
 *           hace ninguna petición HTTP. Se quita al marcarla como leída.
 */
import { useTranslation } from "react-i18next";
import { Unlink } from "lucide-react";
import type { NotificacionItem } from "@/lib/notificaciones";

interface DesvinculacionAprobadaBannerProps {
  notificaciones: NotificacionItem[];
  onMarcarLeida: (id: string) => void;
}

export function DesvinculacionAprobadaBanner({ notificaciones, onMarcarLeida }: DesvinculacionAprobadaBannerProps) {
  const { t } = useTranslation();

  if (notificaciones.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-night-line dark:bg-night-card">
      <div className="mb-3 flex items-center gap-2">
        <Unlink className="icon-md text-gray-600 dark:text-gray-400" aria-hidden="true" />
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t("desvinculacionAprobada.bannerTitle")}</h2>
      </div>
      <div className="space-y-2">
        {notificaciones.map((n) => (
          <div
            key={n.id}
            className="flex flex-col gap-2 rounded-xl bg-white px-4 py-3 dark:bg-night-inset sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-gray-700 dark:text-gray-300">{n.mensaje}</p>
            <button
              type="button"
              onClick={() => onMarcarLeida(n.id)}
              className="shrink-0 cursor-pointer rounded-lg bg-accent-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-800"
            >
              {t("desvinculacionAprobada.gotIt")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
