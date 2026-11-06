/**
 * Archivo: components/ui/Pestanas.tsx
 * Descripción: Fila de pestañas (botones redondeados que cambian de vista) que se acomoda según el ancho de su
 *              propio espacio.
 * ¿Para qué? Antes cada pantalla armaba sus pestañas a mano con `flex-wrap`: en una ventana angosta se
 *           envolvían en filas y una quedaba sola, desordenada ("Mi conjunto" del Residente y Soporte técnico).
 * ¿Impacto? En un espacio angosto las pestañas van en una cuadrícula ordenada (partes iguales, o dos columnas
 *           con la última a todo el ancho si `dosColumnas`); desde `@xl` (36 rem de ancho del espacio, no de la
 *           ventana) van en una fila, cada una del tamaño de su texto. Mide el ancho de su contenedor, así que
 *           funciona igual con el menú lateral abierto o cerrado.
 */
import type { ReactNode } from "react";

export interface OpcionPestana<T extends string> {
  id: T;
  etiqueta: ReactNode;
}

interface PestanasProps<T extends string> {
  pestanas: OpcionPestana<T>[];
  activa: T;
  onCambiar: (id: T) => void;
  /** ¿Qué? Nombre de la fila de pestañas para el lector de pantalla. */
  ariaLabel: string;
  /** ¿Qué? Si se pasa, cada pestaña recibe el id `${idBase}-${id}` (para que el panel use `aria-labelledby`). */
  idBase?: string;
  /** ¿Qué? Id del panel que controlan las pestañas (`aria-controls`). */
  idPanel?: string;
  /** ¿Qué? En espacio angosto, dos columnas (la última, si queda sola, a todo el ancho) en vez de una por pestaña.
   *  ¿Para qué? Con etiquetas largas ("Historial de novedades") tres columnas partirían el texto en 3 líneas. */
  dosColumnas?: boolean;
  /** ¿Qué? Clases extra para la fila (por ejemplo, un borde y un espacio arriba). */
  className?: string;
  /** ¿Qué? Chips pequeños en una fila que salta de línea, en vez de píldoras grandes en cuadrícula.
   *  ¿Para qué? Issue #596: los filtros de estado de Solicitudes (con su contador) ocupaban demasiado alto
   *            en pantallas angostas y se parecían a las pestañas principales. */
  compacta?: boolean;
}

const COLUMNAS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };

export function Pestanas<T extends string>({
  pestanas,
  activa,
  onCambiar,
  ariaLabel,
  idBase,
  idPanel,
  dosColumnas = false,
  className = "",
  compacta = false,
}: PestanasProps<T>) {
  const columnas = dosColumnas ? COLUMNAS[2] : (COLUMNAS[pestanas.length] ?? COLUMNAS[2]);
  return (
    <div className="@container">
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={`${compacta ? "flex flex-wrap gap-1.5" : `grid ${columnas} gap-2 @xl:flex`} ${className}`}
      >
        {pestanas.map(({ id, etiqueta }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={idBase ? `${idBase}-${id}` : undefined}
            aria-selected={activa === id}
            aria-controls={idPanel}
            onClick={() => onCambiar(id)}
            className={`cursor-pointer rounded-full text-center font-semibold leading-tight transition-colors ${
              compacta ? "px-3 py-1 text-xs" : "px-3 py-2 text-sm @xl:px-4"
            } ${
              dosColumnas && !compacta ? "last:odd:col-span-2 @xl:last:odd:col-span-1" : ""
            } ${
              activa === id
                ? "bg-accent-700 text-white dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-night-line dark:bg-night-panel dark:text-gray-300 dark:hover:bg-night-field"
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>
    </div>
  );
}
