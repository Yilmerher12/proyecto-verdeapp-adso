/**
 * Archivo: components/ui/ConjuntoCombobox.tsx
 * ¿Qué? Selector de conjunto residencial con búsqueda en tiempo real,
 *       construido sobre el Combobox de Headless UI.
 * ¿Para qué? Bogotá tiene localidades con miles de conjuntos residenciales
 *           reales registrados (Usaquén, por ejemplo, supera los 3,700).
 *           Un <select> HTML con esa cantidad de opciones es lento e
 *           inutilizable. Este componente le pide al backend solo las
 *           coincidencias del texto escrito, nunca el catálogo completo.
 * ¿Impacto? Se usa en el registro público (buscar por localidad) y en los
 *           paneles del Admin del Sistema (catálogo global / sin admin) —
 *           cada consumidor le pasa su propia función `fetchOptions`.
 */
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { Search } from "lucide-react";
import { useConjuntoBusqueda } from "@/hooks/useConjuntoBusqueda";

export interface ConjuntoOption {
  id_conjunto_residencial: string;
  nombre_conjunto: string;
  nombre_localidad?: string;
}

interface ConjuntoComboboxProps {
  value: ConjuntoOption | null;
  onChange: (value: ConjuntoOption | null) => void;
  fetchOptions: (query: string) => Promise<ConjuntoOption[]>;
  disabled?: boolean;
  placeholder?: string;
  loadingLabel?: string;
  emptyLabel?: string;
}

export function ConjuntoCombobox({
  value,
  onChange,
  fetchOptions,
  disabled = false,
  placeholder,
  loadingLabel = "Buscando…",
  emptyLabel = "Sin resultados",
}: ConjuntoComboboxProps) {
  const { setQuery, options, loading } = useConjuntoBusqueda(fetchOptions, !disabled);

  return (
    <Combobox value={value} onChange={onChange} disabled={disabled}>
      <div className="relative">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <ComboboxInput
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-2.5 pl-9 text-gray-900 outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-400 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-gray-100 dark:disabled:bg-[#0d2116]"
            displayValue={(c: ConjuntoOption | null) => c?.nombre_conjunto ?? ""}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
          />
        </div>
        <ComboboxOptions className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-[#2a4d34] dark:bg-[#1f4029]">
          {loading && (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{loadingLabel}</div>
          )}
          {!loading && options.length === 0 && (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</div>
          )}
          {!loading &&
            options.map((c) => (
              <ComboboxOption
                key={c.id_conjunto_residencial}
                value={c}
                className="cursor-pointer select-none px-4 py-2 text-sm text-gray-900 data-[focus]:bg-green-50 dark:text-gray-100 dark:data-[focus]:bg-green-900/30"
              >
                {c.nombre_conjunto}
                {c.nombre_localidad ? ` — ${c.nombre_localidad}` : ""}
              </ComboboxOption>
            ))}
        </ComboboxOptions>
      </div>
    </Combobox>
  );
}
