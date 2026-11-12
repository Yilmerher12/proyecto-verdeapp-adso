/**
 * Archivo: components/ui/ContenidoRecargable.tsx
 * Descripción: Envuelve una lista o tabla que se vuelve a pedir al servidor (al filtrar, cambiar de
 *              pestaña o de página) para que no salte mientras llega lo nuevo.
 * ¿Para qué? Issue #615: antes, al filtrar, la tabla borraba sus filas y ponía un "Cargando…"; todo lo
 *           de abajo saltaba y, si el servidor respondía rápido, solo se veía un destello.
 * ¿Impacto? Primera carga (aún no hubo datos): la silueta de la lista (Esqueleto, issue #644; antes un círculo "Cargando…"). Recargas:
 *           las filas anteriores se quedan atenuadas y sin clic, con una barra delgada de progreso
 *           arriba; al llegar lo nuevo recuperan su opacidad con una transición suave. Sin animación
 *           para quien pidió "reducir movimiento" (motion-reduce). Decisión en
 *           docs/gestion-proyecto/decision-carga-al-filtrar.md.
 */
import { useState, type ReactNode } from "react";
import { Esqueleto, type VarianteEsqueleto } from "@/components/ui/Esqueleto";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface ContenidoRecargableProps {
  /** ¿Qué? true mientras se espera la respuesta (primera vez o recarga). */
  cargando: boolean;
  /** ¿Qué? Texto ya traducido, para el "Cargando…" de la primera carga y para lectores de pantalla. */
  mensaje: string;
  /** ¿Qué? Forma de la silueta de la primera carga. Por omisión, filas de lista. */
  variante?: VarianteEsqueleto;
  cantidad?: number;
  children: ReactNode;
}

export function ContenidoRecargable({ cargando, mensaje, variante = "filas", cantidad, children }: ContenidoRecargableProps) {
  // ¿Qué? Se vuelve true la primera vez que termina una carga y ya no cambia.
  // ¿Para qué? Distinguir "primera carga" (nada que mostrar) de "recarga" (hay filas que conservar).
  const [yaCargo, setYaCargo] = useState(false);
  if (!cargando && !yaCargo) setYaCargo(true);

  if (cargando && !yaCargo) return <Esqueleto mensaje={mensaje} variante={variante} cantidad={cantidad} />;

  return (
    // ¿Qué? `animate-fade-in` en la raíz: este bloque se crea UNA vez, cuando termina la primera carga.
    // ¿Para qué? Que la lista aparezca con el desvanecimiento estándar (issue #643).
    // ¿Impacto? Al filtrar o recargar sigue siendo el mismo bloque, así que NO se repite la animación.
    <div aria-busy={cargando} className="animate-fade-in">
      <div className="h-1">{cargando && <ProgressBar compacta label={mensaje} />}</div>
      {/* ¿Qué? `inert` además de pointer-events-none: bloquea también el teclado (Tab + Enter) y los
                lectores de pantalla mientras las filas viejas están atenuadas. */}
      <div
        inert={cargando}
        className={`transition-opacity duration-200 motion-reduce:transition-none ${cargando ? "pointer-events-none opacity-50" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
