/**
 * Archivo: components/ui/Pestanas.tsx
 * Descripción: Fila de pestañas (botones redondeados que cambian de vista) que se acomoda según el ancho de su
 *              propio espacio.
 * ¿Para qué? Antes cada pantalla armaba sus pestañas a mano con `flex-wrap`: en una ventana angosta se
 *           envolvían en filas y una quedaba sola, desordenada ("Mi conjunto" del Residente y Soporte técnico).
 * ¿Qué más? Issue #595: la variante `subrayadas` (una línea bajo la pestaña activa) para las pestañas que cambian el
 *            contenido de UNA tarjeta (Resumen / Avisos / Recicladores de un conjunto); las píldoras quedan para filtros.
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
  /** ¿Qué? "subrayadas": una fila con una línea bajo la pestaña activa, a todo el ancho en celular.
   *  ¿Para qué? Issue #595: las pestañas de una sola tarjeta (el panel de cada conjunto) no deben parecerse a los
   *            filtros en píldora de su interior; ya se usaban así a mano en la página de Solicitudes del Admin del Sistema.
   *  ¿Impacto? Ignora `dosColumnas` y `compacta`. Por omisión: "pastillas", como siempre. */
  variante?: "pastillas" | "subrayadas";
  /** ¿Qué? Solo con `subrayadas`: las pestañas se reparten SIEMPRE el ancho en partes iguales, también en ventana ancha.
   *  ¿Para qué? Issue #632 — las pestañas de CONJUNTO (Desempeño) se ven mejor repartidas: son nombres largos y de cantidad
   *            variable. Las demás (Vigentes / Vencidos, Soporte técnico...) miden lo que su texto desde 640 px, para no
   *            estirar una acción corta a todo el ancho. */
  repartidas?: boolean;
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
  variante = "pastillas",
  repartidas = false,
}: PestanasProps<T>) {
  if (variante === "subrayadas") {
    return (
      <div role="tablist" aria-label={ariaLabel} className={`flex border-b border-gray-200 dark:border-night-line ${className}`}>
        {pestanas.map(({ id, etiqueta }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={idBase ? `${idBase}-${id}` : undefined}
            aria-selected={activa === id}
            aria-controls={idPanel}
            onClick={() => onCambiar(id)}
            className={`-mb-px flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 border-b-2 px-2 py-3 text-center text-xs font-bold leading-tight transition-colors min-[25rem]:gap-1.5 min-[25rem]:px-2 min-[25rem]:text-sm ${repartidas ? "sm:px-4" : "sm:flex-none sm:px-5"} ${
              activa === id
                ? "border-accent-600 text-accent-700 dark:border-accent-400 dark:text-accent-300"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>
    );
  }
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
