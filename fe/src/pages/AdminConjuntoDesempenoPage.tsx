import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChartColumn, Download } from "lucide-react";
import { PERIODOS_SEMANAS, SEMANAS_POR_DEFECTO } from "@/config/desempeno";
import { obtenerMisConjuntos, type ConjuntoAdministrado } from "@/lib/conjuntoPanelApi";
import { descargarDesempenoPdf, nombreArchivoDesempeno } from "@/lib/auditoriaConjuntoApi";
import { descargarArchivo } from "@/lib/descargarArchivo";
import { PanelDesempeno } from "@/components/desempeno/PanelDesempeno";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";

/**
 * ¿Qué? Página "Desempeño" del Admin de Conjunto (HU-052): cómo va la separación
 *       de residuos de su conjunto, semana a semana — gráfica, auditorías de cada
 *       semana y temas donde más falla.
 * ¿Para qué? Antes el historial semanal vivía dentro del acordeón de cada
 *           conjunto, con la semana cortada en UTC y solo las últimas 50
 *           auditorías de todos los conjuntos mezcladas. Aquí cada conjunto tiene
 *           su propia vista, con los conteos que calcula el backend.
 * ¿Impacto? Solo elige conjunto y período; todo lo demás lo hace PanelDesempeno,
 *           que también reutiliza el Residente. Con un solo conjunto no hay
 *           selector. Con varios se pide siempre `id_conjunto`: el backend
 *           responde 422 si falta.
 */
export function AdminConjuntoDesempenoPage() {
  const { t } = useTranslation();
  const [conjuntos, setConjuntos] = useState<ConjuntoAdministrado[]>([]);
  const [idConjunto, setIdConjunto] = useState("");
  const [semanas, setSemanas] = useState<number>(SEMANAS_POR_DEFECTO);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [bajando, setBajando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  useEffect(() => {
    obtenerMisConjuntos()
      .then((lista) => {
        setConjuntos(lista);
        setIdConjunto(lista[0]?.id_conjunto_residencial ?? "");
      })
      .catch(() => setErrorCarga(true))
      .finally(() => setCargando(false));
  }, []);

  // ¿Qué? Issue #558 — baja el PDF del conjunto y período elegidos en pantalla.
  const descargarPdf = async () => {
    setBajando(true);
    setErrorDescarga(null);
    try {
      const archivo = await descargarDesempenoPdf(idConjunto, semanas);
      const conjunto = conjuntos.find((c) => c.id_conjunto_residencial === idConjunto);
      descargarArchivo(
        archivo,
        nombreArchivoDesempeno(conjunto?.nombre_conjunto ?? "conjunto", semanas),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setErrorDescarga(err.message || t("desempeno.descargarError"));
    } finally {
      setBajando(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-night-line dark:bg-night-card">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("desempeno.title")}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-gray-400">
            {t("desempeno.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label
              htmlFor="desempeno-periodo"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t("desempeno.periodoLabel")}
            </label>
            <select
              id="desempeno-periodo"
              value={semanas}
              onChange={(e) => setSemanas(Number(e.target.value))}
              className="block cursor-pointer rounded-lg border border-edge bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 dark:border-night-edge dark:bg-night-field dark:text-gray-100"
            >
              {PERIODOS_SEMANAS.map((n) => (
                <option key={n} value={n}>
                  {t("desempeno.periodoOpcion", { semanas: n })}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={descargarPdf}
            disabled={!idConjunto || bajando}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200"
          >
            <Download className="icon-sm" />
            {bajando ? t("desempeno.descargando") : t("desempeno.descargarPdf")}
          </button>
        </div>
      </div>
      {errorDescarga && (
        <Alert type="error" message={errorDescarga} onClose={() => setErrorDescarga(null)} />
      )}

      {cargando ? (
        <LoadingState message={t("common.loading")} />
      ) : errorCarga ? (
        <Alert type="error" message={t("common.loadError")} />
      ) : conjuntos.length === 0 ? (
        <EmptyState icon={ChartColumn} message={t("desempeno.noConjuntos")} />
      ) : (
        <>
          {conjuntos.length > 1 && (
            <div
              role="tablist"
              aria-label={t("desempeno.conjuntoTabs")}
              className="flex flex-wrap gap-2"
            >
              {conjuntos.map((c) => {
                const activo = c.id_conjunto_residencial === idConjunto;
                return (
                  <button
                    key={c.id_conjunto_residencial}
                    type="button"
                    role="tab"
                    aria-selected={activo}
                    onClick={() => setIdConjunto(c.id_conjunto_residencial)}
                    className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      activo
                        ? "border-accent-700 bg-accent-700 text-white dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-night-line dark:bg-night-card dark:text-gray-300 dark:hover:bg-night-hover"
                    }`}
                  >
                    {c.nombre_conjunto}
                  </button>
                );
              })}
            </div>
          )}
          <PanelDesempeno idConjunto={idConjunto} semanas={semanas} />
        </>
      )}
    </div>
  );
}
