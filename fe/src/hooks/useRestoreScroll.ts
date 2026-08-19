import { useEffect, useRef } from "react";

/**
 * Archivo: hooks/useRestoreScroll.ts
 * Descripción: Recuerda y restaura la posición de scroll de una página entre
 *              montajes distintos del mismo componente.
 * ¿Para qué? Con react-router-dom en modo "declarativo" (<BrowserRouter>, sin
 *           createBrowserRouter), no existe <ScrollRestoration> automático —
 *           esa función solo funciona con el router de datos. Cuando el
 *           Landing Page se desmonta (ej: al entrar a /terminos-de-uso) y se
 *           vuelve a montar (al cerrar ese modal con navigate("/")), React
 *           lo trata como una página nueva — el scroll siempre arranca en 0.
 * ¿Impacto? Sin esto, cualquier usuario que entre a Términos/Privacidad/
 *           Cookies desde el footer y vuelva, pierde su lugar en la página
 *           y tiene que buscar de nuevo dónde estaba.
 */
export function useRestoreScroll(storageKey: string) {
  // ¿Qué? Evita que el scroll-restore de abajo se guarde a sí mismo como si
  //       fuera un scroll real del usuario.
  const restaurando = useRef(false);

  useEffect(() => {
    const guardado = sessionStorage.getItem(storageKey);
    if (guardado) {
      // ¿Qué? Se restaura directo, de forma síncrona dentro del efecto.
      // ¿Para qué? Para cuando useEffect corre, React ya terminó de montar
      //           y pintar el DOM — no hace falta esperar un frame extra
      //           (requestAnimationFrame se descartó: en pestañas en
      //           segundo plano el navegador lo pausa indefinidamente,
      //           dejando la restauración sin ejecutarse nunca).
      restaurando.current = true;
      window.scrollTo(0, Number(guardado));
      restaurando.current = false;
    }

    // ¿Qué? Debounce simple con setTimeout — solo se guarda 150ms después
    //       de que el usuario deja de hacer scroll.
    // ¿Para qué? El evento "scroll" dispara decenas de veces por segundo;
    //           sin esto, se escribiría en sessionStorage en cada uno.
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const handleScroll = () => {
      if (restaurando.current) return;
      if (timeoutId !== null) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        sessionStorage.setItem(storageKey, String(window.scrollY));
      }, 150);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [storageKey]);
}
