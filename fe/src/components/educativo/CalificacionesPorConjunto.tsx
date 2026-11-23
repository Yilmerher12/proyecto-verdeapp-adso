import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { CalendarSearch, ChevronLeft, ChevronRight, FilterX, Search } from "lucide-react";
import { API_BASE_URL } from "@/api/axios";
import { Alert } from "@/components/ui/Alert";
import { ConjuntoCombobox, type ConjuntoOption } from "@/components/ui/ConjuntoCombobox";
import { FechaEnPalabras } from "@/components/ui/FechaEnPalabras";
import { ContenidoRecargable } from "@/components/ui/ContenidoRecargable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Paginacion } from "@/components/ui/Paginacion";
import { Pestanas } from "@/components/ui/Pestanas";
import { usePaginacion } from "@/hooks/usePaginacion";
import { NIVELES_DESEMPENO } from "@/config/nivelesDesempeno";
import { Button } from "@/components/ui/Button";
import {
  listarAuditoriasAdmin,
  type AuditoriaAdmin,
  type ConteosNivelAdmin,
  type NivelDesempeno,
  type OrdenCalificaciones,
} from "@/lib/auditoriaConjuntoApi";
import {
  domingoDeLunesUTC,
  etiquetaMes,
  fechaBogota,
  formatearFechaCreacion,
  isoToDateInputUTC,
  lunesBogota,
  lunesUTC,
  mesBogota,
  moverMes,
  rangoDeMes,
  rangoSemanaUTC,
} from "@/lib/dateFormat";

type ModoPeriodo = "semana" | "mes" | "rango";

const MODOS: ModoPeriodo[] = ["semana", "mes", "rango"];
const ORDENES: OrdenCalificaciones[] = ["criticas", "recientes", "conjunto"];
const FILAS_POR_PAGINA = 10;
const CONTEOS_VACIOS: ConteosNivelAdmin = { BUENA: 0, REGULAR: 0, DEFICIENTE: 0 };

const CLASE_CONTROL_FILTRO =
  "touch-target-h rounded-lg border border-edge bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-night-edge dark:bg-night-panel dark:text-gray-200";
const CLASE_FLECHA =
  "touch-target flex cursor-pointer items-center justify-center rounded-lg border border-gray-200 p-1.5 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30 dark:border-night-line dark:text-gray-400 dark:hover:bg-night-hover";

interface Localidad {
  id_localidad: number;
  nombre_localidad: string;
}

interface CalificacionesPorConjuntoProps {
  /** Lunes (YYYY-MM-DD) de la semana de hoy en hora de Bogotá. */
  semanaActual: string;
  /** Fecha de la calificación más reciente que existe (null si no hay ninguna o aún no cargó). */
  ultimaFecha: string | null;
  /** true cuando la página ya terminó de pedir las calificaciones recientes (haya o no). */
  recientesCargadas: boolean;
  onAbrir: (auditoria: AuditoriaAdmin) => void;
}

/**
 * ¿Qué? Pestaña "Calificaciones por conjunto" del Admin del Sistema (issue #618): la tabla de calificaciones de
 *       los recicladores con su periodo (Semana, Mes o Personalizado), sus filtros, su orden y su paginación.
 * ¿Para qué? Antes la pantalla traía TODAS las calificaciones de una semana (de a 200, en un ciclo) y filtraba,
 *           ordenaba y contaba en el navegador; con muchos conjuntos eran miles de filas, y "Desde" y "Hasta" solo
 *           dejaban elegir días de esa semana. Ahora el servidor recibe el periodo y los filtros y devuelve solo 10
 *           filas, los conteos de los botones de nivel y el total.
 * ¿Impacto? Cambiar un filtro, el periodo o el orden vuelve a la página 1. Si la semana en curso está vacía (los
 *           lunes y martes casi siempre), abre en la última semana que tenga datos y lo explica en una franja.
 */
export function CalificacionesPorConjunto({ semanaActual, ultimaFecha, recientesCargadas, onAbrir }: CalificacionesPorConjuntoProps) {
  const { t, i18n } = useTranslation();
  const p = "adminContenidoEducativo";

  // ---------- Periodo ----------
  const [modo, setModo] = useState<ModoPeriodo>("semana");
  const [semana, setSemana] = useState(semanaActual);
  const [mes, setMes] = useState(() => mesBogota());
  const [desdeLibre, setDesdeLibre] = useState("");
  const [hastaLibre, setHastaLibre] = useState("");
  const hoy = fechaBogota(new Date().toISOString());

  // ---------- Filtros ----------
  const [busquedaInput, setBusquedaInput] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [localidadId, setLocalidadId] = useState("");
  const [conjunto, setConjunto] = useState<ConjuntoOption | null>(null);
  const [nivel, setNivel] = useState<"" | NivelDesempeno>("");
  const [orden, setOrden] = useState<OrdenCalificaciones>("criticas");
  const [localidades, setLocalidades] = useState<Localidad[]>([]);

  // ---------- Resultado ----------
  const [items, setItems] = useState<AuditoriaAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [conteos, setConteos] = useState<ConteosNivelAdmin>(CONTEOS_VACIOS);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  // ¿Qué? Cuántas filas dijo el servidor que hay la PRIMERA vez que contestó (null = aún no contestó).
  const [primerTotal, setPrimerTotal] = useState<number | null>(null);
  const [aperturaResuelta, setAperturaResuelta] = useState(false);
  const [avisoUltimaSemana, setAvisoUltimaSemana] = useState(false);

  const paginacion = usePaginacion(FILAS_POR_PAGINA, total);
  const { offset } = paginacion;

  const rango = useMemo(() => {
    if (modo === "semana") return { desde: semana, hasta: isoToDateInputUTC(domingoDeLunesUTC(semana).toISOString()) };
    if (modo === "mes") return rangoDeMes(mes);
    return { desde: desdeLibre, hasta: hastaLibre };
  }, [modo, semana, mes, desdeLibre, hastaLibre]);
  const rangoInvalido = modo === "rango" && Boolean(desdeLibre && hastaLibre && hastaLibre < desdeLibre);
  const hayFiltros = Boolean(busqueda || localidadId || conjunto || nivel);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/v1/geography/localidades`)
      .then((res) => setLocalidades(res.data))
      .catch(() => {});
  }, []);

  // ¿Qué? Búsqueda en vivo con 350 ms de espera, para no pedir la lista con cada tecla.
  useEffect(() => {
    const id = setTimeout(() => {
      setBusqueda(busquedaInput.trim());
      paginacion.reiniciar();
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busquedaInput]);

  useEffect(() => {
    if (rangoInvalido) {
      setItems([]);
      setTotal(0);
      setConteos(CONTEOS_VACIOS);
      setCargando(false);
      return;
    }
    let vigente = true;
    setCargando(true);
    setError(false);
    listarAuditoriasAdmin({
      desde: rango.desde || undefined,
      hasta: rango.hasta || undefined,
      id_localidad: localidadId ? Number(localidadId) : undefined,
      id_conjunto: conjunto?.id_conjunto_residencial,
      buscar: busqueda || undefined,
      nivel: nivel || undefined,
      orden,
      limit: FILAS_POR_PAGINA,
      offset,
    })
      .then((res) => {
        if (!vigente) return;
        setItems(res.items);
        setTotal(res.total);
        setConteos(res.conteos);
        setPrimerTotal((previo) => previo ?? res.total);
      })
      .catch(() => vigente && setError(true))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [rango.desde, rango.hasta, rangoInvalido, localidadId, conjunto, busqueda, nivel, orden, offset]);

  // ¿Qué? Abre en la última semana con datos cuando la semana en curso está vacía (se decide una sola vez).
  // ¿Para qué? Los lunes y martes la semana en curso casi nunca tiene calificaciones, y la pestaña abría vacía
  //           con un mensaje de "no hay calificaciones con esos filtros" aunque no hubiera ningún filtro.
  if (!aperturaResuelta && primerTotal !== null && recientesCargadas) {
    setAperturaResuelta(true);
    if (primerTotal === 0 && ultimaFecha) {
      const lunesDeLaUltima = lunesBogota(new Date(ultimaFecha));
      if (lunesDeLaUltima !== semanaActual) {
        setSemana(lunesDeLaUltima);
        setAvisoUltimaSemana(true);
      }
    }
  }

  // ---------- Cambios que vuelven a la página 1 ----------
  const alCambiarPeriodo = () => {
    setAvisoUltimaSemana(false);
    paginacion.reiniciar();
  };

  const cambiarModo = (nuevo: ModoPeriodo) => {
    setModo(nuevo);
    alCambiarPeriodo();
  };

  const moverSemana = (dias: number) => {
    const [y, m, d] = semana.split("-").map(Number);
    setSemana(lunesUTC(new Date(Date.UTC(y, m - 1, d + dias))));
    alCambiarPeriodo();
  };

  const moverElMes = (delta: number) => {
    setMes((actual) => moverMes(actual, delta));
    alCambiarPeriodo();
  };

  const verEstaSemana = () => {
    setSemana(semanaActual);
    alCambiarPeriodo();
  };

  const cambiarLocalidad = (valor: string) => {
    setLocalidadId(valor);
    // El conjunto elegido puede no ser de la localidad nueva.
    setConjunto(null);
    paginacion.reiniciar();
  };

  const cambiarNivel = (valor: "" | NivelDesempeno) => {
    setNivel(valor);
    paginacion.reiniciar();
  };

  const limpiarFiltros = () => {
    setBusquedaInput("");
    setBusqueda("");
    setLocalidadId("");
    setConjunto(null);
    setNivel("");
    paginacion.reiniciar();
  };

  // ¿Qué? Conjuntos para el buscador, acotados a la localidad si hay una elegida (misma ruta que el panel de usuarios).
  const buscarConjuntos = (query: string): Promise<ConjuntoOption[]> =>
    axios
      .get(`${API_BASE_URL}/api/v1/geography/conjuntos/todos`, {
        params: { search: query || undefined, limit: 20, ...(localidadId ? { id_localidad: Number(localidadId) } : {}) },
      })
      .then((res) => res.data)
      .catch(() => []);

  const enCurso = semana === semanaActual;
  const sumaConteos = conteos.BUENA + conteos.REGULAR + conteos.DEFICIENTE;
  const sinFiltrosNiRango = !hayFiltros;

  return (
    <div>
      <div className="space-y-3 border-t border-gray-100 px-5 py-4 dark:border-night-line">
        <div className="flex flex-wrap items-center gap-3">
          {/* ¿Qué? Los chips del periodo van en su propia fila: Pestanas mide el ancho de su contenedor, y sin un ancho propio
                    los chips se apilaban de a uno. */}
          <div className="w-full">
            <Pestanas
              ariaLabel={t(`${p}.period.label`)}
              activa={modo}
              onCambiar={cambiarModo}
              compacta
              pestanas={MODOS.map((m) => ({ id: m, etiqueta: t(`${p}.period.${m}`) }))}
            />
          </div>

          {modo === "semana" && (
            <>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => moverSemana(-7)} aria-label={t(`${p}.week.prev`)} title={t(`${p}.week.prev`)} className={CLASE_FLECHA}>
                  <ChevronLeft className="icon-md" />
                </button>
                <div className="min-w-[8.125rem] text-center">
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{rangoSemanaUTC(semana)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t(`${p}.week.mondayToSunday`)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => moverSemana(7)}
                  disabled={semana >= semanaActual}
                  aria-label={t(`${p}.week.next`)}
                  title={t(`${p}.week.next`)}
                  className={CLASE_FLECHA}
                >
                  <ChevronRight className="icon-md" />
                </button>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide ${
                  enCurso
                    ? "bg-accent-50 text-accent-700 dark:bg-accent-300/10 dark:text-accent-400"
                    : "bg-gray-100 text-gray-500 dark:bg-night-inset dark:text-gray-400"
                }`}
              >
                {enCurso ? t(`${p}.week.inProgress`) : t(`${p}.week.closed`, { fecha: domingoDeLunesUTC(semana).getUTCDate() })}
              </span>
            </>
          )}

          {modo === "mes" && (
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => moverElMes(-1)} aria-label={t(`${p}.period.prevMonth`)} title={t(`${p}.period.prevMonth`)} className={CLASE_FLECHA}>
                <ChevronLeft className="icon-md" />
              </button>
              <p className="min-w-[8.125rem] text-center text-xs font-bold first-letter:uppercase text-gray-800 dark:text-gray-200">{etiquetaMes(mes, i18n.language)}</p>
              <button
                type="button"
                onClick={() => moverElMes(1)}
                disabled={mes >= mesBogota()}
                aria-label={t(`${p}.period.nextMonth`)}
                title={t(`${p}.period.nextMonth`)}
                className={CLASE_FLECHA}
              >
                <ChevronRight className="icon-md" />
              </button>
            </div>
          )}

          {modo === "rango" && (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="cal-periodo-desde" className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t(`${p}.period.from`)}
                </label>
                <input
                  id="cal-periodo-desde"
                  type="date"
                  value={desdeLibre}
                  max={hastaLibre || hoy}
                  aria-invalid={rangoInvalido}
                  onChange={(e) => {
                    setDesdeLibre(e.target.value);
                    alCambiarPeriodo();
                  }}
                  className={`${CLASE_CONTROL_FILTRO} mt-1 block cursor-pointer`}
                />
                <FechaEnPalabras valor={desdeLibre} />
              </div>
              <div>
                <label htmlFor="cal-periodo-hasta" className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t(`${p}.period.to`)}
                </label>
                <input
                  id="cal-periodo-hasta"
                  type="date"
                  value={hastaLibre}
                  min={desdeLibre || undefined}
                  max={hoy}
                  aria-invalid={rangoInvalido}
                  onChange={(e) => {
                    setHastaLibre(e.target.value);
                    alCambiarPeriodo();
                  }}
                  className={`${CLASE_CONTROL_FILTRO} mt-1 block cursor-pointer`}
                />
                <FechaEnPalabras valor={hastaLibre} />
              </div>
              {rangoInvalido && (
                <p role="alert" className="text-xs font-semibold text-red-700 dark:text-red-300">
                  {t(`${p}.period.rangeInvalid`)}
                </p>
              )}
            </div>
          )}
        </div>

        {avisoUltimaSemana && modo === "semana" && !enCurso && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent-300 bg-accent-50 px-4 py-3 dark:border-accent-300/40 dark:bg-accent-300/10">
            <CalendarSearch className="icon-md shrink-0 text-accent-700 dark:text-accent-400" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-xs text-accent-900 dark:text-accent-200">{t(`${p}.week.lastWeekNotice`, { rango: rangoSemanaUTC(semana) })}</p>
            <Button variant="secondary" size="sm" type="button" onClick={verEstaSemana}>
              {t(`${p}.week.viewThisWeek`)}
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="relative w-full sm:w-56">
            <Search className="icon-sm absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
            <input
              value={busquedaInput}
              onChange={(e) => setBusquedaInput(e.target.value)}
              placeholder={t(`${p}.week.searchPlaceholder`)}
              aria-label={t(`${p}.week.searchPlaceholder`)}
              className={`${CLASE_CONTROL_FILTRO} w-full pl-8`}
            />
          </div>
          <div className="w-full sm:w-auto">
            <label htmlFor="cal-filtro-localidad" className="block text-xs font-medium text-gray-500 dark:text-gray-400">
              {t(`${p}.week.filters.localidad`)}
            </label>
            <select
              id="cal-filtro-localidad"
              value={localidadId}
              onChange={(e) => cambiarLocalidad(e.target.value)}
              className={`${CLASE_CONTROL_FILTRO} mt-1 block w-full cursor-pointer sm:w-48`}
            >
              <option value="">{t(`${p}.week.filters.allLocalidades`)}</option>
              {localidades.map((l) => (
                <option key={l.id_localidad} value={l.id_localidad}>
                  {l.nombre_localidad}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-56">
            <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400">{t(`${p}.week.filters.conjunto`)}</span>
            <div className="mt-1 [&_input]:!mt-0 [&_input]:!py-1.5 [&_input]:!text-xs [&_input]:touch-target-h">
              <ConjuntoCombobox
                key={localidadId}
                value={conjunto}
                onChange={(valor) => {
                  setConjunto(valor);
                  paginacion.reiniciar();
                }}
                fetchOptions={buscarConjuntos}
                placeholder={t(`${p}.week.filters.conjuntoPlaceholder`)}
                ariaLabel={t(`${p}.week.filters.conjunto`)}
              />
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <label htmlFor="cal-orden" className="block text-xs font-medium text-gray-500 dark:text-gray-400">
              {t(`${p}.week.sort.label`)}
            </label>
            <select
              id="cal-orden"
              value={orden}
              onChange={(e) => {
                setOrden(e.target.value as OrdenCalificaciones);
                paginacion.reiniciar();
              }}
              className={`${CLASE_CONTROL_FILTRO} mt-1 block w-full cursor-pointer sm:w-48`}
            >
              {ORDENES.map((o) => (
                <option key={o} value={o}>
                  {t(`${p}.week.sort.${o}`)}
                </option>
              ))}
            </select>
          </div>
          {hayFiltros && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="touch-target-h flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-night-inset/60"
            >
              <FilterX className="icon-sm" />
              {t(`${p}.week.filters.clear`)}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {(["", "DEFICIENTE", "REGULAR", "BUENA"] as const).map((n) => (
            <button
              key={n || "todas"}
              type="button"
              onClick={() => cambiarNivel(n)}
              aria-pressed={nivel === n}
              className={`touch-target-h cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                nivel === n
                  ? "border-accent-600 bg-accent-50 text-accent-700 dark:bg-accent-300/10 dark:text-accent-400"
                  : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-night-line dark:bg-night-panel dark:text-gray-400"
              }`}
            >
              {n === "" ? t(`${p}.week.all`, { count: sumaConteos }) : `${t(`dashboards.reciclador.auditoria.niveles.${n.toLowerCase()}`)} ${conteos[n]}`}
            </button>
          ))}
        </div>
      </div>

      {/* ¿Qué? Issue #615: al cambiar un filtro, el periodo o la página, las filas anteriores se quedan atenuadas con
                una barra de progreso en vez de ser reemplazadas por un "Cargando…". */}
      <ContenidoRecargable cargando={cargando} mensaje={t("common.loading")}>
        {error ? (
          <div className="border-t border-gray-100 px-5 py-6 dark:border-night-line">
            <Alert type="error" message={t("common.loadError")} />
          </div>
        ) : items.length === 0 ? (
          // ¿Qué? Sin resultados, el mensaje va FUERA de la tabla: la tabla mide mínimo 820 px y, en celular, el
          //       texto centrado dentro de ella quedaba cortado.
          <div className="border-t border-gray-100 px-5 py-6 dark:border-night-line">
            <EmptyState icon={Search} message={sinFiltrosNiRango ? t(`${p}.week.emptyPeriod`) : t(`${p}.week.empty`)} />
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-gray-100 dark:border-night-line">
            <table className="w-full min-w-[51.25rem] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 dark:border-night-line dark:bg-night-inset/60">
                  {(["conjunto", "tema", "nivel", "observaciones", "fecha", "avisados"] as const).map((h) => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t(`${p}.week.headers.${h}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-night-line">
                {items.map((a) => {
                  const meta = NIVELES_DESEMPENO[a.nivel_desempeno];
                  return (
                    <tr
                      key={a.id_auditoria}
                      onClick={() => onAbrir(a)}
                      className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-night-inset/40"
                    >
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          className="focus-ring cursor-pointer rounded text-left font-semibold text-gray-900 underline decoration-gray-500 underline-offset-4 hover:text-accent-700 hover:decoration-accent-600 dark:text-white dark:decoration-gray-400"
                        >
                          {a.nombre_conjunto}
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{a.nombre_reciclador}</p>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300">{a.tema_educativo}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.claseBadge}`}>
                          <meta.icon className="icon-sm" />
                          {t(`dashboards.reciclador.auditoria.niveles.${a.nivel_desempeno.toLowerCase()}`)}
                        </span>
                      </td>
                      <td className="max-w-[13.75rem] px-5 py-3 text-xs text-gray-600 dark:text-gray-300">
                        {a.descripcion ? (
                          <span className="line-clamp-2">{a.descripcion}</span>
                        ) : (
                          <span className="italic text-gray-500 dark:text-gray-400">{t(`${p}.week.noObservations`)}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-gray-500 dark:text-gray-400">{formatearFechaCreacion(a.created_at)}</td>
                      <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300">
                        {a.avisados > 0 ? (
                          t(`${p}.week.notified`, { count: a.avisados })
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">{t(`${p}.week.noRecommendation`)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!error && total > 0 && (
          <Paginacion
            desde={paginacion.desde}
            hasta={paginacion.hasta}
            total={total}
            pagina={paginacion.pagina}
            totalPaginas={paginacion.totalPaginas}
            puedeAnterior={paginacion.puedeAnterior}
            puedeSiguiente={paginacion.puedeSiguiente}
            onAnterior={paginacion.irAAnterior}
            onSiguiente={paginacion.irASiguiente}
          />
        )}
      </ContenidoRecargable>
    </div>
  );
}
