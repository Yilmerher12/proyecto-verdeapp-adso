import { useTranslation } from "react-i18next";
import { Building } from "lucide-react";
import type { ConjuntoAdministrado } from "@/lib/conjuntoPanelApi";

/**
 * ¿Qué? Cobertura de UN conjunto: cuántos de sus apartamentos ya tienen al
 *       menos un residente con cuenta, contra el total que definió su Admin.
 * ¿Para qué? Que el Admin de Conjunto vea cuántos faltan por usar VerdeApp y
 *           pueda invitarlos (por ejemplo en la reunión del conjunto).
 * ¿Impacto? Si todavía no definió el total (todos los conjuntos arrancan así),
 *          muestra los registrados y le indica que lo defina con "Editar datos del
 *          conjunto" (issue #513): la cantidad de apartamentos se edita en un solo
 *          lugar. Issue #595: salió de AdminConjuntoDashboard.tsx tal cual, sin cambios.
 */
export function CoberturaConjunto({ conjunto }: { conjunto: ConjuntoAdministrado }) {
  const { t } = useTranslation();
  const { total_apartamentos: total, apartamentos_registrados: registrados, residentes_registrados: residentes } = conjunto;
  const tieneTotal = total !== null && total > 0;
  // ¿Qué? Se topa en 100% / 0 faltantes por si hay más registrados que el total escrito.
  const porcentaje = tieneTotal ? Math.min(100, Math.round((registrados / total) * 100)) : 0;
  const faltan = tieneTotal ? Math.max(0, total - registrados) : 0;

  return (
    // ¿Qué? Columna con mt-auto en el texto de abajo: la tarjeta comparte fila con el
    //       código de acceso y, si es más alta, el espacio sobrante queda repartido
    //       (cifras arriba, explicación abajo) y no como un hueco al final.
    <div className="flex w-full flex-col rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-night-line dark:bg-night-inset/40">
      <div className="mb-2 flex items-center gap-2">
        <Building className="icon-md text-accent-600" />
        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("dashboards.adminConjunto.coverage.title")}</h4>
      </div>
      {/* ¿Qué? Las cifras van en el medio (my-auto) y no pegadas al título.
          ¿Para qué? Con tarjetas de la misma altura en la fila, el espacio sobrante
                    queda repartido arriba y abajo de las cifras, no como un hueco al final. */}
      <div className="my-auto py-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-4xl font-bold leading-none text-accent-700 dark:text-accent-400">{registrados}</span>
          <span className="text-base text-gray-500 dark:text-gray-400">
            {tieneTotal
              ? t("dashboards.adminConjunto.coverage.ofTotal", { total })
              : t("dashboards.adminConjunto.coverage.alreadyHaveResidents")}
          </span>
        </div>

        {tieneTotal && (
          <div
            role="img"
            aria-label={t("dashboards.adminConjunto.coverage.barAria", { registrados, total })}
            className="mt-3 h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-night-line"
          >
            <div className="h-full rounded-full bg-accent-700" style={{ width: `${porcentaje}%` }} />
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-6">
          {tieneTotal && (
            <div>
              <div className="text-xl font-bold text-gray-800 dark:text-white">{faltan}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t("dashboards.adminConjunto.coverage.missing")}</div>
            </div>
          )}
          <div>
            <div className="text-xl font-bold text-gray-800 dark:text-white">{residentes}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t("dashboards.adminConjunto.coverage.residents")}</div>
          </div>
        </div>
      </div>

      {tieneTotal ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">{t("dashboards.adminConjunto.coverage.explain")}</p>
      ) : (
        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
          {t("dashboards.adminConjunto.coverage.noTotal")}
        </p>
      )}
    </div>
  );
}
