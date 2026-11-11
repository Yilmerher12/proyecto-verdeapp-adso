import { ANCHO_PAGINA } from "@/config/anchoPagina";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChartColumn, Download } from "lucide-react";
import { PERIODOS_SEMANAS, SEMANAS_POR_DEFECTO } from "@/config/desempeno";
import { obtenerMisConjuntos, type ConjuntoAdministrado } from "@/lib/conjuntoPanelApi";
import { descargarDesempenoPdf, nombreArchivoDesempeno } from "@/lib/auditoriaConjuntoApi";
import { descargarArchivo } from "@/lib/descargarArchivo";
import { PanelDesempeno } from "@/components/desempeno/PanelDesempeno";
import { Alert } from "@/components/ui/Alert";
import { Pestanas } from "@/components/ui/Pestanas";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/Button";

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
 *           Issue #632: las pestañas de conjunto van DENTRO de la tarjeta del panel (por su prop `cabecera`), al tope,
 *           pegadas al contenido que cambian; antes eran píldoras sueltas entre el encabezado y el panel. El período y
 *           "Descargar PDF" se quedan en el encabezado (el PDF baja el conjunto y el período que estás viendo).
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
    <div className={`${ANCHO_PAGINA.normal} space-y-6 pt-6`}>
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
              className="focus-ring block cursor-pointer rounded-lg border border-edge bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-accent-500 /20 dark:border-night-edge dark:bg-night-field dark:text-gray-100"
            >
              {PERIODOS_SEMANAS.map((n) => (
                <option key={n} value={n}>
                  {t("desempeno.periodoOpcion", { semanas: n })}
                </option>
              ))}
            </select>
          </div>
          <Button variant="primary" type="button" onClick={descargarPdf} disabled={!idConjunto || bajando}>
            <Download className="icon-sm" />
            {bajando ? t("desempeno.descargando") : t("desempeno.descargarPdf")}
          </Button>
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
        <PanelDesempeno
          idConjunto={idConjunto}
          semanas={semanas}
          cabecera={
            conjuntos.length > 1 ? (
              <Pestanas
                variante="subrayadas"
                repartidas
                ariaLabel={t("desempeno.conjuntoTabs")}
                activa={idConjunto}
                onCambiar={setIdConjunto}
                pestanas={conjuntos.map((c) => ({ id: c.id_conjunto_residencial, etiqueta: c.nombre_conjunto }))}
              />
            ) : undefined
          }
        />
      )}
    </div>
  );
}
