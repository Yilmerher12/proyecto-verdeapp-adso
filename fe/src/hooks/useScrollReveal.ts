import { useEffect, useRef, useState } from "react";

/**
 * Archivo: hooks/useScrollReveal.ts
 * ¿Para qué? Detectar cuándo un elemento entra en pantalla al hacer scroll,
 *           para revelarlo con una transición en vez de que aparezca de golpe.
 * ¿Impacto? Se usa en tarjetas de "¿Cómo funciona?" y "Nuestros pilares" del
 *           Landing — sin esto, esas secciones se sienten estáticas.
 */
export function useScrollReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  // ¿Qué? El elemento arranca visible de una vez, sin animación, si (a) el
  //       usuario pidió menos movimiento en su sistema operativo, o (b) el
  //       entorno no tiene IntersectionObserver (navegadores muy viejos, o
  //       el entorno de pruebas jsdom).
  // ¿Para qué? RNF-005 (Accesibilidad) para el caso (a); para el caso (b),
  //           degradar a "siempre visible" en vez de quedar invisible para
  //           siempre. Se calcula como valor inicial del estado (no con un
  //           setState dentro del efecto) para no disparar un render en
  //           cascada.
  const [visible, setVisible] = useState(
    () =>
      typeof window === "undefined" ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, visible]);

  return { ref, visible };
}
