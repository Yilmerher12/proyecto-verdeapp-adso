import { Frown, Meh, Smile, type LucideIcon } from "lucide-react";
import type { NivelDesempeno } from "@/lib/auditoriaConjuntoApi";

/**
 * ¿Qué? Ícono y color por nivel de desempeño de la auditoría (RQF-009).
 * ¿Para qué? Un solo lugar para el mapeo — lo usan el selector del
 *           reciclador al calificar y (rama siguiente) la tarjeta que ven
 *           los residentes con el resultado. Decisión de diseño: 3 niveles
 *           (Bueno / Regular / Malo) con ícono tipo cara, cada uno con su
 *           propio color con significado (verde azulado = va bien,
 *           ámbar/rojo = hay que prestar atención) — no un ciclo de
 *           colores decorativo.
 * ¿Impacto? Agregar un nivel nuevo en el futuro solo requiere una entrada
 *           aquí, no tocar cada componente que lo muestra.
 */
interface NivelDesempenoConfig {
  icon: LucideIcon;
  claseSeleccionado: string;
  claseBadge: string;
  // ¿Qué? Colores de la gráfica semanal (issue #487): el relleno de cada
  //       tramo de barra (clase `fill-*`, para SVG), el color del número que
  //       va dentro y la muestra de la leyenda (clase `bg-*`).
  // ¿Para qué? Un tono más oscuro que el de la insignia para que el número
  //           blanco dentro del tramo alcance el contraste mínimo (4.5:1); el
  //           ámbar es claro y lleva número oscuro.
  // ¿Impacto? Sirven igual en modo claro y oscuro: el tramo lleva su propio
  //           color de fondo, no depende de la superficie detrás.
  claseRelleno: string;
  claseNumeroRelleno: string;
  claseMuestra: string;
}

export const NIVELES_DESEMPENO: Record<NivelDesempeno, NivelDesempenoConfig> = {
  BUENA: {
    icon: Smile,
    claseSeleccionado:
      "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-600",
    claseBadge: "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400",
    claseRelleno: "fill-teal-700",
    claseNumeroRelleno: "fill-white",
    claseMuestra: "bg-teal-700",
  },
  REGULAR: {
    icon: Meh,
    claseSeleccionado:
      "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-600",
    claseBadge: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
    claseRelleno: "fill-amber-400",
    claseNumeroRelleno: "fill-gray-900",
    claseMuestra: "bg-amber-400",
  },
  DEFICIENTE: {
    icon: Frown,
    claseSeleccionado:
      "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-600",
    claseBadge: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    claseRelleno: "fill-red-600",
    claseNumeroRelleno: "fill-white",
    claseMuestra: "bg-red-600",
  },
};

/**
 * ¿Qué? Los 3 niveles que puede ELEGIR el reciclador al crear una nueva
 *       auditoría (Bueno/Regular/Malo, ver traducciones en niveles.*), en
 *       el orden en que se muestran.
 * ¿Para qué? "Excelente" y "Buena" se unificaron en un solo "Bueno"
 *           (decisión del 2026-08-27) y el nivel EXCELENTE se retiró del
 *           código en la migración b1c2d3e4f5a6.
 */
export const ORDEN_NIVELES_SELECCIONABLES: NivelDesempeno[] = ["BUENA", "REGULAR", "DEFICIENTE"];
