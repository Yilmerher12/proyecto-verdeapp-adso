/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import { Mail, Phone, MapPin, Building2, Users as UsersIcon } from "lucide-react";

interface PerfilData {
  id: number;
  email: string;
  role_id: number;
  first_name: string;
  last_name: string;
  numero_telefonico: string | null;
  nombre_conjunto: string | null;
  torre: string | null;
  apto: string | null;
  asociacion: string | null;
  nombre_localidad: string | null;
  conjuntos_administrados: string[] | null;
}

const ROLE_META: Record<number, { label: string; emoji: string }> = {
  1: { label: "Administrador", emoji: "🛠️" },
  2: { label: "Residente", emoji: "🏠" },
  3: { label: "Reciclador", emoji: "♻️" },
  4: { label: "Admin. de Conjunto", emoji: "🏢" },
};

function CampoDato({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}

export function ProfilePage() {
  const { accessToken } = useAuth();
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    axios
      .get("http://localhost:8000/api/v1/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then((res) => setPerfil(res.data))
      .catch((err) => console.error("Error cargando perfil", err))
      .finally(() => setCargando(false));
  }, [accessToken]);

  if (cargando) {
    return <p className="text-sm text-gray-400 px-2">Cargando tu perfil...</p>;
  }

  if (!perfil) {
    return <p className="text-sm text-red-500 px-2">No se pudo cargar tu perfil. Intenta de nuevo.</p>;
  }

  const roleMeta = ROLE_META[perfil.role_id] ?? ROLE_META[2];
  const nombreCompleto = `${perfil.first_name} ${perfil.last_name}`.trim();
  const inicial = perfil.first_name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mi perfil</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gestiona tu información personal
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tarjeta 1 — Identidad */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 flex flex-col items-center text-center">
          <div className="h-20 w-20 rounded-full bg-green-700 flex items-center justify-center text-white text-2xl font-bold mb-4 select-none">
            {inicial}
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{nombreCompleto}</h2>
          <span className="inline-flex items-center gap-1.5 mt-2 rounded-full bg-green-50 dark:bg-green-900/30 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-400">
            <span aria-hidden="true">{roleMeta.emoji}</span>
            {roleMeta.label}
          </span>

          {/*
            ¿Qué? Datos contextuales en grid de 2 columnas (cuando hay 2 datos
                  cortos) en vez de una fila completa cada uno.
            ¿Para qué? "Sumapaz" e "INDEPENDIENTE" son valores cortos — en una
                      fila completa de ancho de tarjeta se ven con demasiado
                      espacio vacío a la derecha. Lado a lado se balancean mejor.
          */}
          <div className="w-full mt-6 space-y-2">
            {perfil.role_id === 2 && perfil.nombre_conjunto && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <CampoDato label="Conjunto" value={perfil.nombre_conjunto} icon={<Building2 className="h-3 w-3" />} />
                {(perfil.torre || perfil.apto) && (
                  <CampoDato
                    label="Unidad"
                    value={`${perfil.torre ?? ""} · Apto ${perfil.apto ?? ""}`}
                  />
                )}
              </div>
            )}

            {perfil.role_id === 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {perfil.nombre_localidad && (
                  <CampoDato label="Localidad base" value={perfil.nombre_localidad} icon={<MapPin className="h-3 w-3" />} />
                )}
                {perfil.asociacion && (
                  <CampoDato label="Asociación" value={perfil.asociacion} icon={<UsersIcon className="h-3 w-3" />} />
                )}
              </div>
            )}

            {perfil.role_id === 4 && perfil.conjuntos_administrados && perfil.conjuntos_administrados.length > 0 && (
              <CampoDato
                label={perfil.conjuntos_administrados.length === 1 ? "Conjunto que administras" : "Conjuntos que administras"}
                value={perfil.conjuntos_administrados.join(", ")}
                icon={<Building2 className="h-3 w-3" />}
              />
            )}
          </div>
        </div>

        {/* Tarjeta 2 — Información de contacto */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
            Información personal
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CampoDato label="Correo electrónico" value={perfil.email} icon={<Mail className="h-3 w-3" />} />
            <CampoDato
              label="Teléfono"
              value={perfil.numero_telefonico && perfil.numero_telefonico !== "N/A" ? perfil.numero_telefonico : "No registrado"}
              icon={<Phone className="h-3 w-3" />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}