/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { LandingPage } from "@/pages/LandingPage";
import { InputField } from "@/components/ui/InputField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import {
  PasswordStrengthIndicator,
  getPasswordRequirementError,
  type PasswordRequirementError,
} from "@/components/ui/PasswordStrengthIndicator";
import { Building2, ShieldCheck, XCircle } from "lucide-react";
import {
    consultarInvitacion,
    aceptarInvitacion,
    type InvitacionInfo,
} from "@/lib/adminConjuntoApi";

// ¿Qué? Misma función que en RegisterPage.tsx — mapea el código devuelto por
//       getPasswordRequirementError() a las claves compartidas de
//       auth.register.validation, la única fuente de verdad para los
//       mensajes de requisitos de contraseña en toda la app.
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

/**
 * ¿Qué? Pantalla pública a la que llega la persona invitada al hacer
 *       clic en el enlace de su correo: /aceptar-invitacion?token=...
 * ¿Para qué? Aquí, y solo aquí, la persona define su propia contraseña
 *           y completa sus datos personales. El Administrador del
 *           Sistema que la invitó nunca ve ni define esta información.
 */
export function AceptarInvitacionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [cargandoInfo, setCargandoInfo] = useState(true);
  const [infoInvitacion, setInfoInvitacion] = useState<InvitacionInfo | null>(null);

  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    numero_telefonico: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    if (!token) {
      setCargandoInfo(false);
      return;
    }
    consultarInvitacion(token)
      .then((info) => setInfoInvitacion(info))
      .catch(() => setInfoInvitacion({ correo_electronico: "", nombres_conjuntos: [], valido: false }))
      .finally(() => setCargandoInfo(false));
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    const errors: Record<string, string> = {};

    if (!formData.nombre.trim()) errors["nombre"] = t("aceptarInvitacion.errors.nameRequired");
    if (!formData.apellidos.trim()) errors["apellidos"] = t("aceptarInvitacion.errors.lastNameRequired");
    const passwordError = getPasswordRequirementError(formData.password);
    if (passwordError) {
      errors["password"] = traducirErrorPassword(passwordError, t);
    }
    if (formData.password !== formData.confirmPassword) {
      errors["confirmPassword"] = t("aceptarInvitacion.errors.passwordsMismatch");
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      await aceptarInvitacion({
        token,
        password: formData.password,
        nombre: formData.nombre,
        apellidos: formData.apellidos,
        numero_telefonico: formData.numero_telefonico || "N/A",
      });
      setExito(true);
    } catch (err: any) {
      setGeneralError(
        err.response?.data?.detail ||
          t("aceptarInvitacion.genericError")
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Estado: cargando info de la invitación ───
  if (cargandoInfo) {
    return (
      <>
        <LandingPage asBackdrop />
        <Modal onClose={() => navigate("/")}>
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">{t("aceptarInvitacion.verifying")}</div>
        </Modal>
      </>
    );
  }

  // ─── Estado: token inválido, vencido, o ya usado ───
  if (!infoInvitacion?.valido) {
    return (
      <>
        <LandingPage asBackdrop />
        <Modal onClose={() => navigate("/")}>
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 flex items-center justify-center rounded-full border border-red-200 dark:bg-red-900/30 dark:border-red-800/40">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("aceptarInvitacion.invalid.title")}</h2>
            <p className="text-gray-600 text-sm dark:text-gray-400">
              {t("aceptarInvitacion.invalid.message")}
            </p>
            <Button onClick={() => navigate("/")} fullWidth>
              {t("aceptarInvitacion.invalid.backHome")}
            </Button>
          </div>
        </Modal>
      </>
    );
  }

  // ─── Estado: cuenta creada con éxito ───
  if (exito) {
    return (
      <>
        <LandingPage asBackdrop />
        <Modal onClose={() => navigate("/")}>
          <div className="p-8 text-center space-y-4 animate-fade-in">
            <div className="mx-auto w-20 h-20 bg-green-100 flex items-center justify-center rounded-full border border-green-200 dark:bg-green-900/30 dark:border-green-800/40">
              <ShieldCheck className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t("aceptarInvitacion.success.title")}</h2>
            <p className="text-gray-600 text-sm dark:text-gray-400">
              {t("aceptarInvitacion.success.message")}
            </p>
            <div className="pt-4">
              <Button onClick={() => navigate("/")} fullWidth>
                {t("aceptarInvitacion.success.goToLogin")}
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  // ─── Estado: formulario de aceptación ───
  return (
    <>
      <LandingPage asBackdrop />
      <Modal onClose={() => navigate("/")} wide closeOnBackdrop={false}>
        <div className="p-8 max-w-2xl mx-auto overflow-y-auto max-h-[90vh] animate-fade-in">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t("aceptarInvitacion.form.title")}</h2>
            <p className="text-gray-500 mt-1 dark:text-gray-400">
              {t("aceptarInvitacion.form.invitationFor")} <strong>{infoInvitacion.correo_electronico}</strong>
            </p>
          </div>

          <div className="mb-6 p-4 bg-green-50/50 border border-green-100 rounded-xl dark:bg-green-900/10 dark:border-green-800/30">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {t("aceptarInvitacion.form.willAdminister")}
              </span>
            </div>
            <ul className="text-sm text-gray-600 list-disc list-inside dark:text-gray-400">
              {infoInvitacion.nombres_conjuntos.map((nombre) => (
                <li key={nombre}>{nombre}</li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              label={t("auth.register.fields.firstName")}
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
            />
            {fieldErrors.nombre && <p className="text-xs text-red-500 dark:text-red-400">{fieldErrors.nombre}</p>}

            <InputField
              label={t("auth.register.fields.lastName")}
              name="apellidos"
              value={formData.apellidos}
              onChange={handleChange}
            />
            {fieldErrors.apellidos && <p className="text-xs text-red-500 dark:text-red-400">{fieldErrors.apellidos}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label={t("common.phone")}
                name="numero_telefonico"
                value={formData.numero_telefonico}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
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
                {fieldErrors.password && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1 font-medium">{fieldErrors.password}</p>
                )}
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
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1 font-medium">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div className="w-full pt-4">
              <Button type="submit" fullWidth isLoading={isLoading}>
                {t("aceptarInvitacion.form.submit")}
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