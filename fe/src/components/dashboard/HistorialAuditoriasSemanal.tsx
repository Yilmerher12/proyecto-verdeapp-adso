/**
 * Archivo: components/dashboard/HistorialAuditoriasSemanal.tsx
 * ¿Qué? Historial de auditorías (RQF-009) de UN conjunto, agrupado por
 *       semana, con una barra Bueno/Regular/Malo por semana para comparar
 *       de un vistazo.
 * ¿Para qué? Uso exclusivo del panel del Admin de Conjunto, anidado dentro
 *           del acordeón de cada conjunto — el Residente sigue viendo la
 *           lista plana de HistorialAuditorias.tsx, sin tocarla.
 * ¿Impacto? No pide datos por su cuenta: recibe ya la lista de auditorías
 *           de ESE conjunto (AdminConjuntoDashboard pide el historial
 *           completo una sola vez y lo filtra por conjunto antes de
 *           pasarlo) — así las auditorías de distintos conjuntos nunca
 *           se mezclan en una misma barra semanal. Si el conjunto no
 *           tiene ninguna, no se muestra nada (igual que SeccionAvisosConjunto).
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, History } from "lucide-react";
import { type AuditoriaConjunto, type NivelDesempeno } from "@/lib/auditoriaConjuntoApi";
import { AuditoriaResultadoModal } from "@/components/dashboard/AuditoriaResultadoModal";
import { NIVELES_DESEMPENO } from "@/config/nivelesDesempeno";
import { formatearFechaCreacion, lunesUTC, rangoSemanaUTC } from "@/lib/dateFormat";

type NivelContable = "BUENA" | "REGULAR" | "DEFICIENTE";

// ¿Qué? EXCELENTE es un nivel retirado (solo lo tienen auditorías viejas) —
//       la propia etiqueta ya lo muestra como "Bueno" (ver nivelesDesempeno.ts),
//       así que se cuenta junto con BUENA en la barra de la semana.
const contarComo = (n: NivelDesempeno): NivelContable => (n === "EXCELENTE" ? "BUENA" : n);

interface Semana {
  lunes: string;
  auditorias: AuditoriaConjunto[];
  conteo: Record<NivelContable, number>;
}

function agruparPorSemana(auditorias: AuditoriaConjunto[]): Semana[] {
  const porLunes = new Map<string, AuditoriaConjunto[]>();
  for (const a of auditorias) {
    const lunes = lunesUTC(new Date(a.created_at));
    const lista = porLunes.get(lunes) ?? [];
    lista.push(a);
    porLunes.set(lunes, lista);
  }
  return [...porLunes.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([lunes, lista]) => {
      const conteo: Record<NivelContable, number> = { BUENA: 0, REGULAR: 0, DEFICIENTE: 0 };
      lista.forEach((a) => conteo[contarComo(a.nivel_desempeno)]++);
      return { lunes, auditorias: lista, conteo };
    });
}

export function HistorialAuditoriasSemanal({ auditorias }: { auditorias: AuditoriaConjunto[] }) {
  const { t } = useTranslation();
  const [idAbierta, setIdAbierta] = useState<string | null>(null);
  // ¿Qué? Mismo patrón de acordeón que AdminPuntosAcopioPage: sin decisión
  //       manual, solo la primera semana (la más reciente) viene abierta.
  const [semanasAbiertas, setSemanasAbiertas] = useState<Record<string, boolean>>({});

  if (auditorias.length === 0) return null;

  const semanas = agruparPorSemana(auditorias);

  return (
    <div className="mt-4 rounded-xl bg-gray-50 p-4 dark:bg-night-inset/40">
      <div className="mb-3 flex items-center gap-2">
        <History className="icon-md text-gray-500 dark:text-gray-400" />
        <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300">
          {t("auditoriaResultado.historialTitle")}
        </h5>
      </div>

      <div className="space-y-2">
        {semanas.map((semana, i) => {
          const total = semana.auditorias.length;
          const abierta = semanasAbiertas[semana.lunes] ?? i === 0;
          return (
            <div
              key={semana.lunes}
              className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-night-line dark:bg-night-card"
            >
              <button
                type="button"
                onClick={() =>
                  setSemanasAbiertas((prev) => ({ ...prev, [semana.lunes]: !abierta }))
                }
                aria-expanded={abierta}
                className="flex w-full cursor-pointer items-center gap-3 p-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-night-inset/60"
              >
                <span className="w-24 shrink-0 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {rangoSemanaUTC(semana.lunes)}
                </span>
                {/* Barra apilada Bueno/Regular/Malo — el ancho de cada tramo es proporcional a su conteo. */}
                <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-night-inset">
                  {(["BUENA", "REGULAR", "DEFICIENTE"] as const).map((nivel) =>
                    semana.conteo[nivel] > 0 ? (
                      <div
                        key={nivel}
                        style={{ width: `${(semana.conteo[nivel] / total) * 100}%` }}
                        className={
                          nivel === "BUENA"
                            ? "bg-teal-500"
                            : nivel === "REGULAR"
                              ? "bg-amber-400"
                              : "bg-red-500"
                        }
                      />
                    ) : null,
                  )}
                </div>
                <span className="w-5 shrink-0 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {total}
                </span>
                <ChevronDown
                  className={`icon-sm shrink-0 text-gray-400 transition-transform ${abierta ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>

              {abierta && (
                <ul className="divide-y divide-gray-50 px-3 pb-2 dark:divide-gray-800">
                  {semana.auditorias.map((a) => {
                    const nivel = NIVELES_DESEMPENO[a.nivel_desempeno];
                    return (
                      <li key={a.id_auditoria}>
                        <button
                          onClick={() => setIdAbierta(a.id_auditoria)}
                          className="flex w-full cursor-pointer items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-night-inset/60"
                        >
                          <div className="min-w-0">
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              {a.tema_educativo}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              {formatearFechaCreacion(a.created_at)}
                            </p>
                          </div>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${nivel.claseBadge}`}
                          >
                            <nivel.icon className="icon-sm" />
                            {t(
                              `dashboards.reciclador.auditoria.niveles.${a.nivel_desempeno.toLowerCase()}`,
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {idAbierta && (
        <AuditoriaResultadoModal idAuditoria={idAbierta} onClose={() => setIdAbierta(null)} />
      )}
    </div>
  );
}
