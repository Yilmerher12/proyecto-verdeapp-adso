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
import { useEffect, useRef, useState } from "react";
import type { ConjuntoOption } from "@/components/ui/ConjuntoCombobox";

export function useConjuntoBusqueda(
  fetchOptions: (query: string) => Promise<ConjuntoOption[]>,
  activo: boolean = true,
) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ConjuntoOption[]>([]);
  const [loading, setLoading] = useState(false);

  // ¿Qué? Issue #225 — antes el efecto de abajo silenciaba la advertencia
  //       de ESLint en vez de arreglarla: "fetchOptions" se usaba adentro
  //       pero no estaba en las dependencias. No se podía agregar tal cual,
  //       porque quien llama a este hook (ConjuntoCombobox) suele pasar una
  //       función NUEVA en cada render — de haberla incluido, el
  //       temporizador de 300ms se hubiera reiniciado en cada render del
  //       componente padre, no solo cuando el usuario escribe. Guardarla en
  //       una "ref" (mismo patrón que ya usa usePolling.ts) deja que el
  //       efecto siempre llame a la ÚLTIMA versión, sin depender de ella.
  const fetchOptionsRef = useRef(fetchOptions);
  // ¿Qué? Mutar la ref debe pasar DENTRO de un efecto, nunca durante el
  //       render mismo (regla react-hooks/refs) — por eso va en su propio
  //       useEffect sin dependencias, que corre después de cada render.
  useEffect(() => {
    fetchOptionsRef.current = fetchOptions;
  });

  useEffect(() => {
    if (!activo) {
      // ¿Qué? La regla react-hooks/set-state-in-effect avisa por el patrón
      //       general de "setState sincrónico dentro de un effect", pero
      //       aquí no dispara un re-render en cascada real: es el mismo
      //       estado que ya se usa para pintar ESTE MISMO combobox (mismo
      //       criterio ya explicado en DirectorioPage.tsx) — solo se limpia
      //       la lista vieja cuando el campo se desactiva.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOptions([]);
      return;
    }
    const id = setTimeout(() => {
      setLoading(true);
      fetchOptionsRef
        .current(query)
        .then(setOptions)
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(id);
  }, [query, activo]);

  return { query, setQuery, options, loading };
}
