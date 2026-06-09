import { useAuth } from "@/hooks/useAuth";
import { Recycle, MapPin, Truck } from "lucide-react";

export function RecicladorDashboard() {
  const { user } = useAuth(); // 🛠️ Extraemos la info del usuario en sesión

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* 🔵 TARJETA DE PERFIL (CUMPLE CRITERIO 5) */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-blue-500">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-4 rounded-full">
            <Recycle className="text-blue-600 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Panel del Reciclador</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Hola, <span className="font-bold uppercase">{user?.first_name} {user?.last_name}</span>. Qué bueno verte.
            </p>
            <p className="text-xs text-blue-600 font-semibold mt-1 tracking-wide">
              PERFIL: RECICLADOR | {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Espacio para futuras funcionalidades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
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