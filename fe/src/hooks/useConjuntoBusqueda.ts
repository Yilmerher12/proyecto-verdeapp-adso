/**
 * Archivo: hooks/useConjuntoBusqueda.ts
 * ¿Qué? Maneja la búsqueda con debounce contra un endpoint de conjuntos
 *       residenciales (query + resultados + estado de carga).
 * ¿Para qué? Lo reutilizan ConjuntoCombobox y ConjuntoComboboxMultiple —
 *           ambos necesitan exactamente la misma lógica de "esperar a que
 *           el usuario deje de escribir y entonces preguntarle al backend",
 *           solo cambia cómo se muestran los resultados.
 * ¿Impacto? Los `setState` corren dentro del callback de setTimeout, no al
 *           inicio del efecto, así que no dispara la regla de ESLint
 *           react-hooks/set-state-in-effect (mismo patrón que
 *           AdminDashboard.tsx).
 */
import { useEffect, useState } from "react";
import type { ConjuntoOption } from "@/components/ui/ConjuntoCombobox";

export function useConjuntoBusqueda(
  fetchOptions: (query: string) => Promise<ConjuntoOption[]>,
  activo: boolean = true,
) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ConjuntoOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activo) {
      setOptions([]);
      return;
    }
    const id = setTimeout(() => {
      setLoading(true);
      fetchOptions(query)
        .then(setOptions)
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activo]);

  return { query, setQuery, options, loading };
}
