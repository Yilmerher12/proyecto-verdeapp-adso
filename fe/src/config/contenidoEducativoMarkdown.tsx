/**
 * Archivo: config/contenidoEducativoMarkdown.tsx
 * ¿Qué? Estilo de cada elemento que un Admin puede escribir en Markdown
 *       (## subtítulo, listas, negrita) dentro del cuerpo de un módulo del
 *       catálogo educativo.
 * ¿Para qué? Antes vivía solo dentro de CategoriaEducativaPage.tsx (lo que
 *           ve el Residente) — AdminContenidoEducativoPage.tsx necesita el
 *           mismo estilo para su vista previa en vivo, así que se compartió
 *           en un solo lugar en vez de mantener dos copias iguales.
 * ¿Impacto? react-markdown no trae estilos propios — sin esto, un subtítulo
 *           se vería exactamente igual que un párrafo normal.
 */
export const COMPONENTES_MARKDOWN = {
  h1: (props: React.ComponentPropsWithoutRef<"h1">) => (
    <h3 className="mt-4 text-base font-bold text-gray-900 first:mt-0 dark:text-white" {...props} />
  ),
  h2: (props: React.ComponentPropsWithoutRef<"h2">) => (
    <h3 className="mt-4 text-base font-bold text-gray-900 first:mt-0 dark:text-white" {...props} />
  ),
  h3: (props: React.ComponentPropsWithoutRef<"h3">) => (
    <h4 className="mt-3 text-sm font-bold text-gray-900 first:mt-0 dark:text-white" {...props} />
  ),
  p: (props: React.ComponentPropsWithoutRef<"p">) => (
    <p className="mt-2 text-sm text-gray-600 first:mt-0 dark:text-gray-300" {...props} />
  ),
  ul: (props: React.ComponentPropsWithoutRef<"ul">) => (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300" {...props} />
  ),
  ol: (props: React.ComponentPropsWithoutRef<"ol">) => (
    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300" {...props} />
  ),
  a: (props: React.ComponentPropsWithoutRef<"a">) => (
    <a className="text-accent-400 underline-offset-4 transition-colors hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
  ),
};
