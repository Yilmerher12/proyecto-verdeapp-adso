/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import {
  Mail,
  Phone,
  MapPin,
  Building2,
  Users as UsersIcon,
  Home,
  Recycle,
  Pencil,
  CheckCircle2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

const ROLE_META: Record<number, { label: string; Icon: LucideIcon; color: string; bg: string }> = {
  1: { label: "Administrador del Sistema", Icon: Building2, color: "text-gray-600 dark:text-gray-400",  bg: "bg-gray-100 dark:bg-gray-800/60" },
  2: { label: "Residente",                 Icon: Home,      color: "text-green-700 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/30" },
  3: { label: "Reciclador",                Icon: Recycle,   color: "text-teal-700 dark:text-teal-400",  bg: "bg-teal-50 dark:bg-teal-900/30" },
  4: { label: "Admin. de Conjunto",        Icon: Building2, color: "text-blue-700 dark:text-blue-400",  bg: "bg-blue-50 dark:bg-blue-900/30" },
};

function InfoField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">{value}</p>
    </div>
  );
}

export function ProfilePage() {
  const { accessToken } = useAuth() as any;
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [cargando, setCargando] = useState(true);

  const [editando, setEditando] = useState(false);
  const [formNombre, setFormNombre] = useState("");
  const [formApellidos, setFormApellidos] = useState("");
  const [formTelefono, setFormTelefono] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${accessToken}` };

  const cargarPerfil = () => {
    if (!accessToken) return;
    axios
      .get("http://localhost:8000/api/v1/users/me", { headers })
      .then((res) => setPerfil(res.data))
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargarPerfil(); }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const iniciarEdicion = () => {
    if (!perfil) return;
    setFormNombre(perfil.first_name);
    setFormApellidos(perfil.last_name);
    const tel = perfil.numero_telefonico;
    setFormTelefono(tel && tel !== "No registrado" && tel !== "N/A" ? tel : "");
    setEditando(true);
    setExito(false);
    setErrorMsg(null);
  };

  const cancelarEdicion = () => {
    setEditando(false);
    setErrorMsg(null);
  };

  const guardarPerfil = async () => {
    if (!formNombre.trim() || !formApellidos.trim()) {
      setErrorMsg("Nombre y apellidos son obligatorios.");
      return;
    }
    setGuardando(true);
    setErrorMsg(null);
    try {
      await axios.put(
        "http://localhost:8000/api/v1/users/me",
        {
          nombre: formNombre.trim(),
          apellidos: formApellidos.trim(),
          numero_telefonico: formTelefono.trim() || null,
        },
        { headers }
      );
      setEditando(false);
      setExito(true);
      setTimeout(() => setExito(false), 3000);
      cargarPerfil();
    } catch {
      setErrorMsg("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <p className="text-sm text-gray-400 px-2 pt-6">Cargando tu perfil...</p>;
  if (!perfil) return <p className="text-sm text-red-500 px-2 pt-6">No se pudo cargar tu perfil.</p>;

  const role = ROLE_META[perfil.role_id] ?? ROLE_META[2];
  const { Icon: RoleIcon } = role;
  const nombreCompleto = `${perfil.first_name} ${perfil.last_name}`.trim();
  const inicial = perfil.first_name?.charAt(0)?.toUpperCase() || "U";
  const canEdit = perfil.role_id !== 1;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pt-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mi perfil</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestiona tu información personal</p>
      </div>

      {/* Success banner */}
      {exito && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:border-green-700/40 dark:bg-green-900/15 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Perfil actualizado correctamente.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT — Avatar + rol + datos de contexto (2/5) */}
        <div className="lg:col-span-2 lg:self-start bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="h-20 w-20 rounded-full bg-green-700 flex items-center justify-center text-white text-3xl font-bold mb-4 select-none">
            {inicial}
          </div>

          {/* Nombre completo */}
          <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
            {nombreCompleto}
          </h2>

          {/* Badge de rol — icono Lucide, sin emoji */}
          <span className={`inline-flex items-center gap-1.5 mt-3 rounded-full ${role.bg} px-3 py-1 text-xs font-semibold ${role.color}`}>
            <RoleIcon className="h-3.5 w-3.5 shrink-0" />
            {role.label}
          </span>

          {/* Datos de contexto (no editables) */}
          <div className="w-full mt-6 space-y-2 text-left">
            {perfil.role_id === 2 && (
              <>
                {perfil.nombre_conjunto && (
                  <InfoField
                    label="Conjunto"
                    value={perfil.nombre_conjunto}
                    icon={<Building2 className="h-3 w-3" />}
                  />
                )}
                {(perfil.torre || perfil.apto) && (
                  <InfoField
                    label="Unidad"
                    value={`${perfil.torre ?? ""} · Apto ${perfil.apto ?? ""}`}
                  />
                )}
              </>
            )}

            {perfil.role_id === 3 && (
              <>
                {perfil.nombre_localidad && (
                  <InfoField
                    label="Localidad base"
                    value={perfil.nombre_localidad}
                    icon={<MapPin className="h-3 w-3" />}
                  />
                )}
                {perfil.asociacion && (
                  <InfoField
                    label="Asociación"
                    value={perfil.asociacion}
                    icon={<UsersIcon className="h-3 w-3" />}
                  />
                )}
              </>
            )}

            {perfil.role_id === 4 &&
              perfil.conjuntos_administrados &&
              perfil.conjuntos_administrados.length > 0 && (
                <InfoField
                  label={
                    perfil.conjuntos_administrados.length === 1
                      ? "Conjunto que administras"
                      : "Conjuntos que administras"
                  }
                  value={perfil.conjuntos_administrados.join(", ")}
                  icon={<Building2 className="h-3 w-3" />}
                />
              )}
          </div>
        </div>

        {/* RIGHT — Información personal editable (3/5) */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Información personal</h3>
            {canEdit && !editando && (
              <button
                onClick={iniciarEdicion}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
            )}
          </div>

          {!editando ? (
            /* Modo lectura */
            <div className="space-y-3">
              <InfoField label="Nombre" value={perfil.first_name} />
              <InfoField label="Apellidos" value={perfil.last_name} />
              <InfoField
                label="Teléfono"
                value={
                  perfil.numero_telefonico &&
                  perfil.numero_telefonico !== "No registrado" &&
                  perfil.numero_telefonico !== "N/A"
                    ? perfil.numero_telefonico
                    : "No registrado"
                }
                icon={<Phone className="h-3 w-3" />}
              />
              <InfoField
                label="Correo electrónico"
                value={perfil.email}
                icon={<Mail className="h-3 w-3" />}
              />
            </div>
          ) : (
            /* Modo edición */
            <div className="space-y-4">
              {errorMsg && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {errorMsg}
                </p>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Apellidos <span className="text-red-500">*</span>
                </label>
                <input
                  value={formApellidos}
                  onChange={(e) => setFormApellidos(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Teléfono
                </label>
                <input
                  value={formTelefono}
                  onChange={(e) => setFormTelefono(e.target.value)}
                  placeholder="Ej: 3001234567"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Correo electrónico
                </label>
                <div className="rounded-xl border border-gray-100 bg-gray-100/70 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800/40">
                  <p className="text-sm text-gray-400 dark:text-gray-500">{perfil.email}</p>
                </div>
                <p className="mt-1 text-[11px] text-gray-400">El correo no se puede cambiar desde aquí.</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={cancelarEdicion}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
                <button
                  onClick={guardarPerfil}
                  disabled={guardando}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-60 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {guardando ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
