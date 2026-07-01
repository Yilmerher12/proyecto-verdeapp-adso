import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Shield, Users, Database, UserPlus } from "lucide-react";
import axios from "axios";
import { InvitarAdminConjuntoForm } from "@/components/InvitarAdminConjuntoForm";

interface ResidenteRow {
  Correo: string;
  Nombre: string;
  Apellido: string;
  Conjunto: string;
  Bloque: string;
  Apartamento: string;
}

interface RecicladorRow {
  Correo: string;
  Nombre_Completo: string;
  Asociacion: string;
}

export function AdminDashboard() {
  const { user, accessToken } = useAuth();
  const [residentesData, setResidentesData] = useState<ResidenteRow[]>([]);
  const [recicladoresData, setRecicladoresData] = useState<RecicladorRow[]>([]);
  const [mostrarInvitar, setMostrarInvitar] = useState(false);

  useEffect(() => {
    axios.get("http://localhost:8000/api/v1/admin/vista-residentes")
      .then(res => setResidentesData(res.data))
      .catch(err => console.error("Error cargando vista SQL", err));

    axios.get("http://localhost:8000/api/v1/admin/sp-recicladores")
      .then(res => setRecicladoresData(res.data))
      .catch(err => console.error("Error cargando SP", err));
  }, []);

  const fullName = `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Administrador";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
            <Shield className="h-7 w-7 text-green-700 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Panel de Administración</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Bienvenido,{" "}
              <span className="font-semibold text-gray-800 dark:text-gray-200 uppercase">{fullName}</span>
            </p>
            <p className="text-xs text-green-700 dark:text-green-400 font-semibold mt-1">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Invitar Administradores de Conjunto */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-green-600" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Administradores de Conjunto</h3>
          </div>
          <button
            type="button"
            onClick={() => setMostrarInvitar((prev) => !prev)}
            className="text-xs font-semibold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 px-3 py-1.5 rounded-xl transition-colors"
          >
            {mostrarInvitar ? "Ocultar" : "+ Invitar administrador"}
          </button>
        </div>
        {mostrarInvitar && (
          <div className="mt-4">
            <InvitarAdminConjuntoForm token={accessToken || ""} />
          </div>
        )}
      </div>

      {/* Tabla: Residentes (Vista SQL) */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <Database className="h-4 w-4 text-green-600" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Listado de Residentes
          </h3>
          <span className="ml-auto rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
            Vista SQL
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Correo</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nombre</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Conjunto</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Unidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {residentesData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-sm text-gray-400">
                    Cargando datos...
                  </td>
                </tr>
              ) : (
                residentesData.map((r, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300">{r.Correo}</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">{r.Nombre} {r.Apellido}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{r.Conjunto}</td>
                    <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400">Blq {r.Bloque} · Apto {r.Apartamento}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla: Recicladores (Procedimiento Almacenado) */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <Users className="h-4 w-4 text-green-600" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Listado de Recicladores
          </h3>
          <span className="ml-auto rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
            Procedimiento Almacenado
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Correo</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nombre completo</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Asociación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {recicladoresData.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-6 text-center text-sm text-gray-400">
                    Cargando datos...
                  </td>
                </tr>
              ) : (
                recicladoresData.map((r, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300">{r.Correo}</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">{r.Nombre_Completo}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-green-50 dark:bg-green-900/20 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
                        {r.Asociacion}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
