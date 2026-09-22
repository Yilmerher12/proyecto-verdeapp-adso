/**
 * Archivo: components/ui/PanelLateral.tsx
 * Descripción: Panel que se desliza desde la derecha, sobre un fondo oscuro.
 * ¿Para qué? Mostrar el detalle de una fila (ej: el perfil de un usuario en el
 *           panel del Admin del Sistema) sin sacar a la persona de la tabla
 *           donde estaba. Un <Modal> centrado se sentía como "otra pantalla"
 *           para algo que solo se quiere consultar de pasada.
 * ¿Impacto? Misma accesibilidad que Modal: role=dialog, aria-modal, foco
 *           atrapado adentro, se cierra con Esc, clic afuera o la X, y el
 *           foco vuelve a la fila desde la que se abrió.
 */

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PanelLateralProps {
  onClose: () => void;
  children: React.ReactNode;
  "aria-label": string;
  /** ¿Qué? Si la tecla Esc cierra el panel. Default: true.
   *  ¿Para qué? Cuando se abre una confirmación (Modal) ENCIMA del panel, Esc
   *            debe cerrar solo esa confirmación — no las dos a la vez. */
  cerrarConEscape?: boolean;
}

const SELECTOR_ENFOCABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function PanelLateral({ onClose, children, "aria-label": ariaLabel, cerrarConEscape = true }: PanelLateralProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const focoPrevioRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    focoPrevioRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      focoPrevioRef.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && cerrarConEscape) {
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const enfocables = panelRef.current.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLE);
        if (enfocables.length === 0) return;
        const primero = enfocables[0];
        const ultimo = enfocables[enfocables.length - 1];
        if (e.shiftKey && document.activeElement === primero) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primero.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, cerrarConEscape]);

  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, []);

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex cursor-pointer justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-md cursor-auto flex-col overflow-y-auto border-l border-gray-100 bg-[#f7f9f3] shadow-2xl outline-none dark:border-[#2a4d34] dark:bg-[#132a1c]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 dark:hover:bg-[#2a4d34] dark:hover:text-gray-300"
          aria-label={t("common.close")}
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}
