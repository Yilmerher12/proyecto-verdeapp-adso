/**
 * Archivo: components/ui/InsigniaAccionImagen.tsx
 * Descripción: Ícono en la esquina de una imagen que se puede tocar.
 * ¿Qué? Un cuadrito oscuro con un ícono (ampliar, abrir en otra pestaña) pegado
 *       a la esquina inferior derecha de la imagen.
 * ¿Para qué? Una foto que abre algo no se distingue de una foto decorativa: el
 *            cambio de opacidad al pasar el mouse no existe en celular. El
 *            ícono lo dice sin depender del mouse.
 * ¿Impacto? El control que la contiene (button o a) debe ser `relative`. Es solo
 *           decoración (aria-hidden): el nombre accesible lo da el aria-label
 *           del botón o enlace, no este ícono.
 */

import type { LucideIcon } from "lucide-react";

export function InsigniaAccionImagen({ icono: Icono }: { icono: LucideIcon }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute bottom-1 right-1 rounded-md bg-black/60 p-1 text-white">
      <Icono className="icon-sm" />
    </span>
  );
}
