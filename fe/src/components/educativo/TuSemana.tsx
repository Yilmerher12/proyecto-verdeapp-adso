/**
 * Archivo: components/educativo/TuSemana.tsx
 * ¿Qué? Bloque de arriba de "Aprende a reciclar": cómo le fue al conjunto del
 *       Residente en su auditoría más reciente y, si salió Regular o Malo, la
 *       lección que le corresponde.
 * ¿Para qué? Que el residente entienda por qué se le recomienda un tema, en vez
 *           de ver solo una lista de categorías.
 * ¿Impacto? Usa la misma consulta que el historial del panel (listarHistorial):
 *           no hay endpoint nuevo. El tema de la auditoría se guarda con el mismo
 *           nombre que la categoría del catálogo, así que la lección recomendada se
 *           encuentra por nombre. Si no hay auditorías, lo dice en vez de quedar vacío.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { IlustracionCategoria } from "@/components/educativo/IlustracionCategoria";
import { NIVELES_DESEMPENO } from "@/config/nivelesDesempeno";
import { lunesBogota, rangoSemanaUTC } from "@/lib/dateFormat";
import { listarHistorial, type AuditoriaConjunto } from "@/lib/auditoriaConjuntoApi";
import type { ContenidoEducativo } from "@/lib/contenidoEducativoApi";

const CLAVE_NIVEL = { BUENA: "buena", REGULAR: "regular", DEFICIENTE: "deficiente" } as const;

export function TuSemana({ contenido }: { contenido: ContenidoEducativo[] }) {
  const { t } = useTranslation();
  const [auditoria, setAuditoria] = useState<AuditoriaConjunto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    listarHistorial(1, 0)
      .then((pagina) => setAuditoria(pagina.items[0] ?? null))
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, []);

  const envoltorio = "overflow-hidden rounded-3xl border border-gray-100 bg-white dark:border-night-line dark:bg-night-card";

  if (cargando) {
    return (
      <div className={`${envoltorio} p-6`}>
        <LoadingState message={t("common.loading")} />
      </div>
    );
  }
  // ¿Qué? Si la consulta falla, el bloque se omite: el resto del catálogo sigue sirviendo.
  if (error) return null;

  if (!auditoria) {
    return (
      <section aria-label={t("tuSemana.ariaLabel")} className={`${envoltorio} p-6`}>
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t("tuSemana.title")}
        </span>
        <p className="mt-2 text-base text-gray-700 dark:text-gray-300">{t("tuSemana.noAudit")}</p>
      </section>
    );
  }

  const nivel = NIVELES_DESEMPENO[auditoria.nivel_desempeno];
  const NivelIcono = nivel.icon;
  const lunesAuditoria = lunesBogota(new Date(auditoria.created_at));
  const esEstaSemana = lunesAuditoria === lunesBogota();
  const nombreNivel = t(`dashboards.reciclador.auditoria.niveles.${CLAVE_NIVEL[auditoria.nivel_desempeno]}`);
  const necesitaRefuerzo = auditoria.nivel_desempeno !== "BUENA";
  const recomendado = necesitaRefuerzo
    ? contenido.find((c) => c.modulo_categoria === auditoria.tema_educativo)
    : undefined;

  return (
    <section aria-label={t("tuSemana.ariaLabel")} className={envoltorio}>
      <div className="space-y-3 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {esEstaSemana ? t("tuSemana.title") : t("tuSemana.lastAudit")} · {rangoSemanaUTC(lunesAuditoria)}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${nivel.claseBadge}`}>
            <NivelIcono className="icon-sm" aria-hidden="true" />
            {nombreNivel}
          </span>
        </div>
        <p className="text-xl font-bold text-gray-900 dark:text-white">
          {t("tuSemana.result", { nivel: nombreNivel.toLowerCase(), tema: auditoria.tema_educativo })}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {necesitaRefuerzo ? t("tuSemana.needsReinforcement") : t("tuSemana.keepItUp")}
        </p>
      </div>

      {recomendado && (
        <Link
          to={`/catalogo-educativo/${encodeURIComponent(recomendado.modulo_categoria)}`}
          className="flex flex-wrap items-center gap-4 rounded-b-3xl border-t border-gray-100 bg-accent-50 px-6 py-4 transition-colors hover:bg-accent-100 dark:border-night-line dark:bg-accent-300/10 dark:hover:bg-accent-300/15"
        >
          <span className="h-20 w-32 shrink-0 overflow-hidden rounded-2xl bg-white dark:bg-night-card">
            <IlustracionCategoria categoria={recomendado.modulo_categoria} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-accent-700 dark:text-accent-400">
              {t("tuSemana.recommended")}
            </span>
            <span className="mt-1 block text-base font-bold text-gray-900 dark:text-white">{recomendado.titulo_tema}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-700 dark:text-accent-400">
            {t("tuSemana.view")}
            <ChevronRight className="icon-md" aria-hidden="true" />
          </span>
        </Link>
      )}
    </section>
  );
}
