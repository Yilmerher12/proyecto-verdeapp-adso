/**
 * Archivo: components/ui/ContenidoRecargable.tsx
 * Descripción: Envuelve una lista o tabla que se vuelve a pedir al servidor (al filtrar, cambiar de
 *              pestaña o de página) para que no salte mientras llega lo nuevo.
 * ¿Para qué? Issue #615: antes, al filtrar, la tabla borraba sus filas y ponía un "Cargando…"; todo lo
 *           de abajo saltaba y, si el servidor respondía rápido, solo se veía un destello.
 * ¿Impacto? Primera carga (aún no hubo datos): el "Cargando…" de siempre (LoadingState). Recargas:
 *           las filas anteriores se quedan atenuadas y sin clic, con una barra delgada de progreso
 *           arriba; al llegar lo nuevo recuperan su opacidad con una transición suave. Sin animación
 *           para quien pidió "reducir movimiento" (motion-reduce). Decisión en
 *           docs/gestion-proyecto/decision-carga-al-filtrar.md.
 */
import { useState, type ReactNode } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface ContenidoRecargableProps {
  /** ¿Qué? true mientras se espera la respuesta (primera vez o recarga). */
  cargando: boolean;
  /** ¿Qué? Texto ya traducido, para el "Cargando…" de la primera carga y para lectores de pantalla. */
  mensaje: string;
  children: ReactNode;
}

export function ContenidoRecargable({ cargando, mensaje, children }: ContenidoRecargableProps) {
  // ¿Qué? Se vuelve true la primera vez que termina una carga y ya no cambia.
  // ¿Para qué? Distinguir "primera carga" (nada que mostrar) de "recarga" (hay filas que conservar).
  const [yaCargo, setYaCargo] = useState(false);
  if (!cargando && !yaCargo) setYaCargo(true);

  if (cargando && !yaCargo) return <LoadingState message={mensaje} />;

  return (
    <div aria-busy={cargando}>
      <div className="h-1">{cargando && <ProgressBar compacta label={mensaje} />}</div>
      <div className={`transition-opacity duration-200 motion-reduce:transition-none ${cargando ? "pointer-events-none opacity-50" : ""}`}>
        {children}
      </div>
    </div>
  );
}
