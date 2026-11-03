/**
 * Archivo: hooks/useAvisoCerradoEnSesion.ts
 * ¿Qué? Recuerda si el usuario cerró un aviso informativo, solo mientras dure su sesión.
 * ¿Para qué? Un aviso de ayuda (ej: "¿Qué es una ECA?") puede estorbar a quien ya lo leyó, pero
 *           debe volver a mostrarse en cada nuevo inicio de sesión como apoyo.
 * ¿Impacto? Se guarda en sessionStorage (se borra al cerrar la pestaña) y además al cerrar sesión
 *           (limpiarAvisosCerrados, que llama AuthContext). Si el navegador bloquea el
 *           almacenamiento, el aviso simplemente vuelve a aparecer: nada se rompe.
 */
import { useState } from "react";

const PREFIJO = "verdeapp:aviso-cerrado:";

export function limpiarAvisosCerrados(): void {
  try {
    Object.keys(sessionStorage)
      .filter((clave) => clave.startsWith(PREFIJO))
      .forEach((clave) => sessionStorage.removeItem(clave));
  } catch {
    // sin almacenamiento disponible: no hay nada que limpiar
  }
}

export function useAvisoCerradoEnSesion(id: string) {
  const clave = `${PREFIJO}${id}`;
  const [cerrado, setCerrado] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(clave) === "1";
    } catch {
      return false;
    }
  });

  const cerrar = () => {
    setCerrado(true);
    try {
      sessionStorage.setItem(clave, "1");
    } catch {
      // se queda cerrado solo en esta pantalla
    }
  };

  const reabrir = () => {
    setCerrado(false);
    try {
      sessionStorage.removeItem(clave);
    } catch {
      // nada que hacer
    }
  };

  return { cerrado, cerrar, reabrir };
}
