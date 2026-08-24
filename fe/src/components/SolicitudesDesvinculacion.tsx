import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ClipboardList, XCircle } from "lucide-react";
import {
  listarSolicitudesDesvinculacion,
  resolverSolicitudDesvinculacion,
  type SolicitudDesvinculacion,
} from "@/lib/adminConjuntoApi";

interface SolicitudesDesvinculacionProps {
  // ¿Qué? El token de sesión del Administrador del Sistema.
  token: string;
}

/**
 * ¿Qué? Panel del Administrador del Sistema para resolver solicitudes de
 *       desvinculación de conjuntos (RQF-016, HU-023).
 * ¿Para qué? Ver quién pidió desvincularse, de qué conjunto y por qué, y
 *           poder aprobar o rechazar cada una — rechazar exige un motivo
 *           (CA-023.3), así que se pide en un formulario aparte por fila.
 */
export function SolicitudesDesvinculacion({ token }: SolicitudesDesvinculacionProps) {
  const { t } = useTranslation();
  const [solicitudes, setSolicitudes] = useState<SolicitudDesvinculacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [rechazandoId, setRechazandoId] = useState<number | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cargar = () => {
    setCargando(true);
    listarSolicitudesDesvinculacion(token)
      .then(setSolicitudes)
      .catch((err) => console.error("Error cargando solicitudes de desvinculación", err))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const aprobar = async (id: number) => {
    setProcesandoId(id);
    setError(null);
    try {
      await resolverSolicitudDesvinculacion(id, true, undefined, token);
      cargar();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err?.response?.data?.detail || t("desvinculacion.adminSistema.errorDefault"));
    } finally {
      setProcesandoId(null);
    }
  };

  const confirmarRechazo = async (id: number) => {
    if (!motivoRechazo.trim()) return;
    setProcesandoId(id);
    setError(null);
    try {
      await resolverSolicitudDesvinculacion(id, false, motivoRechazo.trim(), token);
      setRechazandoId(null);
      setMotivoRechazo("");
      cargar();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err?.response?.data?.detail || t("desvinculacion.adminSistema.errorDefault"));
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-[#132a1c] rounded-2xl border border-gray-100 dark:border-[#2a4d34] p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="h-4 w-4 text-green-600" />
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
          {t("desvinculacion.adminSistema.sectionTitle")}
        </h3>
        {solicitudes.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {solicitudes.length}
          </span>
        )}
      </div>

      {error && (
        <p className="mb-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      {cargando ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</p>
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
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:ring-2 focus:ring-green-500 outline-none dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmarRechazo(s.id)}
                      disabled={procesandoId === s.id || !motivoRechazo.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      {t("desvinculacion.adminSistema.rejectModal.confirm")}
                    </button>
                    <button
                      onClick={() => {
                        setRechazandoId(null);
                        setMotivoRechazo("");
                      }}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-[#2a4d34] dark:bg-transparent dark:text-gray-300 dark:hover:bg-[#2a4d34]"
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
                    className="flex items-center gap-1.5 rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-600 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t("desvinculacion.adminSistema.approve")}
                  </button>
                  <button
                    onClick={() => setRechazandoId(s.id)}
                    disabled={procesandoId === s.id}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800/40 dark:bg-transparent dark:hover:bg-red-900/10"
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
