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
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChartColumn, Table2 } from "lucide-react";
import { MINIMO_AUDITORIAS_GRAFICA } from "@/config/desempeno";
import {
  listarAuditoriasDeSemana,
  obtenerDesempeno,
  type AuditoriaConjunto,
  type DesempenoConjunto,
  type PaginaAuditorias,
} from "@/lib/auditoriaConjuntoApi";
import { HistorialAuditorias } from "@/components/dashboard/HistorialAuditorias";
import { Pestanas } from "@/components/ui/Pestanas";
import { lunesInicial, rangoSemana, totalSemana } from "@/lib/desempeno";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { LeyendaNiveles } from "@/components/desempeno/LeyendaNiveles";
import { ListaAuditoriasSemana } from "@/components/desempeno/ListaAuditoriasSemana";
import { RankingTemas } from "@/components/desempeno/RankingTemas";
import { ResumenDesempeno } from "@/components/desempeno/ResumenDesempeno";
import { TablaDesempenoSemanal } from "@/components/desempeno/TablaDesempenoSemanal";
import { Button } from "@/components/ui/Button";
import { PanelPestana } from "@/components/ui/PanelPestana";

// ¿Qué? La gráfica (Recharts) se descarga aparte, solo cuando se necesita.
// ¿Para qué? Issue #644: el panel pedía la gráfica recién DESPUÉS de recibir los datos, así que se veían dos siluetas
//           seguidas (datos, y luego la descarga de la gráfica). Ahora el panel la pide al montarse, a la vez que los datos.
// ¿Impacto? Una sola espera; la gráfica sigue fuera del paquete principal (no se descarga en pantallas sin panel).
const importarGrafica = () => import("@/components/desempeno/GraficaDesempenoSemanal");
const GraficaDesempenoSemanal = lazy(importarGrafica);

type Pestana = "semana" | "todas" | "temas";

interface PanelDesempenoProps {
  idConjunto?: string;
  semanas: number;
  /** ¿Qué? Título (e ícono) de la tarjeta, arriba del resumen. Sin él, la tarjeta empieza en el resumen. */
  cabecera?: ReactNode;
  /** ¿Qué? Si se pasa, aparece la pestaña "Todas las auditorías" con esa lista paginada (la del Residente). */
  cargarHistorial?: (limit: number, offset: number) => Promise<PaginaAuditorias>;
}

export function PanelDesempeno({ idConjunto, semanas, cabecera, cargarHistorial }: PanelDesempenoProps) {
  const { t, i18n } = useTranslation();
  const [pestana, setPestana] = useState<Pestana>("semana");

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
    void importarGrafica();
  }, []);

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

  if (!actual) return <Marco cabecera={cabecera}><Esqueleto mensaje={t("common.loading")} variante="bloque" alto="h-[48rem]" /></Marco>;
  if (!desempeno) return <Marco cabecera={cabecera}><Alert type="error" message={t("desempeno.errorCarga")} /></Marco>;

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
      <Marco cabecera={cabecera}>
        <ResumenDesempeno desempeno={desempeno} fechaUltima={fechaUltima} />
        <EmptyState
          icon={ChartColumn}
          message={t("desempeno.pocosDatos", { minimo: MINIMO_AUDITORIAS_GRAFICA, semanas })}
        />
        {/* ¿Qué? Con `cargarHistorial` (el Residente) se muestra el historial completo y paginado, no solo el
                  período: con pocas auditorías no hay pestañas, y así las más viejas siguen al alcance. */}
        {cargarHistorial ? (
          <HistorialAuditorias sinTarjeta cargar={cargarHistorial} />
        ) : (
          <ListaAuditoriasSemana
            sinTarjeta
            titulo={t("desempeno.semana.tituloPeriodo")}
            auditorias={listaDelPeriodo}
            mensajeVacio={t("desempeno.semana.vaciaPeriodo")}
          />
        )}
      </Marco>
    );
  }

  const { desde, hasta } = seleccionada ? rangoSemana(seleccionada, i18n.language) : { desde: "", hasta: "" };
  const tituloSemana = t(seleccionada === ultimoLunes ? "desempeno.semana.tituloEnCurso" : "desempeno.semana.titulo", {
    desde,
    hasta,
  });

  const pestanas: { id: Pestana; clave: string }[] = [
    { id: "semana", clave: "desempeno.pestanas.semana" },
    ...(cargarHistorial ? [{ id: "todas" as const, clave: "desempeno.pestanas.todas" }] : []),
    { id: "temas", clave: "desempeno.pestanas.temas" },
  ];

  return (
    <Marco cabecera={cabecera}>
      <ResumenDesempeno desempeno={desempeno} fechaUltima={fechaUltima} />

      <section
        aria-labelledby="desempeno-grafica-titulo"
        className="space-y-4 border-t border-gray-100 pt-5 dark:border-night-line"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="desempeno-grafica-titulo" className="text-lg font-bold text-gray-900 dark:text-white">
              {t("desempeno.grafica.titulo")}
            </h2>
            <p className="mt-0.5 max-w-2xl text-xs text-gray-500 dark:text-gray-400">{t("desempeno.grafica.ayuda")}</p>
          </div>
          <Button variant="secondary" size="sm" type="button" onClick={() => setComoTabla((v) => !v)}>
            {comoTabla ? <ChartColumn className="icon-sm" aria-hidden="true" /> : <Table2 className="icon-sm" aria-hidden="true" />}
            {comoTabla ? t("desempeno.grafica.verComoGrafica") : t("desempeno.grafica.verComoTabla")}
          </Button>
        </div>

        <LeyendaNiveles />

        {comoTabla ? (
          <TablaDesempenoSemanal semanas={desempeno.semanas} seleccionada={seleccionada} onSeleccionar={elegir} />
        ) : (
          <Suspense fallback={<Esqueleto mensaje={t("common.loading")} variante="bloque" alto="h-[18.75rem]" />}>
            <GraficaDesempenoSemanal semanas={desempeno.semanas} seleccionada={seleccionada} onSeleccionar={elegir} />
          </Suspense>
        )}
      </section>

      {/* ¿Qué? Tres pestañas en vez de tres bloques apilados: la semana elegida en la gráfica, todas las
                auditorías (solo si quien usa el panel pasa `cargarHistorial`, como el Residente) y los temas.
          ¿Para qué? Antes el panel eran 6 bloques seguidos y había que bajar mucho para llegar al final.
          ¿Impacto? "Todas las auditorías" pide su lista solo al abrir la pestaña. */}
      {/* ¿Qué? Las pestañas son el componente compartido `Pestanas`: en un espacio angosto se reparten el ancho en
                partes iguales y en uno ancho van en una fila (ver components/ui/Pestanas.tsx).
          ¿Para qué? Antes se envolvían en filas y una pestaña quedaba sola en la segunda, desordenada. */}
      <Pestanas
        pestanas={pestanas.map(({ id, clave: claveTexto }) => ({ id, etiqueta: t(claveTexto) }))}
        activa={pestana}
        onCambiar={setPestana}
        ariaLabel={t("desempeno.pestanas.aria")}
        idBase="desempeno-pestana"
        idPanel="desempeno-pestana-contenido"
        className="border-t border-gray-100 pt-5 dark:border-night-line"
      />

      <PanelPestana id="desempeno-pestana-contenido" labelledBy={`desempeno-pestana-${pestana}`} claveActiva={pestana}>
        {pestana === "semana" && (
          <ListaAuditoriasSemana
            sinTarjeta
            titulo={tituloSemana}
            auditorias={deSemana(seleccionada)}
            mensajeVacio={t("desempeno.semana.vacia")}
          />
        )}
        {pestana === "todas" && cargarHistorial && <HistorialAuditorias sinTarjeta cargar={cargarHistorial} />}
        {pestana === "temas" && <RankingTemas sinTarjeta temas={desempeno.temas} />}
      </PanelPestana>
    </Marco>
  );
}

// ¿Qué? La tarjeta única del desempeño: un solo marco con (opcional) la cabecera que le pasa quien lo usa.
// ¿Para qué? El panel del Residente la usa como su tarjeta "Mi conjunto" (con título e ícono); la página
//           Desempeño del Admin de Conjunto no pasa cabecera porque su título ya está arriba de la página.
function Marco({ cabecera, children }: { cabecera?: ReactNode; children: ReactNode }) {
  return (
    <div className="@container space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-night-line dark:bg-night-card">
      {cabecera}
      {children}
    </div>
  );
}
