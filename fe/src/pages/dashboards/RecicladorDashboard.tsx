/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import {
  Recycle,
  Mail,
  CheckCircle2,
  XCircle,
  Building2,
  Truck,
  AlertTriangle,
  PackageCheck,
  X,
} from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "@/api/axios";
import { ROLE_THEME } from "@/config/roleTheme";
import { RoleId } from "@/types/auth";
import { NotificationFeed, type NotificacionItem } from "@/components/dashboard/NotificationFeed";
import { notificarNotificacionesActualizadas } from "@/lib/notificationEvents";

interface InvitacionPendiente {
  id: string;
  nombre_conjunto: string;
  direccion_conjunto: string;
  invitado_por_nombre: string;
  estado: string;
  expires_at: string;
}

interface ConjuntoAutorizado {
  id_conjunto_residencial: number;
  nombre_conjunto: string;
  direccion: string;
  nombre_localidad: string;
}

const ACCIONES_META = [
  {
    tipo: "LLEGADA_RECICLADOR",
    key: "llegada",
    icon: Truck,
    color: "bg-[#134e4a] hover:bg-teal-800 text-white",   // teal bosque — llegada activa
  },
  {
    tipo: "SHUT_LLENO",
    key: "shutLleno",
    icon: AlertTriangle,
    color: "bg-amber-700 hover:bg-amber-600 text-white",  // ámbar tierra — advertencia cálida
  },
  {
    tipo: "SHUT_LIBRE",
    key: "shutLibre",
    icon: PackageCheck,
    color: "bg-[#14532d] hover:bg-green-800 text-white",  // verde bosque — despejado, natural
  },
] as const;

export function RecicladorDashboard() {
  const { t } = useTranslation();
  const { user, accessToken }: any = useAuth();
  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || t("roles.reciclador");
  const { WatermarkIcon } = ROLE_THEME[RoleId.RECICLADOR];

  const ACCIONES = ACCIONES_META.map(({ tipo, key, icon, color }) => ({
    tipo,
    icon,
    color,
    label: t(`dashboards.reciclador.acciones.${key}`),
  }));

  const [invitaciones, setInvitaciones] = useState<InvitacionPendiente[]>([]);
  const [conjuntosAutorizados, setConjuntosAutorizados] = useState<ConjuntoAutorizado[]>([]);
  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // Modal de selección de conjunto
  const [modalTipo, setModalTipo] = useState<string | null>(null);
  const [conjuntoSeleccionado, setConjuntoSeleccionado] = useState<number | null>(null);
  const [enviandoNotif, setEnviandoNotif] = useState(false);
  const [feedbackOk, setFeedbackOk] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${accessToken}` };

  const cargarDatos = () => {
    Promise.all([
      axios.get(`${API_BASE_URL}/api/v1/reciclador-conjunto/mis-invitaciones`, { headers }),
      axios.get(`${API_BASE_URL}/api/v1/reciclador-conjunto/mis-conjuntos-autorizados`, { headers }),
      axios.get(`${API_BASE_URL}/api/v1/notificaciones/mis-notificaciones`, { headers }),
    ])
      .then(([resInv, resConj, resNotifs]) => {
        setInvitaciones(resInv.data);
        setConjuntosAutorizados(resConj.data);
        setNotificaciones(resNotifs.data);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    if (accessToken) {
      cargarDatos();
      const interval = setInterval(cargarDatos, 20000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const responderInvitacion = async (id: string, aceptar: boolean) => {
    setProcesandoId(id);
    try {
      await axios.post(
        `${API_BASE_URL}/api/v1/reciclador-conjunto/invitaciones/${id}/responder`,
        { aceptar },
        { headers }
      );
      cargarDatos();
    } catch {
      // silent
    } finally {
      setProcesandoId(null);
    }
  };

  const abrirModal = (tipo: string) => {
    if (conjuntosAutorizados.length === 0) return;
    setModalTipo(tipo);
    setConjuntoSeleccionado(
      conjuntosAutorizados.length === 1 ? conjuntosAutorizados[0].id_conjunto_residencial : null
    );
  };

  const enviarNotificacion = async () => {
    if (!modalTipo || !conjuntoSeleccionado) return;
    setEnviandoNotif(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/v1/notificaciones/enviar`,
        { tipo: modalTipo, id_conjunto_residencial: conjuntoSeleccionado },
        { headers }
      );
      const accion = ACCIONES.find((a) => a.tipo === modalTipo);
      setFeedbackOk(accion?.label ?? t("dashboards.reciclador.genericNotificationSent"));
      setTimeout(() => setFeedbackOk(null), 3500);
      setModalTipo(null);
      cargarDatos();
    } catch {
      // silent
    } finally {
      setEnviandoNotif(false);
    }
  };

  const marcarLeida = async (id: number) => {
    await axios.post(`${API_BASE_URL}/api/v1/notificaciones/${id}/leer`, {}, { headers });
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    notificarNotificacionesActualizadas();
  };

  const marcarTodasLeidas = async () => {
    await axios.post(`${API_BASE_URL}/api/v1/notificaciones/marcar-todas-leidas`, {}, { headers });
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    notificarNotificacionesActualizadas();
  };

  const limpiarLeidas = async () => {
    await axios.delete(`${API_BASE_URL}/api/v1/notificaciones/limpiar-leidas`, { headers });
    setNotificaciones((prev) => prev.filter((n) => !n.leida));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header — el símbolo de reciclaje de fondo es solo un detalle tenue,
          para que este panel se sienta del Reciclador, sin estorbar la
          lectura del texto encima. */}
      <div className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
        <WatermarkIcon className="pointer-events-none absolute right-4 top-4 h-20 w-20 text-teal-900/5 dark:text-white/5" aria-hidden="true" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-100 dark:bg-teal-900/30">
            <Recycle className="h-7 w-7 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("dashboards.reciclador.title")}</h1>
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

      {/* Feedback de notificación enviada */}
      {feedbackOk && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:border-green-700/40 dark:bg-green-900/15 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {t("dashboards.reciclador.feedbackSent", { label: feedbackOk })}
        </div>
      )}

      {/* Acciones de notificación */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
        <p className="mb-1 text-sm font-bold text-gray-900 dark:text-white">{t("dashboards.reciclador.sendSection.title")}</p>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          {t("dashboards.reciclador.sendSection.subtitle")}
        </p>
        {conjuntosAutorizados.length === 0 && !cargando ? (
          <p className="text-xs text-gray-400">
            {t("dashboards.reciclador.sendSection.noConjuntos")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {ACCIONES.map(({ tipo, label, icon: Icon, color }) => (
              <button
                key={tipo}
                onClick={() => abrirModal(tipo)}
                className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${color}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Invitaciones pendientes */}
      {!cargando && invitaciones.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Mail className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t("dashboards.reciclador.invitations.title")}</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {invitaciones.length}
            </span>
          </div>
          <div className="space-y-3">
            {invitaciones.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-800/30 dark:bg-amber-900/10 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{inv.nombre_conjunto}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{inv.direccion_conjunto}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{t("dashboards.reciclador.invitations.invitedBy", { nombre: inv.invitado_por_nombre })}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => responderInvitacion(inv.id, true)}
                    disabled={procesandoId === inv.id}
                    className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-500 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t("dashboards.reciclador.invitations.accept")}
                  </button>
                  <button
                    onClick={() => responderInvitacion(inv.id, false)}
                    disabled={procesandoId === inv.id}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800/40 dark:bg-transparent dark:hover:bg-red-900/10"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    {t("dashboards.reciclador.invitations.reject")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mis conjuntos autorizados */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-green-600" />
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t("dashboards.reciclador.myConjuntos.title")}</h2>
        </div>
        {cargando ? (
          <p className="text-sm text-gray-400">{t("common.loading")}</p>
        ) : conjuntosAutorizados.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("dashboards.reciclador.myConjuntos.empty")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {conjuntosAutorizados.map((c) => (
              <div
                key={c.id_conjunto_residencial}
                className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/40"
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{c.nombre_conjunto}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{c.direccion}</p>
                <p className="mt-1 text-xs text-gray-400">{c.nombre_localidad}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actividad reciente (notificaciones recibidas — ej. residentes reportando SHUT lleno) */}
      {cargando ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <p className="text-sm text-gray-400">{t("common.loading")}</p>
        </div>
      ) : (
        <NotificationFeed
          title={t("dashboards.reciclador.notifications.title")}
          notifications={notificaciones}
          emptyMessage={t("dashboards.reciclador.notifications.empty")}
          accentBg="bg-amber-500"
          accentHighlight="bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-900/10 dark:hover:bg-amber-900/20"
          onMarkRead={marcarLeida}
          onMarkAllRead={marcarTodasLeidas}
          onClearRead={limpiarLeidas}
        />
      )}

      {/* Modal: seleccionar conjunto para enviar notificación */}
      {modalTipo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setModalTipo(null)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {t("dashboards.reciclador.modal.title")}
              </h3>
              <button
                onClick={() => setModalTipo(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
              {t("dashboards.reciclador.modal.subtitle")}
            </p>

            <div className="space-y-2 mb-5">
              {conjuntosAutorizados.map((c) => (
                <button
                  key={c.id_conjunto_residencial}
                  onClick={() => setConjuntoSeleccionado(c.id_conjunto_residencial)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                    conjuntoSeleccionado === c.id_conjunto_residencial
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-gray-200 hover:border-green-300 dark:border-gray-700 dark:hover:border-green-700"
                  }`}
                >
                  <p className="font-semibold text-gray-900 dark:text-white">{c.nombre_conjunto}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{c.nombre_localidad}</p>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setModalTipo(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={enviarNotificacion}
                disabled={!conjuntoSeleccionado || enviandoNotif}
                className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-500 disabled:opacity-50"
              >
                {enviandoNotif ? t("dashboards.reciclador.modal.sending") : t("dashboards.reciclador.modal.submit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
