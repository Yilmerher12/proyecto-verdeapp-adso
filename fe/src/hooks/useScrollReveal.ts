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
  // ¿Qué? Si el usuario pidió menos movimiento en su sistema operativo, el
  //       elemento arranca visible de una vez, sin animación.
  // ¿Para qué? RNF-005 (Accesibilidad) — el movimiento en pantalla puede
  //           marear o incomodar a personas con trastornos vestibulares.
  //           Se calcula como valor inicial del estado (no con un setState
  //           dentro del efecto) para no disparar un render en cascada.
  const [visible, setVisible] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
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
