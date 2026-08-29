import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Home, AlertTriangle, Bell, CheckCircle2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import axios from "axios";
import { API_BASE_URL } from "@/api/axios";
import { ROLE_THEME } from "@/config/roleTheme";
import { RoleId } from "@/types/auth";
import { NotificationFeed, tiempoRelativo, type NotificacionItem } from "@/components/dashboard/NotificationFeed";
import { AuditoriaResultadoBanner } from "@/components/dashboard/AuditoriaResultadoBanner";
import { HistorialAuditorias } from "@/components/dashboard/HistorialAuditorias";
import { notificarNotificacionesActualizadas } from "@/lib/notificationEvents";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface EstadoShut {
  lleno: boolean;
  created_at: string | null;
}

export function ResidenteDashboard() {
  const { t } = useTranslation();
  const { user, accessToken } = useAuth() as AnyRecord;
  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || t("roles.residente");
  const { WatermarkIcon } = ROLE_THEME[RoleId.RESIDENTE];

  const [estadoShut, setEstadoShut] = useState<EstadoShut>({ lleno: false, created_at: null });
  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [feedbackOk, setFeedbackOk] = useState(false);
  const [errorReporte, setErrorReporte] = useState(false);
  const [errorAccion, setErrorAccion] = useState(false);

  const headers = { Authorization: `Bearer ${accessToken}` };

  const cargarDatos = async () => {
    try {
      const [resEstado, resNotifs] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/v1/notificaciones/estado-shut`, { headers }),
        axios.get(`${API_BASE_URL}/api/v1/notificaciones/mis-notificaciones`, { headers }),
      ]);
      setEstadoShut(resEstado.data);
      setNotificaciones(resNotifs.data);
      setErrorCarga(false);
    } catch {
      // ¿Qué? Antes esto fallaba en silencio — el panel se quedaba con los
      //       datos viejos sin ningún aviso de que algo salió mal.
      // ¿Impacto? Como cargarDatos() también corre cada 20s (polling), el
      //           aviso desaparece solo apenas una siguiente carga funcione.
      setErrorCarga(true);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    cargarDatos();
    const interval = setInterval(cargarDatos, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const reportarShutLleno = async () => {
    setEnviando(true);
    setErrorReporte(false);
    try {
      await axios.post(
        `${API_BASE_URL}/api/v1/notificaciones/enviar`,
        { tipo: "SHUT_LLENO" },
        { headers }
      );
      setFeedbackOk(true);
      setTimeout(() => setFeedbackOk(false), 3500);
      cargarDatos();
    } catch {
      // ¿Qué? Antes, si esto fallaba, el residente no se enteraba — creía
      //       que había reportado el SHUT lleno y en realidad no pasó nada.
      // ¿Impacto? Ahora se ve un aviso claro de que debe intentar de nuevo.
      setErrorReporte(true);
    } finally {
      setEnviando(false);
    }
  };

  const marcarLeida = async (id: string) => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/notificaciones/${id}/leer`, {}, { headers });
      setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
      notificarNotificacionesActualizadas();
    } catch {
      setErrorAccion(true);
    }
  };

  const marcarTodasLeidas = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/notificaciones/marcar-todas-leidas`, {}, { headers });
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      notificarNotificacionesActualizadas();
    } catch {
      setErrorAccion(true);
    }
  };

  const limpiarLeidas = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/api/v1/notificaciones/limpiar-leidas`, { headers });
      setNotificaciones((prev) => prev.filter((n) => !n.leida));
    } catch {
      setErrorAccion(true);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header — la llave de fondo es solo un detalle tenue, para que este
          panel se sienta del Residente (su casa, su unidad), sin estorbar la
          lectura del texto encima. */}
      <div className="relative overflow-hidden bg-white dark:bg-[#132a1c] rounded-2xl border border-gray-100 dark:border-[#2a4d34] p-6 shadow-sm">
        <WatermarkIcon className="pointer-events-none absolute right-4 top-4 h-20 w-20 text-green-900/5 dark:text-white/5" aria-hidden="true" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
            <Home className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("dashboards.residente.title")}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {t("dashboards.common.welcomePrefix")}{" "}
              <span className="font-semibold text-gray-800 dark:text-gray-200 uppercase">
                {fullName}
              </span>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Banner estado SHUT */}
      {!cargando && estadoShut.lleno && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-900/10">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-400">
              {t("dashboards.residente.shutBanner.title")}
            </p>
            {estadoShut.created_at && (
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-500">
                {t("dashboards.residente.shutBanner.reportedAt", { time: tiempoRelativo(estadoShut.created_at) })}
              </p>
            )}
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-500">
              {t("dashboards.residente.shutBanner.warning")}
            </p>
          </div>
        </div>
      )}

      {!cargando && errorCarga && <Alert type="error" message={t("common.loadError")} />}

      {/* Resultado de auditoría del reciclador (RQF-009) — aparte del feed normal */}
      {!cargando && (
        <AuditoriaResultadoBanner
          notificaciones={notificaciones}
          token={accessToken ?? ""}
          onMarcarLeida={marcarLeida}
        />
      )}

      {/* Acción: reportar SHUT lleno */}
      <div className="bg-white dark:bg-[#132a1c] rounded-2xl border border-gray-100 dark:border-[#2a4d34] p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {t("dashboards.residente.reportSection.title")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              {t("dashboards.residente.reportSection.description")}
            </p>
            {errorReporte && (
              <div className="mt-2">
                <Alert type="error" message={t("common.actionError")} onClose={() => setErrorReporte(false)} />
              </div>
            )}
          </div>
          <button
            onClick={reportarShutLleno}
            disabled={enviando || feedbackOk}
            className={`shrink-0 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-60 ${
              feedbackOk
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-amber-700 text-white hover:bg-amber-600"
            }`}
          >
            {feedbackOk ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {t("dashboards.residente.reportSection.sent")}
              </>
            ) : (
              <>
                <Bell className="h-4 w-4" />
                {t("dashboards.residente.reportSection.submit")}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Actividad reciente (notificaciones recibidas) */}
      {cargando ? (
        <div className="bg-white dark:bg-[#132a1c] rounded-2xl border border-gray-100 dark:border-[#2a4d34] shadow-sm p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</p>
        </div>
      ) : (
        <>
          {errorAccion && (
            <Alert type="error" message={t("common.actionError")} onClose={() => setErrorAccion(false)} />
          )}
          <NotificationFeed
            title={t("dashboards.residente.notifications.title")}
            notifications={notificaciones.filter((n) => n.tipo !== "AUDITORIA_PUBLICADA")}
            emptyMessage={t("dashboards.residente.notifications.empty")}
            accentBg="bg-green-700"
            accentHighlight="bg-green-50/60 hover:bg-green-50 dark:bg-green-900/10 dark:hover:bg-green-900/20"
            onMarkRead={marcarLeida}
            onMarkAllRead={marcarTodasLeidas}
            onClearRead={limpiarLeidas}
          />
        </>
      )}

      <HistorialAuditorias token={accessToken ?? ""} />
    </div>
  );
}
