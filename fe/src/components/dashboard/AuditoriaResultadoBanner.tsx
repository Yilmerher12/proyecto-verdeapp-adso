/**
 * Archivo: components/dashboard/AuditoriaResultadoBanner.tsx
 * ¿Qué? Aviso de auditorías publicadas (RQF-009) — separado a propósito
 *       del feed de notificaciones normal (issue #5: "que no se mezcle
 *       con las de siempre"), con su propio botón "Ver".
 * ¿Para qué? Lo usan tanto el Residente como el Admin de Conjunto — mismo
 *           componente para no duplicar la lógica de filtrar, abrir el
 *           detalle y marcar como leída.
 * ¿Impacto? Filtra las notificaciones tipo AUDITORIA_PUBLICADA de la lista
 *           completa que ya carga el dashboard — no dispara una petición
 *           HTTP aparte.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardCheck } from "lucide-react";
import type { NotificacionItem } from "@/components/dashboard/NotificationFeed";
import { AuditoriaResultadoModal } from "@/components/dashboard/AuditoriaResultadoModal";

interface AuditoriaResultadoBannerProps {
  notificaciones: NotificacionItem[];
  token: string;
  onMarcarLeida: (id: string) => void;
}

export function AuditoriaResultadoBanner({ notificaciones, token, onMarcarLeida }: AuditoriaResultadoBannerProps) {
  const { t } = useTranslation();
  const [abierta, setAbierta] = useState<{ idNotificacion: string; idAuditoria: string } | null>(null);

  const pendientes = notificaciones.filter((n) => n.tipo === "AUDITORIA_PUBLICADA" && !n.leida && n.id_referencia);

  if (pendientes.length === 0) return null;

  const cerrarYMarcarLeida = () => {
    if (abierta) onMarcarLeida(abierta.idNotificacion);
    setAbierta(null);
  };

  return (
    <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-5 dark:border-teal-800/30 dark:bg-teal-900/10">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-teal-700 dark:text-teal-400" />
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t("auditoriaResultado.bannerTitle")}</h2>
      </div>
      <div className="space-y-2">
        {pendientes.map((n) => (
          <div
            key={n.id}
            className="flex flex-col gap-2 rounded-xl bg-white px-4 py-3 dark:bg-[#132a1c] sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-gray-700 dark:text-gray-300">{n.mensaje}</p>
            <button
              onClick={() => setAbierta({ idNotificacion: n.id, idAuditoria: n.id_referencia as string })}
              className="shrink-0 cursor-pointer rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-600"
            >
              {t("auditoriaResultado.verButton")}
            </button>
          </div>
        ))}
      </div>

      {abierta && (
        <AuditoriaResultadoModal idAuditoria={abierta.idAuditoria} token={token} onClose={cerrarYMarcarLeida} />
      )}
    </div>
  );
}
