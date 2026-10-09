/**
 * Archivo: components/ui/BrandLogo.tsx
 * Descripción: Logo de VerdeApp (símbolo solo o símbolo + nombre) en SVG.
 * ¿Para qué? Antes cada página ponía su propio <img> apuntando a un PNG
 *           distinto (uno de ellos con una marca de agua y otro que ni
 *           existía), y otras páginas usaban el ícono Leaf de lucide como
 *           "logo". Este componente es el único lugar que decide qué
 *           archivo de /logos mostrar.
 * ¿Impacto? tone="light" = fondo que siempre es oscuro (sidebar, header de
 *           la landing): siempre la versión blanca. tone="auto" = fondo
 *           claro en modo claro y oscuro en modo oscuro: renderiza las dos
 *           versiones y la clase dark: esconde la que no toca, sin JS.
 *           El alto se controla con className (ej. "h-8"); el ancho sale
 *           solo por la proporción del SVG.
 */
interface BrandLogoProps {
  /** "full" = símbolo + nombre; "mark" = solo el símbolo. */
  variant?: "full" | "mark";
  tone?: "auto" | "light";
  className?: string;
}

export function BrandLogo({ variant = "full", tone = "auto", className = "h-8" }: BrandLogoProps) {
  const base = variant === "full" ? "/logos/logo" : "/logos/logo-mark";
  const img = `${className} w-auto object-contain`;

  if (tone === "light") {
    return <img src={`${base}-white.svg`} alt="VerdeApp" className={img} />;
  }

  // ¿Qué? Las dos llevan alt: la que está oculta (display:none) ya queda
  //       fuera del árbol de accesibilidad, así que el lector de pantalla
  //       anuncia "VerdeApp" una sola vez, sea cual sea el modo.
  return (
    <>
      <img src={`${base}.svg`} alt="VerdeApp" className={`${img} dark:hidden`} />
      <img src={`${base}-white.svg`} alt="VerdeApp" className={`${img} hidden dark:block`} />
    </>
  );
}
