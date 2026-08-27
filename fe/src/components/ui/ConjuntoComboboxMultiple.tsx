/**
 * Archivo: components/ui/ConjuntoComboboxMultiple.tsx
 * ¿Qué? Variante del ConjuntoCombobox que permite elegir VARIOS conjuntos
 *       a la vez, mostrando los ya elegidos como chips removibles.
 * ¿Para qué? InvitarAdminConjuntoForm necesita asignar más de un conjunto
 *           a un mismo Administrador (ver InvitarAdminConjuntoForm.tsx) —
 *           antes era una lista de checkboxes con TODOS los conjuntos, que
 *           no escala a un catálogo real de miles de registros.
 * ¿Impacto? Misma búsqueda con debounce que ConjuntoCombobox, pero el
 *           valor es un arreglo y seleccionar una opción no cierra el
 *           menú, para poder seguir agregando más conjuntos.
 */
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from "@headlessui/react";
import { Search, X } from "lucide-react";
import { useConjuntoBusqueda } from "@/hooks/useConjuntoBusqueda";
import type { ConjuntoOption } from "@/components/ui/ConjuntoCombobox";

interface ConjuntoComboboxMultipleProps {
  value: ConjuntoOption[];
  onChange: (value: ConjuntoOption[]) => void;
  fetchOptions: (query: string) => Promise<ConjuntoOption[]>;
  placeholder?: string;
  loadingLabel?: string;
  emptyLabel?: string;
}

export function ConjuntoComboboxMultiple({
  value,
  onChange,
  fetchOptions,
  placeholder,
  loadingLabel = "Buscando…",
  emptyLabel = "Sin resultados",
}: ConjuntoComboboxMultipleProps) {
  const { setQuery, options, loading } = useConjuntoBusqueda(fetchOptions);

  const quitar = (id: number) => {
    onChange(value.filter((c) => c.id_conjunto_residencial !== id));
  };

  return (
    <div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((c) => (
            <span
              key={c.id_conjunto_residencial}
              className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300"
            >
              {c.nombre_conjunto}
              <button
                type="button"
                onClick={() => quitar(c.id_conjunto_residencial)}
                className="rounded-full hover:bg-green-100 dark:hover:bg-green-900/50"
                aria-label={`Quitar ${c.nombre_conjunto}`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
      {/* ¿Qué? Combobox de Headless UI en modo `multiple`, con value=[] fijo
             (el combobox nunca "recuerda" la selección como texto en el
             input, porque ya la mostramos arriba como chips). */}
      <Combobox multiple value={value} onChange={onChange}>
        <div className="relative">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <ComboboxInput
              className="w-full rounded-xl border border-gray-300 bg-white p-2.5 pl-9 text-gray-900 outline-none focus:ring-2 focus:ring-green-500 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-gray-100"
              displayValue={() => ""}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
            />
          </div>
          <ComboboxOptions className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-[#2a4d34] dark:bg-[#1f4029]">
            {loading && <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{loadingLabel}</div>}
            {!loading && options.length === 0 && (
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</div>
            )}
            {!loading &&
              options.map((c) => (
                <ComboboxOption
                  key={c.id_conjunto_residencial}
                  value={c}
                  className="cursor-pointer select-none px-4 py-2 text-sm text-gray-900 data-[focus]:bg-green-50 data-[selected]:font-semibold dark:text-gray-100 dark:data-[focus]:bg-green-900/30"
                >
                  {c.nombre_conjunto}
                  {c.nombre_localidad ? ` — ${c.nombre_localidad}` : ""}
                </ComboboxOption>
              ))}
          </ComboboxOptions>
        </div>
      </Combobox>
    </div>
  );
}
