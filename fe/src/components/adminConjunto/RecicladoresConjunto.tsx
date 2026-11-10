import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserX } from "lucide-react";
import {
  obtenerInvitacionesDeConjunto,
  obtenerRecicladoresAutorizados,
  revocarReciclador,
  type InvitacionEnviada,
  type RecicladorAutorizado,
} from "@/lib/recicladorConjuntoApi";
import { Alert } from "@/components/ui/Alert";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { LoadingState } from "@/components/ui/LoadingState";
import { InvitarRecicladorModal } from "@/components/adminConjunto/InvitarRecicladorModal";

/**
 * ¿Qué? Badge de color según el estado de la invitación.
 * ¿Para qué? Distinguir visualmente PENDIENTE (ámbar) / ACEPTADA (verde) /
 *           RECHAZADA (rojo) sin tener que leer el texto con atención.
 */
function BadgeEstado({ estado }: { estado: string }) {
  const { t } = useTranslation();
  const estilos: Record<string, string> = {
    PENDIENTE: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200",
    ACEPTADA: "bg-accent-100 text-accent-700 dark:bg-accent-300/10 dark:text-accent-400",
    RECHAZADA: "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300",
  };
  const etiquetas: Record<string, string> = {
    PENDIENTE: t("dashboards.adminConjunto.estado.pendiente"),
    ACEPTADA: t("dashboards.adminConjunto.estado.aceptada"),
    RECHAZADA: t("dashboards.adminConjunto.estado.rechazada"),
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${estilos[estado] || "bg-gray-100 text-gray-600"}`}>
      {etiquetas[estado] || estado}
    </span>
  );
}

/**
 * ¿Qué? Pestaña "Recicladores" de UN conjunto: los recicladores ya autorizados, las invitaciones enviadas y el botón
 *       "+ Invitar reciclador".
 * ¿Para qué? Issue #595: antes vivía en un bloque con "Ver detalle / Ocultar detalle" y un formulario que se desplegaba
 *           aparte (dos botones que no se enteraban uno del otro). Ahora las dos listas se ven siempre y la
 *           invitación se hace en una ventana de un campo.
 * ¿Impacto? Se consultan las dos fuentes por separado (la lista real de autorizados, que sale de
 *           recicladores_conjuntos, y el historial de invitaciones) porque un reciclador vinculado por fuera del flujo
 *           de invitaciones (ej. el seed) sí está autorizado aunque no tenga ninguna invitación. `onCantidad` avisa
 *           cuántos hay autorizados, para el número de la pestaña.
 */
export function RecicladoresConjunto({
  idConjunto,
  onCantidad,
}: {
  idConjunto: string;
  onCantidad?: (cantidad: number) => void;
}) {
  const { t } = useTranslation();
  const [autorizados, setAutorizados] = useState<RecicladorAutorizado[]>([]);
  const [cargandoAutorizados, setCargandoAutorizados] = useState(true);
  const [errorAutorizados, setErrorAutorizados] = useState(false);
  const [invitaciones, setInvitaciones] = useState<InvitacionEnviada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [invitando, setInvitando] = useState(false);
  const [aRevocar, setARevocar] = useState<RecicladorAutorizado | null>(null);
  const [revocando, setRevocando] = useState(false);
  const [errorRevocar, setErrorRevocar] = useState<string | null>(null);

  // ¿Qué? Issue #223 (f2 del diagnóstico) — se distingue "no hay recicladores autorizados" de "falló la carga".
  const cargarAutorizados = useCallback(() => {
    obtenerRecicladoresAutorizados(idConjunto)
      .then((data) => {
        setAutorizados(data);
        setErrorAutorizados(false);
        onCantidad?.(data.length);
      })
      .catch((err) => {
        console.error("Error cargando recicladores autorizados", err);
        setErrorAutorizados(true);
      })
      .finally(() => setCargandoAutorizados(false));
  }, [idConjunto, onCantidad]);

  const cargarInvitaciones = useCallback(() => {
    obtenerInvitacionesDeConjunto(idConjunto)
      .then(setInvitaciones)
      .catch((err) => console.error("Error cargando invitaciones de reciclador", err))
      .finally(() => setCargando(false));
  }, [idConjunto]);

  useEffect(() => {
    cargarAutorizados();
    cargarInvitaciones();
  }, [cargarAutorizados, cargarInvitaciones]);

  const confirmarRevocar = async () => {
    if (!aRevocar) return;
    setRevocando(true);
    setErrorRevocar(null);
    try {
      await revocarReciclador(idConjunto, aRevocar.id_reciclador);
      setARevocar(null);
      cargarAutorizados();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setErrorRevocar(err.message || t("dashboards.adminConjunto.recyclersSection.revokeErrorDefault"));
    } finally {
      setRevocando(false);
    }
  };

  return (
    <div>
      {/* ¿Qué? El botón va en la misma línea que el subtítulo "Autorizados", texto a la izquierda y acción a la derecha,
                como la pestaña Avisos.
          ¿Para qué? Antes iba solo en una fila propia, con todo el lado izquierdo vacío.
          Recicladores YA autorizados — el dato real (recicladores_conjuntos) */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t("dashboards.adminConjunto.recyclersSection.authorizedTitle")}
        </p>
        <button
          type="button"
          onClick={() => setInvitando(true)}
          className="focus-ring touch-target-h cursor-pointer rounded-lg border border-accent-300 bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 transition-colors hover:bg-accent-100 hover:text-accent-800 dark:border-accent-300/40 dark:bg-accent-300/10 dark:text-accent-400 dark:hover:bg-accent-300/15"
        >
          {t("dashboards.adminConjunto.recyclersSection.invite")}
        </button>
      </div>
      {cargandoAutorizados ? (
        <LoadingState message={t("dashboards.adminConjunto.recyclersSection.authorizedLoading")} />
      ) : errorAutorizados ? (
        <div className="mb-4">
          <Alert type="error" message={t("common.loadError")} />
        </div>
      ) : autorizados.length === 0 ? (
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          {t("dashboards.adminConjunto.recyclersSection.authorizedEmpty")}
        </p>
      ) : (
        <div className="mb-4 space-y-2">
          {autorizados.map((r) => (
            <div
              key={r.id_reciclador}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-night-line dark:bg-night-inset/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                  {r.nombre} {r.apellidos}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{r.correo_electronico}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {r.asociacion && (
                  <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[0.6875rem] font-semibold text-gray-700 dark:border-night-line dark:bg-night-card dark:text-gray-300">
                    {r.asociacion}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setARevocar(r)}
                  className="touch-target flex cursor-pointer items-center justify-center rounded-lg border border-gray-200 p-1.5 text-red-500 hover:bg-red-50 dark:border-night-line dark:hover:bg-red-400/15"
                  aria-label={t("dashboards.adminConjunto.recyclersSection.revokeAria", { nombre: `${r.nombre} ${r.apellidos}` })}
                  title={t("dashboards.adminConjunto.recyclersSection.revokeAria", { nombre: `${r.nombre} ${r.apellidos}` })}
                >
                  <UserX className="icon-sm" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Historial de invitaciones enviadas — puede estar vacío aunque sí haya recicladores autorizados arriba. */}
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {t("dashboards.adminConjunto.recyclersSection.invitationsTitle")}
      </p>
      {cargando ? (
        <LoadingState message={t("dashboards.adminConjunto.recyclersSection.loading")} />
      ) : invitaciones.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">{t("dashboards.adminConjunto.recyclersSection.empty")}</p>
      ) : (
        <div className="space-y-2">
          {invitaciones.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-night-line dark:bg-night-inset/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                  {inv.nombre_reciclador} {inv.apellidos_reciclador}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{inv.correo_reciclador}</p>
              </div>
              <BadgeEstado estado={inv.estado} />
            </div>
          ))}
        </div>
      )}

      {invitando && (
        <InvitarRecicladorModal
          idConjunto={idConjunto}
          onClose={() => setInvitando(false)}
          onInvitado={() => {
            setInvitando(false);
            cargarInvitaciones();
          }}
        />
      )}

      {aRevocar && (
        <ConfirmModal
          icon={UserX}
          variant="danger"
          ariaLabel={t("dashboards.adminConjunto.recyclersSection.revokeModalAriaLabel")}
          title={t("dashboards.adminConjunto.recyclersSection.revokeConfirmTitle", { nombre: `${aRevocar.nombre} ${aRevocar.apellidos}` })}
          description={t("dashboards.adminConjunto.recyclersSection.revokeConfirmWarning")}
          error={errorRevocar}
          isConfirming={revocando}
          confirmLabel={t("dashboards.adminConjunto.recyclersSection.revokeConfirmButton")}
          confirmingLabel={t("common.saving")}
          onConfirm={confirmarRevocar}
          onClose={() => setARevocar(null)}
        />
      )}
    </div>
  );
}
