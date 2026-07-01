interface VerdeAppLogoProps {
  className?: string;
  size?: number;
}

export function VerdeAppLogo({ className = "", size = 40 }: VerdeAppLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Flecha superior del símbolo de reciclaje */}
      <path
        d="M50 8 L62 22 L56 22 L56 38 L44 38 L44 22 L38 22 Z"
        fill="currentColor"
      />
      {/* Flecha inferior izquierda */}
      <path
        d="M20 68 L14 52 L20 55 L30 40 L40 52 L34 49 Z"
        fill="currentColor"
      />
      {/* Flecha inferior derecha */}
      <path
        d="M80 68 L74 84 L68 81 L58 68 L68 56 L62 59 Z"
        fill="currentColor"
      />
      {/* Edificio central */}
      <rect x="38" y="48" width="24" height="28" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="41" y="52" width="5" height="5" rx="0.5" fill="white" opacity="0.7" />
      <rect x="54" y="52" width="5" height="5" rx="0.5" fill="white" opacity="0.7" />
      <rect x="41" y="60" width="5" height="5" rx="0.5" fill="white" opacity="0.7" />
      <rect x="54" y="60" width="5" height="5" rx="0.5" fill="white" opacity="0.7" />
      <rect x="46" y="67" width="8" height="9" rx="0.5" fill="white" opacity="0.5" />
      {/* Hoja sobre el edificio */}
      <path
        d="M50 44 Q56 36 62 40 Q56 50 50 44Z"
        fill="#4ade80"
      />
    </svg>
  );
}
