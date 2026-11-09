import { useTranslation } from "react-i18next";
import { TriangleAlert } from "lucide-react";
import { categoriaDuplicada } from "@/lib/categoriaEducativa";
import { CONTENIDO_MODULO_MAX_LENGTH } from "@/lib/validacion";

export type ModoCategoria = "existente" | "nueva";

interface CategoriaFieldProps {
  modo: ModoCategoria;
  onCambiarModo: (modo: ModoCategoria) => void;
  /** Las categorías que ya existen (las de los módulos creados). */
  categorias: string[];
  existente: string;
  onExistente: (valor: string) => void;
  nueva: string;
  onNueva: (valor: string) => void;
  error?: string;
  onBlur?: () => void;
}

const CLASE_CONTROL =
  "w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 dark:bg-night-field dark:text-white";
const CLASE_CONTROL_OK = "border-edge focus:border-accent-500 focus:ring-accent-500/20 dark:border-night-edge";
const CLASE_CONTROL_ERROR = "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-400";

/**
 * ¿Qué? Campo "Categoría" del editor de módulos con dos modos, "Existente" (un selector solo de las categorías ya creadas) y
 *       "Nueva" (un campo de texto), como ya hace la guía de apoyo con "Subir archivo / Pegar link" (issue #620).
 * ¿Para qué? Antes había una opción "+ Nueva categoría…" dentro del selector y dos botones fuera del editor que abrían el mismo
 *           formulario: crear algo dentro de una lista de elegir confundía. Aquí cada modo hace una sola cosa.
 * ¿Impacto? En modo "Nueva" avisa si el nombre ya existe (sin distinguir mayúsculas ni tildes) y ofrece pasar a "Existente"; la
 *           página no deja guardar un duplicado. También avisa que una categoría nueva se vuelve un tema que los recicladores
 *           podrán calificar al auditar un conjunto.
 */
export function CategoriaField({ modo, onCambiarModo, categorias, existente, onExistente, nueva, onNueva, error, onBlur }: CategoriaFieldProps) {
  const { t } = useTranslation();
  const p = "adminContenidoEducativo.fields";
  const repetida = modo === "nueva" ? categoriaDuplicada(nueva, categorias) : null;
  const claseControl = `${CLASE_CONTROL} ${error || repetida ? CLASE_CONTROL_ERROR : CLASE_CONTROL_OK}`;

  const boton = (m: ModoCategoria, texto: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={modo === m}
      onClick={() => onCambiarModo(m)}
      className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
        modo === m
          ? "bg-accent-100 text-accent-800 dark:bg-accent-300/10 dark:text-accent-400"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-night-field dark:text-gray-400 dark:hover:bg-night-hover"
      }`}
    >
      {texto}
    </button>
  );

  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
        {t(`${p}.category`)} <span className="text-red-500">*</span>
      </span>
      <div className="mb-2 flex gap-1.5" role="radiogroup" aria-label={t(`${p}.categoryModeAria`)}>
        {boton("existente", t(`${p}.categoryMode.existing`))}
        {boton("nueva", t(`${p}.categoryMode.new`))}
      </div>

      {modo === "existente" ? (
        categorias.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t(`${p}.categoryNoneYet`)}</p>
        ) : (
          <select
            id="contenido-categoria"
            aria-label={t(`${p}.category`)}
            value={existente}
            onChange={(e) => onExistente(e.target.value)}
            onBlur={onBlur}
            aria-invalid={Boolean(error)}
            className={`${claseControl} cursor-pointer`}
          >
            <option value="">{t(`${p}.categoryPlaceholderSelect`)}</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )
      ) : (
        <div>
          <input
            id="contenido-categoria"
            aria-label={t(`${p}.category`)}
            value={nueva}
            onChange={(e) => onNueva(e.target.value)}
            onBlur={onBlur}
            maxLength={CONTENIDO_MODULO_MAX_LENGTH}
            placeholder={t(`${p}.categoryPlaceholder`)}
            aria-invalid={Boolean(error || repetida)}
            className={claseControl}
          />
          {repetida ? (
            <p role="alert" className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs font-semibold text-red-700 dark:text-red-300">
              {t(`${p}.categoryDuplicate`, { nombre: repetida })}
              <button
                type="button"
                onClick={() => {
                  onExistente(repetida);
                  onCambiarModo("existente");
                }}
                className="cursor-pointer underline underline-offset-2"
              >
                {t(`${p}.useExistingCategory`, { nombre: repetida })}
              </button>
            </p>
          ) : (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-200">
              <TriangleAlert className="icon-sm mt-0.5 shrink-0" aria-hidden="true" />
              {t(`${p}.newCategoryWarning`)}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
