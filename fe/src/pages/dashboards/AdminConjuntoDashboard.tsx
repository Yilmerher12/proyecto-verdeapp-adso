import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Building2, MapPin, Pencil, Check, X, Users, Mail, Send } from "lucide-react";
import { ROLE_THEME } from "@/config/roleTheme";
import { RoleId } from "@/types/auth";
import axios from "axios";
import { API_BASE_URL } from "@/api/axios";
import {
  obtenerMisConjuntos,
  editarMiConjunto,
  type ConjuntoAdministrado,
} from "@/lib/conjuntoPanelApi";
import {
  invitarReciclador,
  obtenerInvitacionesDeConjunto,
  type InvitacionEnviada,
} from "@/lib/recicladorConjuntoApi";
import { NotificationFeed, type NotificacionItem } from "@/components/dashboard/NotificationFeed";

/**
 * ¿Qué? Badge de color según el estado de la invitación.
 * ¿Para qué? Distinguir visualmente PENDIENTE (ámbar) / ACEPTADA (verde) /
 *           RECHAZADA (rojo) sin tener que leer el texto con atención.
 */
function BadgeEstado({ estado }: { estado: string }) {
  const { t } = useTranslation();
  const estilos: Record<string, string> = {
    PENDIENTE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    ACEPTADA: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    RECHAZADA: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  const etiquetas: Record<string, string> = {
    PENDIENTE: t("dashboards.adminConjunto.estado.pendiente"),
    ACEPTADA: t("dashboards.adminConjunto.estado.aceptada"),
    RECHAZADA: t("dashboards.adminConjunto.estado.rechazada"),
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${estilos[estado] || "bg-gray-100 text-gray-600"}`}>
      {etiquetas[estado] || estado}
    </span>
  );
}

/**
 * ¿Qué? Sección de Recicladores Autorizados de UN conjunto específico.
 * ¿Para qué? Componente separado para mantener legible el dashboard
 *           principal — cada conjunto administrado tiene su propia
 *           lista de invitaciones, así que esto vive por tarjeta.
 */
function SeccionRecicladores({ idConjunto, accessToken }: { idConjunto: number; accessToken: string }) {
  const { t } = useTranslation();
  const [invitaciones, setInvitaciones] = useState<InvitacionEnviada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [correoNuevo, setCorreoNuevo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorInvitar, setErrorInvitar] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const cargarInvitaciones = () => {
    setCargando(true);
    obtenerInvitacionesDeConjunto(idConjunto, accessToken)
      .then(setInvitaciones)
      .catch((err) => console.error("Error cargando invitaciones de reciclador", err))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarInvitaciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idConjunto]);

  const handleInvitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInvitar(null);

    if (!correoNuevo.trim()) return;

    setEnviando(true);
    try {
      await invitarReciclador(correoNuevo.trim(), idConjunto, accessToken);
      setCorreoNuevo("");
      setMostrarFormulario(false);
      cargarInvitaciones();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const detalle = err?.response?.data?.detail;
      setErrorInvitar(detalle || t("dashboards.adminConjunto.recyclersSection.errorDefault"));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-green-600" />
          <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("dashboards.adminConjunto.recyclersSection.title")}</h5>
        </div>
        <button
          type="button"
          onClick={() => setMostrarFormulario((v) => !v)}
          className="text-xs font-semibold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
        >
          {t("dashboards.adminConjunto.recyclersSection.invite")}
        </button>
      </div>

      {mostrarFormulario && (
        <form onSubmit={handleInvitar} className="flex flex-col sm:flex-row gap-2 mb-4 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl">
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              placeholder={t("dashboards.adminConjunto.recyclersSection.emailPlaceholder")}
              value={correoNuevo}
              onChange={(e) => setCorreoNuevo(e.target.value)}
              className="w-full pl-9 p-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:ring-2 focus:ring-green-500 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={enviando || !correoNuevo.trim()}
            className="flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {enviando ? t("dashboards.adminConjunto.recyclersSection.sending") : t("dashboards.adminConjunto.recyclersSection.inviteButton")}
          </button>
        </form>
      )}

      {errorInvitar && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3 dark:bg-red-900/20 dark:text-red-400">{errorInvitar}</p>
      )}

      {cargando ? (
        <p className="text-xs text-gray-400">{t("dashboards.adminConjunto.recyclersSection.loading")}</p>
      ) : invitaciones.length === 0 ? (
        <p className="text-xs text-gray-400">
          {t("dashboards.adminConjunto.recyclersSection.empty")}
        </p>
      ) : (
        <div className="space-y-2">
          {invitaciones.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {inv.nombre_reciclador} {inv.apellidos_reciclador}
                </p>
                <p className="text-xs text-gray-400 truncate">{inv.correo_reciclador}</p>
              </div>
              <BadgeEstado estado={inv.estado} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * ¿Qué? Dashboard del rol Administrador de Conjunto (id_rol = 4).
 * ¿Para qué? Mostrar SOLO los conjuntos que esta persona administra,
 *           permitirle editar nombre/NIT/dirección de cada uno, y ahora
 *           también invitar recicladores autorizados por conjunto.
 */
export function AdminConjuntoDashboard() {
  const { t } = useTranslation();
  const { user, accessToken } = useAuth();
  const { WatermarkIcon } = ROLE_THEME[RoleId.ADMIN_CONJUNTO];
  const [conjuntos, setConjuntos] = useState<ConjuntoAdministrado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formEdicion, setFormEdicion] = useState({ nombre_conjunto: "", nit: "", direccion: "" });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>([]);
  const [cargandoNotifs, setCargandoNotifs] = useState(true);

  const authHeaders = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

  const cargarConjuntos = () => {
    if (!accessToken) return;
    setCargando(true);
    obtenerMisConjuntos(accessToken)
      .then(setConjuntos)
      .catch((err) => console.error("Error cargando mis conjuntos", err))
      .finally(() => setCargando(false));
  };

  const cargarNotificaciones = () => {
    if (!accessToken) return;
    axios
      .get(`${API_BASE_URL}/api/v1/notificaciones/mis-notificaciones`, { headers: authHeaders })
      .then((res) => setNotificaciones(res.data))
      .catch(() => {})
      .finally(() => setCargandoNotifs(false));
  };

  const marcarLeida = async (id: number) => {
    await axios.post(`${API_BASE_URL}/api/v1/notificaciones/${id}/leer`, {}, { headers: authHeaders });
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
  };

  const marcarTodasLeidas = async () => {
    await axios.post(`${API_BASE_URL}/api/v1/notificaciones/marcar-todas-leidas`, {}, { headers: authHeaders });
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
  };

  const limpiarLeidas = async () => {
    await axios.delete(`${API_BASE_URL}/api/v1/notificaciones/limpiar-leidas`, { headers: authHeaders });
    setNotificaciones((prev) => prev.filter((n) => !n.leida));
  };

  useEffect(() => {
    cargarConjuntos();
    cargarNotificaciones();
    const interval = setInterval(cargarNotificaciones, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const iniciarEdicion = (c: ConjuntoAdministrado) => {
    setEditandoId(c.id_conjunto_residencial);
    setFormEdicion({
      nombre_conjunto: c.nombre_conjunto,
      nit: c.nit || "",
      direccion: c.direccion,
    });
    setMensaje(null);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
  };

  const guardarEdicion = async (id: number) => {
    if (!accessToken) return;
    setGuardando(true);
    try {
      await editarMiConjunto(
        id,
        {
          nombre_conjunto: formEdicion.nombre_conjunto,
          nit: formEdicion.nit || null,
          direccion: formEdicion.direccion,
        },
        accessToken
      );
      setMensaje(t("dashboards.adminConjunto.editForm.successMessage"));
      setEditandoId(null);
      cargarConjuntos();
    } catch (err) {
      console.error("Error al editar conjunto", err);
      setMensaje(t("dashboards.adminConjunto.editForm.errorMessage"));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* TARJETA DE PERFIL — el maletín de fondo es solo un detalle tenue,
          para que este panel se sienta del Admin de Conjunto, sin estorbar
          la lectura del texto encima. */}
      <div className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
        <WatermarkIcon className="pointer-events-none absolute right-4 top-4 h-20 w-20 text-amber-900/5 dark:text-white/5" aria-hidden="true" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
            <Building2 className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("dashboards.adminConjunto.title")}</h1>
            <p className="text-gray-600 dark:text-gray-300">
              {t("dashboards.common.welcomePrefix")} <span className="font-bold uppercase">{user?.first_name} {user?.last_name}</span>.
            </p>
            <p className="text-xs text-green-600 font-semibold mt-1 tracking-wide">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {mensaje && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-xl dark:border-green-700/40 dark:bg-green-900/15 dark:text-green-400">
          {mensaje}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
          <Building2 className="text-green-600 w-5 h-5" />
          <h3 className="font-bold text-gray-800 dark:text-white">{t("dashboards.adminConjunto.myConjuntos.title")}</h3>
        </div>

        {cargando ? (
          <p className="text-sm text-gray-400 py-4">{t("dashboards.adminConjunto.myConjuntos.loading")}</p>
        ) : conjuntos.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">
            {t("dashboards.adminConjunto.myConjuntos.empty")}
          </p>
        ) : (
          <div className="space-y-4">
            {conjuntos.map((c) => (
              <div
                key={c.id_conjunto_residencial}
                className="border border-gray-200 dark:border-gray-800 rounded-xl p-4"
              >
                {editandoId === c.id_conjunto_residencial ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400">{t("dashboards.adminConjunto.editForm.name")}</label>
                      <input
                        type="text"
                        value={formEdicion.nombre_conjunto}
                        onChange={(e) =>
                          setFormEdicion((p) => ({ ...p, nombre_conjunto: e.target.value }))
                        }
                        className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 bg-white text-gray-900 focus:ring-2 focus:ring-green-500 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400">{t("dashboards.adminConjunto.editForm.nit")}</label>
                      <input
                        type="text"
                        value={formEdicion.nit}
                        onChange={(e) => setFormEdicion((p) => ({ ...p, nit: e.target.value }))}
                        className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 bg-white text-gray-900 focus:ring-2 focus:ring-green-500 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400">{t("dashboards.adminConjunto.editForm.address")}</label>
                      <input
                        type="text"
                        value={formEdicion.direccion}
                        onChange={(e) =>
                          setFormEdicion((p) => ({ ...p, direccion: e.target.value }))
                        }
                        className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 bg-white text-gray-900 focus:ring-2 focus:ring-green-500 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => guardarEdicion(c.id_conjunto_residencial)}
                        disabled={guardando}
                        className="flex items-center gap-1 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
                      >
                        <Check className="w-4 h-4" /> {t("common.save")}
                      </button>
                      <button
                        type="button"
                        onClick={cancelarEdicion}
                        className="flex items-center gap-1 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-colors dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <X className="w-4 h-4" /> {t("common.cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-gray-800 dark:text-white">{c.nombre_conjunto}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {c.direccion} — {c.nombre_localidad}
                        </p>
                        {c.nit && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t("dashboards.adminConjunto.nitLabel", { nit: c.nit })}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => iniciarEdicion(c)}
                        className="flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-xl transition-colors dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
                      >
                        <Pencil className="w-3.5 h-3.5" /> {t("common.edit")}
                      </button>
                    </div>

                    {/*
                      ¿Qué? Sección nueva de Recicladores Autorizados,
                            anidada DENTRO de cada conjunto — solo se
                            muestra cuando NO se está editando ese conjunto.
                      ¿Para qué? Cada conjunto tiene sus propios recicladores
                                autorizados; tiene más sentido vivir aquí
                                que en una sección global aparte.
                    */}
                    {accessToken && (
                      <SeccionRecicladores idConjunto={c.id_conjunto_residencial} accessToken={accessToken} />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feed de notificaciones */}
      {cargandoNotifs ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <p className="text-sm text-gray-400">{t("common.loading")}</p>
        </div>
      ) : (
        <NotificationFeed
          title={t("dashboards.adminConjunto.notifications.title")}
          notifications={notificaciones}
          emptyMessage={t("dashboards.adminConjunto.notifications.empty")}
          accentBg="bg-amber-500"
          accentHighlight="bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-900/10 dark:hover:bg-amber-900/20"
          onMarkRead={marcarLeida}
          onMarkAllRead={marcarTodasLeidas}
          onClearRead={limpiarLeidas}
        />
      )}
    </div>
  );
}