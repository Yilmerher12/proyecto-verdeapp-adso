import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BadgeCheck, Headset, ImageIcon, Send } from "lucide-react";
import { enlaceAdjuntoSeguro } from "@/lib/enlaceSeguro";
import { LoadingState } from "@/components/ui/LoadingState";
import { Paginacion } from "@/components/ui/Paginacion";
import { usePaginacion } from "@/hooks/usePaginacion";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContadorCaracteres } from "@/components/ui/ContadorCaracteres";
import { SOPORTE_RESPUESTA_MAX_LENGTH } from "@/lib/validacion";
import {
  actualizarSoporte,
  listarSoporte,
  type EstadoSoporte,
  type PrioridadSoporte,
  type SoporteItem,
} from "@/lib/novedadesEnviadasApi";
import { formatearFechaCreacion } from "@/lib/dateFormat";

interface SoporteTecnicoProps {
  /** ¿Para qué? El resumen de arriba del panel necesita el número de pendientes
   *  ANTES de que el usuario abra la bandeja — se avisa cada vez que cambia,
   *  sin importar los filtros activos. */
  onCountChange?: (count: number) => void;
}

type FiltroEstado = "PENDIENTES" | EstadoSoporte;
type FiltroPrioridad = "TODAS" | PrioridadSoporte;

const FILTROS_ESTADO: { id: FiltroEstado; labelKey: string }[] = [
  { id: "PENDIENTES", labelKey: "soporteAdmin.filtroEstado.pendientes" },
  { id: "NUEVA", labelKey: "soporteAdmin.filtroEstado.nueva" },
  { id: "EN_REVISION", labelKey: "soporteAdmin.filtroEstado.enRevision" },
  { id: "RESUELTA", labelKey: "soporteAdmin.filtroEstado.resuelta" },
];

const FILTROS_PRIORIDAD: { id: FiltroPrioridad; labelKey: string }[] = [
  { id: "TODAS", labelKey: "soporteAdmin.filtroPrioridad.todas" },
  { id: "ALTA", labelKey: "soporteAdmin.prioridad.ALTA" },
  { id: "MEDIA", labelKey: "soporteAdmin.prioridad.MEDIA" },
  { id: "BAJA", labelKey: "soporteAdmin.prioridad.BAJA" },
];

const PRIORIDADES: PrioridadSoporte[] = ["ALTA", "MEDIA", "BAJA"];

// ¿Qué? Issue #372 (CN-042) — filas por página; va dentro de un modal, así que pocas.
const TAMANO_PAGINA = 5;

const CLASE_PRIORIDAD: Record<PrioridadSoporte, string> = {
  ALTA: "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300",
  MEDIA: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200",
  BAJA: "bg-gray-100 text-gray-600 dark:bg-night-field dark:text-gray-300",
};

const CLASE_ESTADO: Record<EstadoSoporte, string> = {
  NUEVA: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200",
  EN_REVISION: "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300",
  RESUELTA: "bg-accent-50 text-accent-700 dark:bg-accent-300/10 dark:text-accent-300",
};

const CLASE_CHIP_ACTIVO = "bg-accent-700 text-white dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200";
const CLASE_CHIP_INACTIVO =
  "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-night-line dark:bg-night-panel dark:text-gray-300 dark:hover:bg-night-field";
const CLASE_BOTON_SECUNDARIO =
  "flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-night-line dark:bg-transparent dark:text-gray-300 dark:hover:bg-night-hover";

/**
 * ¿Qué? Pestaña "Soporte técnico" del Administrador del Sistema: las consultas que
 *       Residentes, Recicladores y Admins de Conjunto le envían, con su prioridad
 *       y su estado, filtrables, y con respuesta al autor.
 * ¿Para qué? Issue #512: antes todas se veían iguales y solo se podían "marcar como
 *           vistas"; no había forma de saber cuál atender primero ni de contestar.
 * ¿Impacto? La prioridad llega calculada por el motivo que eligió el autor; aquí solo
 *          se corrige. Por defecto se ve lo pendiente; "Resueltas" muestra el historial.
 */
export function SoporteTecnico({ onCountChange }: SoporteTecnicoProps = {}) {
  const { t } = useTranslation();
  const [items, setItems] = useState<SoporteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("PENDIENTES");
  const [filtroPrioridad, setFiltroPrioridad] = useState<FiltroPrioridad>("TODAS");
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [respondiendoId, setRespondiendoId] = useState<string | null>(null);
  const [textoRespuesta, setTextoRespuesta] = useState("");
  const [error, setError] = useState<string | null>(null);

  const paginacion = usePaginacion(TAMANO_PAGINA, total);
  const { offset, irAAnterior } = paginacion;

  const cargar = useCallback(() => {
    setCargando(true);
    const estado = filtroEstado === "PENDIENTES" ? undefined : filtroEstado;
    const prioridad = filtroPrioridad === "TODAS" ? undefined : filtroPrioridad;
    // ¿Qué? Con algún filtro activo se pide además el total sin filtro (limit=1), para que
    //       el conteo de onCountChange no dependa de los chips.
    Promise.all([
      listarSoporte(TAMANO_PAGINA, offset, estado, prioridad),
      estado || prioridad ? listarSoporte(1, 0) : null,
    ])
      .then(([pagina, sinFiltro]) => {
        // ¿Qué? Si se atendió la última fila de la última página, esa página quedó
        //       vacía — se vuelve a la anterior en vez de mostrarla así.
        if (pagina.items.length === 0 && offset > 0) {
          irAAnterior();
          return;
        }
        setItems(pagina.items);
        setTotal(pagina.total);
        onCountChange?.((sinFiltro ?? pagina).total);
      })
      .catch((err) => console.error("Error cargando soporte técnico", err))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- irAAnterior es un setState envuelto, cambia de identidad en cada render
  }, [onCountChange, filtroEstado, filtroPrioridad, offset]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarFiltroEstado = (id: FiltroEstado) => {
    setFiltroEstado(id);
    paginacion.reiniciar();
  };

  const cambiarFiltroPrioridad = (id: FiltroPrioridad) => {
    setFiltroPrioridad(id);
    paginacion.reiniciar();
  };

  const actualizar = async (
    s: SoporteItem,
    cambios: { estado?: EstadoSoporte; prioridad?: PrioridadSoporte; respuesta?: string },
  ) => {
    setProcesandoId(s.id);
    setError(null);
    try {
      await actualizarSoporte(s.id, cambios);
      if (cambios.respuesta) {
        setRespondiendoId(null);
        setTextoRespuesta("");
      }
      cargar();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || t("soporteAdmin.errorDefault"));
    } finally {
      setProcesandoId(null);
    }
  };

  const abrirRespuesta = (s: SoporteItem) => {
    setRespondiendoId(s.id);
    setTextoRespuesta(s.respuesta ?? "");
  };

  return (
    <div>
      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-bold text-gray-600 dark:text-gray-400">{t("soporteAdmin.estadoLabel")}</span>
          {FILTROS_ESTADO.map(({ id, labelKey }) => (
            <button
              key={id}
              type="button"
              onClick={() => cambiarFiltroEstado(id)}
              aria-pressed={filtroEstado === id}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                filtroEstado === id ? CLASE_CHIP_ACTIVO : CLASE_CHIP_INACTIVO
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-bold text-gray-600 dark:text-gray-400">{t("soporteAdmin.prioridadLabel")}</span>
          {FILTROS_PRIORIDAD.map(({ id, labelKey }) => (
            <button
              key={id}
              type="button"
              onClick={() => cambiarFiltroPrioridad(id)}
              aria-pressed={filtroPrioridad === id}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                filtroPrioridad === id ? CLASE_CHIP_ACTIVO : CLASE_CHIP_INACTIVO
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-3">
          <Alert type="error" message={error} onClose={() => setError(null)} />
        </div>
      )}

      {cargando ? (
        <LoadingState message={t("common.loading")} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Headset}
          message={
            filtroEstado === "PENDIENTES" && filtroPrioridad === "TODAS" ? t("soporteAdmin.empty") : t("soporteAdmin.emptyFiltro")
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-gray-100 bg-white p-4 dark:border-night-line dark:bg-night-card"
            >
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide ${CLASE_PRIORIDAD[s.prioridad]}`}>
                  {t(`soporteAdmin.prioridad.${s.prioridad}`)}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide ${CLASE_ESTADO[s.estado]}`}>
                  {t(`soporteAdmin.estado.${s.estado}`)}
                </span>
                <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">{formatearFechaCreacion(s.created_at)}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {s.nombre_autor ? `${s.origen} — ${s.nombre_autor}` : s.origen}
              </p>
              {s.nombre_conjunto && <p className="text-xs text-gray-500 dark:text-gray-400">{s.nombre_conjunto}</p>}
              <p className="mt-1 whitespace-pre-line text-xs text-gray-600 dark:text-gray-300">{s.texto}</p>
              {enlaceAdjuntoSeguro(s.url_imagen) && (
                <a
                  href={enlaceAdjuntoSeguro(s.url_imagen) ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-text mt-2 inline-flex items-center gap-1 text-xs"
                >
                  <ImageIcon className="icon-sm" />
                  {t("soporteAdmin.verFoto")}
                </a>
              )}

              {s.respuesta && respondiendoId !== s.id && (
                <div className="mt-3 rounded-lg bg-gray-50 p-3 dark:bg-night-field">
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-400">
                    {t("soporteAdmin.respuestaEnviada", { fecha: formatearFechaCreacion(s.respondida_at ?? s.created_at) })}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-xs text-gray-700 dark:text-gray-200">{s.respuesta}</p>
                </div>
              )}

              {respondiendoId === s.id ? (
                <div className="mt-3 space-y-2">
                  <label htmlFor={`respuesta-${s.id}`} className="text-xs font-bold text-gray-600 dark:text-gray-400">
                    {t("soporteAdmin.respuestaLabel")}
                  </label>
                  <textarea
                    id={`respuesta-${s.id}`}
                    value={textoRespuesta}
                    onChange={(e) => setTextoRespuesta(e.target.value)}
                    maxLength={SOPORTE_RESPUESTA_MAX_LENGTH}
                    aria-describedby={`respuesta-contador-${s.id}`}
                    placeholder={t("soporteAdmin.respuestaPlaceholder")}
                    rows={3}
                    className="w-full rounded-xl border border-edge bg-white p-2.5 text-sm text-gray-900 outline-none transition-colors focus:ring-2 focus:ring-accent-500 dark:border-night-edge dark:bg-night-field dark:text-white"
                  />
                  <ContadorCaracteres
                    id={`respuesta-contador-${s.id}`}
                    actual={textoRespuesta.length}
                    max={SOPORTE_RESPUESTA_MAX_LENGTH}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => actualizar(s, { respuesta: textoRespuesta.trim() })}
                      disabled={procesandoId === s.id || !textoRespuesta.trim()}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200"
                    >
                      <Send className="icon-sm" />
                      {t("soporteAdmin.enviarRespuesta")}
                    </button>
                    <button
                      onClick={() => {
                        setRespondiendoId(null);
                        setTextoRespuesta("");
                      }}
                      className={CLASE_BOTON_SECUNDARIO}
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button onClick={() => abrirRespuesta(s)} disabled={procesandoId === s.id} className={CLASE_BOTON_SECUNDARIO}>
                    {s.respuesta ? t("soporteAdmin.cambiarRespuesta") : t("soporteAdmin.responder")}
                  </button>
                  {s.estado === "NUEVA" && (
                    <button
                      onClick={() => actualizar(s, { estado: "EN_REVISION" })}
                      disabled={procesandoId === s.id}
                      className={CLASE_BOTON_SECUNDARIO}
                    >
                      {t("soporteAdmin.marcarEnRevision")}
                    </button>
                  )}
                  {s.estado === "RESUELTA" ? (
                    <button
                      onClick={() => actualizar(s, { estado: "EN_REVISION" })}
                      disabled={procesandoId === s.id}
                      className={CLASE_BOTON_SECUNDARIO}
                    >
                      {t("soporteAdmin.reabrir")}
                    </button>
                  ) : (
                    <button
                      onClick={() => actualizar(s, { estado: "RESUELTA" })}
                      disabled={procesandoId === s.id}
                      className={CLASE_BOTON_SECUNDARIO}
                    >
                      <BadgeCheck className="icon-sm" />
                      {t("soporteAdmin.marcarResuelta")}
                    </button>
                  )}
                  <select
                    aria-label={t("soporteAdmin.cambiarPrioridad")}
                    value={s.prioridad}
                    onChange={(e) => actualizar(s, { prioridad: e.target.value as PrioridadSoporte })}
                    disabled={procesandoId === s.id}
                    className="ml-auto cursor-pointer rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold text-gray-600 outline-none focus:ring-2 focus:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-night-line dark:bg-night-field dark:text-gray-300"
                  >
                    {PRIORIDADES.map((p) => (
                      <option key={p} value={p}>
                        {t("soporteAdmin.prioridadOpcion", { prioridad: t(`soporteAdmin.prioridad.${p}`) })}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!cargando && total > TAMANO_PAGINA && (
        <div className="mt-3">
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
        </div>
      )}
    </div>
  );
}
