/**
 * Este bloque (el título, el contador de no leídas, la lista, el botón de
 * "ver más", marcar leídas / limpiar leídas) estaba copiado casi igual en
 * los 3 dashboards que reciben notificaciones (Residente, Reciclador, Admin
 * de Conjunto) — cada uno con su propia copia de TIPO_META y tiempoRelativo()
 * incluida. Si mañana querían cambiarle algo a cómo se ve una notificación,
 * tocaba acordarse de cambiarlo en los 3 archivos. Ahora es un solo
 * componente: cada dashboard solo le pasa su título, sus datos, y de qué
 * color quiere el acento (verde, ámbar, etc. — el que le corresponda a su rol).
 *
 * Issue #516: es también la lista del menú de la campanita (prop `flat`), así
 * que cada notificación se ve igual en los 4 roles y en los dos lugares.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  TriangleAlert,
  Bell,
  Building,
  ClipboardCheck,
  DoorOpen,
  GraduationCap,
  LifeBuoy,
  Megaphone,
  MessageSquareReply,
  Newspaper,
  PackageCheck,
  Truck,
  Unlink,
  UserX,
  OctagonX,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { tiempoRelativo, type NotificacionItem } from "@/lib/notificaciones";
import { formatearFechaCreacion } from "@/lib/dateFormat";

const TIPO_META: Record<string, { Icon: LucideIcon; color: string }> = {
  LLEGADA_RECICLADOR: { Icon: Truck, color: "text-teal-700 dark:text-teal-300" },
  SHUT_LLENO: { Icon: TriangleAlert, color: "text-amber-700 dark:text-amber-200" },
  SHUT_LIBRE: { Icon: PackageCheck, color: "text-accent-700 dark:text-accent-500" },
  FINALIZACION_RECICLADOR: { Icon: DoorOpen, color: "text-indigo-700 dark:text-indigo-300" },
  // RQF-016 (desvinculación y reasignación de conjuntos)
  DESVINCULACION_APROBADA: { Icon: Unlink, color: "text-gray-600 dark:text-gray-400" },
  DESVINCULACION_RECHAZADA: { Icon: OctagonX, color: "text-red-600 dark:text-red-300" },
  CONJUNTO_ASIGNADO: { Icon: Building, color: "text-accent-700 dark:text-accent-500" },
  RECICLADOR_REVOCADO: { Icon: UserX, color: "text-red-600 dark:text-red-300" },
  // RQF-014 (comunicados del conjunto)
  COMUNICADO_NUEVO: { Icon: Megaphone, color: "text-purple-700 dark:text-purple-300" },
  COMUNICADO_ACTUALIZADO: { Icon: Megaphone, color: "text-purple-500 dark:text-purple-300" },
  // RQF-015 (novedades generales de la plataforma)
  NOVEDAD_NUEVA: { Icon: Newspaper, color: "text-indigo-700 dark:text-indigo-300" },
  NOVEDAD_ACTUALIZADA: { Icon: Newspaper, color: "text-indigo-500 dark:text-indigo-300" },
  // Soporte técnico: respuesta y cambio de estado de la consulta que el usuario envió
  RESPUESTA_SOPORTE: { Icon: MessageSquareReply, color: "text-accent-700 dark:text-accent-500" },
  ESTADO_SOPORTE: { Icon: LifeBuoy, color: "text-accent-700 dark:text-accent-500" },
  // RQF-009 (resultado de la auditoría del reciclador)
  AUDITORIA_PUBLICADA: { Icon: ClipboardCheck, color: "text-teal-700 dark:text-teal-300" },
  // RQF-013 (recomendación de contenido educativo según auditoría)
  CONTENIDO_RECOMENDADO: { Icon: GraduationCap, color: "text-amber-700 dark:text-amber-200" },
  // RQF-013, Flujo C (Admin del Sistema envía un módulo a mano, sin auditoría de por medio)
  CONTENIDO_RECOMENDADO_MANUAL: { Icon: GraduationCap, color: "text-amber-700 dark:text-amber-200" },
};

interface NotificationFeedProps {
  title: string;
  /** Frase corta bajo el título que explica qué avisos salen en esta lista (opcional). */
  description?: string;
  notifications: NotificacionItem[];
  emptyMessage: string;
  /** Color del contador y el punto de "no leída" — el acento del rol (ej: "bg-accent-600" / "bg-amber-500"). */
  accentBg: string;
  /** Fondo de la fila cuando está sin leer (claro + oscuro), a tono con el mismo acento. */
  accentHighlight: string;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearRead: () => void;
  /**
   * ¿Qué? Acción opcional al hacer clic en una notificación, además de
   * marcarla leída (ej: navegar a la página relacionada).
   * ¿Para qué? Issue #4 (RQF-013) — "entre menos clicks tenga que hacer el
   * usuario, mejor": clic en la notificación de contenido recomendado debe
   * llevar directo a "Aprender", no solo marcarla como leída. Se deja
   * opcional para no forzar a los otros 2 dashboards que usan este mismo
   * componente a implementar una navegación que no necesitan.
   */
  onItemClick?: (notif: NotificacionItem) => void;
  /**
   * ¿Qué? Dice si `onItemClick` hace algo con esa notificación (por omisión, sí con todas).
   * ¿Para qué? Issue #516 — el menú de la campanita solo actúa con dos tipos: sin esto, el
   *           resto de las filas ya leídas quedarían como botones enfocables que no hacen nada.
   */
  esAccionable?: (notif: NotificacionItem) => boolean;
  /**
   * ¿Qué? Sin tarjeta propia (sin fondo, borde, sombra ni esquinas redondeadas).
   * ¿Para qué? Issue #516 — dentro del menú de la campanita la tarjeta ya es el menú: con la
   *           suya además se verían dos bordes uno dentro del otro.
   */
  flat?: boolean;
}

export function NotificationFeed({
  title,
  description,
  notifications,
  emptyMessage,
  accentBg,
  accentHighlight,
  onMarkRead,
  onMarkAllRead,
  onClearRead,
  onItemClick,
  esAccionable,
  flat = false,
}: NotificationFeedProps) {
  const { t } = useTranslation();
  const [expandido, setExpandido] = useState(false);
  const noLeidas = notifications.filter((n) => !n.leida).length;

  return (
    <div className={flat ? "" : "bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line shadow-sm"}>
      <div className={`flex items-center justify-between gap-3 px-5 pt-5 ${description ? "pb-2" : "pb-3"}`}>
        <div className="flex items-center gap-2">
          <Clock className="icon-md text-accent-600" />
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
          {noLeidas > 0 && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white ${accentBg}`}>
              {noLeidas}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {noLeidas > 0 && (
            <button onClick={onMarkAllRead} className="link-text text-xs">
              {t("notificationFeed.markAllRead")}
            </button>
          )}
          {notifications.some((n) => n.leida) && (
            <button onClick={onClearRead} className="focus-ring cursor-pointer rounded text-xs font-medium text-gray-500 underline underline-offset-2 transition-colors hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400">
              {t("notificationFeed.clearRead")}
            </button>
          )}
        </div>
      </div>

      {/* ¿Qué? Mismo tamaño y color que el mensaje de lista vacía (text-sm), a propósito:
                con dos tamaños distintos se leían como dos textos sueltos (issue #513). */}
      {description && <p className="px-5 pb-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{description}</p>}

      {notifications.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      ) : (
        <>
          <ul className="divide-y divide-gray-50 dark:divide-gray-800">
            {(expandido ? notifications : notifications.slice(0, 5)).map((n) => {
              const meta = TIPO_META[n.tipo] ?? { Icon: Bell, color: "text-gray-500 dark:text-gray-400" };
              const interactiva = !n.leida || Boolean(onItemClick && (esAccionable?.(n) ?? true));
              const activar = () => {
                if (!n.leida) onMarkRead(n.id);
                onItemClick?.(n);
              };
              return (
                <li
                  key={n.id}
                  onClick={() => interactiva && activar()}
                  onKeyDown={(e) => {
                    if (interactiva && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      activar();
                    }
                  }}
                  role={interactiva ? "button" : undefined}
                  tabIndex={interactiva ? 0 : undefined}
                  aria-label={
                    interactiva
                      ? !n.leida
                        ? `${n.mensaje}. ${t("notificationFeed.markReadHint")}`
                        : n.mensaje
                      : undefined
                  }
                  className={`flex items-start gap-3 px-5 py-3.5 transition-colors ${interactiva ? "cursor-pointer" : ""} ${
                    !n.leida ? accentHighlight : interactiva ? "hover:bg-gray-50 dark:hover:bg-night-inset/60" : ""
                  }`}
                >
                  {/* ¿Qué? Issue #516 — el ícono va en un círculo, y debajo del mensaje una fila
                            fija: de qué conjunto (o "VerdeApp"), cuándo y si es nueva o leída.
                      ¿Para qué? Antes el estado era solo un punto de color; ahora se dice con
                                palabras y se lee igual con lector de pantalla. */}
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-night-inset">
                    <meta.Icon className={`icon-md ${meta.color}`} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${!n.leida ? "font-semibold text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}`}>
                      {n.mensaje}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 font-medium text-gray-700 dark:border-night-line dark:bg-night-inset dark:text-gray-300">
                        {n.nombre_conjunto ?? t("notificationFeed.platformLabel")}
                      </span>
                      <time dateTime={n.created_at} title={formatearFechaCreacion(n.created_at)}>
                        {tiempoRelativo(n.created_at)}
                      </time>
                      {n.leida ? (
                        <span>{t("notificationFeed.read")}</span>
                      ) : (
                        <span className="rounded-md bg-accent-100 px-2 py-0.5 font-semibold text-accent-700 dark:bg-accent-300/10 dark:text-accent-400">
                          {t("notificationFeed.new")}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {notifications.length > 5 && (
            <button
              onClick={() => setExpandido((v) => !v)}
              className="w-full cursor-pointer py-2.5 text-xs font-medium text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 border-t border-gray-50 dark:border-night-line transition-colors"
            >
              {expandido ? t("notificationFeed.showLess") : t("notificationFeed.showMore", { count: notifications.length - 5 })}
            </button>
          )}
        </>
      )}
    </div>
  );
}
