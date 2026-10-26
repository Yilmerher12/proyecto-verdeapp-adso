/**
 * Archivo: components/ui/ProgressBar.tsx
 * Descripción: Barra de progreso para subidas de archivos.
 * ¿Para qué? RNF-004.3 y el issue #458: una subida que puede tardar (foto de
 *           perfil, adjuntos, evidencias de la auditoría) debe mostrar cuánto
 *           falta, no solo un círculo girando. Con mala conexión, el
 *           porcentaje que avanza distingue "está subiendo" de "se colgó".
 * ¿Impacto? `role="progressbar"` con aria-valuenow: el lector de pantalla
 *           anuncia el avance. `label` llega ya traducido (este componente no
 *           conoce i18n). Sin `value` (aún no hay dato) se muestra la barra
 *           indeterminada: un tramo que va y viene.
 */

interface ProgressBarProps {
  /** Porcentaje de 0 a 100. Sin valor, la barra es indeterminada. */
  value?: number;
  /** Texto accesible y visible, ya traducido (ej. "Subiendo foto…"). */
  label: string;
  className?: string;
}

export function ProgressBar({ value, label, className = "" }: ProgressBarProps) {
  const determinada = typeof value === "number";
  const porcentaje = determinada ? Math.min(100, Math.max(0, Math.round(value))) : undefined;

  return (
    <div className={`w-full ${className}`}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentaje}
        className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-night-line"
      >
        <div
          className={`h-full rounded-full bg-accent-600 dark:bg-accent-400 ${
            determinada ? "transition-[width] duration-200 ease-out" : "w-2/5 animate-barra-indeterminada"
          }`}
          style={determinada ? { width: `${porcentaje}%` } : undefined}
        />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span>{label}</span>
        {determinada && <span aria-hidden="true">{porcentaje}%</span>}
      </div>
    </div>
  );
}
