/**
 * Archivo: components/ui/Esqueleto.tsx
 * Descripción: Silueta gris con la forma del contenido que va a llegar (filas de lista, tarjetas, campos o un bloque),
 *              que se ve mientras la pantalla espera datos del servidor.
 * ¿Para qué? Issue #644: el círculo "Cargando…" mide unos 100 px y, al llegar los datos, se reemplazaba por una lista de
 *            otra altura, así que la página saltaba. La silueta reserva el espacio del contenido final desde el primer instante.
 * ¿Impacto? Tres cosas decididas con prototipos: (1) el aspecto es un latido suave (solo cambia la opacidad, clase
 *           `animate-latido`; quieto con "reducir movimiento"); (2) las formas aparecen tras 200 ms: si los datos llegan antes
 *           no se ve nada, y mientras tanto el espacio ya está reservado (`invisible` oculta sin quitar la altura);
 *           (3) el aviso "Cargando…" para lectores de pantalla (`role="status"`) está desde el primer momento, no a los 200 ms.
 *           `mensaje` llega ya traducido: este componente no conoce i18n. Las filas son 5 por omisión (las listas paginan de a 10).
 */
import { useEffect, useState } from "react";

export const RETRASO_ESQUELETO_MS = 200;

export type VarianteEsqueleto = "filas" | "tarjetas" | "campos" | "bloque";

interface EsqueletoProps {
  /** ¿Qué? Texto ya traducido para el lector de pantalla (por ejemplo, "Cargando…"). */
  mensaje: string;
  variante?: VarianteEsqueleto;
  /** ¿Qué? Cuántas filas, tarjetas o campos dibuja. Sin valor: 5 filas, 3 tarjetas, 4 campos. */
  cantidad?: number;
  /** ¿Qué? Clases extra para el contenedor (por ejemplo, un margen). */
  className?: string;
}

const CANTIDAD_POR_OMISION: Record<VarianteEsqueleto, number> = { filas: 5, tarjetas: 3, campos: 4, bloque: 1 };

// ¿Qué? Color de toda forma gris: el mismo de la barra de progreso (claro: gray-200; oscuro: night-line).
const GRIS = "bg-gray-200 dark:bg-night-line";

function Fila() {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className={`h-9 w-9 shrink-0 rounded-lg ${GRIS}`} />
      <div className="min-w-0 flex-1 space-y-2">
        <div className={`h-3 w-2/3 rounded ${GRIS}`} />
        <div className={`h-3 w-1/3 rounded ${GRIS}`} />
      </div>
    </div>
  );
}

function Tarjeta() {
  return <div className={`h-32 rounded-2xl ${GRIS}`} />;
}

function Campo() {
  return (
    <div className="space-y-2">
      <div className={`h-3 w-1/4 rounded ${GRIS}`} />
      <div className={`h-10 rounded-lg ${GRIS}`} />
    </div>
  );
}

export function Esqueleto({ mensaje, variante = "filas", cantidad, className = "" }: EsqueletoProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const espera = setTimeout(() => setVisible(true), RETRASO_ESQUELETO_MS);
    return () => clearTimeout(espera);
  }, []);

  const n = cantidad ?? CANTIDAD_POR_OMISION[variante];
  const formas = Array.from({ length: n }, (_, i) => i);

  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{mensaje}</span>
      <div aria-hidden="true" data-esqueleto={variante} className={`animate-latido ${visible ? "" : "invisible"}`}>
        {variante === "filas" && (
          <div className="divide-y divide-gray-100 dark:divide-night-line">
            {formas.map((i) => (
              <Fila key={i} />
            ))}
          </div>
        )}
        {variante === "tarjetas" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {formas.map((i) => (
              <Tarjeta key={i} />
            ))}
          </div>
        )}
        {variante === "campos" && (
          <div className="space-y-4">
            {formas.map((i) => (
              <Campo key={i} />
            ))}
          </div>
        )}
        {variante === "bloque" && <div className={`h-40 rounded-2xl ${GRIS}`} />}
      </div>
    </div>
  );
}
