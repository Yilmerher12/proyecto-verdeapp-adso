/**
 * Archivo: components/ui/Spinner.tsx
 * Descripción: Ícono de carga animado, reutilizable.
 * ¿Para qué? El mismo SVG ya vivía copiado a mano en Button.tsx y en
 *           ProtectedRoute.tsx, cada uno con su propio tamaño/color — se
 *           extrae acá para que cualquier estado de carga nuevo (los
 *           paneles, por ejemplo) use el mismo dibujo en vez de uno
 *           distinto por archivo.
 * ¿Impacto? Button.tsx y ProtectedRoute.tsx no se tocaron — sus spinners
 *           ya funcionan y no había necesidad de arriesgarlos en este
 *           cambio. Este componente es para los casos NUEVOS.
 */

const TAMANOS = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
} as const;

interface SpinnerProps {
  size?: keyof typeof TAMANOS;
  className?: string;
}

export function Spinner({ size = "sm", className = "" }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin text-accent-600 dark:text-accent-400 ${TAMANOS[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
