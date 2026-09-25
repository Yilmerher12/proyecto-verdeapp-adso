/**
 * Archivo: components/ui/Alert.tsx
 * Descripción: Componente de alerta para mostrar mensajes de éxito, error o información.
 * ¿Para qué? Dar feedback visual al usuario después de una acción (login exitoso, error, etc.).
 * ¿Impacto? Sin alertas, el usuario no sabría si una operación tuvo éxito o falló.
 */
import { useTranslation } from "react-i18next";
import { BadgeCheck, Info, OctagonX, TriangleAlert, X, type LucideIcon } from "lucide-react";

// ¿Qué? Ícono y animación de cada tipo de mensaje (concepto "mensajes" del mapa
//       de íconos: éxito BadgeCheck, error OctagonX, aviso TriangleAlert, info Info).
const ICONO_POR_TIPO: Record<AlertProps["type"], { icon: LucideIcon; anim: string }> = {
  success: { icon: BadgeCheck, anim: "icon-hop" },
  error: { icon: OctagonX, anim: "icon-shake" },
  warning: { icon: TriangleAlert, anim: "icon-ring" },
  info: { icon: Info, anim: "icon-nudge" },
};

/**
 * ¿Qué? Props del componente Alert.
 * ¿Para qué? Configurar tipo de alerta (success, error, info) y contenido del mensaje.
 * ¿Impacto? El tipo determina el color y el ícono de la alerta.
 */
interface AlertProps {
  type: "success" | "error" | "info" | "warning";
  message: string;
  onClose?: () => void;
}

/**
 * ¿Qué? Componente de alerta con colores según tipo y botón de cierre opcional.
 * ¿Para qué? Mostrar mensajes de feedback en los formularios de auth.
 * ¿Impacto? Colores sólidos (sin degradados), bordes sutiles, transiciones suaves.
 */
export function Alert({ type, message, onClose }: AlertProps) {
  const { t } = useTranslation();
  const Icono = ICONO_POR_TIPO[type].icon;
  // ¿Qué? Mapeo de tipo → clases CSS para colores del contenedor.
  // ¿Para qué? Cada tipo de alerta tiene colores que comunican su naturaleza.
  // ¿Impacto? Verde = éxito, rojo = error, azul = información.
  const typeClasses = {
    success:
      "bg-accent-50 text-accent-800 border-accent-200 dark:bg-accent-950 dark:text-accent-300 dark:border-accent-800",
    error:
      "bg-red-50 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
    info: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
    warning:
      "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800",
  };

  // ¿Qué? Clases CSS para el botón de cierre según el tipo de alerta.
  const closeClasses = {
    success: "text-accent-600 hover:text-accent-800 dark:text-accent-400 dark:hover:text-accent-200",
    error: "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200",
    info: "text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200",
    warning:
      "text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200",
  };

  return (
    <div
      className={`animate-fade-in flex items-start gap-3 rounded-lg border p-4 text-sm ${typeClasses[type]}`}
      role="alert"
    >
      {/*
        ¿Qué? Ícono de lucide según el tipo (antes eran SVG de otra librería pegados
              a mano). aria-hidden: el texto del mensaje ya comunica el tipo (WCAG 1.1.1).
        ¿Para qué? icon-appear hace que el ícono se mueva UNA vez al aparecer el mensaje
                  (el check salta, la X niega, el triángulo tiembla) — ver index.css.
      */}
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        <Icono className={`h-5 w-5 icon-appear ${ICONO_POR_TIPO[type].anim}`} />
      </span>

      {/* ¿Qué? Texto del mensaje y botón de cierre. */}
      <span className="flex-1">{message}</span>

      {onClose && (
        <button
          onClick={onClose}
          className={`shrink-0 cursor-pointer transition-colors ${closeClasses[type]}`}
          aria-label={t("common.close")}
        >
          {/* ¿Qué? Ícono X decorativo — la acción ya está descrita por aria-label del botón. */}
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
