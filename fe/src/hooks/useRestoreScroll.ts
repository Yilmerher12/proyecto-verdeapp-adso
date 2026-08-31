import { useEffect, useLayoutEffect, useRef } from "react";

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
export function useRestoreScroll(storageKey: string, enabled = true) {
  // ¿Qué? Evita que el scroll-restore de abajo se guarde a sí mismo como si
  //       fuera un scroll real del usuario.
  const restaurando = useRef(false);

  // ¿Qué? Antes esta restauración vivía en un useEffect normal.
  // ¿Para qué? useEffect corre DESPUÉS de que el navegador ya pintó el
  //           componente recién montado (arrancando en scroll 0) — eso se
  //           veía como un salto visible: sube arriba y luego "cae" a la
  //           posición guardada. useLayoutEffect corre ANTES de que el
  //           navegador pinte, así que la posición correcta ya está puesta
  //           desde el primer frame visible, sin salto.
  useLayoutEffect(() => {
    // ¿Qué? Cuando LandingPage se usa como fondo de un modal (Login,
    //       Registro, Términos, etc.), este hook no debe hacer nada — si no,
    //       cada vez que se monta de fondo salta de golpe al scroll que
    //       tenía la última vez que se vio la Landing real, dando la
    //       sensación de que la página "se recargó".
    // ¿Para qué? enabled=false lo desactiva sin romper las reglas de hooks
    //           (el hook siempre se llama, solo que no hace nada).
    if (!enabled) return;

    const guardado = sessionStorage.getItem(storageKey);
    if (guardado) {
      restaurando.current = true;
      window.scrollTo(0, Number(guardado));
      restaurando.current = false;
    }
  }, [storageKey, enabled]);

  useEffect(() => {
    if (!enabled) return;

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
      // ¿Qué? Antes, al desmontar (ej: clic en un link legal del footer),
      //       si habían pasado menos de 150ms desde el último scroll, el
      //       "clearTimeout" de arriba cancelaba el guardado pendiente sin
      //       llegar a escribirlo nunca — se perdía la posición más reciente.
      // ¿Impacto? Ahora se guarda la posición actual de inmediato al salir
      //           de la página, sin esperar el debounce — nunca se pierde.
      sessionStorage.setItem(storageKey, String(window.scrollY));
    };
  }, [storageKey, enabled]);
}
