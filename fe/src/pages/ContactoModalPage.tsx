import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { LandingPage } from "@/pages/LandingPage";
import { useState } from "react";
import { Send, MessageSquare, Mail } from "lucide-react";
import { InputField } from "@/components/ui/InputField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { enviarMensajeContacto } from "@/lib/contactApi";
import {
  CONTACTO_ASUNTO_MAX_LENGTH,
  CONTACTO_ASUNTO_MIN_LENGTH,
  CONTACTO_MENSAJE_MAX_LENGTH,
  CONTACTO_MENSAJE_MIN_LENGTH,
  CORREO_MAX_LENGTH,
  CORREO_REGEX,
  NOMBRE_MAX_LENGTH,
  motivoNombreInvalido,
} from "@/lib/validacion";

type Campo = "name" | "email" | "subject" | "message";
const CAMPOS: Campo[] = ["name", "email", "subject", "message"];
const FORM_VACIO: Record<Campo, string> = { name: "", email: "", subject: "", message: "" };

/**
 * ¿Qué? Ruta /contacto — Landing de fondo + modal con el formulario de contacto.
 * ¿Para qué? A diferencia de Términos/Privacidad/Cookies (documentos legales
 *           reutilizando LegalLayout), el contacto es un formulario interactivo
 *           con su propio estado — se embebe directo aquí, sin necesitar una
 *           prop "embedded" porque nunca existe como página standalone separada.
 */
export function ContactoModalPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [formData, setFormData] = useState(FORM_VACIO);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Campo, string>>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  // ¿Qué? Issue #351 — error de un campo, o "" si es válido.
  // ¿Para qué? Una sola función para validar al salir del campo, para
  //           activar el botón y para revisar todo al enviar.
  const errorDe = (campo: Campo): string => {
    const valor = formData[campo].trim();
    if (campo === "name") {
      const motivo = motivoNombreInvalido(valor, NOMBRE_MAX_LENGTH);
      if (!motivo) return "";
      if (motivo === "requerido") return t("contactoModal.validation.nameRequired");
      if (motivo === "formato") return t("auth.register.validation.nameFormat");
      if (motivo === "largo") return t("auth.register.validation.firstNameMax", { max: NOMBRE_MAX_LENGTH });
      return t("auth.register.validation.firstNameMin");
    }
    if (campo === "email") {
      if (!valor) return t("auth.register.validation.emailRequired");
      return CORREO_REGEX.test(valor) ? "" : t("auth.register.validation.emailInvalid");
    }
    const [min, max] =
      campo === "subject"
        ? [CONTACTO_ASUNTO_MIN_LENGTH, CONTACTO_ASUNTO_MAX_LENGTH]
        : [CONTACTO_MENSAJE_MIN_LENGTH, CONTACTO_MENSAJE_MAX_LENGTH];
    if (valor.length < min) return t(`contactoModal.validation.${campo}Min`, { min });
    if (valor.length > max) return t(`contactoModal.validation.${campo}Max`, { max });
    return "";
  };

  const formularioValido = CAMPOS.every((campo) => !errorDe(campo));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const campo = e.target.name as Campo;
    setFormData((prev) => ({ ...prev, [campo]: e.target.value }));
    // ¿Qué? Al corregir, el error del campo desaparece; vuelve a revisarse al salir.
    setFieldErrors((prev) => ({ ...prev, [campo]: undefined }));
  };

  const validarCampo = (campo: Campo) => {
    const mensaje = errorDe(campo);
    setFieldErrors((prev) => ({ ...prev, [campo]: mensaje || undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errores = Object.fromEntries(
      CAMPOS.map((campo) => [campo, errorDe(campo) || undefined]),
    );
    setFieldErrors(errores);
    if (!formularioValido) return;

    setStatus("loading");
    setErrorEnvio(null);
    try {
      await enviarMensajeContacto({
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      });
      setStatus("success");
      setFormData(FORM_VACIO);
    } catch (err) {
      setStatus("idle");
      setErrorEnvio(err instanceof Error ? err.message : t("contactoModal.errorDefault"));
    }
  };

  return (
    <>
      <LandingPage asBackdrop />
      <Modal onClose={() => navigate("/")} wide aria-label={t("contactoModal.title")}>
        <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-100 dark:bg-accent-900/30">
              <MessageSquare className="icon-xl text-accent-600 dark:text-accent-400" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {t("contactoModal.title")}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
              {t("contactoModal.subtitle")}
            </p>
          </div>

          {status === "success" ? (
            <Alert
              type="success"
              message={t("contactoModal.successMessage")}
              onClose={() => setStatus("idle")}
            />
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {errorEnvio && (
                <Alert type="error" message={errorEnvio} onClose={() => setErrorEnvio(null)} />
              )}
              <InputField
                label={t("contactoModal.name.label")}
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={() => validarCampo("name")}
                error={fieldErrors.name}
                maxLength={NOMBRE_MAX_LENGTH}
                placeholder={t("contactoModal.name.placeholder")}
              />
              <InputField
                label={t("contactoModal.email.label")}
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={() => validarCampo("email")}
                error={fieldErrors.email}
                maxLength={CORREO_MAX_LENGTH}
                placeholder={t("contactoModal.email.placeholder")}
                icon={<Mail className="icon-lg" />}
              />
              <InputField
                label={t("contactoModal.subject.label")}
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                onBlur={() => validarCampo("subject")}
                error={fieldErrors.subject}
                maxLength={CONTACTO_ASUNTO_MAX_LENGTH}
                placeholder={t("contactoModal.subject.placeholder")}
              />

              <div className="space-y-1.5">
                <label htmlFor="message" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t("contactoModal.message.label")}
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  value={formData.message}
                  onChange={handleChange}
                  onBlur={() => validarCampo("message")}
                  maxLength={CONTACTO_MENSAJE_MAX_LENGTH}
                  aria-invalid={!!fieldErrors.message}
                  aria-describedby={fieldErrors.message ? "message-error message-count" : "message-count"}
                  placeholder={t("contactoModal.message.placeholder")}
                  className={`block w-full rounded-xl border bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors hover:border-accent-400 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/10 dark:bg-night-field dark:text-white dark:placeholder:text-gray-500 dark:hover:border-accent-500 ${
                    fieldErrors.message ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-night-line"
                  }`}
                />
                <div className="flex items-start justify-between gap-2">
                  {fieldErrors.message ? (
                    <p id="message-error" className="animate-fade-in text-sm text-red-600 dark:text-red-400" role="alert">
                      {fieldErrors.message}
                    </p>
                  ) : (
                    <span />
                  )}
                  <p id="message-count" className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                    {t("contactoModal.charCount", {
                      actual: formData.message.length,
                      max: CONTACTO_MENSAJE_MAX_LENGTH,
                    })}
                  </p>
                </div>
              </div>

              <Button type="submit" fullWidth isLoading={status === "loading"} disabled={!formularioValido}>
                <span className="flex items-center gap-2">
                  {formularioValido ? t("contactoModal.submit") : t("contactoModal.incomplete")}
                  <Send className="icon-md" />
                </span>
              </Button>
            </form>
          )}
        </div>
      </Modal>
    </>
  );
}
