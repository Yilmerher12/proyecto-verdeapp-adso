/**
 * Archivo: components/desempeno/RankingTemas.tsx
 * ¿Qué? "Temas del período": cada tema con cuántas de sus auditorías salieron
 *       Regular o Malo ("Regular o Malo: 4 de 5"), el que más arriba el que más
 *       hay que reforzar. Con un botón para verlo como tabla.
 * ¿Para qué? Decirle al Admin de Conjunto en qué temas falla su conjunto.
 * ¿Impacto? Con pocas auditorías por tema es una pista, no una conclusión: el
 *           aviso va escrito debajo del título. La tabla es la alternativa
 *           accesible (RNF-005) con las mismas cifras por nivel.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Table2, List } from "lucide-react";
import { NIVELES_DESEMPENO } from "@/config/nivelesDesempeno";
import type { TemaDesempeno } from "@/lib/auditoriaConjuntoApi";
import { CAMPOS_POR_NIVEL, claveNivel, rankingTemas, regularOMalo, totalTema } from "@/lib/desempeno";
import { EmptyState } from "@/components/ui/EmptyState";

export function RankingTemas({ temas }: { temas: TemaDesempeno[] }) {
  const { t } = useTranslation();
  const [comoTabla, setComoTabla] = useState(false);
  const ordenados = rankingTemas(temas);

  return (
    <section
      aria-labelledby="desempeno-temas-titulo"
      className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-night-line dark:bg-night-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="desempeno-temas-titulo" className="text-base font-bold text-gray-900 dark:text-white">
            {t("desempeno.temas.titulo")}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t("desempeno.temas.pista")}</p>
        </div>
        {ordenados.length > 0 && (
          <button
            type="button"
            onClick={() => setComoTabla((v) => !v)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-night-line dark:bg-transparent dark:text-gray-300 dark:hover:bg-night-hover"
          >
            {comoTabla ? <List className="icon-sm" aria-hidden="true" /> : <Table2 className="icon-sm" aria-hidden="true" />}
            {comoTabla ? t("desempeno.temas.verComoLista") : t("desempeno.temas.verComoTabla")}
          </button>
        )}
      </div>

      {ordenados.length === 0 ? (
        <EmptyState icon={List} message={t("desempeno.temas.vacio")} />
      ) : comoTabla ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{t("desempeno.temas.tablaCaption")}</caption>
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500 dark:border-night-line dark:text-gray-400">
                <th scope="col" className="py-2 pr-3">
                  {t("desempeno.temas.columnaTema")}
                </th>
                {CAMPOS_POR_NIVEL.map(({ nivel }) => (
                  <th key={nivel} scope="col" className="px-3 py-2 text-right">
                    {t(claveNivel(nivel))}
                  </th>
                ))}
                <th scope="col" className="py-2 pl-3 text-right">
                  {t("desempeno.temas.columnaRegularOMalo")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-night-line">
              {ordenados.map((tema) => (
                <tr key={tema.tema}>
                  <th scope="row" className="py-2 pr-3 text-left font-normal text-gray-800 dark:text-gray-200">
                    {tema.tema}
                  </th>
                  {CAMPOS_POR_NIVEL.map(({ nivel, campo }) => (
                    <td key={nivel} className="px-3 py-2 text-right tabular-nums text-gray-800 dark:text-gray-200">
                      {tema[campo]}
                    </td>
                  ))}
                  <td className="py-2 pl-3 text-right font-semibold tabular-nums text-gray-900 dark:text-white">
                    {regularOMalo(tema)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ol className="divide-y divide-gray-50 dark:divide-night-line">
          {ordenados.map((tema) => {
            const malas = regularOMalo(tema);
            return (
              <li key={tema.tema} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200">{tema.tema}</p>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {malas > 0
                      ? t("desempeno.temas.regularOMalo", { cantidad: malas, total: totalTema(tema) })
                      : t("desempeno.temas.sinRegularNiMalo", { total: totalTema(tema) })}
                  </p>
                </div>
                {/* ¿Qué? Cifras por nivel con su ícono y su nombre (oculto, para el lector de pantalla). */}
                <ul className="flex items-center gap-3">
                  {CAMPOS_POR_NIVEL.map(({ nivel, campo }) => {
                    const config = NIVELES_DESEMPENO[nivel];
                    return (
                      <li
                        key={nivel}
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold ${config.claseBadge}`}
                      >
                        <config.icon className="icon-sm" aria-hidden="true" />
                        <span className="sr-only">{t(claveNivel(nivel))}</span>
                        {tema[campo]}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
