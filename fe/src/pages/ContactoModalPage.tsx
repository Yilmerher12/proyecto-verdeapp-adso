import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { LandingPage } from "@/pages/LandingPage";
import { useState } from "react";
import { Send, MessageSquare, Mail } from "lucide-react";
import { InputField } from "@/components/ui/InputField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

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

  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const isFormIncomplete =
    !formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormIncomplete) return;
    setStatus("loading");
    setTimeout(() => {
      setStatus("success");
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 1500);
  };

  return (
    <>
      <LandingPage asBackdrop />
      <Modal onClose={() => navigate("/")} wide aria-label={t("contactoModal.title")}>
        <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
              <MessageSquare className="h-7 w-7 text-green-600 dark:text-green-400" />
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <InputField
                label={t("contactoModal.name.label")}
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t("contactoModal.name.placeholder")}
              />
              <InputField
                label={t("contactoModal.email.label")}
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t("contactoModal.email.placeholder")}
                icon={<Mail className="h-5 w-5 text-gray-400" />}
              />
              <InputField
                label={t("contactoModal.subject.label")}
                name="subject"
                value={formData.subject}
                onChange={handleChange}
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
                  placeholder={t("contactoModal.message.placeholder")}
                  required
                  className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors hover:border-green-400 focus:border-green-500 focus:outline-none focus:ring-4 focus:ring-green-500/10 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white dark:placeholder:text-gray-500 dark:hover:border-green-500"
                />
              </div>

              <Button type="submit" fullWidth isLoading={status === "loading"} disabled={isFormIncomplete}>
                <span className="flex items-center gap-2">
                  {isFormIncomplete ? t("contactoModal.incomplete") : t("contactoModal.submit")}
                  <Send className="h-4 w-4" />
                </span>
              </Button>
            </form>
          )}
        </div>
      </Modal>
    </>
  );
}