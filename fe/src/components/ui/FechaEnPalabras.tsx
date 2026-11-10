import { useTranslation } from "react-i18next";
import { fechaEnPalabras } from "@/lib/dateFormat";

/**
 * ¿Qué? Issue #633 — la fecha elegida en un campo de fecha, escrita con el mes en palabras, debajo del campo
 *       ("Expira el 20 de noviembre de 2026").
 * ¿Para qué? El campo `<input type="date">` lo dibuja el navegador con su propio idioma y la página no puede cambiarlo; esta frase
 *           siempre sigue el idioma de la app y no deja dudas entre día y mes.
 * ¿Impacto? No dibuja nada si el campo está vacío. `frase` es una clave de traducción con `{{fecha}}` ("Expira el {{fecha}}"); sin
 *           ella se escribe solo la fecha. Es un aviso que cambia sola (`aria-live="polite"`): el lector de pantalla la lee al elegir.
 */
export function FechaEnPalabras({ valor, frase }: { valor: string; frase?: string }) {
  const { t, i18n } = useTranslation();
  const fecha = fechaEnPalabras(valor, i18n.language);
  if (!fecha) return null;
  return (
    <p aria-live="polite" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
      {frase ? t(frase, { fecha }) : fecha}
    </p>
  );
}
