import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Home, AlertTriangle, Bell, CheckCircle2, Clock, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import axios from "axios";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface EstadoShut {
  lleno: boolean;
  created_at: string | null;
}

interface NotificacionItem {
  id: number;
  tipo: string;
  mensaje: string;
  nombre_conjunto: string;
  leida: boolean;
  created_at: string;
}

const TIPO_META: Record<string, { Icon: LucideIcon; color: string }> = {
  LLEGADA_RECICLADOR: { Icon: Truck,         color: "text-teal-700 dark:text-teal-400" },
  SHUT_LLENO:         { Icon: AlertTriangle, color: "text-amber-700 dark:text-amber-500" },
  SHUT_LIBRE:         { Icon: CheckCircle2,  color: "text-green-700 dark:text-green-500" },
};

function tiempoRelativo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "hace un momento";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export function ResidenteDashboard() {
  const { user, accessToken } = useAuth() as AnyRecord;
  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Residente";

  const [estadoShut, setEstadoShut] = useState<EstadoShut>({ lleno: false, created_at: null });
  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [feedbackOk, setFeedbackOk] = useState(false);

  const headers = { Authorization: `Bearer ${accessToken}` };

  const cargarDatos = async () => {
    try {
      const [resEstado, resNotifs] = await Promise.all([
        axios.get("http://localhost:8000/api/v1/notificaciones/estado-shut", { headers }),
        axios.get("http://localhost:8000/api/v1/notificaciones/mis-notificaciones", { headers }),
      ]);
      setEstadoShut(resEstado.data);
      setNotificaciones(resNotifs.data);
    } catch {
      // silent
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
    try {
      await axios.post(
        "http://localhost:8000/api/v1/notificaciones/enviar",
        { tipo: "SHUT_LLENO" },
        { headers }
      );
      setFeedbackOk(true);
      setTimeout(() => setFeedbackOk(false), 3500);
      cargarDatos();
    } catch {
      // silent
    } finally {
      setEnviando(false);
    }
  };

  const marcarLeida = async (id: number) => {
    await axios.post(`http://localhost:8000/api/v1/notificaciones/${id}/leer`, {}, { headers });
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
  };

  const marcarTodasLeidas = async () => {
    await axios.post("http://localhost:8000/api/v1/notificaciones/marcar-todas-leidas", {}, { headers });
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
  };

  const noLeidas = notificaciones.filter((n) => !n.leida).length;
  const [expandido, setExpandido] = useState(false);

  const limpiarLeidas = async () => {
    await axios.delete("http://localhost:8000/api/v1/notificaciones/limpiar-leidas", { headers });
    setNotificaciones((prev) => prev.filter((n) => !n.leida));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
            <Home className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Panel del Residente</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Bienvenido,{" "}
              <span className="font-semibold text-gray-800 dark:text-gray-200 uppercase">
                {fullName}
              </span>
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
              El SHUT está lleno
            </p>
            {estadoShut.created_at && (
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-500">
                Reportado {tiempoRelativo(estadoShut.created_at)}
              </p>
            )}
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-500">
              No bajes más material reciclable hasta que el reciclador indique que está libre.
            </p>
          </div>
        </div>
      )}

      {/* Acción: reportar SHUT lleno */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Reportar SHUT lleno
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              Avisa al reciclador y al administrador que el cuarto de basuras está lleno.
              El reporte es anónimo.
            </p>
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
                Enviado
              </>
            ) : (
              <>
                <Bell className="h-4 w-4" />
                Reportar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Actividad reciente (notificaciones recibidas) */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-green-600" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Actividad reciente</h2>
            {noLeidas > 0 && (
              <span className="rounded-full bg-green-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {noLeidas}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {noLeidas > 0 && (
              <button onClick={marcarTodasLeidas} className="text-xs font-medium text-green-600 hover:text-green-500">
                Marcar leídas
              </button>
            )}
            {notificaciones.some((n) => n.leida) && (
              <button onClick={limpiarLeidas} className="text-xs font-medium text-gray-400 hover:text-red-400">
                Limpiar leídas
              </button>
            )}
          </div>
        </div>

        {cargando ? (
          <p className="px-5 pb-5 text-sm text-gray-400">Cargando...</p>
        ) : notificaciones.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-gray-400">
            No tienes notificaciones aún. Aparecerán aquí cuando el reciclador envíe avisos.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-gray-50 dark:divide-gray-800">
              {(expandido ? notificaciones : notificaciones.slice(0, 5)).map((n) => {
                const meta = TIPO_META[n.tipo] ?? { Icon: Bell, color: "text-gray-500" };
                return (
                  <li
                    key={n.id}
                    onClick={() => !n.leida && marcarLeida(n.id)}
                    className={`flex cursor-pointer items-start gap-3 px-5 py-3.5 transition-colors ${
                      !n.leida
                        ? "bg-green-50/60 hover:bg-green-50 dark:bg-green-900/10 dark:hover:bg-green-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
                    }`}
                  >
                    <meta.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.color}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${!n.leida ? "font-semibold text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}`}>
                        {n.mensaje}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {n.nombre_conjunto} · {tiempoRelativo(n.created_at)}
                      </p>
                    </div>
                    {!n.leida && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-green-500" />}
                  </li>
                );
              })}
            </ul>
            {notificaciones.length > 5 && (
              <button
                onClick={() => setExpandido((v) => !v)}
                className="w-full py-2.5 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border-t border-gray-50 dark:border-gray-800 transition-colors"
              >
                {expandido ? "Ver menos" : `Ver ${notificaciones.length - 5} más`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
