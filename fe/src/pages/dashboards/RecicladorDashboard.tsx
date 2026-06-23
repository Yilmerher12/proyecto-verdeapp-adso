/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Recycle, MapPin, Truck, Mail, CheckCircle2, XCircle, Building2 } from "lucide-react";
import axios from "axios";

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

export function RecicladorDashboard() {
  const { user, accessToken }: any = useAuth();

  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Reciclador";

  const [invitaciones, setInvitaciones] = useState<InvitacionPendiente[]>([]);
  const [conjuntosAutorizados, setConjuntosAutorizados] = useState<ConjuntoAutorizado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${accessToken}` };

  const cargarDatos = () => {
    Promise.all([
      axios.get("http://localhost:8000/api/v1/reciclador-conjunto/mis-invitaciones", { headers }),
      axios.get("http://localhost:8000/api/v1/reciclador-conjunto/mis-conjuntos-autorizados", { headers }),
    ])
      .then(([resInvitaciones, resConjuntos]) => {
        setInvitaciones(resInvitaciones.data);
        setConjuntosAutorizados(resConjuntos.data);
      })
      .catch((err) => console.error("Error cargando datos de reciclador-conjunto", err))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    if (accessToken) cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const responderInvitacion = async (id: string, aceptar: boolean) => {
    setProcesandoId(id);
    try {
      await axios.post(
        `http://localhost:8000/api/v1/reciclador-conjunto/invitaciones/${id}/responder`,
        { aceptar },
        { headers }
      );
      // ¿Qué? Recarga ambas listas — si aceptó, debe desaparecer de
      //       "pendientes" y aparecer en "conjuntos autorizados".
      cargarDatos();
    } catch (err) {
      console.error("Error respondiendo invitación", err);
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-blue-500">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-4 rounded-full">
            <Recycle className="text-blue-600 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Panel del Reciclador</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Hola, <span className="font-bold uppercase">{fullName}</span>. Qué bueno verte.
            </p>
            <p className="text-xs text-blue-600 font-semibold mt-1 tracking-wide">
              PERFIL: RECICLADOR | {user?.email || user?.correo_electronico || user?.sub}
            </p>
          </div>
        </div>
      </div>

      {/*
        ¿Qué? Sección "Mis Invitaciones Pendientes" — solo se muestra si
              hay al menos una invitación esperando respuesta.
        ¿Para qué? Evitar mostrar una sección vacía cuando no hay nada
                  pendiente, manteniendo el dashboard limpio.
      */}
      {!cargando && invitaciones.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Invitaciones Pendientes
            </h2>
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {invitaciones.length}
            </span>
          </div>

          <div className="space-y-3">
            {invitaciones.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800"
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{inv.nombre_conjunto}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{inv.direccion_conjunto}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Invitado por {inv.invitado_por_nombre}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => responderInvitacion(inv.id, true)}
                    disabled={procesandoId === inv.id}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Aceptar
                  </button>
                  <button
                    onClick={() => responderInvitacion(inv.id, false)}
                    disabled={procesandoId === inv.id}
                    className="flex items-center gap-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/*
        ¿Qué? Sección "Mis Conjuntos Autorizados" — solo lectura, lista
              los conjuntos donde el reciclador YA puede trabajar.
      */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Mis Conjuntos Autorizados
          </h2>
        </div>

        {cargando ? (
          <p className="text-sm text-gray-400">Cargando...</p>
        ) : conjuntosAutorizados.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Todavía no estás autorizado en ningún conjunto. Cuando un administrador
            te invite y aceptes, aparecerá aquí.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {conjuntosAutorizados.map((c) => (
              <div
                key={c.id_conjunto_residencial}
                className="rounded-xl bg-gray-50 dark:bg-gray-700/40 p-4"
              >
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  {c.nombre_conjunto}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.direccion}</p>
                <p className="text-xs text-gray-400 mt-1">{c.nombre_localidad}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accesos rápidos existentes — sin cambios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="p-6 border rounded shadow-sm bg-gray-50 flex items-center gap-4 cursor-pointer hover:bg-blue-50 transition">
           <MapPin className="text-blue-500 w-6 h-6" />
           <span className="font-semibold text-gray-700">Rutas y Alertas de Recolección</span>
        </div>
        <div className="p-6 border rounded shadow-sm bg-gray-50 flex items-center gap-4 cursor-pointer hover:bg-blue-50 transition">
           <Truck className="text-blue-500 w-6 h-6" />
           <span className="font-semibold text-gray-700">Mi Historial de Material Recogido</span>
        </div>
      </div>
    </div>
  );
}