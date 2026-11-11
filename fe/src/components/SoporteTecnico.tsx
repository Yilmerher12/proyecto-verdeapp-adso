import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BadgeCheck, Eye, Flag, Headset, ImageIcon, RotateCcw, Send } from "lucide-react";
import { enlaceAdjuntoSeguro } from "@/lib/enlaceSeguro";
import { ContenidoRecargable } from "@/components/ui/ContenidoRecargable";
import { MenuAcciones, type OpcionMenu } from "@/components/ui/MenuAcciones";
import { Pestanas } from "@/components/ui/Pestanas";
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
import { notificarSolicitudesActualizadas } from "@/lib/solicitudesEvents";
import { formatearFechaCreacion } from "@/lib/dateFormat";
import { Button } from "@/components/ui/Button";

type FiltroEstado = "PENDIENTES" | EstadoSoporte;
type FiltroPrioridad = "TODAS" | PrioridadSoporte;

const FILTROS_ESTADO: { id: FiltroEstado; labelKey: string }[] = [
  { id: "PENDIENTES", labelKey: "soporteAdmin.filtroEstado.pendientes" },
  { id: "NUEVA", labelKey: "soporteAdmin.filtroEstado.nueva" },
  { id: "EN_REVISION", labelKey: "soporteAdmin.filtroEstado.enRevision" },
  { id: "RESUELTA", labelKey: "soporteAdmin.filtroEstado.resuelta" },
];

const FILTROS_PRIORIDAD: FiltroPrioridad[] = ["TODAS", "ALTA", "MEDIA", "BAJA"];
const PRIORIDADES: PrioridadSoporte[] = ["ALTA", "MEDIA", "BAJA"];

// ¿Qué? Issue #372 (CN-042) — filas por página. Antes eran 5 porque la lista vivía dentro de un modal;
//       ahora tiene una página propia (issue #596).
const TAMANO_PAGINA = 10;

const CLASE_PRIORIDAD: Record<PrioridadSoporte, string> = {
  ALTA: "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300",
  MEDIA: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200",
  BAJA: "bg-gray-100 text-gray-600 dark:bg-night-field dark:text-gray-300",
};

// ¿Qué? Barra de color a la izquierda de cada solicitud: se ve la prioridad de lejos.
// ¿Para qué? La prioridad no se comunica solo con el color: además va la etiqueta con ícono y texto.
const BARRA_PRIORIDAD: Record<PrioridadSoporte, string> = {
  ALTA: "bg-red-500 dark:bg-red-400",
  MEDIA: "bg-amber-500 dark:bg-amber-400",
  BAJA: "bg-gray-300 dark:bg-gray-500",
};

const CLASE_ESTADO: Record<EstadoSoporte, string> = {
  NUEVA: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200",
  EN_REVISION: "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300",
  RESUELTA: "bg-accent-50 text-accent-700 dark:bg-accent-300/10 dark:text-accent-300",
};

const CLASE_BOTON_SECUNDARIO =
  "flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-night-line dark:bg-transparent dark:text-gray-300 dark:hover:bg-night-hover";

type Conteos = Record<FiltroEstado, number>;

/**
 * ¿Qué? Pestaña "Soporte técnico" de la página de Solicitudes del Administrador del Sistema: las
 *       consultas que Residentes, Recicladores y Admins de Conjunto le envían, con su prioridad y su
 *       estado, filtrables, y con respuesta al autor.
 * ¿Para qué? Issue #596: antes vivía en un modal con 8 botones de filtro y, en cada consulta, 3 botones,
 *           una lista nativa de prioridad y la prioridad repetida. Ahora: una fila por consulta con barra
 *           de color y etiqueta de prioridad, "Responder" a la vista y el resto de acciones (estado y
 *           prioridad) en un menú de tres puntos; 4 pestañas de estado con contador y un menú "Prioridad".
 * ¿Impacto? La prioridad llega calculada por el motivo que eligió el autor; aquí solo se corrige. Por
 *          defecto se ve lo pendiente; "Resueltas" muestra el historial. Al atender una consulta se avisa
 *          (solicitudesEvents) para que el contador del menú y la franja del panel se actualicen ya.
 */
export function SoporteTecnico() {
  const { t } = useTranslation();
  const [items, setItems] = useState<SoporteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("PENDIENTES");
  const [filtroPrioridad, setFiltroPrioridad] = useState<FiltroPrioridad>("TODAS");
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  // ¿Qué? La consulta cuyo texto completo se ve (una a la vez). Pulsar su encabezado la abre o la cierra.
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const [respondiendoId, setRespondiendoId] = useState<string | null>(null);
  const [textoRespuesta, setTextoRespuesta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [conteos, setConteos] = useState<Conteos | null>(null);
  // ¿Qué? Cambia cada vez que una acción puede haber movido consultas de una pestaña a otra.
  const [versionConteos, setVersionConteos] = useState(0);

  const paginacion = usePaginacion(TAMANO_PAGINA, total);
  const { offset, irAAnterior } = paginacion;

  const cargar = useCallback(() => {
    setCargando(true);
    const estado = filtroEstado === "PENDIENTES" ? undefined : filtroEstado;
    const prioridad = filtroPrioridad === "TODAS" ? undefined : filtroPrioridad;
    listarSoporte(TAMANO_PAGINA, offset, estado, prioridad)
      .then((pagina) => {
        // ¿Qué? Si se atendió la última fila de la última página, esa página quedó
        //       vacía — se vuelve a la anterior en vez de mostrarla así.
        if (pagina.items.length === 0 && offset > 0) {
          irAAnterior();
          return;
        }
        setItems(pagina.items);
        setTotal(pagina.total);
      })
      .catch((err) => console.error("Error cargando soporte técnico", err))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- irAAnterior es un setState envuelto, cambia de identidad en cada render
  }, [filtroEstado, filtroPrioridad, offset]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // ¿Qué? El número de cada pestaña: se pide solo 1 fila de cada estado para leer su total.
  useEffect(() => {
    Promise.all(FILTROS_ESTADO.map(({ id }) => listarSoporte(1, 0, id === "PENDIENTES" ? undefined : id)))
      .then((paginas) => {
        const nuevos = {} as Conteos;
        FILTROS_ESTADO.forEach(({ id }, i) => {
          nuevos[id] = paginas[i].total;
        });
        setConteos(nuevos);
      })
      .catch(() => {});
  }, [versionConteos]);

  const cambiarFiltroEstado = (id: FiltroEstado) => {
    setFiltroEstado(id);
    setAbiertaId(null);
    paginacion.reiniciar();
  };

  const cambiarFiltroPrioridad = (id: FiltroPrioridad) => {
    setFiltroPrioridad(id);
    setAbiertaId(null);
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
      setVersionConteos((v) => v + 1);
      notificarSolicitudesActualizadas();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || t("soporteAdmin.errorDefault"));
    } finally {
      setProcesandoId(null);
    }
  };

  const abrirRespuesta = (s: SoporteItem) => {
    setAbiertaId(s.id);
    setRespondiendoId(s.id);
    setTextoRespuesta(s.respuesta ?? "");
  };

  // ¿Qué? Las acciones de una consulta en su menú de tres puntos: primero las de estado, y aparte la
  //       prioridad (se elige una, la actual lleva marca).
  const opcionesDe = (s: SoporteItem): OpcionMenu[][] => {
    const estado: OpcionMenu[] = [];
    if (s.estado === "NUEVA") {
      estado.push({
        id: "revision",
        label: t("soporteAdmin.marcarEnRevision"),
        icon: Eye,
        onSelect: () => actualizar(s, { estado: "EN_REVISION" }),
      });
    }
    estado.push(
      s.estado === "RESUELTA"
        ? { id: "reabrir", label: t("soporteAdmin.reabrir"), icon: RotateCcw, onSelect: () => actualizar(s, { estado: "EN_REVISION" }) }
        : { id: "resolver", label: t("soporteAdmin.marcarResuelta"), icon: BadgeCheck, onSelect: () => actualizar(s, { estado: "RESUELTA" }) },
    );
    const prioridad: OpcionMenu[] = PRIORIDADES.map((p) => ({
      id: `prioridad-${p}`,
      label: t("soporteAdmin.prioridadOpcion", { prioridad: t(`soporteAdmin.prioridad.${p}`) }),
      marcada: s.prioridad === p,
      onSelect: () => (s.prioridad === p ? undefined : actualizar(s, { prioridad: p })),
    }));
    return [estado, prioridad];
  };

  const etiquetaPrioridadFiltro = t("soporteAdmin.prioridadFiltro", {
    valor: filtroPrioridad === "TODAS" ? t("soporteAdmin.filtroPrioridad.todas") : t(`soporteAdmin.prioridad.${filtroPrioridad}`),
  });

  return (
    <div>
      <div className="mb-3 space-y-3">
        <Pestanas
          ariaLabel={t("soporteAdmin.estadoLabel")}
          activa={filtroEstado}
          onCambiar={cambiarFiltroEstado}
          compacta
          pestanas={FILTROS_ESTADO.map(({ id, labelKey }) => ({
            id,
            etiqueta: (
              <>
                {t(labelKey)}
                {conteos && conteos[id] > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[0.6875rem] font-bold text-amber-800 dark:bg-amber-400/15 dark:text-amber-200">
                    {conteos[id]}
                  </span>
                )}
              </>
            ),
          }))}
        />
        <MenuAcciones
          ariaLabel={t("soporteAdmin.prioridadLabel")}
          etiqueta={
            <>
              <Flag className="icon-sm" aria-hidden="true" />
              {etiquetaPrioridadFiltro}
            </>
          }
          grupos={[
            FILTROS_PRIORIDAD.map((p) => ({
              id: `filtro-${p}`,
              label: p === "TODAS" ? t("soporteAdmin.filtroPrioridad.todas") : t(`soporteAdmin.prioridad.${p}`),
              marcada: filtroPrioridad === p,
              onSelect: () => cambiarFiltroPrioridad(p),
            })),
          ]}
        />
      </div>

      {error && (
        <div className="mb-3">
          <Alert type="error" message={error} onClose={() => setError(null)} />
        </div>
      )}

      {/* ¿Qué? Issue #615: al cambiar un filtro o de página las solicitudes anteriores se quedan
                atenuadas con una barra de progreso, en vez de ser reemplazadas por un "Cargando…". */}
      <ContenidoRecargable cargando={cargando} mensaje={t("common.loading")}>
        {items.length === 0 ? (
          <EmptyState
            icon={Headset}
            message={
              filtroEstado === "PENDIENTES" && filtroPrioridad === "TODAS" ? t("soporteAdmin.empty") : t("soporteAdmin.emptyFiltro")
            }
          />
        ) : (
          <div className="space-y-3">
            {items.map((s) => {
              const abierta = abiertaId === s.id;
              const nombre = s.nombre_autor ? `${s.origen} — ${s.nombre_autor}` : s.origen;
              return (
                <article
                  key={s.id}
                  className="flex overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-night-line dark:bg-night-card"
                >
                  <span aria-hidden="true" className={`w-1 shrink-0 ${BARRA_PRIORIDAD[s.prioridad]}`} />
                  <div className="min-w-0 flex-1 p-3.5">
                    <button
                      type="button"
                      onClick={() => setAbiertaId(abierta ? null : s.id)}
                      aria-expanded={abierta}
                      className="focus-ring block w-full cursor-pointer rounded text-left"
                    >
                      <span className="flex items-baseline gap-2">
                        <span className="min-w-0 truncate text-sm font-semibold text-gray-900 dark:text-white">{nombre}</span>
                        <span className="ml-auto shrink-0 text-xs text-gray-500 dark:text-gray-400">{formatearFechaCreacion(s.created_at)}</span>
                      </span>
                      {s.nombre_conjunto && (
                        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{s.nombre_conjunto}</span>
                      )}
                      <span
                        className={`mt-1 block text-xs text-gray-600 dark:text-gray-300 ${abierta ? "whitespace-pre-line" : "truncate"}`}
                      >
                        {s.texto}
                      </span>
                    </button>

                    {abierta && enlaceAdjuntoSeguro(s.url_imagen) && (
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

                    {abierta && s.respuesta && respondiendoId !== s.id && (
                      <div className="mt-3 rounded-lg bg-gray-50 p-3 dark:bg-night-field">
                        <p className="text-xs font-bold text-gray-600 dark:text-gray-400">
                          {t("soporteAdmin.respuestaEnviada", { fecha: formatearFechaCreacion(s.respondida_at ?? s.created_at) })}
                        </p>
                        <p className="mt-1 whitespace-pre-line text-xs text-gray-700 dark:text-gray-200">{s.respuesta}</p>
                      </div>
                    )}

                    {respondiendoId === s.id && (
                      <div className="mt-3 space-y-2">
                        <label htmlFor={`respuesta-${s.id}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">
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
                          className="w-full rounded-lg border border-edge bg-white p-2.5 text-sm text-gray-900 outline-none transition-colors focus:ring-2 focus:ring-accent-500 dark:border-night-edge dark:bg-night-field dark:text-white"
                        />
                        <ContadorCaracteres
                          id={`respuesta-contador-${s.id}`}
                          actual={textoRespuesta.length}
                          max={SOPORTE_RESPUESTA_MAX_LENGTH}
                        />
                        <div className="flex gap-2">
                          <Button variant="primary" size="sm" type="button" onClick={() => actualizar(s, { respuesta: textoRespuesta.trim() })} disabled={procesandoId === s.id || !textoRespuesta.trim()}>
                            <Send className="icon-sm" />
                            {t("soporteAdmin.enviarRespuesta")}
                          </Button>
                          <button
                            type="button"
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
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide ${CLASE_PRIORIDAD[s.prioridad]}`}
                      >
                        <Flag className="icon-sm" aria-hidden="true" />
                        {t(`soporteAdmin.prioridad.${s.prioridad}`)}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide ${CLASE_ESTADO[s.estado]}`}>
                        {t(`soporteAdmin.estado.${s.estado}`)}
                      </span>
                      <div className="ml-auto flex items-center gap-1.5">
                        {respondiendoId !== s.id && (
                          <button
                            type="button"
                            onClick={() => abrirRespuesta(s)}
                            disabled={procesandoId === s.id}
                            className={CLASE_BOTON_SECUNDARIO}
                          >
                            {s.respuesta ? t("soporteAdmin.cambiarRespuesta") : t("soporteAdmin.responder")}
                          </button>
                        )}
                        <MenuAcciones ariaLabel={t("soporteAdmin.masAcciones", { nombre })} grupos={opcionesDe(s)} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {total > 0 && (
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
      </ContenidoRecargable>
    </div>
  );
}
