import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BadgeCheck, OctagonX, Unlink } from "lucide-react";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContadorCaracteres } from "@/components/ui/ContadorCaracteres";
import { DESVINCULACION_MOTIVO_MAX_LENGTH } from "@/lib/validacion";
import {
  listarSolicitudesDesvinculacion,
  resolverSolicitudDesvinculacion,
  type SolicitudDesvinculacion,
} from "@/lib/adminConjuntoApi";
import { notificarSolicitudesActualizadas } from "@/lib/solicitudesEvents";
import { formatearFechaCreacion } from "@/lib/dateFormat";
import { Button } from "@/components/ui/Button";

/**
 * ¿Qué? Pestaña "Desvinculaciones" del Administrador del Sistema: las solicitudes
 *       de un Admin de Conjunto para dejar de administrar un conjunto (RQF-016),
 *       que se aprueban o se rechazan con motivo.
 * ¿Para qué? Issue #512: antes iban mezcladas con las consultas de soporte en una
 *           sola lista. Son cosas distintas (una decisión de sí o no, sin prioridad
 *           ni respuesta), así que tienen su propio lugar.
 * ¿Impacto? Usa el mismo flujo y los mismos endpoints de RQF-016; solo cambia dónde se ve. Issue #596: ya
 *          no reporta su número hacia arriba (lo lee useSolicitudesPendientes); al aprobar o rechazar
 *          avisa con solicitudesEvents para que el contador del menú y la franja del panel se actualicen.
 */
export function SolicitudesDesvinculacion() {
  const { t } = useTranslation();
  const [solicitudes, setSolicitudes] = useState<SolicitudDesvinculacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    listarSolicitudesDesvinculacion()
      .then(setSolicitudes)
      .catch((err) => console.error("Error cargando solicitudes de desvinculación", err))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const resolver = async (s: SolicitudDesvinculacion, aprobar: boolean) => {
    setProcesandoId(s.id);
    setError(null);
    try {
      await resolverSolicitudDesvinculacion(s.id, aprobar, aprobar ? undefined : motivoRechazo.trim());
      setRechazandoId(null);
      setMotivoRechazo("");
      cargar();
      notificarSolicitudesActualizadas();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || t("desvinculacion.adminSistema.errorDefault"));
    } finally {
      setProcesandoId(null);
    }
  };

  if (cargando) return <Esqueleto mensaje={t("common.loading")} variante="filas" />;

  return (
    <div className="space-y-3">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {solicitudes.length === 0 ? (
        <EmptyState icon={Unlink} message={t("desvinculacion.adminSistema.empty")} />
      ) : (
        solicitudes.map((s) => (
          <div
            key={s.id}
            className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-300/30 dark:bg-amber-400/10"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatearFechaCreacion(s.created_at)}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{s.nombre_conjunto}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("desvinculacion.adminSistema.requestedBy", {
                nombre: `${s.nombre_administrador} ${s.apellidos_administrador}`,
              })}
            </p>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
              <span className="font-bold">{t("desvinculacion.adminSistema.motivoLabel")}</span>{" "}
              {s.motivo || t("desvinculacion.adminSistema.noMotivo")}
            </p>

            {rechazandoId === s.id ? (
              <div className="mt-3 space-y-2">
                <label htmlFor={`motivo-rechazo-${s.id}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">
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
                  className="focus-ring w-full rounded-lg border border-edge bg-white p-2.5 text-sm text-gray-900 transition-colors dark:border-night-edge dark:bg-night-field dark:text-white"
                />
                <ContadorCaracteres
                  id={`motivo-rechazo-contador-${s.id}`}
                  actual={motivoRechazo.length}
                  max={DESVINCULACION_MOTIVO_MAX_LENGTH}
                />
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" onClick={() => resolver(s, false)} disabled={procesandoId === s.id || !motivoRechazo.trim()}>
                    <OctagonX className="icon-sm icon-draw" />
                    {t("desvinculacion.adminSistema.rejectModal.confirm")}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => {
                      setRechazandoId(null);
                      setMotivoRechazo("");
                    }}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button variant="primary" size="sm" onClick={() => resolver(s, true)} disabled={procesandoId === s.id}>
                  <BadgeCheck className="icon-sm icon-draw" />
                  {t("desvinculacion.adminSistema.approve")}
                </Button>
                <Button variant="dangerOutline" size="sm" onClick={() => setRechazandoId(s.id)} disabled={procesandoId === s.id}>
                  <OctagonX className="icon-sm icon-draw" />
                  {t("desvinculacion.adminSistema.reject")}
                </Button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
