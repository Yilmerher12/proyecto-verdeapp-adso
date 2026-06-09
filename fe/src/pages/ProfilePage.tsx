/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAuth } from "@/hooks/useAuth";
import { User, Mail, Shield, MapPin, Building, Phone } from "lucide-react";

export function ProfilePage() {
  const { user } = useAuth();
  
  const userData = user as any;
  const userRole = userData?.role?.toLowerCase() || userData?.rol?.toLowerCase() || "residente";

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

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {/* Banner Superior Verde */}
        <div className="h-24 bg-gradient-to-r from-green-800 to-green-950 p-6 flex items-end justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold text-green-300 uppercase tracking-wider backdrop-blur-sm border border-green-500/30">
            Cuenta Activa
          </span>
        </div>

        {/* Tarjeta de Datos Cuerpo */}
        <div className="p-6 relative pt-12">
          {/* Avatar Flotante */}
          <div className="absolute -top-10 left-6 h-20 w-20 rounded-2xl bg-green-700 border-4 border-white dark:border-gray-900 flex items-center justify-center text-white font-black text-2xl shadow-sm">
            {userData?.first_name ? userData.first_name.charAt(0).toUpperCase() : <User className="h-8 w-8" />}
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase">
                {userData?.first_name || "Usuario"} {userData?.last_name || "VerdeApp"}
              </h2>
              <p className="text-sm font-medium text-green-600 dark:text-green-400 capitalize mt-0.5 flex items-center gap-1">
                🏡 Rol de Sistema: {userRole}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800">
                <Mail className="h-5 w-5 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Correo Electrónico</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{userData?.correo_electronico || userData?.email || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800">
                <Phone className="h-5 w-5 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Número Telefónico</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{userData?.numero_telefonico || "N/A"}</p>
                </div>
              </div>

              {/* 🟢 ATRIBUTOS EXCLUSIVOS: SI ES RESIDENTE */}
              {userRole === "residente" && (
                <>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800">
                    <Building className="h-5 w-5 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Conjunto Residencial</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{userData?.nombre_conjunto || "Registrado"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800">
                    <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ubicación Interna</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                        {userData?.torre || "N/A"} - Apto {userData?.apto || "N/A"}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* 🟢 ATRIBUTOS EXCLUSIVOS: SI ES RECICLADOR */}
              {userRole === "reciclador" && (
                <>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800">
                    <Shield className="h-5 w-5 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Asociación Avalada</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate uppercase">{userData?.asociacion || "INDEPENDIENTE"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800">
                    <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Localidad Base de Operación</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{userData?.nombre_localidad || "Asignada"}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}