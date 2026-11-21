import { useTranslation } from "react-i18next";
import { partirEnTarjetas } from "@/lib/muroLeccion";

// ¿Qué? Primeras palabras de un párrafo, para reconocerlo en el recuadro sin repetir todo el texto.
function resumir(texto: string, max = 60): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  return limpio.length > max ? `${limpio.slice(0, max).trimEnd()}…` : limpio;
}

/**
 * ¿Qué? Recuadro en vivo "Así se dividirá tu texto en el muro" (issue #620): cuenta la introducción, cada tarjeta con su título y el
 *       cierre del texto que se está escribiendo.
 * ¿Para qué? El texto se ve como un cuadro de texto seguido, pero el Residente lo ve partido en tarjetas. Aquí se ve la partición mientras
 *           se escribe, sin tener que mirar la vista previa ni conocer las reglas.
 * ¿Impacto? Usa la MISMA función que el muro del Residente (partirEnTarjetas, lib/muroLeccion.ts): lo que cuenta aquí es lo que se ve allá.
 */
export function ResumenMuro({ texto }: { texto: string }) {
  const { t } = useTranslation();
  const p = "adminContenidoEducativo.wallSummary";
  const { introduccion, tarjetas, cierre } = partirEnTarjetas(texto);

  return (
    <div role="status" aria-label={t(`${p}.title`)} className="rounded-xl border border-gray-200 bg-white p-3 text-xs dark:border-night-line dark:bg-night-inset/60">
      <p className="mb-1.5 font-bold text-gray-700 dark:text-gray-200">{t(`${p}.title`)}</p>
      {!texto.trim() ? (
        <p className="text-gray-500 dark:text-gray-400">{t(`${p}.empty`)}</p>
      ) : (
        <ul className="space-y-1 text-gray-600 dark:text-gray-300">
          <li>
            <span className="font-semibold">{t(`${p}.intro`)}:</span>{" "}
            {introduccion ? resumir(introduccion) : <span className="text-gray-500 dark:text-gray-400">{t(`${p}.none`)}</span>}
          </li>
          <li>
            <span className="font-semibold">{t(`${p}.cards`, { count: tarjetas.length })}</span>
            {tarjetas.length > 0 && (
              <ol className="mt-0.5 list-decimal space-y-0.5 pl-5">
                {tarjetas.map((tarjeta, i) => (
                  <li key={`${i}-${tarjeta.titulo ?? ""}`}>
                    {tarjeta.titulo ?? <span className="italic text-gray-500 dark:text-gray-400">{t(`${p}.noTitle`)}</span>}
                  </li>
                ))}
              </ol>
            )}
          </li>
          <li>
            <span className="font-semibold">{t(`${p}.closing`)}:</span>{" "}
            {cierre ? resumir(cierre) : <span className="text-gray-500 dark:text-gray-400">{t(`${p}.none`)}</span>}
          </li>
        </ul>
      )}
    </div>
  );
}
