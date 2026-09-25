 
import { useCallback, useEffect, useRef, useState } from "react";
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
  Camera,
  Loader2,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { RoleId } from "@/types/auth";
import { ROLE_THEME } from "@/config/roleTheme";
import { notificarFotoPerfilActualizada } from "@/lib/profileEvents";
import { TELEFONO_REGEX } from "@/lib/validacion";
import { useAvisoTemporal } from "@/hooks/useAvisoTemporal";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import { InputField } from "@/components/ui/InputField";

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
  // ¿Qué? Solo aplica al rol Reciclador — ver ProfilePage/DirectorioPage.
  mostrar_contacto_directorio: boolean;
  // ¿Qué? Ruta relativa (/uploads/perfiles/...) o null si nunca ha subido
  //       una — en ese caso se sigue mostrando el círculo con la inicial.
  foto_perfil_url: string | null;
}

// ¿Qué? Misma lista y mismo tope que ya valida el backend
//       (be/app/utils/imagenes.py) — se revisa aquí también para avisar al
//       instante, sin esperar el viaje de ida y vuelta con un archivo que
//       de todas formas se va a rechazar.
const TIPOS_IMAGEN_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

function InfoField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-[#1a3324]/60 px-4 py-3">
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
  const { user } = useAuth();
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [cargando, setCargando] = useState(true);

  const [editando, setEditando] = useState(false);
  const [formNombre, setFormNombre] = useState("");
  const [formApellidos, setFormApellidos] = useState("");
  const [formTelefono, setFormTelefono] = useState("");
  const [formAsociacion, setFormAsociacion] = useState("");
  const [formMostrarContacto, setFormMostrarContacto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [exito, mostrarExito] = useAvisoTemporal<boolean>();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // ¿Qué? Issue #13 (hallazgo U8 de la auditoría) — antes "nombre y
  //       apellidos son obligatorios" era un solo Alert genérico que no
  //       decía cuál de los dos. Ahora cada campo se valida al salir de
  //       él (onBlur), igual que ya hacen los formularios de auth.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const cargarPerfil = useCallback(() => {
    if (!user) return;
    axios
      .get(`${API_BASE_URL}/api/v1/users/me`)
      .then((res) => setPerfil(res.data))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [user]);

  // ¿Qué? Issue #225 — "cargarPerfil" faltaba en las dependencias; se
  //       silenciaba la advertencia en vez de agregarla.
  useEffect(() => {
    cargarPerfil();
  }, [cargarPerfil]);

  // ¿Qué? Sube la foto de perfil — disponible para los 4 roles (a
  //       diferencia de nombre/teléfono, que el Admin del Sistema no puede
  //       editar, ver `canEdit` más abajo).
  // ¿Para qué? Valida tipo/tamaño en el navegador ANTES de subir, igual que
  //           ya hace ImagenAdjuntaField para comunicados/novedades — evita
  //           el viaje de ida y vuelta con un archivo que el backend de
  //           todas formas va a rechazar.
  const subirFoto = async (archivo: File | undefined) => {
    if (!archivo) return;
    setErrorFoto(null);

    if (!TIPOS_IMAGEN_PERMITIDOS.includes(archivo.type)) {
      setErrorFoto(t("profile.photo.invalidType"));
      return;
    }
    if (archivo.size > TAMANO_MAXIMO_BYTES) {
      setErrorFoto(t("profile.photo.tooLarge"));
      return;
    }

    const formData = new FormData();
    formData.append("archivo", archivo);
    setSubiendoFoto(true);
    try {
      await axios.post(`${API_BASE_URL}/api/v1/users/me/foto-perfil`, formData);
      cargarPerfil();
      notificarFotoPerfilActualizada();
    } catch {
      setErrorFoto(t("profile.photo.uploadError"));
    } finally {
      setSubiendoFoto(false);
      if (inputFotoRef.current) inputFotoRef.current.value = "";
    }
  };

  const iniciarEdicion = () => {
    if (!perfil) return;
    setFormNombre(perfil.first_name);
    setFormApellidos(perfil.last_name);
    const tel = perfil.numero_telefonico;
    setFormTelefono(tel && tel !== "No registrado" && tel !== "N/A" ? tel : "");
    const asoc = perfil.asociacion;
    setFormAsociacion(asoc && asoc !== "INDEPENDIENTE" ? asoc : "");
    setFormMostrarContacto(perfil.mostrar_contacto_directorio);
    setEditando(true);
    mostrarExito(false);
    setErrorMsg(null);
    setFieldErrors({});
  };

  const cancelarEdicion = () => {
    setEditando(false);
    setErrorMsg(null);
    setFieldErrors({});
  };

  const limpiarError = (campo: string) => {
    if (fieldErrors[campo]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[campo];
        return copy;
      });
    }
  };

  const validarCampo = (campo: "nombre" | "apellidos" | "telefono") => {
    let mensaje = "";
    if (campo === "nombre" && !formNombre.trim()) mensaje = t("profile.validation.firstNameRequired");
    if (campo === "apellidos" && !formApellidos.trim()) mensaje = t("profile.validation.lastNameRequired");
    if (campo === "telefono" && formTelefono.trim() && !TELEFONO_REGEX.test(formTelefono.trim())) {
      mensaje = t("profile.validation.phoneInvalid");
    }
    setFieldErrors((prev) => (mensaje ? { ...prev, [campo]: mensaje } : prev));
  };

  const guardarPerfil = async () => {
    const errores: Record<string, string> = {};
    if (!formNombre.trim()) errores.nombre = t("profile.validation.firstNameRequired");
    if (!formApellidos.trim()) errores.apellidos = t("profile.validation.lastNameRequired");
    const telefono = formTelefono.trim();
    if (telefono && !TELEFONO_REGEX.test(telefono)) errores.telefono = t("profile.validation.phoneInvalid");
    if (Object.keys(errores).length > 0) {
      setFieldErrors(errores);
      return;
    }
    setGuardando(true);
    setErrorMsg(null);
    try {
      await axios.put(`${API_BASE_URL}/api/v1/users/me`, {
        nombre: formNombre.trim(),
        apellidos: formApellidos.trim(),
        numero_telefonico: telefono || null,
        asociacion: formAsociacion.trim() || null,
        mostrar_contacto_directorio: formMostrarContacto,
      });
      setEditando(false);
      mostrarExito(true);
      cargarPerfil();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("common.saveError"));
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <div className="pt-6"><LoadingState message={t("profile.loading")} /></div>;
  if (!perfil) return <div className="pt-6"><Alert type="error" message={t("profile.loadError")} /></div>;

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
  const urlFotoPerfil = perfil.foto_perfil_url ? `${API_BASE_URL}${perfil.foto_perfil_url}` : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pt-6">
      {/* Header */}
      <div className="bg-[#ffffff] dark:bg-[#12231a] rounded-2xl border border-gray-100 dark:border-[#23392b] p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("profile.title")}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("profile.subtitle")}</p>
      </div>

      {/* Success banner */}
      {exito && (
        <div className="flex items-center gap-2 rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm font-medium text-accent-700 dark:border-accent-700/40 dark:bg-accent-900/15 dark:text-accent-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {t("profile.updateSuccess")}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT — Avatar + rol + datos de contexto (2/5) */}
        <div className="lg:col-span-2 lg:self-start bg-[#ffffff] dark:bg-[#12231a] rounded-2xl border border-gray-100 dark:border-[#23392b] p-8 flex flex-col items-center text-center">
          {/* Avatar — foto real si existe, si no el círculo con la inicial de siempre. */}
          <div className="relative mb-4">
            {urlFotoPerfil ? (
              <img
                src={urlFotoPerfil}
                alt={nombreCompleto}
                className="h-20 w-20 rounded-full object-cover select-none"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-accent-700 flex items-center justify-center text-white text-3xl font-bold select-none">
                {inicial}
              </div>
            )}
            <button
              type="button"
              onClick={() => inputFotoRef.current?.click()}
              disabled={subiendoFoto}
              aria-label={t("profile.photo.change")}
              title={t("profile.photo.change")}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-[#ffffff] bg-gray-700 text-white shadow-sm transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#12231a]"
            >
              {subiendoFoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
            <input
              ref={inputFotoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={subiendoFoto}
              onChange={(e) => subirFoto(e.target.files?.[0])}
            />
          </div>
          {errorFoto && (
            <p className="-mt-2 mb-4 max-w-[16rem] text-xs text-red-600 dark:text-red-400">{errorFoto}</p>
          )}

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
        <div className="lg:col-span-3 bg-[#ffffff] dark:bg-[#12231a] rounded-2xl border border-gray-100 dark:border-[#23392b] p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t("profile.personalInfoSection.title")}</h3>
            {canEdit && !editando && (
              <button
                onClick={iniciarEdicion}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-[#23392b] dark:text-gray-300 dark:hover:bg-[#23392b] transition-colors"
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
              {perfil.role_id === RoleId.RECICLADOR && (
                <InfoField
                  label={t("profile.fields.directoryVisibility")}
                  value={
                    perfil.mostrar_contacto_directorio
                      ? t("profile.fields.directoryVisibilityOn")
                      : t("profile.fields.directoryVisibilityOff")
                  }
                  icon={
                    perfil.mostrar_contacto_directorio ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )
                  }
                />
              )}
              <InfoField
                label={t("common.email")}
                value={perfil.email}
                icon={<Mail className="h-3 w-3" />}
              />
            </div>
          ) : (
            /* Modo edición */
            <div className="space-y-4">
              {errorMsg && <Alert type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />}

              <InputField
                label={t("profile.fields.firstName")}
                name="nombre"
                value={formNombre}
                onChange={(e) => {
                  setFormNombre(e.target.value);
                  limpiarError("nombre");
                }}
                onBlur={() => validarCampo("nombre")}
                error={fieldErrors.nombre}
              />

              <InputField
                label={t("profile.fields.lastName")}
                name="apellidos"
                value={formApellidos}
                onChange={(e) => {
                  setFormApellidos(e.target.value);
                  limpiarError("apellidos");
                }}
                onBlur={() => validarCampo("apellidos")}
                error={fieldErrors.apellidos}
              />

              <InputField
                label={t("common.phone")}
                name="telefono"
                value={formTelefono}
                onChange={(e) => {
                  setFormTelefono(e.target.value);
                  limpiarError("telefono");
                }}
                onBlur={() => validarCampo("telefono")}
                placeholder={t("profile.phonePlaceholder")}
                error={fieldErrors.telefono}
              />

              {perfil.role_id === RoleId.RECICLADOR && (
                <>
                  <InputField
                    label={t("profile.fields.association")}
                    name="asociacion"
                    value={formAsociacion}
                    onChange={(e) => setFormAsociacion(e.target.value)}
                    placeholder={t("profile.associationPlaceholder")}
                  />

                  {/* ¿Qué? Interruptor de consentimiento — apagado por
                      defecto. Sin esto, no había forma de que el reciclador
                      controlara si su teléfono aparece en el Directorio
                      general (visible a cualquier usuario autenticado de
                      la ciudad, no solo a su propio conjunto). */}
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-[#23392b] dark:bg-[#1a3324]">
                    <input
                      type="checkbox"
                      checked={formMostrarContacto}
                      onChange={(e) => setFormMostrarContacto(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-accent-600 focus:ring-accent-500 dark:border-[#23392b]"
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                        {t("profile.fields.directoryConsent")}
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                        {t("profile.fields.directoryConsentHint")}
                      </span>
                    </span>
                  </label>
                </>
              )}

              <div>
                {/* ¿Qué? No es un <label> real — no hay ningún campo editable
                    que etiquetar, el correo se muestra como texto fijo.
                    ¿Para qué? Un <label> sin htmlFor y sin envolver ningún
                    control confunde a lectores de pantalla (anuncia "etiqueta"
                    sin decir de qué campo); un <p> describe correctamente
                    que esto es solo texto informativo. */}
                <p className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {t("common.email")}
                </p>
                <div className="rounded-xl border border-gray-100 bg-gray-100/70 px-4 py-2.5 dark:border-[#23392b] dark:bg-[#0c1a12]/60">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{perfil.email}</p>
                </div>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{t("profile.emailNote")}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={cancelarEdicion}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-[#23392b] dark:text-gray-300 dark:hover:bg-[#23392b] transition-colors"
                >
                  <X className="h-4 w-4" />
                  {t("common.cancel")}
                </button>
                <button
                  onClick={guardarPerfil}
                  disabled={guardando}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-accent-700 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
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
