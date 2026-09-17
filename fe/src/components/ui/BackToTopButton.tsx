import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Archivo: components/ui/BackToTopButton.tsx
 * ¿Para qué? En páginas largas (el Landing), volver al inicio a pulso es
 *           incómodo. El botón aparece solo después de bajar un poco, y
 *           sube con scroll suave en vez de un salto brusco.
 */
export function BackToTopButton() {
  const { t } = useTranslation();
  // ¿Qué? Antes arrancaba siempre en `false`, sin importar el scroll actual.
  // ¿Para qué? Este botón vive dentro del Landing, que se re-monta cada vez
  //           que se navega entre modales (Privacidad, Contacto, etc.) —
  //           con `false` fijo, cada re-montaje nacía invisible y luego
  //           aparecía con la transición, aunque el scroll ya estuviera
  //           bien abajo. Se veía como si la animación "se repitiera".
  // ¿Impacto? Al leer `window.scrollY` en el primer render, el botón nace
  //           ya visible si corresponde, sin repetir la animación de
  //           entrada en cada re-montaje.
  const [visible, setVisible] = useState(() => window.scrollY > 500);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 500);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label={t("landing.backToTop")}
      className={`fixed bottom-6 right-6 z-40 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-accent-700 text-white shadow-lg transition-all duration-300 hover:bg-accent-600 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 ${
        visible ? "opacity-100 translate-y-0" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
