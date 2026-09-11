/**
 * Archivo: hooks/usePolling.ts
 * Descripción: Hook reutilizable para "traer estos datos ahora, y repetir
 *              cada N segundos mientras el componente esté montado".
 * ¿Para qué? Issue #224 — este mismo patrón (llamar la función al montar,
 *           repetir cada 20 segundos, limpiar el temporizador al
 *           desmontar) estaba copiado a mano en 4 pantallas distintas
 *           (AppShell.tsx, AdminConjuntoDashboard.tsx, RecicladorDashboard.tsx,
 *           ResidenteDashboard.tsx), cada una con pequeñas diferencias.
 * ¿Impacto? La función que se repite se guarda en una "ref" (una caja que
 *           React no vuelve a leer en cada render) — así el hook siempre
 *           llama a la ÚLTIMA versión de la función, sin necesidad de
 *           reiniciar el temporizador cada vez que el componente se
 *           vuelve a dibujar, y sin tener que silenciar la advertencia de
 *           "dependencia faltante" de React que las 4 copias originales
 *           sí tenían que silenciar.
 */
import { useEffect, useRef } from "react";

interface UsePollingOptions {
  /** ¿Qué? Cada cuánto se repite, en milisegundos. Por defecto 20 segundos —
   *        el mismo intervalo que ya usaban las 4 pantallas originales. */
  intervalMs?: number;
  /** ¿Qué? Si es false, el hook no hace nada (no llama la función ni arma
   *        el temporizador) — pensado para el caso "todavía no hay sesión
   *        iniciada", que las 4 pantallas ya revisaban a su manera. */
  enabled?: boolean;
  /** ¿Qué? Suscribe un evento externo (ej. "se marcó una notificación como
   *        leída") que, al dispararse, fuerza una actualización inmediata
   *        sin esperar al siguiente ciclo del temporizador. Debe devolver
   *        la función para cancelar la suscripción. Opcional — solo
   *        AppShell.tsx lo necesitaba de las 4 pantallas originales. */
  onExternalTrigger?: (ejecutar: () => void) => () => void;
}

export function usePolling(fetchFn: () => void, options: UsePollingOptions = {}): void {
  const { intervalMs = 20000, enabled = true, onExternalTrigger } = options;

  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  useEffect(() => {
    if (!enabled) return;

    const ejecutar = () => fetchRef.current();
    ejecutar();
    const interval = setInterval(ejecutar, intervalMs);
    const cancelarSuscripcion = onExternalTrigger?.(ejecutar);

    return () => {
      clearInterval(interval);
      cancelarSuscripcion?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs]);
}
