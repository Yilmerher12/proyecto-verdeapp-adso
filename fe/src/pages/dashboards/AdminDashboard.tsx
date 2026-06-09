import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Shield, Users, Database } from "lucide-react";
import axios from "axios";

// 🛠️ Interfaces estrictas para eliminar la palabra 'any' por completo
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
  const { user } = useAuth();
  
  // Estados tipados correctamente sin usar 'any'
  const [residentesData, setResidentesData] = useState<ResidenteRow[]>([]);
  const [recicladoresData, setRecicladoresData] = useState<RecicladorRow[]>([]);

  useEffect(() => {
    // Consumir la Vista SQL (Criterio 6)
    axios.get("http://localhost:8000/api/v1/admin/vista-residentes")
      .then(res => setResidentesData(res.data))
      .catch(err => console.error("Error cargando vista SQL", err));

    // Consumir el Procedimiento Almacenado (Criterio 7)
    axios.get("http://localhost:8000/api/v1/admin/sp-recicladores")
      .then(res => setRecicladoresData(res.data))
      .catch(err => console.error("Error cargando SP", err));
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* TARJETA DE PERFIL (CUMPLE CRITERIO 5) */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-purple-600">
        <div className="flex items-center gap-4">
          <div className="bg-purple-100 p-4 rounded-full">
            <Shield className="text-purple-600 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Panel de Administración</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Sistema de gestión. Usuario activo: <span className="font-bold uppercase">{user?.first_name} {user?.last_name}</span>.
            </p>
            <p className="text-xs text-purple-600 font-semibold mt-1 tracking-wide">
              PERFIL: ADMINISTRADOR MÁSTER | {user?.email}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 pt-4">
        
        {/* 📋 TABLA 1: VISTA SQL (CRITERIO 6) */}
        <div className="p-6 border rounded-lg shadow-sm bg-white overflow-hidden">
          <div className="flex items-center gap-2 mb-4 border-b pb-2">
            <Database className="text-purple-600 w-5 h-5" />
            <h3 className="font-bold text-gray-800">Listado de Residentes (Mediante Vista SQL)</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3">Correo</th>
                  <th className="px-6 py-3">Nombres</th>
                  <th className="px-6 py-3">Conjunto</th>
                  <th className="px-6 py-3">Ubicación</th>
                </tr>
              </thead>
              <tbody>
                {residentesData.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-4 text-center">Cargando datos...</td></tr>
                ) : (
                  residentesData.map((residente, idx) => (
                    <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{residente.Correo}</td>
                      <td className="px-6 py-4">{residente.Nombre} {residente.Apellido}</td>
                      <td className="px-6 py-4">{residente.Conjunto}</td>
                      <td className="px-6 py-4 text-xs">Blq {residente.Bloque} - Apto {residente.Apartamento}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 📋 TABLA 2: PROCEDIMIENTO ALMACENADO (CRITERIO 7) */}
        <div className="p-6 border rounded-lg shadow-sm bg-white overflow-hidden">
           <div className="flex items-center gap-2 mb-4 border-b pb-2">
             <Users className="text-purple-600 w-5 h-5" />
             <h3 className="font-bold text-gray-800">Listado de Recicladores (Mediante Procedimiento Almacenado)</h3>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left text-gray-500">
               <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                 <tr>
                   <th className="px-6 py-3">Correo Electrónico</th>
                   <th className="px-6 py-3">Nombre Completo</th>
                   <th className="px-6 py-3">Asociación</th>
                 </tr>
               </thead>
               <tbody>
                 {recicladoresData.length === 0 ? (
                   <tr><td colSpan={3} className="px-6 py-4 text-center">Cargando datos...</td></tr>
                 ) : (
                   recicladoresData.map((reciclador, idx) => (
                     <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                       <td className="px-6 py-4 font-medium text-gray-900">{reciclador.Correo}</td>
                       <td className="px-6 py-4">{reciclador.Nombre_Completo}</td>
                       <td className="px-6 py-4">
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                            {reciclador.Asociacion}
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
    </div>
  );
}