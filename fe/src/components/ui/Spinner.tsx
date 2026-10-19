/**
 * Archivo: components/ui/Spinner.tsx
 * Descripción: Ícono de carga animado, reutilizable. Es el ÚNICO dibujo de
 *              "cargando" de la aplicación.
 * ¿Para qué? Antes había 7 versiones distintas: el SVG de Button.tsx, el de
 *           ProtectedRoute.tsx, un círculo con borde en VerifyEmailPage.tsx y
 *           el `LoaderCircle` de lucide-react en 4 sitios, cada una con su
 *           propio tamaño y color (issue #458, RNF-004.3).
 * ¿Impacto? Cambiar cómo se ve el indicador de carga de toda la aplicación es
 *           tocar este archivo. `tone="current"` toma el color del texto que
 *           lo rodea (para botones de relleno, donde el texto es blanco);
 *           `tone="accent"` usa el verde de marca (para fondos claros).
 */

const TAMANOS = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
} as const;

const TONOS = {
  accent: "text-accent-600 dark:text-accent-400",
  current: "",
} as const;

interface SpinnerProps {
  size?: keyof typeof TAMANOS;
  tone?: keyof typeof TONOS;
  className?: string;
}

export function Spinner({ size = "sm", tone = "accent", className = "" }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin ${TONOS[tone]} ${TAMANOS[size]} ${className}`}
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
