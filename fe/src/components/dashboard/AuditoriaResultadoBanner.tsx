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
import type { NotificacionItem } from "@/lib/notificaciones";
import { AuditoriaResultadoModal } from "@/components/dashboard/AuditoriaResultadoModal";
import { Button } from "@/components/ui/Button";

interface AuditoriaResultadoBannerProps {
  notificaciones: NotificacionItem[];
  onMarcarLeida: (id: string) => void;
}

export function AuditoriaResultadoBanner({ notificaciones, onMarcarLeida }: AuditoriaResultadoBannerProps) {
  const { t } = useTranslation();
  const [abierta, setAbierta] = useState<{ idNotificacion: string; idAuditoria: string } | null>(null);

  const pendientes = notificaciones.filter((n) => n.tipo === "AUDITORIA_PUBLICADA" && !n.leida && n.id_referencia);

  if (pendientes.length === 0) return null;

  const cerrarYMarcarLeida = () => {
    if (abierta) onMarcarLeida(abierta.idNotificacion);
    setAbierta(null);
  };

  return (
    <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-6 dark:border-cyan-400/30 dark:bg-cyan-400/10">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardCheck className="icon-md text-cyan-700 dark:text-cyan-300" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("auditoriaResultado.bannerTitle")}</h2>
      </div>
      <div className="space-y-2">
        {pendientes.map((n) => (
          <div
            key={n.id}
            className="flex flex-col gap-2 rounded-xl bg-white px-4 py-3 dark:bg-night-card sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-gray-700 dark:text-gray-300">{n.mensaje}</p>
            <Button size="sm" onClick={() => setAbierta({ idNotificacion: n.id, idAuditoria: n.id_referencia as string })}>
              {t("auditoriaResultado.verButton")}
            </Button>
          </div>
        ))}
      </div>

      {abierta && (
        <AuditoriaResultadoModal idAuditoria={abierta.idAuditoria} onClose={cerrarYMarcarLeida} />
      )}
    </div>
  );
}
