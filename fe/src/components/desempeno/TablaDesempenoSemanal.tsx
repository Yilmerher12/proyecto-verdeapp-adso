/**
 * Archivo: components/desempeno/TablaDesempenoSemanal.tsx
 * ¿Qué? Los mismos números de la gráfica semanal, en una tabla (botón "Ver como tabla").
 * ¿Para qué? Alternativa accesible (RNF-005): quien usa lector de pantalla o no
 *           distingue los colores lee las cifras exactas. El rango de cada
 *           semana es un botón que la elige, igual que tocar su barra.
 */
import { useTranslation } from "react-i18next";
import type { SemanaDesempeno } from "@/lib/auditoriaConjuntoApi";
import { CAMPOS_POR_NIVEL, claveNivel, rangoSemana, totalSemana } from "@/lib/desempeno";

interface TablaDesempenoSemanalProps {
  semanas: SemanaDesempeno[];
  seleccionada: string | null;
  onSeleccionar: (lunes: string) => void;
}

export function TablaDesempenoSemanal({ semanas, seleccionada, onSeleccionar }: TablaDesempenoSemanalProps) {
  const { t, i18n } = useTranslation();
  const ultimoLunes = semanas[semanas.length - 1]?.lunes;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{t("desempeno.grafica.tablaCaption")}</caption>
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500 dark:border-night-line dark:text-gray-400">
            <th scope="col" className="py-2 pr-3">
              {t("desempeno.grafica.tablaSemana")}
            </th>
            {CAMPOS_POR_NIVEL.map(({ nivel }) => (
              <th key={nivel} scope="col" className="px-3 py-2 text-right">
                {t(claveNivel(nivel))}
              </th>
            ))}
            <th scope="col" className="py-2 pl-3 text-right">
              {t("desempeno.grafica.tablaTotal")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-night-line">
          {semanas.map((semana) => {
            const { desde, hasta } = rangoSemana(semana.lunes, i18n.language);
            const activa = semana.lunes === seleccionada;
            return (
              <tr key={semana.lunes}>
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  <button
                    type="button"
                    onClick={() => onSeleccionar(semana.lunes)}
                    aria-pressed={activa}
                    className={`cursor-pointer rounded-md px-1 text-left text-gray-800 underline-offset-2 hover:underline dark:text-gray-200 ${
                      activa ? "font-bold" : ""
                    }`}
                  >
                    {t("desempeno.grafica.rango", { desde, hasta })}
                    {semana.lunes === ultimoLunes && ` (${t("desempeno.grafica.enCurso")})`}
                  </button>
                </th>
                {CAMPOS_POR_NIVEL.map(({ nivel, campo }) => (
                  <td key={nivel} className="px-3 py-2 text-right tabular-nums text-gray-800 dark:text-gray-200">
                    {semana[campo]}
                  </td>
                ))}
                <td className="py-2 pl-3 text-right font-semibold tabular-nums text-gray-900 dark:text-white">
                  {totalSemana(semana)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
