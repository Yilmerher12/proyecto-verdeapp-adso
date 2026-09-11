/**
 * Archivo: components/ui/ConfirmModal.tsx
 * Descripción: Ventana de confirmación reutilizable ("¿estás seguro?") con
 *              ícono, título, advertencia y botones Cancelar/Confirmar.
 * ¿Para qué? Issue #224 — esta misma ventana estaba escrita a mano, casi
 *           idéntica, en 7 lugares distintos del panel de administración
 *           (regenerar código de acceso, revocar reciclador, eliminar
 *           comunicado, dar de baja/eliminar punto de acopio, eliminar
 *           módulo educativo, activar/desactivar una cuenta) — cada copia
 *           con pequeñas diferencias de estilo entre sí.
 * ¿Impacto? Ahora hay un solo lugar que define cómo se ve una confirmación
 *           en toda la app — si el diseño cambia, se cambia aquí una vez.
 */

import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";

interface ConfirmModalProps {
  /** ¿Qué? Ícono dentro del círculo de color, arriba del título (ej: AlertTriangle, Trash2, Ban). */
  icon: LucideIcon;
  /** ¿Qué? Color del círculo/ícono/botón de confirmar. "warning" (ámbar) para
   *        acciones reversibles-pero-delicadas, "danger" (rojo) para acciones
   *        destructivas, "primary" (verde de marca) para una confirmación
   *        positiva (ej: reactivar una cuenta). */
  variant: "warning" | "danger" | "primary";
  title: string;
  description: string;
  confirmLabel: string;
  /** ¿Qué? Texto del botón mientras isConfirming=true. Por defecto, el mismo confirmLabel. */
  confirmingLabel?: string;
  isConfirming?: boolean;
  error?: string | null;
  /** ¿Qué? Si se pasa, el aviso de error se puede cerrar sin cerrar todo el modal. */
  onDismissError?: () => void;
  onConfirm: () => void;
  onClose: () => void;
  ariaLabel: string;
}

const ESTILOS_VARIANTE = {
  warning: {
    circulo: "bg-amber-50 dark:bg-amber-900/20",
    icono: "text-amber-600 dark:text-amber-400",
    boton: "bg-amber-600 hover:bg-amber-700",
  },
  danger: {
    circulo: "bg-red-50 dark:bg-red-900/20",
    icono: "text-red-500 dark:text-red-400",
    boton: "bg-red-500 hover:bg-red-600",
  },
  primary: {
    circulo: "bg-accent-50 dark:bg-accent-900/20",
    icono: "text-accent-600 dark:text-accent-400",
    boton: "bg-accent-700 hover:bg-accent-800",
  },
} as const;

export function ConfirmModal({
  icon: Icon,
  variant,
  title,
  description,
  confirmLabel,
  confirmingLabel,
  isConfirming = false,
  error,
  onDismissError,
  onConfirm,
  onClose,
  ariaLabel,
}: ConfirmModalProps) {
  const { t } = useTranslation();
  const estilo = ESTILOS_VARIANTE[variant];

  return (
    <Modal onClose={onClose} aria-label={ariaLabel}>
      <div className="p-6 sm:p-8 max-w-sm mx-auto text-center">
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${estilo.circulo}`}>
          <Icon className={`h-6 w-6 ${estilo.icono}`} />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{description}</p>
        {error && (
          <div className="mb-4 text-left">
            <Alert type="error" message={error} onClose={onDismissError} />
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-xl border border-gray-200 dark:border-[#2a4d34] px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a4d34] transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`flex-1 cursor-pointer rounded-xl ${estilo.boton} px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {isConfirming ? (confirmingLabel ?? confirmLabel) : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
