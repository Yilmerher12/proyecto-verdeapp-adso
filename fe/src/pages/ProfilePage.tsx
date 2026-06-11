/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAuth } from "@/hooks/useAuth";
import { Mail, Shield, MapPin, Building, Phone } from "lucide-react";

export function ProfilePage() {
  const { user } = useAuth();
  const userData = user as any;
  
  const userRole = userData?.role_id === 1 ? "administrador" : userData?.role_id === 3 ? "reciclador" : "residente";
  const userRoleLabel = userData?.role_id === 1 ? "Administrador Máster" : userData?.role_id === 3 ? "Reciclador de Oficio" : "Residente de Conjunto";

  return (
    <div className="mx-auto max-w-2xl p-2 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Mi Perfil de Usuario
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Información registrada y credenciales operativas dentro del ecosistema de VerdeApp.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden flex flex-col">
        {/* Banner Superior Verde - Aumentamos la altura base */}
        <div className="h-32 bg-linear-to-r from-green-800 to-green-950 p-6 flex items-start justify-end relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold text-green-300 uppercase tracking-wider backdrop-blur-sm border border-green-500/30">
            Cuenta Activa
          </span>
        </div>

        {/* Contenido Principal */}
        <div className="px-6 pb-8">
          
          {/* Cabecera del Perfil con Flexbox Seguro (sin superposiciones) */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-12 mb-8 relative z-10 text-center sm:text-left">
            {/* Avatar Flotante Centrado/Izquierda */}
            <div className="h-24 w-24 rounded-2xl bg-green-700 border-4 border-white dark:border-gray-900 flex items-center justify-center text-white font-black text-4xl shadow-md shrink-0 select-none">
              {userData?.first_name ? userData.first_name.charAt(0).toUpperCase() : "U"}
            </div>
            
            {/* Contenedor de Textos Limpio */}
            <div className="pt-2">
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white uppercase tracking-tight">
                {userData?.first_name} {userData?.last_name}
              </h2>
              <p className="text-sm font-semibold text-green-600 dark:text-green-400 capitalize mt-1.5">
                Rol de Sistema: {userRoleLabel}
              </p>
            </div>
          </div>

          {/* GRID DE INFORMACIÓN DE REGISTRO REAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-gray-100 dark:border-gray-800">
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-green-300 transition-colors">
              <Mail className="h-5 w-5 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Correo Electrónico</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{userData?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-green-300 transition-colors">
              <Phone className="h-5 w-5 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Número Telefónico</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{userData?.numero_telefonico}</p>
              </div>
            </div>

            {/* Atributos Exclusivos: Residente */}
            {userRole === "residente" && (
              <>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-green-300 transition-colors">
                  <Building className="h-5 w-5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Conjunto Residencial</p>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{userData?.nombre_conjunto}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-green-300 transition-colors">
                  <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ubicación Interna</p>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                      {userData?.torre} - Apto {userData?.apto}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Atributos Exclusivos: Reciclador */}
            {userRole === "reciclador" && (
              <>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-green-300 transition-colors">
                  <Shield className="h-5 w-5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Asociación Avalada</p>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate uppercase">{userData?.asociacion}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-green-300 transition-colors">
                  <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Localidad Base de Operación</p>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{userData?.nombre_localidad}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}