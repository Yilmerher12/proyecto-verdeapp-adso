/**
 * Archivo: components/ui/TextoRecortable.tsx
 * Descripción: Un texto largo recortado a unas pocas líneas, con "Ver más / Ver menos".
 * ¿Para qué? Issue #616: un comunicado, una novedad o una consulta de soporte puede tener hasta
 *           2.000 caracteres y, mostrado completo, una sola tarjeta ocupaba media pantalla y empujaba
 *           a las demás. Antes cada pantalla lo mostraba entero (y solo el modal de auditoría lo cortaba,
 *           con código propio).
 * ¿Impacto? "Ver más" aparece solo si el texto de verdad no cabe en las líneas; un texto corto se ve
 *           igual que antes. Las líneas se fijan con `style` (-webkit-line-clamp) y no con una clase
 *           `line-clamp-N`, porque Tailwind no genera clases armadas con un número variable. El estado
 *           del botón se anuncia con aria-expanded.
 */
import { useId, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface TextoRecortableProps {
  texto: string;
  /** ¿Qué? Cuántas líneas se ven antes de pulsar "Ver más". Por defecto 3. */
  lineas?: number;
  /** ¿Qué? Las clases de texto de cada pantalla (tamaño, color, `whitespace-pre-line`, margen…). */
  className?: string;
}

export function TextoRecortable({ texto, lineas = 3, className = "" }: TextoRecortableProps) {
  const { t } = useTranslation();
  const idTexto = useId();
  const refTexto = useRef<HTMLParagraphElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [hayMas, setHayMas] = useState(false);

  // ¿Qué? Mide si el texto recortado deja algo oculto, y vuelve a medir cuando cambia el ancho
  //       disponible (girar el celular, abrir o cerrar el menú lateral).
  // ¿Para qué? "Ver más" solo debe aparecer cuando hace falta.
  useLayoutEffect(() => {
    const el = refTexto.current;
    if (!el || abierto) return;
    const medir = () => setHayMas(el.scrollHeight > el.clientHeight + 1);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, [texto, lineas, abierto]);

  return (
    <>
      <p
        id={idTexto}
        ref={refTexto}
        className={className}
        style={
          abierto
            ? undefined
            : { display: "-webkit-box", WebkitLineClamp: lineas, WebkitBoxOrient: "vertical", overflow: "hidden" }
        }
      >
        {texto}
      </p>
      {(hayMas || abierto) && (
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-controls={idTexto}
          className="focus-ring mt-1 cursor-pointer text-sm font-semibold text-accent-700 hover:underline dark:text-accent-400"
        >
          {t(abierto ? "common.viewLess" : "common.viewMore")}
        </button>
      )}
    </>
  );
}
