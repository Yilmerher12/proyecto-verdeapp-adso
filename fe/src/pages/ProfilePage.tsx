/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import { API_BASE_URL } from "@/api/axios";
import {
  Mail,
  Phone,
  MapPin,
  Building2,
  Users as UsersIcon,
  Pencil,
  CheckCircle2,
  X,
} from "lucide-react";
import { RoleId } from "@/types/auth";
import { ROLE_THEME } from "@/config/roleTheme";

interface PerfilData {
  id: number;
  email: string;
  role_id: RoleId;
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
  const { t } = useTranslation();
  const { accessToken } = useAuth() as any;
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [cargando, setCargando] = useState(true);

  const [editando, setEditando] = useState(false);
  const [formNombre, setFormNombre] = useState("");
  const [formApellidos, setFormApellidos] = useState("");
  const [formTelefono, setFormTelefono] = useState("");
  const [formAsociacion, setFormAsociacion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ¿Qué? Mismo formato que valida el backend (RQF-008): solo dígitos,
  //       entre 7 (fijo) y 10 (celular) caracteres.
  const TELEFONO_REGEX = /^\d{7,10}$/;

  const headers = { Authorization: `Bearer ${accessToken}` };

  const cargarPerfil = () => {
    if (!accessToken) return;
    axios
      .get(`${API_BASE_URL}/api/v1/users/me`, { headers })
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
    const asoc = perfil.asociacion;
    setFormAsociacion(asoc && asoc !== "INDEPENDIENTE" ? asoc : "");
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
      setErrorMsg(t("profile.validation.nameRequired"));
      return;
    }
    const telefono = formTelefono.trim();
    if (telefono && !TELEFONO_REGEX.test(telefono)) {
      setErrorMsg(t("profile.validation.phoneInvalid"));
      return;
    }
    setGuardando(true);
    setErrorMsg(null);
    try {
      await axios.put(
        `${API_BASE_URL}/api/v1/users/me`,
        {
          nombre: formNombre.trim(),
          apellidos: formApellidos.trim(),
          numero_telefonico: telefono || null,
          asociacion: formAsociacion.trim() || null,
        },
        { headers }
      );
      setEditando(false);
      setExito(true);
      setTimeout(() => setExito(false), 3000);
      cargarPerfil();
    } catch (err) {
      const backendMsg = axios.isAxiosError(err)
        ? (err.response?.data as { detail?: string } | undefined)?.detail
        : undefined;
      setErrorMsg(backendMsg || t("common.saveError"));
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <p className="text-sm text-gray-400 px-2 pt-6">{t("profile.loading")}</p>;
  if (!perfil) return <p className="text-sm text-red-500 px-2 pt-6">{t("profile.loadError")}</p>;

  const role = ROLE_THEME[perfil.role_id] ?? ROLE_THEME[RoleId.RESIDENTE];
  const { Icon: RoleIcon } = role;
  const ROLE_LABEL_KEY: Record<RoleId, string> = {
    [RoleId.ADMIN_SISTEMA]: "roles.adminSistema",
    [RoleId.RESIDENTE]: "roles.residente",
    [RoleId.RECICLADOR]: "roles.reciclador",
    [RoleId.ADMIN_CONJUNTO]: "roles.adminConjunto",
  };
  const roleLabel = t(ROLE_LABEL_KEY[perfil.role_id] ?? ROLE_LABEL_KEY[RoleId.RESIDENTE]);
  const nombreCompleto = `${perfil.first_name} ${perfil.last_name}`.trim();
  const inicial = perfil.first_name?.charAt(0)?.toUpperCase() || "U";
  const canEdit = perfil.role_id !== 1;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pt-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("profile.title")}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("profile.subtitle")}</p>
      </div>

      {/* Success banner */}
      {exito && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:border-green-700/40 dark:bg-green-900/15 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {t("profile.updateSuccess")}
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
          <span className={`inline-flex items-center gap-1.5 mt-3 rounded-full ${role.badgeBg} px-3 py-1 text-xs font-semibold ${role.badgeText}`}>
            <RoleIcon className="h-3.5 w-3.5 shrink-0" />
            {roleLabel}
          </span>

          {/* Datos de contexto (no editables) */}
          <div className="w-full mt-6 space-y-2 text-left">
            {perfil.role_id === RoleId.RESIDENTE && (
              <>
                {perfil.nombre_conjunto && (
                  <InfoField
                    label={t("profile.fields.conjunto")}
                    value={perfil.nombre_conjunto}
                    icon={<Building2 className="h-3 w-3" />}
                  />
                )}
                {(perfil.torre || perfil.apto) && (
                  <InfoField
                    label={t("profile.fields.unit")}
                    value={t("profile.fields.unitFormat", { torre: perfil.torre ?? "", apto: perfil.apto ?? "" })}
                  />
                )}
              </>
            )}

            {perfil.role_id === RoleId.RECICLADOR && (
              <>
                {perfil.nombre_localidad && (
                  <InfoField
                    label={t("profile.fields.baseLocality")}
                    value={perfil.nombre_localidad}
                    icon={<MapPin className="h-3 w-3" />}
                  />
                )}
                {perfil.asociacion && (
                  <InfoField
                    label={t("profile.fields.association")}
                    value={perfil.asociacion}
                    icon={<UsersIcon className="h-3 w-3" />}
                  />
                )}
              </>
            )}

            {perfil.role_id === RoleId.ADMIN_CONJUNTO &&
              perfil.conjuntos_administrados &&
              perfil.conjuntos_administrados.length > 0 && (
                <InfoField
                  label={
                    perfil.conjuntos_administrados.length === 1
                      ? t("profile.managedConjuntoSingular")
                      : t("profile.managedConjuntoPlural")
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
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t("profile.personalInfoSection.title")}</h3>
            {canEdit && !editando && (
              <button
                onClick={iniciarEdicion}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("common.edit")}
              </button>
            )}
          </div>

          {!editando ? (
            /* Modo lectura */
            <div className="space-y-3">
              <InfoField label={t("profile.fields.firstName")} value={perfil.first_name} />
              <InfoField label={t("profile.fields.lastName")} value={perfil.last_name} />
              <InfoField
                label={t("common.phone")}
                value={
                  perfil.numero_telefonico &&
                  perfil.numero_telefonico !== "No registrado" &&
                  perfil.numero_telefonico !== "N/A"
                    ? perfil.numero_telefonico
                    : t("profile.notRegistered")
                }
                icon={<Phone className="h-3 w-3" />}
              />
              <InfoField
                label={t("common.email")}
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
                  {t("profile.fields.firstName")} <span className="text-red-500">*</span>
                </label>
                <input
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {t("profile.fields.lastName")} <span className="text-red-500">*</span>
                </label>
                <input
                  value={formApellidos}
                  onChange={(e) => setFormApellidos(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {t("common.phone")}
                </label>
                <input
                  value={formTelefono}
                  onChange={(e) => setFormTelefono(e.target.value)}
                  placeholder={t("profile.phonePlaceholder")}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {perfil.role_id === RoleId.RECICLADOR && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    {t("profile.fields.association")}
                  </label>
                  <input
                    value={formAsociacion}
                    onChange={(e) => setFormAsociacion(e.target.value)}
                    placeholder={t("profile.associationPlaceholder")}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {t("common.email")}
                </label>
                <div className="rounded-xl border border-gray-100 bg-gray-100/70 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800/40">
                  <p className="text-sm text-gray-400 dark:text-gray-500">{perfil.email}</p>
                </div>
                <p className="mt-1 text-[11px] text-gray-400">{t("profile.emailNote")}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={cancelarEdicion}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                  {t("common.cancel")}
                </button>
                <button
                  onClick={guardarPerfil}
                  disabled={guardando}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-60 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {guardando ? t("common.saving") : t("profile.saveChanges")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
