/**
 * Archivo: components/desempeno/PanelDesempeno.tsx
 * ¿Qué? El desempeño semanal de UN conjunto completo: tarjetas de resumen,
 *       gráfica de barras (o tabla), auditorías de la semana elegida y ranking
 *       de temas. Pide los datos al backend (issue #486) y los reparte.
 * ¿Para qué? Lo usa la página "Desempeño" del Admin de Conjunto (issue #487) y,
 *           en la tarjeta siguiente (#488), el panel del Residente: por eso no
 *           sabe nada de selectores de conjunto ni de períodos, solo recibe
 *           `idConjunto` (opcional: sin él, el backend usa el único del
 *           usuario) y `semanas`.
 * ¿Impacto? Con menos de MINIMO_AUDITORIAS_GRAFICA auditorías en el período no
 *           se dibuja la gráfica ni el ranking: se avisa y se muestra la lista
 *           de todas las del período. La gráfica se descarga bajo demanda
 *           (lazy), recharts no entra en la primera carga de la app.
 */
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChartColumn, Table2 } from "lucide-react";
import { MINIMO_AUDITORIAS_GRAFICA } from "@/config/desempeno";
import {
  listarAuditoriasDeSemana,
  obtenerDesempeno,
  type AuditoriaConjunto,
  type DesempenoConjunto,
} from "@/lib/auditoriaConjuntoApi";
import { lunesInicial, rangoSemana, totalSemana } from "@/lib/desempeno";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { LeyendaNiveles } from "@/components/desempeno/LeyendaNiveles";
import { ListaAuditoriasSemana } from "@/components/desempeno/ListaAuditoriasSemana";
import { RankingTemas } from "@/components/desempeno/RankingTemas";
import { ResumenDesempeno } from "@/components/desempeno/ResumenDesempeno";
import { TablaDesempenoSemanal } from "@/components/desempeno/TablaDesempenoSemanal";

const GraficaDesempenoSemanal = lazy(() => import("@/components/desempeno/GraficaDesempenoSemanal"));

interface PanelDesempenoProps {
  idConjunto?: string;
  semanas: number;
}

export function PanelDesempeno({ idConjunto, semanas }: PanelDesempenoProps) {
  const { t, i18n } = useTranslation();

  // ¿Qué? Cada respuesta lleva la "clave" (conjunto + período) con que se pidió.
  // ¿Para qué? Si el usuario cambia de conjunto o de período mientras carga, la
  //           respuesta vieja no se muestra: no coincide con la clave actual, y
  //           mientras no haya una que coincida se muestra "cargando".
  const clave = `${idConjunto ?? ""}|${semanas}`;
  const [respuesta, setRespuesta] = useState<{ clave: string; datos: DesempenoConjunto | null } | null>(null);
  const [eleccion, setEleccion] = useState<{ clave: string; lunes: string } | null>(null);
  const [comoTabla, setComoTabla] = useState(false);
  // ¿Qué? Auditorías de cada semana ya pedidas, por "clave|lunes" (null = falló).
  const [listas, setListas] = useState<Record<string, AuditoriaConjunto[] | null>>({});
  const pedidas = useRef(new Set<string>());

  useEffect(() => {
    let vigente = true;
    obtenerDesempeno(idConjunto, semanas)
      .then((datos) => vigente && setRespuesta({ clave, datos }))
      .catch(() => vigente && setRespuesta({ clave, datos: null }));
    return () => {
      vigente = false;
    };
  }, [clave, idConjunto, semanas]);

  const actual = respuesta?.clave === clave ? respuesta : null;
  const desempeno = actual?.datos ?? null;

  const pocosDatos = !!desempeno && desempeno.total < MINIMO_AUDITORIAS_GRAFICA;
  const lunesPorDefecto = desempeno ? lunesInicial(desempeno.semanas) : null;
  const seleccionada = eleccion?.clave === clave ? eleccion.lunes : lunesPorDefecto;

  // ¿Qué? Semanas cuyas auditorías hay que tener: con pocos datos, todas las que
  //       tienen alguna (a lo sumo 3); si no, la elegida y la más reciente (de
  //       ahí sale la fecha de la última auditoría).
  const necesarias = !desempeno
    ? []
    : pocosDatos
      ? desempeno.semanas.filter((s) => totalSemana(s) > 0).map((s) => s.lunes)
      : [...new Set([seleccionada, lunesPorDefecto].filter((l): l is string => !!l))];
  const llave = necesarias.join(",");

  useEffect(() => {
    for (const lunes of llave ? llave.split(",") : []) {
      const k = `${clave}|${lunes}`;
      if (pedidas.current.has(k)) continue;
      pedidas.current.add(k);
      listarAuditoriasDeSemana(lunes, idConjunto)
        .then((lista) => setListas((previas) => ({ ...previas, [k]: lista })))
        .catch(() => setListas((previas) => ({ ...previas, [k]: null })));
    }
  }, [llave, clave, idConjunto]);

  if (!actual) return <LoadingState message={t("common.loading")} />;
  if (!desempeno) return <Alert type="error" message={t("desempeno.errorCarga")} />;

  const deSemana = (lunes: string | null) => (lunes ? listas[`${clave}|${lunes}`] : undefined);
  const fechaUltima = desempeno.total > 0 ? (deSemana(lunesPorDefecto)?.[0]?.created_at ?? null) : null;
  const elegir = (lunes: string) => setEleccion({ clave, lunes });
  const ultimoLunes = desempeno.semanas[desempeno.semanas.length - 1]?.lunes;

  if (pocosDatos) {
    // ¿Qué? Las auditorías del período, juntas y de la más reciente a la más antigua.
    const cargadas = necesarias.map(deSemana);
    const listaDelPeriodo = cargadas.some((l) => l === null)
      ? null
      : cargadas.some((l) => l === undefined)
        ? undefined
        : cargadas.flatMap((l) => l ?? []).sort((a, b) => b.created_at.localeCompare(a.created_at));
    return (
      <div className="space-y-6">
        <ResumenDesempeno desempeno={desempeno} fechaUltima={fechaUltima} />
        <EmptyState
          icon={ChartColumn}
          message={t("desempeno.pocosDatos", { minimo: MINIMO_AUDITORIAS_GRAFICA, semanas })}
        />
        <ListaAuditoriasSemana
          titulo={t("desempeno.semana.tituloPeriodo")}
          auditorias={listaDelPeriodo}
          mensajeVacio={t("desempeno.semana.vaciaPeriodo")}
        />
      </div>
    );
  }

  const { desde, hasta } = seleccionada ? rangoSemana(seleccionada, i18n.language) : { desde: "", hasta: "" };
  const tituloSemana = t(seleccionada === ultimoLunes ? "desempeno.semana.tituloEnCurso" : "desempeno.semana.titulo", {
    desde,
    hasta,
  });

  return (
    <div className="space-y-6">
      <ResumenDesempeno desempeno={desempeno} fechaUltima={fechaUltima} />

      <section
        aria-labelledby="desempeno-grafica-titulo"
        className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-night-line dark:bg-night-card"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="desempeno-grafica-titulo" className="text-base font-bold text-gray-900 dark:text-white">
              {t("desempeno.grafica.titulo")}
            </h2>
            <p className="mt-0.5 max-w-2xl text-xs text-gray-500 dark:text-gray-400">{t("desempeno.grafica.ayuda")}</p>
          </div>
          <button
            type="button"
            onClick={() => setComoTabla((v) => !v)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-night-line dark:bg-transparent dark:text-gray-300 dark:hover:bg-night-hover"
          >
            {comoTabla ? <ChartColumn className="icon-sm" aria-hidden="true" /> : <Table2 className="icon-sm" aria-hidden="true" />}
            {comoTabla ? t("desempeno.grafica.verComoGrafica") : t("desempeno.grafica.verComoTabla")}
          </button>
        </div>

        <LeyendaNiveles />

        {comoTabla ? (
          <TablaDesempenoSemanal semanas={desempeno.semanas} seleccionada={seleccionada} onSeleccionar={elegir} />
        ) : (
          <Suspense fallback={<LoadingState message={t("common.loading")} />}>
            <GraficaDesempenoSemanal semanas={desempeno.semanas} seleccionada={seleccionada} onSeleccionar={elegir} />
          </Suspense>
        )}
      </section>

      <ListaAuditoriasSemana
        titulo={tituloSemana}
        auditorias={deSemana(seleccionada)}
        mensajeVacio={t("desempeno.semana.vacia")}
      />

      <RankingTemas temas={desempeno.temas} />
    </div>
  );
}
