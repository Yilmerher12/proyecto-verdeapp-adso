/**
 * Archivo: pages/LoginPage.tsx
 * Descripción: Página de inicio de sesión — formulario de email y contraseña.
 * ¿Para qué? Permitir que usuarios registrados se autentiquen en el sistema.
 * ¿Impacto? Es la puerta de entrada a la app — sin login, no se puede acceder a nada protegido.
 */
import { useEffect, useState } from "react";
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

  // ¿Qué? Si axios.ts detectó una sesión vencida (401 con token guardado),
  //       dejó esta marca antes de redirigir aquí con recarga completa.
  // ¿Para qué? Explicarle al usuario por qué terminó en esta pantalla, en vez
  //           de dejarlo pensando que la app falló o que cerró sesión él mismo.
  // ¿Impacto? La marca se borra al leerla, así que solo se muestra una vez.
  useEffect(() => {
    if (sessionStorage.getItem("verdeapp:session-expired")) {
      sessionStorage.removeItem("verdeapp:session-expired");
      setError(t("auth.login.sessionExpired"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // ¿Qué? Antes se armaba { correo_electronico, username, password } y
      //       se forzaba con "as any" porque no coincidía con LoginRequest
      //       ({ email, password }) — funcionaba solo porque el backend
      //       (UserLogin) tolera varios nombres de campo.
      // ¿Para qué? Enviar exactamente lo que LoginRequest declara, para que
      //           TypeScript sí revise este payload en vez de dejarlo pasar
      //           sin chequeo.
      const userData = await login({ email: formData.email, password: formData.password });
      const roleId = userData.role_id;

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
      <Modal onClose={() => navigate("/")} closeOnBackdrop={false}>
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