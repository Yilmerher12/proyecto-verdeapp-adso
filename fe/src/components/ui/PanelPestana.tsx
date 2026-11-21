/**
 * Archivo: components/ui/PanelPestana.tsx
 * Descripción: Panel de contenido que acompaña a una fila de `Pestanas`: lleva el rol `tabpanel`, el vínculo con la pestaña
 *              activa y el desvanecimiento de entrada.
 * ¿Para qué? Issue #643: al cambiar de pestaña el contenido aparecía de golpe, y cada página armaba su panel a mano.
 * ¿Impacto? Con `claveActiva`, el panel se vuelve a crear al cambiar de pestaña y por eso se desvanece de nuevo (el contenido
 *           interno pierde su estado local; el que importa vive en la página). Sin `claveActiva` no se vuelve a crear ni se
 *           anima por sí solo: es para paneles que mantienen TODAS sus vistas montadas y ocultan las inactivas con `hidden`
 *           (TarjetaConjunto), donde cada vista lleva su propio `animate-fade-in`, que se repite al volver a mostrarse.
 */
import type { ReactNode } from "react";

interface PanelPestanaProps {
  /** ¿Qué? Id del panel; el mismo que se le pasa a `Pestanas` como `idPanel`. */
  id?: string;
  /** ¿Qué? Id de la pestaña activa (`aria-labelledby`), con la forma `${idBase}-${activa}`. */
  labelledBy: string;
  /** ¿Qué? Pestaña activa. Si cambia, el panel se recrea y se desvanece. Omitirla desactiva esa animación. */
  claveActiva?: string;
  className?: string;
  children: ReactNode;
}

export function PanelPestana({ id, labelledBy, claveActiva, className = "", children }: PanelPestanaProps) {
  const animar = claveActiva !== undefined;
  return (
    <div
      key={claveActiva}
      id={id}
      role="tabpanel"
      aria-labelledby={labelledBy}
      className={`${animar ? "animate-fade-in" : ""} ${className}`.trim() || undefined}
    >
      {children}
    </div>
  );
}
