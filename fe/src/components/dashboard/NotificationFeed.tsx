/* eslint-disable react-refresh/only-export-components */
/**
 * Este bloque (el título, el contador de no leídas, la lista, el botón de
 * "ver más", marcar leídas / limpiar leídas) estaba copiado casi igual en
 * los 3 dashboards que reciben notificaciones (Residente, Reciclador, Admin
 * de Conjunto) — cada uno con su propia copia de TIPO_META y tiempoRelativo()
 * incluida. Si mañana querían cambiarle algo a cómo se ve una notificación,
 * tocaba acordarse de cambiarlo en los 3 archivos. Ahora es un solo
 * componente: cada dashboard solo le pasa su título, sus datos, y de qué
 * color quiere el acento (verde, ámbar, etc. — el que le corresponda a su rol).
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Bell, Building2, Clock, DoorOpen, Megaphone, Newspaper, PackageCheck, Truck, Unlink, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import i18n from "@/i18n";

export interface NotificacionItem {
  id: number;
  tipo: string;
  mensaje: string;
  // ¿Qué? Puntero opcional al registro relacionado (ej. id_auditoria para
  //       AUDITORIA_PUBLICADA) — la mayoría de tipos no lo usan.
  id_referencia: number | null;
  // ¿Qué? Puede ser null — las novedades de plataforma (RQF-015) no
  //       pertenecen a ningún conjunto residencial.
  nombre_conjunto: string | null;
  leida: boolean;
  created_at: string;
}

const TIPO_META: Record<string, { Icon: LucideIcon; color: string }> = {
  LLEGADA_RECICLADOR: { Icon: Truck, color: "text-teal-700 dark:text-teal-400" },
  SHUT_LLENO: { Icon: AlertTriangle, color: "text-amber-700 dark:text-amber-500" },
  SHUT_LIBRE: { Icon: PackageCheck, color: "text-green-700 dark:text-green-500" },
  FINALIZACION_RECICLADOR: { Icon: DoorOpen, color: "text-indigo-700 dark:text-indigo-400" },
  // RQF-016 (desvinculación y reasignación de conjuntos)
  DESVINCULACION_APROBADA: { Icon: Unlink, color: "text-gray-600 dark:text-gray-400" },
  DESVINCULACION_RECHAZADA: { Icon: XCircle, color: "text-red-600 dark:text-red-400" },
  CONJUNTO_ASIGNADO: { Icon: Building2, color: "text-green-700 dark:text-green-500" },
  // RQF-014 (comunicados del conjunto)
  COMUNICADO_NUEVO: { Icon: Megaphone, color: "text-purple-700 dark:text-purple-400" },
  COMUNICADO_ACTUALIZADO: { Icon: Megaphone, color: "text-purple-500 dark:text-purple-300" },
  // RQF-015 (novedades generales de la plataforma)
  NOVEDAD_NUEVA: { Icon: Newspaper, color: "text-indigo-700 dark:text-indigo-400" },
  NOVEDAD_ACTUALIZADA: { Icon: Newspaper, color: "text-indigo-500 dark:text-indigo-300" },
};

// ¿Qué? Se usa i18n.t() directamente (no el hook useTranslation) porque esta
//       es una función común, no un componente — pero como siempre se llama
//       desde el render de un componente que sí usa el hook, el texto se
//       actualiza igual al cambiar de idioma.
export function tiempoRelativo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return i18n.t("notificationFeed.time.justNow");
  if (mins < 60) return i18n.t("notificationFeed.time.minutesAgo", { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return i18n.t("notificationFeed.time.hoursAgo", { count: hrs });
  return i18n.t("notificationFeed.time.daysAgo", { count: Math.floor(hrs / 24) });
}

interface NotificationFeedProps {
  title: string;
  notifications: NotificacionItem[];
  emptyMessage: string;
  /** Color del contador y el punto de "no leída" — el acento del rol (ej: "bg-green-600" / "bg-amber-500"). */
  accentBg: string;
  /** Fondo de la fila cuando está sin leer (claro + oscuro), a tono con el mismo acento. */
  accentHighlight: string;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onClearRead: () => void;
}

export function NotificationFeed({
  title,
  notifications,
  emptyMessage,
  accentBg,
  accentHighlight,
  onMarkRead,
  onMarkAllRead,
  onClearRead,
}: NotificationFeedProps) {
  const { t } = useTranslation();
  const [expandido, setExpandido] = useState(false);
  const noLeidas = notifications.filter((n) => !n.leida).length;

  return (
    <div className="bg-white dark:bg-[#132a1c] rounded-2xl border border-gray-100 dark:border-[#2a4d34] shadow-sm">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-green-600" />
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
          {noLeidas > 0 && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white ${accentBg}`}>
              {noLeidas}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {noLeidas > 0 && (
            <button onClick={onMarkAllRead} className="text-xs font-medium text-green-700 hover:text-green-600 dark:text-green-500 dark:hover:text-green-400">
              {t("notificationFeed.markAllRead")}
            </button>
          )}
          {notifications.some((n) => n.leida) && (
            <button onClick={onClearRead} className="text-xs font-medium text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">
              {t("notificationFeed.clearRead")}
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      ) : (
        <>
          <ul className="divide-y divide-gray-50 dark:divide-gray-800">
            {(expandido ? notifications : notifications.slice(0, 5)).map((n) => {
              const meta = TIPO_META[n.tipo] ?? { Icon: Bell, color: "text-gray-500" };
              return (
                <li
                  key={n.id}
                  onClick={() => !n.leida && onMarkRead(n.id)}
                  className={`flex cursor-pointer items-start gap-3 px-5 py-3.5 transition-colors ${
                    !n.leida ? accentHighlight : "hover:bg-gray-50 dark:hover:bg-[#0d2116]/60"
                  }`}
                >
                  <meta.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.color}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${!n.leida ? "font-semibold text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}`}>
                      {n.mensaje}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {n.nombre_conjunto ?? t("notificationFeed.platformLabel")} · {tiempoRelativo(n.created_at)}
                    </p>
                  </div>
                  {!n.leida && <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${accentBg}`} />}
                </li>
              );
            })}
          </ul>
          {notifications.length > 5 && (
            <button
              onClick={() => setExpandido((v) => !v)}
              className="w-full py-2.5 text-xs font-medium text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 border-t border-gray-50 dark:border-[#2a4d34] transition-colors"
            >
              {expandido ? t("notificationFeed.showLess") : t("notificationFeed.showMore", { count: notifications.length - 5 })}
            </button>
          )}
        </>
      )}
    </div>
  );
}
