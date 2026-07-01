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
import { Modal } from "@/components/ui/Modal";

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
    setShowConfirm(false);
    setIsLoading(true);
    try {
      await forgotPassword({ email });
      setSuccess(t("auth.forgotPassword.successMessage"));
      setEmail("");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.forgotPassword.errorDefault");
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    {showConfirm && (
      <Modal onClose={() => setShowConfirm(false)}>
        <div className="p-6 sm:p-8 max-w-sm mx-auto text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
            <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            ¿Enviar enlace de recuperación?
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Se enviará un correo a:
          </p>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-6 break-all">
            {email}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmSend}
              className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              Sí, enviar
            </button>
          </div>
        </div>
      </Modal>
    )}
    <AuthLayout title={t("auth.forgotPassword.title")} subtitle={t("auth.forgotPassword.subtitle")}>
      {success && (
        <div className="mb-4">
          <Alert type="success" message={success} />
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
          <Button type="submit" fullWidth isLoading={isLoading}>
            {t("auth.forgotPassword.submit")}
          </Button>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        <Link
          to="/login"
          className="font-medium text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
        >
          {t("auth.forgotPassword.backToLogin")}
        </Link>
      </p>
    </AuthLayout>
    </>
  );
}
