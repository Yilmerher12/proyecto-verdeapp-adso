/**
 * Archivo: components/ui/Modal.tsx
 * Descripción: Modal overlay reutilizable — backdrop + dialog centrado.
 * ¿Para qué? Mostrar formularios de auth sobre la landing page sin abandonar el contexto visual.
 * ¿Impacto? El usuario puede registrarse o iniciar sesión sin perder de vista la landing;
 *           cierra con ESC o clic en el backdrop. Accesible (role=dialog, aria-modal, foco).
 */

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ModalProps {
  /** ¿Qué? Callback que se ejecuta cuando el usuario quiere cerrar el modal. */
  onClose: () => void;
  children: React.ReactNode;
  /** ¿Qué? Amplía el diálogo a max-w-xl para formularios con más campos (ej: registro). */
  wide?: boolean;
  /** ¿Qué? Label accesible del diálogo para lectores de pantalla (aria-label). */
  "aria-label"?: string;
  /**
   * ¿Qué? Nivel de apilamiento del modal. "base" es el normal (login, registro,
   *       landing). "stacked" es para un modal SECUNDARIO que se abre encima
   *       de otro modal ya abierto (ej: Términos de Uso abierto desde dentro
   *       del formulario de Registro).
   * ¿Para qué? Sin esto, dos modales con el mismo z-index se apilan según el
   *           orden del DOM, y dependiendo de en qué orden React los monta,
   *           el "de encima" visualmente puede terminar quedando detrás.
   * ¿Impacto? "stacked" usa un z-index mayor, garantizando que siempre se vea
   *           sobre cualquier modal "base", sin depender del orden de montaje.
   * Default: "base".
   */
  layer?: "base" | "stacked";
}

/**
 * ¿Qué? Componente modal con backdrop semitransparente y diálogo centrado.
 * ¿Para qué? Mostrar contenido en primer plano sin cambiar de ruta de forma visible.
 * ¿Impacto? Cierra con ESC o clic en backdrop. Bloquea scroll del body mientras está abierto.
 *           Mueve el foco al diálogo al abrirse (WCAG 2.1 — 2.4.3 Focus Order).
 */
export function Modal({
  onClose,
  children,
  wide = false,
  "aria-label": ariaLabel,
  layer = "base",
}: ModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // ¿Qué? z-50 para modales base, z-[70] para modales secundarios/apilados.
  // ¿Para qué? Garantizar el orden visual correcto sin depender de en qué
  //           orden React montó cada <Modal> en el árbol de componentes.
  const backdropZIndex = layer === "stacked" ? "z-[70]" : "z-50";

  return (
    <div
      className={`fixed inset-0 ${backdropZIndex} flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:items-center sm:p-6`}
      onClick={onClose}
      aria-hidden="false"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={`relative my-auto w-full ${wide ? "max-w-xl" : "max-w-md"} rounded-2xl bg-white shadow-2xl outline-none dark:bg-gray-900`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-gray-400 transition-colors
            hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          aria-label={t("common.close")}
        >
          <X className="h-5 w-5" />
        </button>

        {children}
      </div>
    </div>
  );
}