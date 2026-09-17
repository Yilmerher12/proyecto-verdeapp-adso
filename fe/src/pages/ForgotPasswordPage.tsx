/**
 * Archivo: pages/ForgotPasswordPage.tsx
 * Descripción: Página para solicitar recuperación de contraseña por email.
 * ¿Para qué? Iniciar el flujo de recuperación: el usuario ingresa su email
 *            y el backend envía un enlace de reset si el email existe.
 * ¿Impacto? La respuesta siempre es la misma — no revela si el email está registrado.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { InputField } from "@/components/ui/InputField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

/**
 * ¿Qué? Formulario de solicitud de recuperación de contraseña.
 * ¿Para qué? El usuario ingresa su email y el backend envía un enlace de reset.
 * ¿Impacto? Siempre muestra mensaje de éxito (por seguridad, sin revelar si el email existe).
 */
export function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // ¿Qué? Error propio del envío (dentro del modal de confirmación) —
  //       separado de "error" (validación del correo, antes de siquiera
  //       abrir el modal), para que cada uno se muestre en el lugar
  //       correcto, igual que hacen los demás ConfirmModal de la app.
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const formularioIncompleto = !email.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError(t("auth.forgotPassword.validation.emailRequired"));
      return;
    }
    setShowConfirm(true);
  };

  const confirmSend = async () => {
    setIsLoading(true);
    setErrorEnvio(null);
    try {
      await forgotPassword({ email });
      setSuccess(t("auth.forgotPassword.successMessage"));
      setEmail("");
      setShowConfirm(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.forgotPassword.errorDefault");
      setErrorEnvio(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    {showConfirm && (
      <ConfirmModal
        icon={Mail}
        variant="primary"
        ariaLabel={t("auth.forgotPassword.confirmTitle")}
        title={t("auth.forgotPassword.confirmTitle")}
        description={t("auth.forgotPassword.confirmDescription", { email })}
        error={errorEnvio}
        onDismissError={() => setErrorEnvio(null)}
        isConfirming={isLoading}
        confirmLabel={t("auth.forgotPassword.confirmButton")}
        confirmingLabel={t("auth.forgotPassword.confirmSending")}
        onConfirm={confirmSend}
        onClose={() => setShowConfirm(false)}
      />
    )}
    <AuthLayout title={t("auth.forgotPassword.title")} subtitle={t("auth.forgotPassword.subtitle")}>
      {success && (
        <div className="mb-4">
          <Alert type="success" message={success} onClose={() => setSuccess(null)} />
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Alert type="error" message={error} onClose={() => setError(null)} />
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <InputField
          label={t("common.email")}
          name="email"
          type="email"
          value={email}
          placeholder={t("common.emailPlaceholder")}
          autoComplete="email"
          autoFocus
          icon={<Mail className="h-5 w-5" />}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
        />

        <div className="mt-2 flex justify-end">
          <Button type="submit" fullWidth isLoading={isLoading} disabled={formularioIncompleto}>
            {formularioIncompleto ? t("common.formIncomplete") : t("auth.forgotPassword.submit")}
          </Button>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        <Link
          to="/login"
          className="font-medium text-accent-700 hover:text-accent-800 dark:text-accent-400 dark:hover:text-accent-300"
        >
          {t("auth.forgotPassword.backToLogin")}
        </Link>
      </p>
    </AuthLayout>
    </>
  );
}
