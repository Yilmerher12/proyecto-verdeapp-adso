/**
 * Archivo: components/ui/MenuAcciones.tsx
 * Descripción: Kebab (tres puntos verticales) que abre un menú de acciones,
 *              con las opciones agrupadas y separadas por una línea.
 * ¿Para qué? Es el lugar único de las acciones por fila de una tabla (hoy, las
 *           del Admin del Sistema sobre un usuario). Cuando exista "Editar
 *           datos" se agrega como un ítem o un grupo más, sin tocar la tabla.
 * ¿Impacto? El menú se dibuja en un portal con posición fija: las tablas van
 *           dentro de un contenedor con scroll horizontal que, si no, recortaría
 *           el menú en las últimas filas.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { EllipsisVertical, type LucideIcon } from "lucide-react";

export interface OpcionMenu {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** ¿Qué? Acción delicada (desactivar, dar de baja): se pinta en rojo. */
  peligrosa?: boolean;
  onSelect: () => void;
}

interface MenuAccionesProps {
  ariaLabel: string;
  /** ¿Qué? Cada grupo es un arreglo de opciones; entre grupos va una línea. */
  grupos: OpcionMenu[][];
}

interface PosicionMenu {
  right: number;
  top?: number;
  bottom?: number;
}

const ANCHO_MENU = "13rem";
// ¿Qué? Alto aproximado de una opción y de lo que aporta cada separador, en px.
// ¿Para qué? Decidir si el menú abre hacia abajo o hacia arriba SIN medirlo
//           después de pintarlo (medir exigiría guardar estado dentro de un efecto).
const ALTO_OPCION = 40;
const ALTO_SEPARADOR = 9;
const MARGEN = 4;

export function MenuAcciones({ ariaLabel, grupos }: MenuAccionesProps) {
  const [posicion, setPosicion] = useState<PosicionMenu | null>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const abierto = posicion !== null;

  const gruposConOpciones = grupos.filter((g) => g.length > 0);

  const cerrar = (devolverFoco: boolean) => {
    setPosicion(null);
    if (devolverFoco) botonRef.current?.focus();
  };

  const abrir = () => {
    const boton = botonRef.current;
    if (!boton) return;
    const rect = boton.getBoundingClientRect();
    const totalOpciones = gruposConOpciones.reduce((suma, g) => suma + g.length, 0);
    const altoMenu = totalOpciones * ALTO_OPCION + (gruposConOpciones.length - 1) * ALTO_SEPARADOR + 2 * MARGEN;
    const right = window.innerWidth - rect.right;
    const cabeAbajo = rect.bottom + MARGEN + altoMenu <= window.innerHeight;
    setPosicion(cabeAbajo ? { right, top: rect.bottom + MARGEN } : { right, bottom: window.innerHeight - rect.top + MARGEN });
  };

  // ¿Qué? Con el menú abierto: foco en la primera opción, y se cierra con un
  //       clic fuera, con Escape, o si la página se desplaza o cambia de tamaño.
  // ¿Para qué? Un menú flotante que sigue ahí tras hacer scroll quedaría
  //           suelto, lejos de la fila a la que pertenece.
  useEffect(() => {
    if (!abierto) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    const alHacerClicFuera = (e: MouseEvent) => {
      const objetivo = e.target as Node;
      if (menuRef.current?.contains(objetivo) || botonRef.current?.contains(objetivo)) return;
      setPosicion(null);
    };
    const alPulsarTecla = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setPosicion(null);
        botonRef.current?.focus();
      }
    };
    const alMoverPagina = () => setPosicion(null);

    document.addEventListener("mousedown", alHacerClicFuera);
    document.addEventListener("keydown", alPulsarTecla);
    window.addEventListener("scroll", alMoverPagina, true);
    window.addEventListener("resize", alMoverPagina);
    return () => {
      document.removeEventListener("mousedown", alHacerClicFuera);
      document.removeEventListener("keydown", alPulsarTecla);
      window.removeEventListener("scroll", alMoverPagina, true);
      window.removeEventListener("resize", alMoverPagina);
    };
  }, [abierto]);

  const moverFoco = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const actual = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(actual + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(actual - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Tab") {
      setPosicion(null);
    }
  };

  if (gruposConOpciones.length === 0) return null;

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        aria-label={ariaLabel}
        title={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => (abierto ? cerrar(false) : abrir())}
        className="touch-target focus-ring inline-flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-night-hover"
      >
        <EllipsisVertical className="icon-md" aria-hidden="true" />
      </button>

      {posicion &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={ariaLabel}
            onKeyDown={moverFoco}
            style={{ position: "fixed", right: posicion.right, top: posicion.top, bottom: posicion.bottom, width: ANCHO_MENU }}
            className="z-30 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-night-line dark:bg-night-panel"
          >
            {gruposConOpciones.map((grupo, indice) => (
              <div key={indice}>
                {indice > 0 && <div role="separator" className="my-1 border-t border-gray-100 dark:border-night-line" />}
                {grupo.map(({ id, label, icon: Icono, peligrosa, onSelect }) => (
                  <button
                    key={id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      cerrar(true);
                      onSelect();
                    }}
                    className={`focus-ring flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                      peligrosa
                        ? "text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-400/10"
                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-night-hover"
                    }`}
                  >
                    {Icono && <Icono className="icon-sm" aria-hidden="true" />}
                    {label}
                  </button>
                ))}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
