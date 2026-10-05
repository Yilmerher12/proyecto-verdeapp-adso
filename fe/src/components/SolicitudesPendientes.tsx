import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BadgeCheck, ClipboardList, ImageIcon, OctagonX } from "lucide-react";
import { enlaceAdjuntoSeguro } from "@/lib/enlaceSeguro";
import { LoadingState } from "@/components/ui/LoadingState";
import { Alert } from "@/components/ui/Alert";
import { ContadorCaracteres } from "@/components/ui/ContadorCaracteres";
import { DESVINCULACION_MOTIVO_MAX_LENGTH } from "@/lib/validacion";
import {
  listarSolicitudesUnificadas,
  resolverSolicitudUnificada,
  type SolicitudUnificada,
  type TipoSolicitudUnificada,
} from "@/lib/adminConjuntoApi";
import { formatearFechaCreacion } from "@/lib/dateFormat";

interface SolicitudesPendientesProps {
  /** ¿Para qué? El resumen de "Solicitudes pendientes" arriba del todo en
   *  AdminDashboard necesita el número ANTES de que el usuario despliegue
   *  esta lista — se avisa cada vez que cambia, en vez de duplicar la
   *  petición al backend solo para contar. */
  onCountChange?: (count: number) => void;
  mostrarEncabezado?: boolean;
  dentroDeModal?: boolean;
}

const FILTROS: { id: TipoSolicitudUnificada | "TODAS"; labelKey: string }[] = [
  { id: "TODAS", labelKey: "solicitudesPendientes.filtros.todas" },
  { id: "DESVINCULACION", labelKey: "solicitudesPendientes.filtros.desvinculacion" },
  { id: "NOVEDAD", labelKey: "solicitudesPendientes.filtros.novedad" },
];

const CLASE_TIPO: Record<string, string> = {
  DESVINCULACION: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  NOVEDAD: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
};

/**
 * ¿Qué? Bandeja unificada "Solicitudes pendientes" del Administrador del
 *       Sistema — junta en una sola lista las solicitudes de desvinculación
 *       (RQF-016, solicitudes_desvinculacion, sin tocar su tabla ni su
 *       flujo) con las novedades que envían Residentes, Recicladores y Admins de
 *       Conjunto (se marcan como vistas), con chips para filtrar por tipo.
 * ¿Para qué? Reemplaza a SolicitudesDesvinculacion.tsx en AdminDashboard —
 *           mismas props (onCountChange/mostrarEncabezado/dentroDeModal)
 *           para que el resto del panel no tenga que cambiar.
 * ¿Impacto? Por dentro siguen siendo 2 tablas distintas (ver
 *           solicitud_residente_service.listar_unificadas) — el Admin
 *           Sistema solo ve una lista, sin saberlo.
 */
export function SolicitudesPendientes({
  onCountChange,
  mostrarEncabezado = true,
  dentroDeModal = false,
}: SolicitudesPendientesProps = {}) {
  const { t } = useTranslation();
  const [solicitudes, setSolicitudes] = useState<SolicitudUnificada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<TipoSolicitudUnificada | "TODAS">("TODAS");
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [error, setError] = useState<string | null>(null);

  // ¿Qué? Se pide SIEMPRE la lista completa (sin `tipo`) — los chips
  //       filtran en el navegador, así no hay que pedir de nuevo al
  //       backend cada vez que se cambia de chip, y el conteo total
  //       (onCountChange) no depende de qué chip esté activo.
  const cargar = useCallback(() => {
    setCargando(true);
    listarSolicitudesUnificadas()
      .then((data) => {
        setSolicitudes(data);
        onCountChange?.(data.length);
      })
      .catch((err) => console.error("Error cargando solicitudes pendientes", err))
      .finally(() => setCargando(false));
  }, [onCountChange]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const aprobar = async (s: SolicitudUnificada) => {
    setProcesandoId(s.id);
    setError(null);
    try {
      await resolverSolicitudUnificada(s.tipo, s.id, true, undefined);
      cargar();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || t("solicitudesPendientes.errorDefault"));
    } finally {
      setProcesandoId(null);
    }
  };

  const confirmarRechazo = async (s: SolicitudUnificada) => {
    if (!motivoRechazo.trim()) return;
    setProcesandoId(s.id);
    setError(null);
    try {
      await resolverSolicitudUnificada(s.tipo, s.id, false, motivoRechazo.trim());
      setRechazandoId(null);
      setMotivoRechazo("");
      cargar();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || t("solicitudesPendientes.errorDefault"));
    } finally {
      setProcesandoId(null);
    }
  };

  const visibles = filtro === "TODAS" ? solicitudes : solicitudes.filter((s) => s.tipo === filtro);
  const conteos: Record<string, number> = { TODAS: solicitudes.length };
  for (const s of solicitudes) conteos[s.tipo] = (conteos[s.tipo] ?? 0) + 1;

  return (
    <div
      className={
        dentroDeModal
          ? ""
          : "bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line p-5 shadow-sm"
      }
    >
      {mostrarEncabezado && (
        <div className="mb-4 flex items-center gap-2">
          <ClipboardList className="icon-md text-accent-600" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t("solicitudesPendientes.sectionTitle")}</h3>
          {solicitudes.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {solicitudes.length}
            </span>
          )}
        </div>
      )}

      {!cargando && solicitudes.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {FILTROS.map(({ id, labelKey }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltro(id)}
              aria-pressed={filtro === id}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                filtro === id
                  ? "bg-accent-700 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-night-line dark:bg-night-panel dark:text-gray-300 dark:hover:bg-night-field"
              }`}
            >
              {t(labelKey)} · {conteos[id] ?? 0}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-3">
          <Alert type="error" message={error} onClose={() => setError(null)} />
        </div>
      )}

      {cargando ? (
        <LoadingState message={t("common.loading")} />
      ) : solicitudes.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("solicitudesPendientes.empty")}</p>
      ) : visibles.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("solicitudesPendientes.emptyFiltro")}</p>
      ) : (
        <div className="space-y-3">
          {visibles.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-800/30 dark:bg-amber-900/10"
            >
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${CLASE_TIPO[s.tipo]}`}>
                  {t(`solicitudesPendientes.filtros.${s.tipo === "DESVINCULACION" ? "desvinculacion" : "novedad"}`)}
                </span>
                <span className="text-xs text-gray-400">{formatearFechaCreacion(s.created_at)}</span>
              </div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{s.titulo}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {s.nombre_conjunto ? `${s.origen} — ${s.nombre_conjunto}` : s.origen}
              </p>
              {s.detalle && <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{s.detalle}</p>}
              {enlaceAdjuntoSeguro(s.url_evidencia) && (
                <a
                  href={enlaceAdjuntoSeguro(s.url_evidencia) ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent-700 hover:text-accent-800 dark:text-accent-400"
                >
                  <ImageIcon className="icon-sm" />
                  {t("solicitudesPendientes.verFoto")}
                </a>
              )}

              {rechazandoId === s.id ? (
                <div className="mt-3 space-y-2">
                  <label htmlFor={`motivo-rechazo-${s.id}`} className="text-xs font-bold text-gray-600 dark:text-gray-400">
                    {t("desvinculacion.adminSistema.rejectModal.motivoLabel")}
                  </label>
                  <textarea
                    id={`motivo-rechazo-${s.id}`}
                    value={motivoRechazo}
                    onChange={(e) => setMotivoRechazo(e.target.value)}
                    maxLength={DESVINCULACION_MOTIVO_MAX_LENGTH}
                    aria-describedby={`motivo-rechazo-contador-${s.id}`}
                    placeholder={t("desvinculacion.adminSistema.rejectModal.motivoPlaceholder")}
                    rows={2}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 transition-colors focus:ring-2 focus:ring-accent-500 outline-none dark:border-night-line dark:bg-night-field dark:text-white"
                  />
                  <ContadorCaracteres
                    id={`motivo-rechazo-contador-${s.id}`}
                    actual={motivoRechazo.length}
                    max={DESVINCULACION_MOTIVO_MAX_LENGTH}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmarRechazo(s)}
                      disabled={procesandoId === s.id || !motivoRechazo.trim()}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <OctagonX className="icon-sm icon-shake" />
                      {t("desvinculacion.adminSistema.rejectModal.confirm")}
                    </button>
                    <button
                      onClick={() => {
                        setRechazandoId(null);
                        setMotivoRechazo("");
                      }}
                      className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-night-line dark:bg-transparent dark:text-gray-300 dark:hover:bg-night-hover"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              ) : s.tipo === "NOVEDAD" ? (
                <div className="mt-3">
                  <button
                    onClick={() => aprobar(s)}
                    disabled={procesandoId === s.id}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-night-line dark:bg-transparent dark:text-gray-300 dark:hover:bg-night-hover"
                  >
                    <BadgeCheck className="icon-sm" />
                    {t("solicitudesPendientes.marcarVista")}
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => aprobar(s)}
                    disabled={procesandoId === s.id}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <BadgeCheck className="icon-sm icon-hop" />
                    {t("desvinculacion.adminSistema.approve")}
                  </button>
                  <button
                    onClick={() => setRechazandoId(s.id)}
                    disabled={procesandoId === s.id}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800/40 dark:bg-transparent dark:hover:bg-red-900/10"
                  >
                    <OctagonX className="icon-sm icon-shake" />
                    {t("desvinculacion.adminSistema.reject")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
