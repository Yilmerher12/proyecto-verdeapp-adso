import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ClipboardList, XCircle } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  listarSolicitudesDesvinculacion,
  resolverSolicitudDesvinculacion,
  type SolicitudDesvinculacion,
} from "@/lib/adminConjuntoApi";

interface SolicitudesDesvinculacionProps {
  /** ¿Para qué? El resumen de "Solicitudes pendientes" arriba del todo en
   *  AdminDashboard necesita el número ANTES de que el usuario despliegue
   *  esta lista — se avisa cada vez que cambia, en vez de duplicar la
   *  petición al backend solo para contar. */
  onCountChange?: (count: number) => void;
  /** ¿Para qué? Cuando este componente vive dentro del acordeón de
   *  "Solicitudes pendientes" de AdminDashboard, ese acordeón ya muestra su
   *  propio título + contador — repetirlos aquí adentro se veía como un
   *  encabezado duplicado. Por defecto se muestra (para no romper ningún
   *  otro lugar que ya use este componente tal cual). */
  mostrarEncabezado?: boolean;
  /** ¿Para qué? Dentro de un <Modal>, el fondo blanco/borde redondeado/sombra
   *  ya los pone el propio modal — repetirlos aquí adentro se veía como una
   *  tarjeta dentro de otra tarjeta (doble borde, doble sombra), además de
   *  que el contenido quedaba pegado al botón "cerrar" (X) del modal sin
   *  nada de aire arriba. Con esto, el componente se monta como contenido
   *  plano (sin su propia tarjeta). Default false para no romper el uso
   *  normal, embebido directo en el panel. */
  dentroDeModal?: boolean;
}

/**
 * ¿Qué? Panel del Administrador del Sistema para resolver solicitudes de
 *       desvinculación de conjuntos (RQF-016, HU-023).
 * ¿Para qué? Ver quién pidió desvincularse, de qué conjunto y por qué, y
 *           poder aprobar o rechazar cada una — rechazar exige un motivo
 *           (CA-023.3), así que se pide en un formulario aparte por fila.
 */
export function SolicitudesDesvinculacion({
  onCountChange,
  mostrarEncabezado = true,
  dentroDeModal = false,
}: SolicitudesDesvinculacionProps = {}) {
  const { t } = useTranslation();
  const [solicitudes, setSolicitudes] = useState<SolicitudDesvinculacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cargar = () => {
    setCargando(true);
    listarSolicitudesDesvinculacion()
      .then((data) => {
        setSolicitudes(data);
        onCountChange?.(data.length);
      })
      .catch((err) => console.error("Error cargando solicitudes de desvinculación", err))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();

  }, []);

  const aprobar = async (id: string) => {
    setProcesandoId(id);
    setError(null);
    try {
      await resolverSolicitudDesvinculacion(id, true, undefined);
      cargar();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || t("desvinculacion.adminSistema.errorDefault"));
    } finally {
      setProcesandoId(null);
    }
  };

  const confirmarRechazo = async (id: string) => {
    if (!motivoRechazo.trim()) return;
    setProcesandoId(id);
    setError(null);
    try {
      await resolverSolicitudDesvinculacion(id, false, motivoRechazo.trim());
      setRechazandoId(null);
      setMotivoRechazo("");
      cargar();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || t("desvinculacion.adminSistema.errorDefault"));
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <div
      className={
        dentroDeModal
          ? ""
          : "bg-[#f7f9f3] dark:bg-[#1c341b] rounded-2xl border border-gray-100 dark:border-[#2a4d34] p-5 shadow-sm"
      }
    >
      {mostrarEncabezado && (
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="h-4 w-4 text-accent-600" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            {t("desvinculacion.adminSistema.sectionTitle")}
          </h3>
          {solicitudes.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {solicitudes.length}
            </span>
          )}
        </div>
      )}

      {error && (
        <p className="mb-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      {cargando ? (
        <LoadingState message={t("common.loading")} />
      ) : solicitudes.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("desvinculacion.adminSistema.empty")}</p>
      ) : (
        <div className="space-y-3">
          {solicitudes.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-800/30 dark:bg-amber-900/10"
            >
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{s.nombre_conjunto}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("desvinculacion.adminSistema.requestedBy", {
                  nombre: `${s.nombre_administrador} ${s.apellidos_administrador}`,
                })}
              </p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                <span className="font-semibold">{t("desvinculacion.adminSistema.motivoLabel")}</span>{" "}
                {s.motivo || t("desvinculacion.adminSistema.noMotivo")}
              </p>

              {rechazandoId === s.id ? (
                <div className="mt-3 space-y-2">
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-400">
                    {t("desvinculacion.adminSistema.rejectModal.motivoLabel")}
                  </label>
                  <textarea
                    value={motivoRechazo}
                    onChange={(e) => setMotivoRechazo(e.target.value)}
                    placeholder={t("desvinculacion.adminSistema.rejectModal.motivoPlaceholder")}
                    rows={2}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 transition-colors focus:ring-2 focus:ring-accent-500 outline-none dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmarRechazo(s.id)}
                      disabled={procesandoId === s.id || !motivoRechazo.trim()}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      {t("desvinculacion.adminSistema.rejectModal.confirm")}
                    </button>
                    <button
                      onClick={() => {
                        setRechazandoId(null);
                        setMotivoRechazo("");
                      }}
                      className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-[#2a4d34] dark:bg-transparent dark:text-gray-300 dark:hover:bg-[#2a4d34]"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => aprobar(s.id)}
                    disabled={procesandoId === s.id}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t("desvinculacion.adminSistema.approve")}
                  </button>
                  <button
                    onClick={() => setRechazandoId(s.id)}
                    disabled={procesandoId === s.id}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800/40 dark:bg-transparent dark:hover:bg-red-900/10"
                  >
                    <XCircle className="h-3.5 w-3.5" />
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
