import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Building2, MapPin, Pencil, Check, X, Users, Mail, Send, Clock, Truck, AlertTriangle, PackageCheck, Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import axios from "axios";
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
  SHUT_LIBRE:         { Icon: PackageCheck,  color: "text-green-700 dark:text-green-500" },
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

/**
 * ¿Qué? Badge de color según el estado de la invitación.
 * ¿Para qué? Distinguir visualmente PENDIENTE (ámbar) / ACEPTADA (verde) /
 *           RECHAZADA (rojo) sin tener que leer el texto con atención.
 */
function BadgeEstado({ estado }: { estado: string }) {
  const estilos: Record<string, string> = {
    PENDIENTE: "bg-amber-100 text-amber-700",
    ACEPTADA: "bg-green-100 text-green-700",
    RECHAZADA: "bg-red-100 text-red-700",
  };
  const etiquetas: Record<string, string> = {
    PENDIENTE: "Pendiente",
    ACEPTADA: "Aceptada",
    RECHAZADA: "Rechazada",
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
      setErrorInvitar(detalle || "No se pudo enviar la invitación. Verifica el correo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-green-600" />
          <h5 className="text-sm font-bold text-gray-700">Recicladores Autorizados</h5>
        </div>
        <button
          type="button"
          onClick={() => setMostrarFormulario((v) => !v)}
          className="text-xs font-semibold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          + Invitar reciclador
        </button>
      </div>

      {mostrarFormulario && (
        <form onSubmit={handleInvitar} className="flex flex-col sm:flex-row gap-2 mb-4 bg-gray-50 p-3 rounded-xl">
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              placeholder="correo.del.reciclador@ejemplo.com"
              value={correoNuevo}
              onChange={(e) => setCorreoNuevo(e.target.value)}
              className="w-full pl-9 p-2.5 border rounded-xl bg-white text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={enviando || !correoNuevo.trim()}
            className="flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {enviando ? "Enviando..." : "Invitar"}
          </button>
        </form>
      )}

      {errorInvitar && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{errorInvitar}</p>
      )}

      {cargando ? (
        <p className="text-xs text-gray-400">Cargando recicladores...</p>
      ) : invitaciones.length === 0 ? (
        <p className="text-xs text-gray-400">
          Todavía no has invitado a ningún reciclador a este conjunto.
        </p>
      ) : (
        <div className="space-y-2">
          {invitaciones.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
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
  const { user, accessToken } = useAuth();
  const [conjuntos, setConjuntos] = useState<ConjuntoAdministrado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formEdicion, setFormEdicion] = useState({ nombre_conjunto: "", nit: "", direccion: "" });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>([]);
  const [expandidoNotifs, setExpandidoNotifs] = useState(false);

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
      .get("http://localhost:8000/api/v1/notificaciones/mis-notificaciones", { headers: authHeaders })
      .then((res) => setNotificaciones(res.data))
      .catch(() => {});
  };

  const marcarLeida = async (id: number) => {
    await axios.post(`http://localhost:8000/api/v1/notificaciones/${id}/leer`, {}, { headers: authHeaders });
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
  };

  const marcarTodasLeidas = async () => {
    await axios.post("http://localhost:8000/api/v1/notificaciones/marcar-todas-leidas", {}, { headers: authHeaders });
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
  };

  const limpiarLeidas = async () => {
    await axios.delete("http://localhost:8000/api/v1/notificaciones/limpiar-leidas", { headers: authHeaders });
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
      setMensaje("Conjunto actualizado correctamente.");
      setEditandoId(null);
      cargarConjuntos();
    } catch (err) {
      console.error("Error al editar conjunto", err);
      setMensaje("No se pudo guardar el cambio. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* TARJETA DE PERFIL */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-green-600">
        <div className="flex items-center gap-4">
          <div className="bg-green-100 p-4 rounded-full">
            <Building2 className="text-green-600 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Panel de Administrador de Conjunto</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Bienvenido, <span className="font-bold uppercase">{user?.first_name} {user?.last_name}</span>.
            </p>
            <p className="text-xs text-green-600 font-semibold mt-1 tracking-wide">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {mensaje && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-xl">
          {mensaje}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-100">
        <div className="flex items-center gap-2 mb-4 border-b pb-2">
          <Building2 className="text-green-600 w-5 h-5" />
          <h3 className="font-bold text-gray-800 dark:text-white">Conjuntos que administras</h3>
        </div>

        {cargando ? (
          <p className="text-sm text-gray-400 py-4">Cargando tus conjuntos...</p>
        ) : conjuntos.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">
            Todavía no tienes ningún conjunto asignado. Contacta al equipo de VerdeApp.
          </p>
        ) : (
          <div className="space-y-4">
            {conjuntos.map((c) => (
              <div
                key={c.id_conjunto_residencial}
                className="border border-gray-200 rounded-xl p-4"
              >
                {editandoId === c.id_conjunto_residencial ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-gray-600">Nombre del conjunto</label>
                      <input
                        type="text"
                        value={formEdicion.nombre_conjunto}
                        onChange={(e) =>
                          setFormEdicion((p) => ({ ...p, nombre_conjunto: e.target.value }))
                        }
                        className="w-full p-2.5 border rounded-xl mt-1 bg-white focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600">NIT (opcional)</label>
                      <input
                        type="text"
                        value={formEdicion.nit}
                        onChange={(e) => setFormEdicion((p) => ({ ...p, nit: e.target.value }))}
                        className="w-full p-2.5 border rounded-xl mt-1 bg-white focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600">Dirección</label>
                      <input
                        type="text"
                        value={formEdicion.direccion}
                        onChange={(e) =>
                          setFormEdicion((p) => ({ ...p, direccion: e.target.value }))
                        }
                        className="w-full p-2.5 border rounded-xl mt-1 bg-white focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => guardarEdicion(c.id_conjunto_residencial)}
                        disabled={guardando}
                        className="flex items-center gap-1 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
                      >
                        <Check className="w-4 h-4" /> Guardar
                      </button>
                      <button
                        type="button"
                        onClick={cancelarEdicion}
                        className="flex items-center gap-1 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-colors"
                      >
                        <X className="w-4 h-4" /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-gray-800">{c.nombre_conjunto}</h4>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {c.direccion} — {c.nombre_localidad}
                        </p>
                        {c.nit && <p className="text-xs text-gray-400 mt-1">NIT: {c.nit}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => iniciarEdicion(c)}
                        className="flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-xl transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Editar
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
      {(() => {
        const noLeidas = notificaciones.filter((n) => !n.leida).length;
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />
                <h3 className="text-sm font-bold text-gray-800 dark:text-white">Actividad del conjunto</h3>
                {noLeidas > 0 && (
                  <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
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

            {notificaciones.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-gray-400">
                No hay actividad aún. Las notificaciones de recicladores y residentes aparecerán aquí.
              </p>
            ) : (
              <>
                <ul className="divide-y divide-gray-50 dark:divide-gray-700">
                  {(expandidoNotifs ? notificaciones : notificaciones.slice(0, 5)).map((n) => {
                    const meta = TIPO_META[n.tipo] ?? { Icon: Bell, color: "text-gray-500" };
                    return (
                      <li
                        key={n.id}
                        onClick={() => !n.leida && marcarLeida(n.id)}
                        className={`flex cursor-pointer items-start gap-3 px-5 py-3.5 transition-colors ${
                          !n.leida
                            ? "bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-900/10 dark:hover:bg-blue-900/20"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700/30"
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
                        {!n.leida && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                      </li>
                    );
                  })}
                </ul>
                {notificaciones.length > 5 && (
                  <button
                    onClick={() => setExpandidoNotifs((v) => !v)}
                    className="w-full py-2.5 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border-t border-gray-50 dark:border-gray-700 transition-colors"
                  >
                    {expandidoNotifs ? "Ver menos" : `Ver ${notificaciones.length - 5} más`}
                  </button>
                )}
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}