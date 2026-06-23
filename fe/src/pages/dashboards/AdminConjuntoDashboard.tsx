import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Building2, MapPin, Pencil, Check, X, Users, Mail, Send } from "lucide-react";
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

  const cargarConjuntos = () => {
    if (!accessToken) return;
    setCargando(true);
    obtenerMisConjuntos(accessToken)
      .then(setConjuntos)
      .catch((err) => console.error("Error cargando mis conjuntos", err))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarConjuntos();
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
    </div>
  );
}