/**
 * Archivo: components/desempeno/GraficaDesempenoSemanal.tsx
 * ¿Qué? Gráfica de barras apiladas del desempeño semanal de un conjunto
 *       (issue #487): una barra por semana, con la cantidad de auditorías Bueno,
 *       Regular y Malo escrita dentro de cada tramo.
 * ¿Para qué? Ver de un vistazo si el conjunto mejora o empeora. Se carga bajo
 *           demanda (React.lazy, ver PanelDesempeno) porque recharts pesa y la
 *           mayoría de las pantallas no la usan.
 * ¿Impacto? Accesible (RNF-005): las barras se dibujan en SVG y no se pueden
 *           enfocar, así que lo que se enfoca y se activa con el teclado es el
 *           rótulo de cada semana (rol "button", con su descripción completa).
 *           El color nunca es la única señal: cada tramo lleva su número y la
 *           leyenda (LeyendaNiveles) trae ícono y nombre. Sin animación, así
 *           que `prefers-reduced-motion` no tiene nada que apagar.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { NIVELES_DESEMPENO } from "@/config/nivelesDesempeno";
import type { NivelDesempeno, SemanaDesempeno } from "@/lib/auditoriaConjuntoApi";
import { CAMPOS_POR_NIVEL, rangoSemana } from "@/lib/desempeno";

interface GraficaDesempenoSemanalProps {
  semanas: SemanaDesempeno[];
  seleccionada: string | null;
  onSeleccionar: (lunes: string) => void;
}

// ¿Qué? Ancho mínimo de cada semana. En celular la gráfica se desplaza hacia el
//       lado en vez de apretar las barras hasta no poder leer los rótulos.
const ANCHO_MINIMO_SEMANA = 72;
const ALTO_GRAFICA = 300;

// ¿Qué? Cuántas veces es más grande 1rem que los 16 px de siempre (1 en laptop,
//       2,5 en un televisor 4K; ver `html` en index.css).
// ¿Para qué? Recharts y el SVG miden en px: sin multiplicar esas medidas por la
//           escala, el texto crece (está en rem) pero la gráfica no, y los
//           rótulos de las semanas se montan sobre las barras.
// ¿Impacto? Se vuelve a leer al cambiar el tamaño de la ventana.
function useEscalaRem(): number {
  const leer = () => parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1;
  const [escala, setEscala] = useState(leer);
  useEffect(() => {
    const alCambiar = () => setEscala(leer());
    window.addEventListener("resize", alCambiar);
    return () => window.removeEventListener("resize", alCambiar);
  }, []);
  return escala;
}

// ¿Qué? Lo que recharts le pasa a un tramo de barra y a un rótulo del eje (solo lo que se usa).
interface TramoProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: SemanaDesempeno;
}

interface RotuloProps {
  x?: number | string;
  y?: number | string;
  payload?: { value?: unknown };
}

function dibujarTramo(
  { x = 0, y = 0, width = 0, height = 0, payload }: TramoProps,
  nivel: NivelDesempeno,
  campo: "bueno" | "regular" | "malo",
  onSeleccionar: (lunes: string) => void,
  escala: number,
): ReactElement {
  const cantidad = payload?.[campo] ?? 0;
  if (!payload || cantidad === 0 || height <= 0) return <g />;
  const config = NIVELES_DESEMPENO[nivel];
  return (
    <g aria-hidden="true" className="cursor-pointer" onClick={() => onSeleccionar(payload.lunes)}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        strokeWidth={1}
        className={`${config.claseRelleno} stroke-white dark:stroke-night-card`}
      />
      {height >= 18 * escala && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className={`${config.claseNumeroRelleno} text-xs font-bold`}
        >
          {cantidad}
        </text>
      )}
    </g>
  );
}

export default function GraficaDesempenoSemanal({ semanas, seleccionada, onSeleccionar }: GraficaDesempenoSemanalProps) {
  const { t, i18n } = useTranslation();
  const e = useEscalaRem();
  // ¿Qué? En celular la gráfica se abre desplazada hasta el final.
  // ¿Para qué? Lo más reciente (la semana en curso) está a la derecha: sin esto se vería primero la semana más vieja.
  const desplazable = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (desplazable.current) desplazable.current.scrollLeft = desplazable.current.scrollWidth;
  }, [semanas.length]);
  const ultimoLunes = semanas[semanas.length - 1]?.lunes;
  const porLunes = new Map(semanas.map((s) => [s.lunes, s]));

  const dibujarRotulo = ({ x = 0, y = 0, payload }: RotuloProps): ReactElement => {
    const lunes = String(payload?.value ?? "");
    const semana = porLunes.get(lunes);
    if (!semana) return <g />;
    const { desde, hasta } = rangoSemana(lunes, i18n.language);
    const enCurso = lunes === ultimoLunes;
    const activa = lunes === seleccionada;
    const descripcion = t(
      enCurso ? "desempeno.grafica.descripcionBarraEnCurso" : "desempeno.grafica.descripcionBarra",
      { desde, hasta, bueno: semana.bueno, regular: semana.regular, malo: semana.malo },
    );
    const alTeclear = (e: KeyboardEvent<SVGGElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSeleccionar(lunes);
      }
    };
    const clasesTexto = `text-[0.6875rem] fill-gray-700 dark:fill-gray-200 ${activa ? "font-bold" : "font-medium"}`;
    return (
      <g
        transform={`translate(${x},${y})`}
        role="button"
        tabIndex={0}
        aria-label={descripcion}
        aria-pressed={activa}
        className="group cursor-pointer outline-none"
        onClick={() => onSeleccionar(lunes)}
        onKeyDown={alTeclear}
      >
        <rect
          x={-32 * e}
          y={2 * e}
          width={64 * e}
          height={(enCurso ? 58 : 44) * e}
          rx={6 * e}
          strokeWidth={2}
          className="fill-transparent stroke-transparent group-focus-visible:stroke-accent-600 dark:group-focus-visible:stroke-accent-300"
        />
        {/* ¿Qué? La semana elegida lleva una rayita encima y su rótulo en negrita.
            ¿Para qué? Marcarla sin depender del color ni atenuar las demás barras (restaba contraste a sus números). */}
        {activa && <rect x={-20 * e} y={4 * e} width={40 * e} height={3 * e} rx={1.5 * e} className="fill-accent-700 dark:fill-accent-300" />}
        <text y={20 * e} textAnchor="middle" className={clasesTexto}>
          {desde}
        </text>
        <text y={34 * e} textAnchor="middle" className={clasesTexto}>
          {t("desempeno.grafica.hastaLinea", { hasta })}
        </text>
        {enCurso && (
          <text y={50 * e} textAnchor="middle" className="text-[0.6875rem] font-semibold fill-accent-700 dark:fill-accent-300">
            {t("desempeno.grafica.enCurso")}
          </text>
        )}
      </g>
    );
  };

  return (
    <div ref={desplazable} className="overflow-x-auto">
      <div style={{ minWidth: semanas.length * ANCHO_MINIMO_SEMANA * e }}>
        <ResponsiveContainer width="100%" height={ALTO_GRAFICA * e}>
          <BarChart data={semanas} margin={{ top: 8 * e, right: 8 * e, left: 0, bottom: 0 }} accessibilityLayer={false}>
            <CartesianGrid vertical={false} className="stroke-gray-200 dark:stroke-night-line" />
            <XAxis dataKey="lunes" tickLine={false} axisLine={false} interval={0} height={64 * e} tick={dibujarRotulo} />
            <YAxis
              allowDecimals={false}
              width={28 * e}
              tickLine={false}
              axisLine={false}
              tick={{ className: "fill-gray-600 dark:fill-gray-300", fontSize: 11 * e }}
            />
            {CAMPOS_POR_NIVEL.map(({ nivel, campo }) => (
              <Bar
                key={nivel}
                dataKey={campo}
                stackId="semana"
                isAnimationActive={false}
                shape={(props: TramoProps) => dibujarTramo(props, nivel, campo, onSeleccionar, e)}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
