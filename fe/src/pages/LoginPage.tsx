/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Archivo: pages/LoginPage.tsx
 * Descripción: Página de inicio de sesión — formulario de email y contraseña.
 * ¿Para qué? Permitir que usuarios registrados se autentiquen en el sistema.
 * ¿Impacto? Es la puerta de entrada a la app — sin login, no se puede acceder a nada protegido.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, Lock, Leaf } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Modal } from "@/components/ui/Modal";
import { LandingPage } from "@/pages/LandingPage";
import { InputField } from "@/components/ui/InputField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { RoleId } from "@/types/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const loginPayload = {
        correo_electronico: formData.email, 
        username: formData.email,          
        password: formData.password
      };

      // 🛠️ CORREGIDO: Forzamos el casteo directo sobre la función login para que TypeScript no chille
      const response = await login(loginPayload as any);
      const userData = response as Record<string, any> | null | undefined;
      
      const roleId = userData?.role_id || userData?.id_rol;
      
      if (roleId === RoleId.ADMIN_SISTEMA) {
        navigate("/dashboard/admin", { replace: true });
      } else if (roleId === RoleId.RECICLADOR) {
        navigate("/dashboard/reciclador", { replace: true });
      } else if (roleId === RoleId.RESIDENTE) {
        navigate("/dashboard/residente", { replace: true });
      } else {
        navigate("/dashboard", { replace: true }); 
      }
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("auth.login.errorDefault"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <LandingPage asBackdrop />
      <Modal onClose={() => navigate("/")}>
        <div className="p-6 sm:p-8 max-w-md mx-auto">
          <div className="mb-6 text-center sm:text-left">
            <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 mb-3 mx-auto sm:mx-0 shadow-sm border border-green-200">
              <Leaf className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("auth.login.title")}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("auth.login.subtitle")}
            </p>
          </div>

          {error && (
            <div className="mb-4">
              <Alert type="error" message={error} onClose={() => setError(null)} />
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <InputField
              label={t("common.email")}
              name="email"
              type="email"
              value={formData.email}
              placeholder={t("common.emailPlaceholder")}
              autoComplete="email"
              autoFocus
              icon={<Mail className="h-5 w-5 text-gray-400" />}
              onChange={handleChange}
            />

            <InputField
              label={t("common.password")}
              name="password"
              type="password"
              value={formData.password}
              placeholder={t("common.passwordPlaceholder")}
              autoComplete="current-password"
              icon={<Lock className="h-5 w-5 text-gray-400" />}
              onChange={handleChange}
            />

            <div className="flex justify-end pt-1">
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-green-600 hover:text-green-700 dark:text-green-400"
              >
                {t("auth.login.forgotPassword")}
              </Link>
            </div>

            <div className="pt-2">
              <Button type="submit" fullWidth isLoading={isLoading}>
                {t("auth.login.submit")}
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("auth.login.noAccount")}{" "}
            <Link
              to="/register"
              className="font-bold text-green-600 hover:text-green-700 dark:text-green-400"
            >
              {t("auth.login.createAccountLink")}
            </Link>
          </p>
        </div>
      </Modal>
    </>
  );
}