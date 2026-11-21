 
import { ANCHO_PAGINA } from "@/config/anchoPagina";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import { API_BASE_URL } from "@/api/axios";
import { enlaceAdjuntoSeguro } from "@/lib/enlaceSeguro";
import {
  Mail,
  Phone,
  Map as MapIcon,
  Building,
  Users as UsersIcon,
  Pencil,
  BadgeCheck,
  Camera,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { RoleId } from "@/types/auth";
import { Spinner } from "@/components/ui/Spinner";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ROLE_THEME } from "@/config/roleTheme";
import { notificarFotoPerfilActualizada } from "@/lib/profileEvents";
import {
  APELLIDOS_MAX_LENGTH,
  ASOCIACION_MAX_LENGTH,
  NOMBRE_MAX_LENGTH,
  TELEFONO_MAX_LENGTH,
  TELEFONO_REGEX,
  motivoNombreInvalido,
} from "@/lib/validacion";
import { useAvisoTemporal } from "@/hooks/useAvisoTemporal";
import { Alert } from "@/components/ui/Alert";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { InputField } from "@/components/ui/InputField";
import { Button } from "@/components/ui/Button";

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
    <div className="rounded-xl bg-gray-50 dark:bg-night-field/60 px-4 py-3">
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
  const [progresoFoto, setProgresoFoto] = useState<number | undefined>(undefined);
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
    setProgresoFoto(undefined);
    try {
      await axios.post(`${API_BASE_URL}/api/v1/users/me/foto-perfil`, formData, {
        onUploadProgress: (evento) => {
          if (evento.total) setProgresoFoto(Math.round((evento.loaded / evento.total) * 100));
        },
      });
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

  // ¿Qué? Error de un campo, o "" si es válido. Mismas reglas que el registro
  //       (lib/validacion.ts): antes aquí solo se revisaba que el nombre no
  //       estuviera vacío, así que "Juan123" se podía guardar.
  // ¿Para qué? Una sola función para validar al salir del campo y al guardar.
  const errorDe = (campo: "nombre" | "apellidos" | "telefono"): string => {
    if (campo === "telefono") {
      const telefono = formTelefono.trim();
      return telefono && !TELEFONO_REGEX.test(telefono) ? t("profile.validation.phoneInvalid") : "";
    }
    const esNombre = campo === "nombre";
    const maximo = esNombre ? NOMBRE_MAX_LENGTH : APELLIDOS_MAX_LENGTH;
    const motivo = motivoNombreInvalido(esNombre ? formNombre : formApellidos, maximo);
    if (!motivo) return "";
    if (motivo === "requerido") return t(esNombre ? "profile.validation.firstNameRequired" : "profile.validation.lastNameRequired");
    if (motivo === "formato") return t("auth.register.validation.nameFormat");
    if (motivo === "largo") return t(esNombre ? "auth.register.validation.firstNameMax" : "auth.register.validation.lastNameMax", { max: maximo });
    return t(esNombre ? "auth.register.validation.firstNameMin" : "auth.register.validation.lastNameMin");
  };

  const validarCampo = (campo: "nombre" | "apellidos" | "telefono") => {
    const mensaje = errorDe(campo);
    setFieldErrors((prev) => (mensaje ? { ...prev, [campo]: mensaje } : prev));
  };

  const guardarPerfil = async () => {
    const errores: Record<string, string> = {};
    for (const campo of ["nombre", "apellidos", "telefono"] as const) {
      const mensaje = errorDe(campo);
      if (mensaje) errores[campo] = mensaje;
    }
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
        numero_telefonico: formTelefono.trim() || null,
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

  if (cargando) return <div className="pt-6"><Esqueleto mensaje={t("profile.loading")} variante="campos" cantidad={7} /></div>;
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
  // ¿Qué? Issue #400: enlaceAdjuntoSeguro completa la ruta (/uploads/perfiles/...)
  //       con la URL del backend, o devuelve null si no es un enlace seguro
  //       (entonces se muestra la inicial, igual que sin foto).
  const urlFotoPerfil = enlaceAdjuntoSeguro(perfil.foto_perfil_url);

  // ¿Qué? Si el rol tiene datos propios que mostrar y cómo se llama su bloque.
  // ¿Para qué? El Admin del Sistema no tiene ninguno: sin esto dibujaría un
  //           bloque vacío al lado de la información personal.
  const hayDatosDeRol =
    (perfil.role_id === RoleId.RESIDENTE && !!(perfil.nombre_conjunto || perfil.torre || perfil.apto)) ||
    (perfil.role_id === RoleId.RECICLADOR && !!(perfil.nombre_localidad || perfil.asociacion)) ||
    (perfil.role_id === RoleId.ADMIN_CONJUNTO && !!perfil.conjuntos_administrados?.length);
  const tituloDatosRol =
    perfil.role_id === RoleId.RESIDENTE
      ? t("profile.roleSection.residente")
      : perfil.role_id === RoleId.RECICLADOR
        ? t("profile.roleSection.reciclador")
        : perfil.conjuntos_administrados?.length === 1
          ? t("profile.managedConjuntoSingular")
          : t("profile.managedConjuntoPlural");

  return (
    <div className={`${ANCHO_PAGINA.normal} space-y-6 pt-6`}>
      {/* Success banner */}
      {exito && (
        <div className="flex items-center gap-2 rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm font-medium text-accent-700 dark:border-accent-300/40 dark:bg-accent-300/10 dark:text-accent-400">
          <BadgeCheck className="icon-md shrink-0 icon-appear icon-hop" />
          {t("profile.updateSuccess")}
        </div>
      )}

      {/* ¿Qué? Una sola tarjeta arriba: el título de la página y, debajo, la identidad (foto, nombre y rol),
                a todo el ancho.
          ¿Para qué? Antes eran dos tarjetas seguidas (el título y la identidad) con espacio de sobra entre
                    ellas, y la foto y los datos del rol vivían en una columna izquierda más corta que la
                    información personal de la derecha.
          ¿Impacto? En celular la foto y el nombre se apilan y centran. */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-night-line dark:bg-night-card">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("profile.title")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("profile.subtitle")}</p>

      <div className="mt-5 flex flex-col items-center gap-5 border-t border-gray-100 pt-5 text-center dark:border-night-line sm:flex-row sm:text-left">
        {/* Avatar — foto real si existe, si no el círculo con la inicial de siempre. */}
        <div className="relative shrink-0">
          {urlFotoPerfil ? (
            <img
              src={urlFotoPerfil}
              alt={nombreCompleto}
              className="h-20 w-20 rounded-full object-cover select-none"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-accent-700 flex items-center justify-center text-white text-2xl font-bold select-none">
              {inicial}
            </div>
          )}
          <button
            type="button"
            onClick={() => inputFotoRef.current?.click()}
            disabled={subiendoFoto}
            aria-label={t("profile.photo.change")}
            title={t("profile.photo.change")}
            className="touch-area absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-gray-700 text-white shadow-sm transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-night-card"
          >
            {subiendoFoto ? <Spinner size="sm" tone="current" /> : <Camera className="icon-sm" />}
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

        <div className="min-w-0">
          {/* Nombre completo */}
          <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug break-words">
            {nombreCompleto}
          </h2>

          {/* Badge de rol — icono Lucide, sin emoji */}
          <span className={`inline-flex items-center gap-1.5 mt-2 rounded-full ${role.badgeBg} px-3 py-1 text-xs font-semibold ${role.badgeText}`}>
            <RoleIcon className="icon-sm shrink-0" />
            {roleLabel}
          </span>

          {subiendoFoto && (
            <ProgressBar value={progresoFoto} label={t("profile.photo.uploading")} className="mt-3 max-w-[16rem]" />
          )}
          {errorFoto && (
            <p className="mt-3 max-w-[16rem] text-xs text-red-600 dark:text-red-300">{errorFoto}</p>
          )}
        </div>
      </div>
      </div>

      {/* ¿Qué? Dos bloques de la misma altura (la cuadrícula los estira): a la
                izquierda la información personal, a la derecha los datos propios
                del rol. Si el rol no tiene datos propios, el bloque no se dibuja
                y la información personal ocupa todo el ancho.
          ¿Para qué? Cada rol tiene datos distintos (conjunto y unidad, zona de
                    trabajo, conjuntos que administra) y así quedan agrupados. */}
      <div className={`grid grid-cols-1 gap-6 ${hayDatosDeRol ? "lg:grid-cols-2" : ""}`}>
        {/* Información personal editable */}
        <div className="bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t("profile.personalInfoSection.title")}</h3>
            {canEdit && !editando && (
              <Button variant="secondary" size="sm" onClick={iniciarEdicion}>
                <Pencil className="icon-sm" />
                {t("common.edit")}
              </Button>
            )}
          </div>

          {!editando ? (
            /* Modo lectura */
            <div className="space-y-3">
              {/* ¿Qué? Una sola casilla en lectura; en edición siguen siendo dos
                        campos porque así se guardan (nombre y apellidos). */}
              <InfoField label={t("profile.fields.fullName")} value={nombreCompleto} />
              <InfoField
                label={t("common.phone")}
                value={
                  perfil.numero_telefonico &&
                  perfil.numero_telefonico !== "No registrado" &&
                  perfil.numero_telefonico !== "N/A"
                    ? perfil.numero_telefonico
                    : t("profile.notRegistered")
                }
                icon={<Phone className="icon-sm" />}
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
                      <Eye className="icon-sm" />
                    ) : (
                      <EyeOff className="icon-sm" />
                    )
                  }
                />
              )}
              <InfoField
                label={t("common.email")}
                value={perfil.email}
                icon={<Mail className="icon-sm" />}
              />
            </div>
          ) : (
            /* Modo edición */
            <div className="space-y-4">
              {errorMsg && <Alert type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />}

              <InputField
                label={t("profile.fields.firstName")}
                name="nombre"
                maxLength={NOMBRE_MAX_LENGTH}
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
                maxLength={APELLIDOS_MAX_LENGTH}
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
                type="tel"
                inputMode="numeric"
                maxLength={TELEFONO_MAX_LENGTH}
                value={formTelefono}
                onChange={(e) => {
                  // Solo dígitos, igual que en el registro.
                  setFormTelefono(e.target.value.split("").filter((c) => c >= "0" && c <= "9").join(""));
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
                    maxLength={ASOCIACION_MAX_LENGTH}
                    value={formAsociacion}
                    onChange={(e) => setFormAsociacion(e.target.value)}
                    placeholder={t("profile.associationPlaceholder")}
                  />

                  {/* ¿Qué? Interruptor de consentimiento — apagado por
                      defecto. Sin esto, no había forma de que el reciclador
                      controlara si su teléfono aparece en el Directorio
                      general (visible a cualquier usuario autenticado de
                      la ciudad, no solo a su propio conjunto). */}
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-night-line dark:bg-night-field">
                    <input
                      type="checkbox"
                      checked={formMostrarContacto}
                      onChange={(e) => setFormMostrarContacto(e.target.checked)}
                      className="focus-ring mt-0.5 h-4 w-4 shrink-0 rounded border-edge text-accent-600 dark:border-night-edge"
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
                <div className="rounded-xl border border-gray-100 bg-gray-100/70 px-4 py-2.5 dark:border-night-line dark:bg-night-inset/60">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{perfil.email}</p>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("profile.emailNote")}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="secondary" fullWidth onClick={cancelarEdicion}>
                  <X className="icon-md" />
                  {t("common.cancel")}
                </Button>
                <Button variant="primary" fullWidth onClick={guardarPerfil} disabled={guardando}>
                  <BadgeCheck className="icon-md icon-draw" />
                  {guardando ? t("common.saving") : t("profile.saveChanges")}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Datos propios del rol (no editables aquí) */}
        {hayDatosDeRol && (
          <div className="bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line p-6">
            <h3 className="mb-6 text-sm font-bold text-gray-900 dark:text-white">{tituloDatosRol}</h3>
            <div className="space-y-3">
              {perfil.role_id === RoleId.RESIDENTE && (
                <>
                  {perfil.nombre_conjunto && (
                    <InfoField
                      label={t("profile.fields.conjunto")}
                      value={perfil.nombre_conjunto}
                      icon={<Building className="icon-sm" />}
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
                      icon={<MapIcon className="icon-sm" />}
                    />
                  )}
                  {perfil.asociacion && (
                    <InfoField
                      label={t("profile.fields.association")}
                      value={perfil.asociacion}
                      icon={<UsersIcon className="icon-sm" />}
                    />
                  )}
                </>
              )}

              {/* Un conjunto por casilla (antes iban todos separados por coma en una sola). */}
              {perfil.role_id === RoleId.ADMIN_CONJUNTO &&
                perfil.conjuntos_administrados?.map((nombre) => (
                  <InfoField
                    key={nombre}
                    label={t("profile.fields.conjunto")}
                    value={nombre}
                    icon={<Building className="icon-sm" />}
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
