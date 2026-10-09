/**
 * Archivo: lib/notificaciones.ts
 * Descripción: Tipo y utilidad compartidos entre NotificationFeed.tsx y las
 *              pantallas que lo usan (los 3 dashboards con notificaciones,
 *              y AuditoriaResultadoBanner/Modal).
 * ¿Para qué? Issue #225 — antes vivían dentro de NotificationFeed.tsx, que
 *           además exporta un componente de React. ESLint (regla
 *           react-refresh/only-export-components) avisa que un archivo así
 *           no puede recargarse en caliente (Fast Refresh) de forma
 *           confiable — el aviso estaba silenciado con un comentario en vez
 *           de resolverse. Separar el tipo/función a su propio archivo deja
 *           NotificationFeed.tsx exportando SOLO el componente.
 */
import i18n from "@/i18n";

export interface NotificacionItem {
  id: string;
  tipo: string;
  mensaje: string;
  // ¿Qué? Puntero opcional al registro relacionado (ej. id_auditoria para
  //       AUDITORIA_PUBLICADA) — la mayoría de tipos no lo usan.
  id_referencia: string | null;
  // ¿Qué? Puede ser null — las novedades de plataforma (RQF-015) no
  //       pertenecen a ningún conjunto residencial.
  nombre_conjunto: string | null;
  leida: boolean;
  created_at: string;
}

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
