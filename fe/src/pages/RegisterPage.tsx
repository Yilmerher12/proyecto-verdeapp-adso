/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { PasswordStrengthIndicator } from "@/components/ui/PasswordStrengthIndicator";
import { getPasswordRequirementError, type PasswordRequirementError } from "@/lib/passwordStrength";
import { Modal } from "@/components/ui/Modal";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { LandingPage } from "@/pages/LandingPage";
import { InputField } from "@/components/ui/InputField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { HardHat, MailCheck, Map as MapIcon } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "@/api/axios";
import { TerminosDeUsoPage } from "@/pages/TerminosDeUsoPage";
import { PoliticaPrivacidadPage } from "@/pages/PoliticaPrivacidadPage";
import { ConjuntoCombobox, type ConjuntoOption } from "@/components/ui/ConjuntoCombobox";
import { SolicitudAdminConjuntoInfo } from "@/components/SolicitudAdminConjuntoInfo";
import { ROLE_THEME } from "@/config/roleTheme";
import { RoleId } from "@/types/auth";
import {
  APELLIDOS_MAX_LENGTH,
  ASOCIACION_MAX_LENGTH,
  CODIGO_ACCESO_LONGITUD,
  CODIGO_ACCESO_REGEX,
  CORREO_MAX_LENGTH,
  NOMBRE_MAX_LENGTH,
  TELEFONO_MAX_LENGTH,
  TELEFONO_REGEX,
  UNIDAD_MAX_LENGTH,
  UNIDAD_REGEX,
  motivoNombreInvalido,
} from "@/lib/validacion";

type DocumentoLegal = "terminos" | "privacidad" | null;

// ¿Qué? Las 3 opciones del selector de rol, con el ícono de cada rol sacado
//       de ROLE_THEME (el mismo del sidebar y del perfil).
// ¿Para qué? "admin_conjunto" no se envía nunca al backend: al elegirlo, el
//           formulario se reemplaza por SolicitudAdminConjuntoInfo.
const OPCIONES_ROL = [
  { rol: "residente", Icon: ROLE_THEME[RoleId.RESIDENTE].Icon, etiqueta: "auth.register.roleResident" },
  { rol: "reciclador", Icon: ROLE_THEME[RoleId.RECICLADOR].Icon, etiqueta: "auth.register.roleRecycler" },
  { rol: "admin_conjunto", Icon: ROLE_THEME[RoleId.ADMIN_CONJUNTO].Icon, etiqueta: "auth.register.roleAdminConjunto" },
] as const;

// ¿Qué? Campos que se revisan tanto en tiempo real (al salir del campo)
//       como al enviar el formulario — una sola lista para no repetirla.
const CAMPOS_A_VALIDAR = [
  "nombre",
  "apellidos",
  "numero_telefonico",
  "numero_bloque",
  "apto",
  "codigo_acceso",
  "email",
  "confirmEmail",
  "password",
  "confirmPassword",
] as const;

// ¿Qué? Traduce el código que devuelve getPasswordRequirementError() al
//       mensaje correcto según el idioma activo.
// ¿Para qué? PasswordStrengthIndicator.tsx devuelve un CÓDIGO a propósito
//           (ver su propio comentario) para que cada pantalla lo traduzca
//           a su idioma — antes esta pantalla usaba PASSWORD_ERROR_MESSAGES_ES,
//           que solo existe en español.
function traducirErrorPassword(
  codigo: PasswordRequirementError,
  t: (key: string) => string,
): string {
  const claves: Record<PasswordRequirementError, string> = {
    too_short: "auth.register.validation.passwordMin",
    no_uppercase: "auth.register.validation.passwordUppercase",
    no_lowercase: "auth.register.validation.passwordLowercase",
    no_digit: "auth.register.validation.passwordNumber",
  };
  return t(claves[codigo]);
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ¿Qué? Modal secundario para Términos/Privacidad, abierto ENCIMA del
  //       modal de registro. Usa layer="stacked" en el <Modal> para
  //       garantizar que siempre se vea por encima, sin depender del orden
  //       de montaje en el DOM (antes a veces quedaba "debajo").
  const [documentoAbierto, setDocumentoAbierto] = useState<DocumentoLegal>(null);

  const [localidades, setLocalidades] = useState<any[]>([]);
  const [conjuntoSeleccionado, setConjuntoSeleccionado] = useState<ConjuntoOption | null>(null);

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [formData, setFormData] = useState({
    rol: "residente",
    nombre: "",
    apellidos: "",
    numero_telefonico: "",
    localidad_id: "",
    id_conjunto_residencial: "",
    prefijo_unidad: "TORRE",
    numero_bloque: "",
    apto: "",
    codigo_acceso: "",
    asociacion: "",
    email: "",
    confirmEmail: "",
    password: "",
    confirmPassword: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/v1/geography/localidades`)
      .then(res => setLocalidades(res.data))
      .catch(err => console.error("Error cargando localidades", err));
  }, []);

  // ¿Qué? Al cambiar de localidad, se descarta el conjunto ya elegido —
  //       puede que ni siquiera exista en la nueva localidad.
  // ¿Para qué? El ConjuntoCombobox ya busca sus propias opciones en el
  //           backend (ver fetchConjuntos más abajo), así que aquí solo
  //           queda limpiar la selección anterior.
  useEffect(() => {
    setConjuntoSeleccionado(null);
    setFormData(prev => ({ ...prev, id_conjunto_residencial: "" }));
  }, [formData.localidad_id]);

  // ¿Qué? Busca conjuntos de la localidad elegida que coincidan con `query`.
  // ¿Para qué? Localidades como Usaquén tienen miles de conjuntos reales
  //           registrados — el ConjuntoCombobox solo pide coincidencias
  //           acotadas (ver geography.py), nunca el catálogo completo.
  const fetchConjuntos = (query: string): Promise<ConjuntoOption[]> => {
    if (!formData.localidad_id) return Promise.resolve([]);
    return axios
      .get(`${API_BASE_URL}/api/v1/geography/conjuntos/${formData.localidad_id}`, {
        params: { search: query || undefined, limit: 20 },
      })
      .then(res => res.data)
      .catch(() => []);
  };

  const handleConjuntoChange = (conjunto: ConjuntoOption | null) => {
    setConjuntoSeleccionado(conjunto);
    setFormData(prev => ({
      ...prev,
      id_conjunto_residencial: conjunto ? String(conjunto.id_conjunto_residencial) : "",
    }));
    if (fieldErrors.id_conjunto_residencial) {
      setFieldErrors(prev => {
        const copy = { ...prev };
        delete copy.id_conjunto_residencial;
        return copy;
      });
    }
  };

  // ¿Qué? Calcula el error de UN campo específico contra el estado actual
  //       del formulario. Antes esta lógica solo existía dentro de
  //       handleSubmit — se repetía si además se quería validar "en vivo".
  // ¿Para qué? Una sola función usada tanto por handleBlur (apenas el
  //           usuario sale del campo) como por handleSubmit (al enviar) y
  //           checkFormIncomplete (para decidir si el botón se habilita) —
  //           así las tres coinciden siempre en qué es "válido".
  const validarCampo = (campo: string, data: typeof formData): string | undefined => {
    switch (campo) {
      // ¿Qué? Nombre y apellidos: mínimo 2, máximo el de la base de datos, y
      //       solo letras con espacio, apóstrofe, punto o guion (lib/validacion.ts).
      case "nombre": {
        const motivo = motivoNombreInvalido(data.nombre, NOMBRE_MAX_LENGTH);
        if (!motivo) return undefined;
        if (motivo === "formato") return t("auth.register.validation.nameFormat");
        if (motivo === "largo") return t("auth.register.validation.firstNameMax", { max: NOMBRE_MAX_LENGTH });
        return t("auth.register.validation.firstNameMin");
      }
      case "apellidos": {
        const motivo = motivoNombreInvalido(data.apellidos, APELLIDOS_MAX_LENGTH);
        if (!motivo) return undefined;
        if (motivo === "formato") return t("auth.register.validation.nameFormat");
        if (motivo === "largo") return t("auth.register.validation.lastNameMax", { max: APELLIDOS_MAX_LENGTH });
        return t("auth.register.validation.lastNameMin");
      }
      // ¿Qué? Solo aplica al Residente; vacío lo controla checkFormIncomplete.
      case "codigo_acceso":
        return data.rol === "residente" && data.codigo_acceso && !CODIGO_ACCESO_REGEX.test(data.codigo_acceso)
          ? t("auth.register.validation.codigoAccesoFormat", { n: CODIGO_ACCESO_LONGITUD })
          : undefined;
      case "numero_telefonico":
        return data.numero_telefonico.trim() && !TELEFONO_REGEX.test(data.numero_telefonico.trim())
          ? t("auth.register.validation.phoneInvalid")
          : undefined;
      case "numero_bloque":
        return data.numero_bloque.trim() && !UNIDAD_REGEX.test(data.numero_bloque.trim())
          ? t("auth.register.validation.unitFormatInvalid")
          : undefined;
      case "apto":
        return data.apto.trim() && !UNIDAD_REGEX.test(data.apto.trim())
          ? t("auth.register.validation.unitFormatInvalid")
          : undefined;
      case "email":
        return !/\S+@\S+\.\S+/.test(data.email) ? t("auth.register.validation.emailInvalid") : undefined;
      case "confirmEmail":
        if (!data.confirmEmail) return t("auth.register.validation.confirmEmailRequired");
        if (data.email !== data.confirmEmail) return t("auth.register.validation.emailsMismatch");
        return undefined;
      case "password": {
        const error = getPasswordRequirementError(data.password);
        return error ? traducirErrorPassword(error, t) : undefined;
      }
      case "confirmPassword":
        return data.password !== data.confirmPassword
          ? t("auth.register.validation.passwordsMismatch")
          : undefined;
      default:
        return undefined;
    }
  };

  const limpiarError = (name: string) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    limpiarError(name);
  };

  // ¿Qué? A diferencia de handleChange, este descarta cualquier caracter
  //       que no sea un dígito ANTES de guardarlo en el estado.
  // ¿Para qué? Antes el campo de teléfono era de texto libre: aceptaba
  //           "abc123!!" sin ningún freno mientras se escribía, y solo se
  //           avisaba del error después de enviar el formulario. Ahora es
  //           imposible que una letra o símbolo llegue siquiera a
  //           mostrarse en el campo.
  // ¿Impacto? Tope de 10 caracteres (RQF-008: máximo un celular colombiano).
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const soloDigitos = e.target.value.replace(/\D/g, "").slice(0, TELEFONO_MAX_LENGTH);
    setFormData((prev) => ({ ...prev, numero_telefonico: soloDigitos }));
    limpiarError("numero_telefonico");
  };

  // ¿Qué? Al salir de un campo (blur), se muestra su error de inmediato si
  //       lo tiene — no hay que esperar a hacer clic en "Registrar Cuenta".
  // ¿Impacto? Antes ningún campo de este formulario avisaba nada hasta el
  //           envío; ahora el usuario ve el problema apenas ocurre.
  // ¿Qué? El código de acceso se guarda en mayúscula y sin espacios mientras
  //       se escribe, con tope de 6 caracteres.
  // ¿Para qué? Así se escribe igual que en la cartelera del conjunto, y no
  //           hay que adivinar si importan las mayúsculas.
  const handleCodigoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const limpio = e.target.value.toUpperCase().split(" ").join("").slice(0, CODIGO_ACCESO_LONGITUD);
    setFormData((prev) => ({ ...prev, codigo_acceso: limpio }));
    limpiarError("codigo_acceso");
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    const error = validarCampo(name, formData);
    if (error) {
      setFieldErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const checkFormIncomplete = () => {
    if (!acceptedTerms) return true;

    const baseFields =
      !formData.nombre.trim() ||
      !formData.apellidos.trim() ||
      !formData.email.trim() ||
      !formData.confirmEmail.trim() ||
      !formData.password.trim() ||
      !formData.confirmPassword.trim();

    if (baseFields) return true;

    // ¿Qué? Antes solo se revisaba que estos campos NO estuvieran vacíos —
    //       el botón se habilitaba aunque el contenido fuera inválido (ej.
    //       un teléfono de 3 dígitos, un nombre de una sola letra).
    // ¿Impacto? Ahora el botón sigue deshabilitado mientras cualquiera de
    //           estos campos tenga un formato inválido, no solo cuando
    //           está vacío.
    const hayFormatoInvalido = CAMPOS_A_VALIDAR.some((campo) => validarCampo(campo, formData));
    if (hayFormatoInvalido) return true;

    if (formData.rol === "residente") {
      return (
        !formData.localidad_id ||
        !formData.id_conjunto_residencial ||
        !formData.numero_bloque.trim() ||
        !formData.apto.trim() ||
        !formData.codigo_acceso.trim()
      );
    }

    if (formData.rol === "reciclador") {
      return !formData.localidad_id;
    }

    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    // ¿Qué? Misma función validarCampo que ya se usa en vivo (handleBlur) y
    //       para habilitar/deshabilitar el botón (checkFormIncomplete) —
    //       aquí solo se vuelve a correr por si el usuario nunca llegó a
    //       salir de algún campo (ej. pegó todo y dio clic directo).
    const errors: Record<string, string> = {};
    for (const campo of CAMPOS_A_VALIDAR) {
      const error = validarCampo(campo, formData);
      if (error) errors[campo] = error;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const torreCompleta = `${formData.prefijo_unidad} ${formData.numero_bloque}`.trim().toUpperCase();

      await register({
        rol: formData.rol,
        correo_electronico: formData.email,
        password: formData.password,
        nombre: formData.nombre,
        apellidos: formData.apellidos,
        numero_telefonico: formData.numero_telefonico || "N/A",
        id_conjunto_residencial: formData.rol === "residente" ? formData.id_conjunto_residencial : undefined,
        torre: formData.rol === "residente" ? torreCompleta : undefined,
        apto: formData.rol === "residente" ? formData.apto.trim().toUpperCase() : undefined,
        codigo_acceso: formData.rol === "residente" ? formData.codigo_acceso.trim().toUpperCase() : undefined,
        asociacion: formData.rol === "reciclador" ? formData.asociacion : undefined,
        localidad_id: formData.rol === "reciclador" ? parseInt(formData.localidad_id) : undefined
      });

      setShowSuccessModal(true);
    } catch (err: unknown) {
      setGeneralError(err instanceof Error ? err.message : t("auth.register.genericError"));
    } finally {
      setIsLoading(false);
    }
  };

  const isButtonDisabled = checkFormIncomplete();

  if (showSuccessModal) {
    return (
      <>
        <LandingPage asBackdrop />
        <Modal onClose={() => navigate("/")}>
          <div className="p-6 sm:p-8 text-center max-w-sm mx-auto">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-accent-50 ring-8 ring-accent-50 dark:bg-accent-900/20 dark:ring-accent-900/20">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-100 dark:bg-accent-800/40">
                <MailCheck className="icon-xl text-accent-600 dark:text-accent-400" strokeWidth={2} />
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {t("auth.register.success.title")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
              {t("auth.register.success.bodyPrefix")}{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-300">{formData.email}</span>.
            </p>

            <div className="text-left bg-accent-50 dark:bg-accent-900/20 rounded-xl p-4 mb-6 space-y-3">
              {[
                t("auth.register.success.step1"),
                t("auth.register.success.step2"),
                t("auth.register.success.step3"),
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-700 text-white text-xs font-bold">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{step}</p>
                </div>
              ))}
            </div>

            <Button onClick={() => navigate("/")} fullWidth>
              {t("auth.register.success.understood")}
            </Button>
          </div>
        </Modal>
      </>
    );
  }

  return (
    <>
      <LandingPage asBackdrop />

      {/*
        ¿Qué? layer="stacked" — garantiza que este modal se vea SIEMPRE
              encima del modal de registro, sin importar el orden de montaje.
        ¿Impacto? Antes ambos usaban el mismo z-index fijo y, dependiendo del
                 orden en que React los montaba, el de Términos podía quedar
                 visualmente DETRÁS del de registro.
      */}
      {documentoAbierto === "terminos" && (
        <Modal onClose={() => setDocumentoAbierto(null)} wide layer="stacked" aria-label={t("legal.terms.title")}>
          <TerminosDeUsoPage />
        </Modal>
      )}
      {documentoAbierto === "privacidad" && (
        <Modal onClose={() => setDocumentoAbierto(null)} wide layer="stacked" aria-label={t("legal.privacy.title")}>
          <PoliticaPrivacidadPage />
        </Modal>
      )}

      <Modal onClose={() => navigate("/")} wide closeOnBackdrop={false}>
        <div className="p-8 max-w-2xl mx-auto overflow-y-auto max-h-[90vh] animate-fade-in">
          <div className="text-center mb-8">
            <div className="mb-3 flex justify-center">
              <BrandLogo variant="mark" className="h-12" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t("auth.register.title")}</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{t("auth.register.subtitle")}</p>
          </div>

          {/*
            ¿Qué? Selector de rol con 3 opciones. La tercera no es un rol que
                  se pueda registrar: muestra cómo pedir la cuenta de
                  Administrador de Conjunto (solo se crea por invitación).
            ¿Para qué? Antes eran <div> con onClick: no se podían alcanzar con
                      Tab ni elegir con Enter. Como <button> sí, y aria-pressed
                      le dice al lector de pantalla cuál está elegido.
            ¿Impacto? Va FUERA del <form> para que elegir la tercera opción
                     pueda reemplazar el formulario completo.
          */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
            {OPCIONES_ROL.map(({ rol, Icon, etiqueta }) => {
              const elegido = formData.rol === rol;
              return (
                <button
                  key={rol}
                  type="button"
                  aria-pressed={elegido}
                  onClick={() => setFormData(p => ({ ...p, rol }))}
                  className={`flex flex-col items-center justify-start p-2 sm:p-4 border-2 text-center cursor-pointer rounded-2xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${elegido ? "border-accent-600 bg-accent-50/50 dark:bg-accent-900/20 shadow-sm" : "border-gray-200 dark:border-night-line hover:border-accent-300"}`}
                >
                  <Icon className={`icon-xl mb-2 ${elegido ? "text-accent-600" : "text-gray-400"}`}/>
                  <span className={`text-xs sm:text-base leading-tight font-semibold ${elegido ? "text-accent-800 dark:text-accent-400" : "text-gray-500 dark:text-gray-400"}`}>{t(etiqueta)}</span>
                </button>
              );
            })}
          </div>

          {formData.rol === "admin_conjunto" ? (
            <SolicitudAdminConjuntoInfo />
          ) : (
            /*
              ¿Qué? noValidate desactiva la validación nativa del navegador
                    (los globos tipo "Please include an '@'..." de Chrome).
              ¿Para qué? El resto de formularios de auth (Login, Cambiar
                        contraseña, Recuperar contraseña) ya lo tienen — este
                        era el único que se había quedado sin él, por eso
                        Chrome mostraba sus propios avisos en vez de los
                        mensajes en rojo consistentes con el diseño de la app.
            */
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {/*
                ¿Qué? Bloque de identidad: Nombres, Apellidos y Teléfono, cada
                      uno en su propia fila a ancho completo.
                ¿Para qué? Teléfono se ubica aquí (junto a los datos personales,
                          no junto a las credenciales), tal como se pidió.
              */}
              <div className="space-y-4">
                <InputField
                  label={t("auth.register.fields.firstName")}
                  name="nombre"
                  maxLength={NOMBRE_MAX_LENGTH}
                  value={formData.nombre}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={fieldErrors.nombre}
                />
                <InputField
                  label={t("auth.register.fields.lastName")}
                  name="apellidos"
                  maxLength={APELLIDOS_MAX_LENGTH}
                  value={formData.apellidos}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={fieldErrors.apellidos}
                />
                <InputField
                  label={t("auth.register.fields.phone")}
                  name="numero_telefonico"
                  type="tel"
                  inputMode="numeric"
                  maxLength={TELEFONO_MAX_LENGTH}
                  value={formData.numero_telefonico}
                  onChange={handlePhoneChange}
                  onBlur={handleBlur}
                  error={fieldErrors.numero_telefonico}
                />
              </div>

              {formData.rol === "residente" && (
                <div className="space-y-4 p-5 bg-gray-50/50 dark:bg-night-inset/60 border border-gray-100 dark:border-night-line rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <MapIcon className="icon-lg text-accent-600" />
                    <h3 className="font-bold text-gray-800 dark:text-gray-200">{t("auth.register.fields.residenceLocationHeading")}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="localidad_id" className="text-xs font-bold text-gray-600 dark:text-gray-400">{t("auth.register.fields.locality")}</label>
                      <select id="localidad_id" name="localidad_id" value={formData.localidad_id} onChange={handleChange} className="w-full cursor-pointer p-2.5 border border-gray-300 dark:border-night-line rounded-xl mt-1 bg-white dark:bg-night-field text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-accent-500 outline-none">
                        <option value="">{t("auth.register.fields.selectPlaceholder")}</option>
                        {localidades.map(loc => (
                          <option key={loc.id_localidad} value={loc.id_localidad}>{loc.nombre_localidad}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400">{t("auth.register.fields.conjunto")}</label>
                      <ConjuntoCombobox
                        value={conjuntoSeleccionado}
                        onChange={handleConjuntoChange}
                        fetchOptions={fetchConjuntos}
                        disabled={!formData.localidad_id}
                        placeholder={t("auth.register.fields.conjuntoSearchPlaceholder")}
                        emptyLabel={t("auth.register.fields.conjuntoNoResults")}
                        loadingLabel={t("common.loading")}
                        ariaLabel={t("auth.register.fields.conjunto")}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-gray-200 dark:border-night-line">
                    <div>
                      <label htmlFor="prefijo_unidad" className="text-xs font-bold text-gray-600 dark:text-gray-400">{t("auth.register.fields.unitType")}</label>
                      <select id="prefijo_unidad" name="prefijo_unidad" value={formData.prefijo_unidad} onChange={handleChange} disabled={!formData.id_conjunto_residencial} className="w-full cursor-pointer p-2.5 border border-gray-300 dark:border-night-line rounded-xl mt-1 bg-white dark:bg-night-field text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-accent-500 outline-none disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-night-inset">
                        <option value="TORRE">{t("auth.register.fields.unitTypeTower")}</option>
                        <option value="INTERIOR">{t("auth.register.fields.unitTypeInterior")}</option>
                        <option value="BLOQUE">{t("auth.register.fields.unitTypeBlock")}</option>
                        <option value="CASA">{t("auth.register.fields.unitTypeHouse")}</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="numero_bloque" className="text-xs font-bold text-gray-600 dark:text-gray-400">{t("auth.register.fields.unitNumber")}</label>
                      <input id="numero_bloque" type="text" name="numero_bloque" maxLength={UNIDAD_MAX_LENGTH} aria-invalid={!!fieldErrors.numero_bloque} aria-describedby={fieldErrors.numero_bloque ? "numero_bloque-error" : undefined} placeholder={t("auth.register.fields.unitNumberPlaceholder")} value={formData.numero_bloque} onChange={handleChange} onBlur={handleBlur} disabled={!formData.id_conjunto_residencial} className="w-full p-2.5 border border-gray-300 dark:border-night-line rounded-xl mt-1 bg-white dark:bg-night-field text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-accent-500 outline-none disabled:bg-gray-100 dark:disabled:bg-night-inset uppercase" />
                      {fieldErrors.numero_bloque && <p id="numero_bloque-error" role="alert" className="text-xs text-red-500 mt-1">{fieldErrors.numero_bloque}</p>}
                    </div>

                    <div>
                      <label htmlFor="apto" className="text-xs font-bold text-gray-600 dark:text-gray-400">{t("auth.register.fields.apto")}</label>
                      <input id="apto" type="text" name="apto" maxLength={UNIDAD_MAX_LENGTH} aria-invalid={!!fieldErrors.apto} aria-describedby={fieldErrors.apto ? "apto-error" : undefined} placeholder={t("auth.register.fields.aptoPlaceholder")} value={formData.apto} onChange={handleChange} onBlur={handleBlur} disabled={!formData.id_conjunto_residencial} className="w-full p-2.5 border border-gray-300 dark:border-night-line rounded-xl mt-1 bg-white dark:bg-night-field text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-accent-500 outline-none disabled:bg-gray-100 dark:disabled:bg-night-inset uppercase" />
                      {fieldErrors.apto && <p id="apto-error" role="alert" className="text-xs text-red-500 mt-1">{fieldErrors.apto}</p>}
                    </div>
                  </div>

                  {/*
                    ¿Qué? Issue #168 — el código que el Admin de Conjunto
                          reparte fuera de la app (cartelera, grupo del
                          conjunto) para demostrar que de verdad vives ahí.
                    ¿Para qué? Va en su propia fila, no en el grid de 3
                              columnas de arriba — es un campo distinto en
                              naturaleza (una prueba, no un dato del domicilio)
                              y merece su propia aclaración debajo.
                  */}
                  <div className="pt-3 border-t border-gray-200 dark:border-night-line">
                    <label htmlFor="codigo_acceso" className="text-xs font-bold text-gray-600 dark:text-gray-400">{t("auth.register.fields.codigoAcceso")}</label>
                    <input
                      id="codigo_acceso"
                      type="text"
                      name="codigo_acceso"
                      placeholder={t("auth.register.fields.codigoAccesoPlaceholder")}
                      value={formData.codigo_acceso}
                      onChange={handleCodigoChange}
                      onBlur={handleBlur}
                      maxLength={CODIGO_ACCESO_LONGITUD}
                      autoComplete="off"
                      aria-invalid={!!fieldErrors.codigo_acceso}
                      aria-describedby={fieldErrors.codigo_acceso ? "codigo_acceso-error" : undefined}
                      disabled={!formData.id_conjunto_residencial}
                      className="w-full p-2.5 border border-gray-300 dark:border-night-line rounded-xl mt-1 bg-white dark:bg-night-field text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-accent-500 outline-none disabled:bg-gray-100 dark:disabled:bg-night-inset uppercase tracking-widest font-mono"
                    />
                    {fieldErrors.codigo_acceso && <p id="codigo_acceso-error" role="alert" className="text-xs text-red-500 mt-1">{fieldErrors.codigo_acceso}</p>}
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{t("auth.register.fields.codigoAccesoHint")}</p>
                  </div>
                </div>
              )}

              {formData.rol === "reciclador" && (
                <div className="space-y-4 p-5 bg-accent-50/30 dark:bg-accent-900/10 border border-accent-100 dark:border-accent-900/40 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <HardHat className="icon-lg text-accent-600" />
                    <h3 className="font-bold text-gray-800 dark:text-gray-200">{t("auth.register.fields.operativeProfileHeading")}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="localidad_id" className="text-xs font-bold text-gray-600 dark:text-gray-400">{t("auth.register.fields.workLocality")}</label>
                      <select id="localidad_id" name="localidad_id" value={formData.localidad_id} onChange={handleChange} className="w-full cursor-pointer p-2.5 border border-gray-300 dark:border-night-line rounded-xl mt-1 bg-white dark:bg-night-field text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-accent-500 outline-none">
                        <option value="">{t("auth.register.fields.selectYourLocality")}</option>
                        {localidades.map(loc => (
                          <option key={loc.id_localidad} value={loc.id_localidad}>{loc.nombre_localidad}</option>
                        ))}
                      </select>
                    </div>
                    <InputField label={t("auth.register.fields.association")} name="asociacion" maxLength={ASOCIACION_MAX_LENGTH} value={formData.asociacion} onChange={handleChange} placeholder={t("auth.register.fields.associationPlaceholder")} />
                  </div>
                </div>
              )}

              {/*
                ¿Qué? Bloque de credenciales: Correo, Confirmar correo, Contraseña
                      y Confirmar contraseña — cada uno en su PROPIA fila a ancho
                      completo (ya no en grid de 2 columnas).
                ¿Para qué? Es lo que se pidió: que los 4 campos se vean igual de
                          "grandes" e importantes, consistentes entre sí.
              */}
              <div className="space-y-4 pt-2">
                <div>
                  <InputField
                    label={t("auth.register.fields.email")}
                    name="email"
                    type="email"
                    maxLength={CORREO_MAX_LENGTH}
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={fieldErrors.email}
                  />
                </div>

                <div>
                  <InputField
                    label={t("auth.register.fields.confirmEmailField")}
                    name="confirmEmail"
                    type="email"
                    maxLength={CORREO_MAX_LENGTH}
                    value={formData.confirmEmail}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disablePaste
                    error={fieldErrors.confirmEmail}
                  />
                </div>

                <div>
                  <InputField
                    label={t("auth.register.fields.password")}
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={t("auth.register.fields.passwordPlaceholder")}
                    error={fieldErrors.password}
                  />
                  <PasswordStrengthIndicator password={formData.password} />
                </div>

                <div>
                  <InputField
                    label={t("auth.register.fields.confirmPasswordField")}
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={t("auth.register.fields.confirmPasswordPlaceholder")}
                    disablePaste
                    error={fieldErrors.confirmPassword}
                  />
                </div>
              </div>

              {/*
                ¿Qué? CASILLA DE TÉRMINOS Y CONDICIONES.
                ¿Para qué? Botones que abren el Modal secundario "stacked"
                          definido arriba — el formulario nunca se desmonta.
              */}
              <div className="flex items-start gap-3 p-2 select-none">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-night-line text-accent-600 focus:ring-accent-500 accent-accent-600 cursor-pointer"
                />
                <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  {t("auth.register.termsPrefix")}{" "}
                  <button
                    type="button"
                    onClick={() => setDocumentoAbierto("terminos")}
                    className="cursor-pointer text-accent-600 transition-colors hover:underline font-semibold"
                  >
                    {t("auth.register.termsLinkLabel")}
                  </button>
                  {" "}{t("auth.register.andThe")}{" "}
                  <button
                    type="button"
                    onClick={() => setDocumentoAbierto("privacidad")}
                    className="cursor-pointer text-accent-600 transition-colors hover:underline font-semibold"
                  >
                    {t("auth.register.privacyLinkLabel")}
                  </button>
                  {" "}{t("auth.register.brandSuffix")}
                </label>
              </div>

              <div className="w-full pt-4">
                <Button type="submit" fullWidth isLoading={isLoading} disabled={isButtonDisabled}>
                  {isButtonDisabled ? t("auth.register.submitIncomplete") : t("auth.register.submitFull")}
                </Button>
              </div>
            </form>
          )}

          {generalError && (
            <div className="mt-6">
              <Alert type="error" message={generalError} />
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}