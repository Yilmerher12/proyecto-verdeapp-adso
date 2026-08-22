/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import {
  PasswordStrengthIndicator,
  getPasswordRequirementError,
  type PasswordRequirementError,
} from "@/components/ui/PasswordStrengthIndicator";
import { Modal } from "@/components/ui/Modal";
import { LandingPage } from "@/pages/LandingPage";
import { InputField } from "@/components/ui/InputField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Home, Recycle, MailCheck, MapPin } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "@/api/axios";
import { TerminosDeUsoPage } from "@/pages/TerminosDeUsoPage";
import { PoliticaPrivacidadPage } from "@/pages/PoliticaPrivacidadPage";

type DocumentoLegal = "terminos" | "privacidad" | null;

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
  const [conjuntos, setConjuntos] = useState<any[]>([]);

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

  useEffect(() => {
    if (formData.localidad_id) {
      axios.get(`${API_BASE_URL}/api/v1/geography/conjuntos/${formData.localidad_id}`)
        .then(res => setConjuntos(res.data))
        .catch(err => console.error("Error cargando conjuntos", err));
    } else {
      setConjuntos([]);
    }
    setFormData(prev => ({ ...prev, id_conjunto_residencial: "" }));
  }, [formData.localidad_id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
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

    if (formData.rol === "residente") {
      return (
        !formData.localidad_id ||
        !formData.id_conjunto_residencial ||
        !formData.numero_bloque.trim() ||
        !formData.apto.trim()
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
    const errors: Record<string, string> = {};

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors["email"] = t("auth.register.validation.emailInvalid");
    }
    if (!formData.confirmEmail) {
      errors["confirmEmail"] = t("auth.register.validation.confirmEmailRequired");
    } else if (formData.email !== formData.confirmEmail) {
      errors["confirmEmail"] = t("auth.register.validation.emailsMismatch");
    }
    const passwordError = getPasswordRequirementError(formData.password);
    if (passwordError) {
      errors["password"] = traducirErrorPassword(passwordError, t);
    }
    if (formData.password !== formData.confirmPassword) {
      errors["confirmPassword"] = t("auth.register.validation.passwordsMismatch");
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
        email: formData.email,
        password: formData.password,
        nombre: formData.nombre,
        apellidos: formData.apellidos,
        numero_telefonico: formData.numero_telefonico || "N/A",
        id_conjunto_residencial: formData.rol === "residente" ? parseInt(formData.id_conjunto_residencial) : undefined,
        torre: formData.rol === "residente" ? torreCompleta : undefined,
        apto: formData.rol === "residente" ? formData.apto.trim().toUpperCase() : undefined,
        asociacion: formData.rol === "reciclador" ? formData.asociacion : undefined,
        localidad_id: formData.rol === "reciclador" ? parseInt(formData.localidad_id) : undefined
      });

      setShowSuccessModal(true);
    } catch (err: any) {
      const errorText = JSON.stringify(err) + " " + (err.response?.data?.detail || err.message || "");

      if (errorText.includes("verificada") || errorText.includes("Mailpit") || errorText.includes("403") || errorText.includes("registrado")) {
        setGeneralError(null);
        setShowSuccessModal(true);
      } else {
        setGeneralError(t("auth.register.genericError"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isButtonDisabled = checkFormIncomplete();

  if (showSuccessModal) {
    return (
      <>
        <LandingPage />
        <Modal onClose={() => navigate("/")}>
          <div className="p-6 sm:p-8 text-center max-w-sm mx-auto">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-50 ring-8 ring-green-50 dark:bg-green-900/20 dark:ring-green-900/20">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-800/40">
                <MailCheck className="h-7 w-7 text-green-600 dark:text-green-400" strokeWidth={2} />
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {t("auth.register.success.title")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
              {t("auth.register.success.bodyPrefix")}{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-300">{formData.email}</span>.
            </p>

            <div className="text-left bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mb-6 space-y-3">
              {[
                t("auth.register.success.step1"),
                t("auth.register.success.step2"),
                t("auth.register.success.step3"),
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-white text-xs font-bold">
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
      <LandingPage />

      {/*
        ¿Qué? layer="stacked" — garantiza que este modal se vea SIEMPRE
              encima del modal de registro, sin importar el orden de montaje.
        ¿Impacto? Antes ambos usaban el mismo z-index fijo y, dependiendo del
                 orden en que React los montaba, el de Términos podía quedar
                 visualmente DETRÁS del de registro.
      */}
      {documentoAbierto === "terminos" && (
        <Modal onClose={() => setDocumentoAbierto(null)} wide layer="stacked" aria-label="Términos de Uso">
          <TerminosDeUsoPage embedded />
        </Modal>
      )}
      {documentoAbierto === "privacidad" && (
        <Modal onClose={() => setDocumentoAbierto(null)} wide layer="stacked" aria-label="Política de Privacidad">
          <PoliticaPrivacidadPage embedded />
        </Modal>
      )}

      <Modal onClose={() => navigate("/")} wide>
        <div className="p-8 max-w-2xl mx-auto overflow-y-auto max-h-[90vh] animate-fade-in">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t("auth.register.title")}</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{t("auth.register.subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={() => setFormData(p => ({ ...p, rol: "residente" }))}
                className={`p-4 border-2 text-center cursor-pointer rounded-2xl transition-all ${formData.rol === "residente" ? "border-green-600 bg-green-50/50 dark:bg-green-900/20 shadow-sm" : "border-gray-200 dark:border-[#2a4d34] hover:border-green-300"}`}
              >
                <Home className={`mx-auto mb-2 w-8 h-8 ${formData.rol === "residente" ? "text-green-600" : "text-gray-400"}`}/>
                <span className={`font-semibold ${formData.rol === "residente" ? "text-green-800 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>{t("auth.register.roleResident")}</span>
              </div>
              <div
                onClick={() => setFormData(p => ({ ...p, rol: "reciclador" }))}
                className={`p-4 border-2 text-center cursor-pointer rounded-2xl transition-all ${formData.rol === "reciclador" ? "border-green-600 bg-green-50/50 dark:bg-green-900/20 shadow-sm" : "border-gray-200 dark:border-[#2a4d34] hover:border-green-300"}`}
              >
                <Recycle className={`mx-auto mb-2 w-8 h-8 ${formData.rol === "reciclador" ? "text-green-600" : "text-gray-400"}`}/>
                <span className={`font-semibold ${formData.rol === "reciclador" ? "text-green-800 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>{t("auth.register.roleRecycler")}</span>
              </div>
            </div>

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
                value={formData.nombre}
                onChange={handleChange}
              />
              <InputField
                label={t("auth.register.fields.lastName")}
                name="apellidos"
                value={formData.apellidos}
                onChange={handleChange}
              />
              <InputField
                label={t("auth.register.fields.phone")}
                name="numero_telefonico"
                value={formData.numero_telefonico}
                onChange={handleChange}
              />
            </div>

            {formData.rol === "residente" && (
              <div className="space-y-4 p-5 bg-gray-50/50 dark:bg-[#0d2116]/60 border border-gray-100 dark:border-[#2a4d34] rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-green-600" />
                  <h3 className="font-bold text-gray-800 dark:text-gray-200">{t("auth.register.fields.residenceLocationHeading")}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-400">{t("auth.register.fields.locality")}</label>
                    <select name="localidad_id" value={formData.localidad_id} onChange={handleChange} className="w-full p-2.5 border border-gray-300 dark:border-[#2a4d34] rounded-xl mt-1 bg-white dark:bg-[#1f4029] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 outline-none">
                      <option value="">{t("auth.register.fields.selectPlaceholder")}</option>
                      {localidades.map(loc => (
                        <option key={loc.id_localidad} value={loc.id_localidad}>{loc.nombre_localidad}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-400">{t("auth.register.fields.conjunto")}</label>
                    <select name="id_conjunto_residencial" value={formData.id_conjunto_residencial} onChange={handleChange} disabled={!formData.localidad_id} className="w-full p-2.5 border border-gray-300 dark:border-[#2a4d34] rounded-xl mt-1 bg-white dark:bg-[#1f4029] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-100 dark:disabled:bg-[#0d2116] disabled:text-gray-400">
                      <option value="">{t("auth.register.fields.selectPlaceholder")}</option>
                      {conjuntos.map(conj => (
                        <option key={conj.id_conjunto_residencial} value={conj.id_conjunto_residencial}>{conj.nombre_conjunto}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200 dark:border-[#2a4d34]">
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-400">{t("auth.register.fields.unitType")}</label>
                    <select name="prefijo_unidad" value={formData.prefijo_unidad} onChange={handleChange} disabled={!formData.id_conjunto_residencial} className="w-full p-2.5 border border-gray-300 dark:border-[#2a4d34] rounded-xl mt-1 bg-white dark:bg-[#1f4029] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-100 dark:disabled:bg-[#0d2116]">
                      <option value="TORRE">{t("auth.register.fields.unitTypeTower")}</option>
                      <option value="INTERIOR">{t("auth.register.fields.unitTypeInterior")}</option>
                      <option value="BLOQUE">{t("auth.register.fields.unitTypeBlock")}</option>
                      <option value="CASA">{t("auth.register.fields.unitTypeHouse")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-400">{t("auth.register.fields.unitNumber")}</label>
                    <input type="text" name="numero_bloque" placeholder={t("auth.register.fields.unitNumberPlaceholder")} value={formData.numero_bloque} onChange={handleChange as any} disabled={!formData.id_conjunto_residencial} className="w-full p-2.5 border border-gray-300 dark:border-[#2a4d34] rounded-xl mt-1 bg-white dark:bg-[#1f4029] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-100 dark:disabled:bg-[#0d2116] uppercase" />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-400">{t("auth.register.fields.apto")}</label>
                    <input type="text" name="apto" placeholder={t("auth.register.fields.aptoPlaceholder")} value={formData.apto} onChange={handleChange as any} disabled={!formData.id_conjunto_residencial} className="w-full p-2.5 border border-gray-300 dark:border-[#2a4d34] rounded-xl mt-1 bg-white dark:bg-[#1f4029] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-100 dark:disabled:bg-[#0d2116] uppercase" />
                  </div>
                </div>
              </div>
            )}

            {formData.rol === "reciclador" && (
              <div className="space-y-4 p-5 bg-green-50/30 dark:bg-green-900/10 border border-green-100 dark:border-green-900/40 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Recycle className="w-5 h-5 text-green-600" />
                  <h3 className="font-bold text-gray-800 dark:text-gray-200">{t("auth.register.fields.operativeProfileHeading")}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-400">{t("auth.register.fields.workLocality")}</label>
                    <select name="localidad_id" value={formData.localidad_id} onChange={handleChange} className="w-full p-2.5 border border-gray-300 dark:border-[#2a4d34] rounded-xl mt-1 bg-white dark:bg-[#1f4029] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 outline-none">
                      <option value="">{t("auth.register.fields.selectYourLocality")}</option>
                      {localidades.map(loc => (
                        <option key={loc.id_localidad} value={loc.id_localidad}>{loc.nombre_localidad}</option>
                      ))}
                    </select>
                  </div>
                  <InputField label={t("auth.register.fields.association")} name="asociacion" value={formData.asociacion} onChange={handleChange} placeholder={t("auth.register.fields.associationPlaceholder")} />
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
                  value={formData.email}
                  onChange={handleChange}
                />
                {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
              </div>

              <div>
                <InputField
                  label={t("auth.register.fields.confirmEmailField")}
                  name="confirmEmail"
                  type="email"
                  value={formData.confirmEmail}
                  onChange={handleChange}
                  disablePaste
                />
                {fieldErrors.confirmEmail && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.confirmEmail}</p>
                )}
              </div>

              <div>
                <InputField
                  label={t("auth.register.fields.password")}
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={t("auth.register.fields.passwordPlaceholder")}
                />
                <PasswordStrengthIndicator password={formData.password} />
                {fieldErrors.password && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.password}</p>}
              </div>

              <div>
                <InputField
                  label={t("auth.register.fields.confirmPasswordField")}
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder={t("auth.register.fields.confirmPasswordPlaceholder")}
                  disablePaste
                />
                {fieldErrors.confirmPassword && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.confirmPassword}</p>}
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
                className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-[#2a4d34] text-green-600 focus:ring-green-500 accent-green-600 cursor-pointer"
              />
              <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                {t("auth.register.termsPrefix")}{" "}
                <button
                  type="button"
                  onClick={() => setDocumentoAbierto("terminos")}
                  className="text-green-600 hover:underline font-semibold"
                >
                  {t("auth.register.termsLinkLabel")}
                </button>
                {" "}{t("auth.register.andThe")}{" "}
                <button
                  type="button"
                  onClick={() => setDocumentoAbierto("privacidad")}
                  className="text-green-600 hover:underline font-semibold"
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