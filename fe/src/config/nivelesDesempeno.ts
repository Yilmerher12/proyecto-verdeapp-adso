import { Frown, Laugh, Meh, Smile, type LucideIcon } from "lucide-react";
import type { NivelDesempeno } from "@/lib/auditoriaConjuntoApi";

/**
 * ¿Qué? Ícono y color por nivel de desempeño de la auditoría (RQF-009).
 * ¿Para qué? Un solo lugar para el mapeo — lo usan el selector del
 *           reciclador al calificar y (rama siguiente) la tarjeta que ven
 *           los residentes con el resultado. Decisión de diseño: 4 niveles
 *           con ícono tipo cara, cada uno con su propio color con
 *           significado (verde/verde azulado = va bien, ámbar/rojo = hay
 *           que prestar atención) — no un ciclo de colores decorativo.
 * ¿Impacto? Agregar un nivel nuevo en el futuro solo requiere una entrada
 *           aquí, no tocar cada componente que lo muestra.
 */
interface NivelDesempenoConfig {
  icon: LucideIcon;
  claseSeleccionado: string;
  claseBadge: string;
}

export const NIVELES_DESEMPENO: Record<NivelDesempeno, NivelDesempenoConfig> = {
  EXCELENTE: {
    icon: Laugh,
    claseSeleccionado:
      "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 dark:border-green-600",
    claseBadge: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  },
  BUENA: {
    icon: Smile,
    claseSeleccionado:
      "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-600",
    claseBadge: "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400",
  },
  REGULAR: {
    icon: Meh,
    claseSeleccionado:
      "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-600",
    claseBadge: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  },
  DEFICIENTE: {
    icon: Frown,
    claseSeleccionado:
      "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-600",
    claseBadge: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  },
};

export const ORDEN_NIVELES: NivelDesempeno[] = ["EXCELENTE", "BUENA", "REGULAR", "DEFICIENTE"];

/**
 * ¿Qué? Los 3 niveles que puede ELEGIR el reciclador al crear una nueva
 *       auditoría (Bueno/Regular/Malo, ver traducciones en niveles.*).
 * ¿Para qué? "Excelente" y "Buena" ya no son dos opciones distintas para
 *           calificar — se unificaron en un solo "Bueno" (decisión del
 *           2026-08-27). Las auditorías viejas con nivel EXCELENTE se
 *           siguen mostrando igual que las BUENA en historiales/detalles,
 *           simplemente ya no se ofrece como opción nueva al calificar.
 */
export const ORDEN_NIVELES_SELECCIONABLES: NivelDesempeno[] = ["BUENA", "REGULAR", "DEFICIENTE"];
