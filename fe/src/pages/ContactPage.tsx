/**
 * Archivo: ContactPage.tsx
 * Descripción: Formulario público de contacto para VerdeApp.
 * ¿Para qué? Proveer un canal de comunicación para consultas, soporte o alianzas.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send, MessageSquare, Mail, Leaf } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { InputField } from "@/components/ui/InputField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function ContactPage() {
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // 🛠️ VALIDACIÓN INTELIGENTE: Verifica si hay algún campo vacío
  const isFormIncomplete = !formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Doble bloqueo por seguridad
    if (isFormIncomplete) return;

    setStatus("loading");
    
    // Simulación de envío — reemplazar con endpoint real en Fase 2
    setTimeout(() => {
      setStatus("success");
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 selection:bg-green-200 selection:text-green-900">
      
      {/* HEADER DE NAVEGACIÓN SECUNDARIA */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 dark:border-gray-800 dark:bg-gray-950/80 backdrop-blur-md shadow-sm">
        <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-green-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-md"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.backToHome")}
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </nav>
      </header>

      {/* CONTENEDOR PRINCIPAL */}
      <main className="flex-1 py-12 px-6">
        <div className="mx-auto max-w-xl animate-fade-in">
          
          {/* CABECERA DEL FORMULARIO */}
          <div className="mb-10 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
              <MessageSquare className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
              Contáctanos
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
              ¿Tienes dudas sobre VerdeApp, problemas con tu cuenta o quieres proponer una alianza? Déjanos tu mensaje.
            </p>
          </div>

          {/* FORMULARIO */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-10 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {status === "success" && (
              <div className="mb-6">
                <Alert
                  type="success"
                  message="¡Mensaje enviado con éxito! Te responderemos pronto a tu correo electrónico."
                  onClose={() => setStatus("idle")}
                />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* 🛠️ Quitamos el atributo 'required' que causaba el conflicto de TypeScript */}
                <InputField
                  label="Nombre completo"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ej. Juan Pérez"
                />
                <InputField
                  label="Correo electrónico"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="juan@ejemplo.com"
                  icon={<Mail className="h-5 w-5 text-gray-400" />}
                />
              </div>

              <InputField
                label="Asunto"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="¿En qué podemos ayudarte?"
              />

              <div className="space-y-1.5">
                <label
                  htmlFor="message"
                  className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  Mensaje
                </label>
                {/* Como textarea es nativo, aquí sí podemos dejar el required, no causa conflicto */}
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Escribe tu mensaje aquí..."
                  required
                  className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors hover:border-green-400 focus:border-green-500 focus:outline-none focus:ring-4 focus:ring-green-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:hover:border-green-500"
                />
              </div>

              {/* Botón dinámico que se deshabilita si faltan datos */}
              <div className={`pt-4 rounded-xl overflow-hidden transition-all shadow-sm ${isFormIncomplete ? 'opacity-60 cursor-not-allowed bg-green-600/50 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                <Button
                  type="submit"
                  fullWidth
                  isLoading={status === "loading"}
                  disabled={isFormIncomplete}
                >
                  <span className="flex items-center gap-2">
                    {isFormIncomplete ? "Completa todos los campos" : "Enviar Mensaje"} <Send className="h-4 w-4" />
                  </span>
                </Button>
              </div>
            </form>
          </div>
          
        </div>
      </main>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-gray-200 py-8 text-center dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Leaf className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="font-semibold text-gray-700 dark:text-gray-300">VerdeApp</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} ADSO - SENA
        </p>
      </footer>
    </div>
  );
}