/**
 * Archivo: hooks/useAvisoTemporal.ts
 * Descripción: Hook reutilizable para "mostrar este aviso, y ocultarlo solo
 *              después de N milisegundos".
 * ¿Para qué? Issue #226 — este mismo patrón (guardar un valor, esconderlo
 *           con un setTimeout) estaba copiado a mano en ProfilePage.tsx,
 *           ResidenteDashboard.tsx y RecicladorDashboard.tsx (dos veces),
 *           cada uno con su propia duración inventada por separado: 3000ms,
 *           3500ms y 4000ms.
 * ¿Impacto? Ahora las 4 pantallas comparten la misma duración
 *           (DURACION_AVISO_MS) y la misma lógica — si el diseño decide
 *           cambiar cuánto dura un aviso, se cambia en un solo lugar.
 */
import { useEffect, useRef, useState } from "react";

// ¿Qué? Duración compartida, en milisegundos, para los avisos de éxito que
//       se ocultan solos. Se eligió 3500 porque era la duración que ya
//       usaban 3 de los 4 casos encontrados — la más "de consenso".
export const DURACION_AVISO_MS = 3500;

export function useAvisoTemporal<T>(duracionMs: number = DURACION_AVISO_MS) {
  const [valor, setValor] = useState<T | null>(null);
  const idTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ¿Qué? Si el componente se desmonta (ej. el usuario navega a otra
  //       pantalla) antes de que el temporizador termine, se cancela.
  // ¿Impacto? Sin esto, el temporizador intentaría actualizar el estado de
  //           un componente que ya no existe.
  useEffect(() => {
    return () => {
      if (idTimeoutRef.current) clearTimeout(idTimeoutRef.current);
    };
  }, []);

  const mostrarAvisoTemporal = (nuevoValor: T) => {
    if (idTimeoutRef.current) clearTimeout(idTimeoutRef.current);
    setValor(nuevoValor);
    idTimeoutRef.current = setTimeout(() => setValor(null), duracionMs);
  };

  return [valor, mostrarAvisoTemporal] as const;
}
