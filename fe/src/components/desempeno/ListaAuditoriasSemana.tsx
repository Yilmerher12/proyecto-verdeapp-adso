/**
 * Archivo: components/desempeno/ListaAuditoriasSemana.tsx
 * ¿Qué? Lista de auditorías (tema, fecha, nivel con ícono y nombre) con un
 *       botón "Ver detalle" que abre el modal de la auditoría.
 * ¿Para qué? Es lo que se ve al tocar una barra de la gráfica (las de esa
 *           semana) y, cuando hay pocos datos, la lista de todo el período.
 * ¿Impacto? No pide datos: PanelDesempeno le pasa las auditorías ya cargadas
 *           (o `null` mientras cargan, o `error`). El detalle de cada una sí
 *           lo pide AuditoriaResultadoModal, igual que en el historial.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardList } from "lucide-react";
import { NIVELES_DESEMPENO } from "@/config/nivelesDesempeno";
import type { AuditoriaConjunto } from "@/lib/auditoriaConjuntoApi";
import { formatearFechaCreacion } from "@/lib/dateFormat";
import { claveNivel } from "@/lib/desempeno";
import { AuditoriaResultadoModal } from "@/components/dashboard/AuditoriaResultadoModal";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";

interface ListaAuditoriasSemanaProps {
  titulo: string;
  // ¿Qué? undefined = cargando; null = falló la carga.
  auditorias: AuditoriaConjunto[] | null | undefined;
  mensajeVacio: string;
}

export function ListaAuditoriasSemana({ titulo, auditorias, mensajeVacio }: ListaAuditoriasSemanaProps) {
  const { t } = useTranslation();
  const [idAbierta, setIdAbierta] = useState<string | null>(null);

  return (
    <section
      aria-label={titulo}
      className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-night-line dark:bg-night-card"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">{titulo}</h2>
        {auditorias && auditorias.length > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t("desempeno.semana.cantidad", { count: auditorias.length })}
          </span>
        )}
      </div>

      {auditorias === undefined ? (
        <LoadingState message={t("common.loading")} />
      ) : auditorias === null ? (
        <Alert type="error" message={t("desempeno.semana.errorCarga")} />
      ) : auditorias.length === 0 ? (
        <EmptyState icon={ClipboardList} message={mensajeVacio} />
      ) : (
        <ul className="divide-y divide-gray-50 dark:divide-night-line">
          {auditorias.map((a) => {
            const nivel = NIVELES_DESEMPENO[a.nivel_desempeno];
            return (
              <li key={a.id_auditoria} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200">{a.tema_educativo}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{formatearFechaCreacion(a.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${nivel.claseBadge}`}
                  >
                    <nivel.icon className="icon-sm" aria-hidden="true" />
                    {t(claveNivel(a.nivel_desempeno))}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIdAbierta(a.id_auditoria)}
                    aria-label={t("desempeno.semana.verDetalleDe", { tema: a.tema_educativo })}
                    className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-night-line dark:bg-transparent dark:text-gray-300 dark:hover:bg-night-hover"
                  >
                    {t("desempeno.semana.verDetalle")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {idAbierta && <AuditoriaResultadoModal idAuditoria={idAbierta} onClose={() => setIdAbierta(null)} />}
    </section>
  );
}
