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
  warning: { icon: TriangleAlert, anim: "icon-shake" },
  info: { icon: Info, anim: "icon-hop" },
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
  // ¿Impacto? Verde = éxito, rojo = error, ámbar = aviso, turquesa = información.
  // ¿Qué? Tonal reforzado (decisión 6 de docs/gestion-proyecto/investigacion-paleta-colores.md).
  //       Claro: relleno -100, borde de la escala media y texto -900.
  //       Oscuro: relleno al 18 % del color pleno, borde al 60 % y texto -200 (antes 10 % y 30-40 %).
  // ¿Para qué? Que el aviso se despegue de la tarjeta (antes casi no se veía y el color lo llevaba
  //            solo el texto) sin perder el estilo translúcido que ya tenía el proyecto.
  // ¿Impacto? El tipo se reconoce por el ícono y el texto, no solo por el color (ayuda a quien no
  //           distingue bien los tonos). La información usa turquesa (decisión 7) y no el azul.
  // Los colores salen de las utilidades `aviso-*` de index.css, que comparten las cajas de aviso y las
  // etiquetas de estado de toda la app.
  const typeClasses = {
    success: "aviso-exito",
    error: "aviso-error",
    info: "aviso-info",
    warning: "aviso-aviso",
  };

  // ¿Qué? Color del ícono: en claro el del texto; en oscuro el color pleno del tipo.
  const iconClasses = {
    success: "text-accent-900 dark:text-accent-300",
    error: "text-red-900 dark:text-red-400",
    info: "text-cyan-900 dark:text-cyan-400",
    warning: "text-yellow-900 dark:text-amber-400",
  };

  // ¿Qué? Clases CSS para el botón de cierre según el tipo de alerta.
  const closeClasses = {
    success: "text-accent-800 hover:text-accent-900 dark:text-accent-200 dark:hover:text-accent-100",
    error: "text-red-800 hover:text-red-900 dark:text-red-200 dark:hover:text-red-100",
    info: "text-cyan-800 hover:text-cyan-900 dark:text-cyan-200 dark:hover:text-cyan-100",
    warning:
      "text-yellow-800 hover:text-yellow-900 dark:text-amber-100 dark:hover:text-amber-50",
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
      <span className={`mt-0.5 shrink-0 ${iconClasses[type]}`} aria-hidden="true">
        <Icono className={`icon-lg icon-appear ${ICONO_POR_TIPO[type].anim}`} />
      </span>

      {/* ¿Qué? Texto del mensaje y botón de cierre. */}
      <span className="flex-1">{message}</span>

      {onClose && (
        <button
          onClick={onClose}
          className={`shrink-0 cursor-pointer transition-colors ${closeClasses[type]}`}
          aria-label={t("common.close")}
          title={t("common.close")}
        >
          {/* ¿Qué? Ícono X decorativo — la acción ya está descrita por aria-label del botón. */}
          <X className="icon-lg" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
