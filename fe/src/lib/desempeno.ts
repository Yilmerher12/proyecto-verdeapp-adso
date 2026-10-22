/**
 * Archivo: lib/desempeno.ts
 * ¿Qué? Cálculos sobre la respuesta del endpoint de desempeño semanal
 *       (issue #487): totales, ranking de temas, porcentaje Bueno y rango de
 *       fechas de cada semana.
 * ¿Para qué? Sacar la cuenta de los componentes para probarla sola, y para
 *           que la página del Admin de Conjunto y la sección del Residente
 *           (issue #488) lean los mismos números de la misma manera.
 * ¿Impacto? El backend ya contó las auditorías; aquí solo se suman y ordenan
 *           esos conteos, nunca se vuelven a agrupar auditorías sueltas.
 */
import type {
  DesempenoConjunto,
  NivelDesempeno,
  SemanaDesempeno,
  TemaDesempeno,
} from "@/lib/auditoriaConjuntoApi";
import { domingoDeLunesUTC, formatearDiaMes, isoToDateInputUTC } from "@/lib/dateFormat";

// ¿Qué? Cada nivel de la BD (BUENA...) con el campo del conteo que le corresponde
//       en la respuesta del backend (bueno...), en el orden en que se apilan y se leen.
// ¿Para qué? Una sola lista para la gráfica, la leyenda, la tabla y el ranking.
export const CAMPOS_POR_NIVEL: ReadonlyArray<{ nivel: NivelDesempeno; campo: "bueno" | "regular" | "malo" }> = [
  { nivel: "BUENA", campo: "bueno" },
  { nivel: "REGULAR", campo: "regular" },
  { nivel: "DEFICIENTE", campo: "malo" },
];

// ¿Qué? Clave de traducción del nombre de cada nivel (Bueno / Regular / Malo).
export function claveNivel(nivel: NivelDesempeno): string {
  return `dashboards.reciclador.auditoria.niveles.${nivel.toLowerCase()}`;
}

export function totalSemana(semana: SemanaDesempeno): number {
  return semana.bueno + semana.regular + semana.malo;
}

export function totalTema(tema: TemaDesempeno): number {
  return tema.bueno + tema.regular + tema.malo;
}

export function regularOMalo(tema: TemaDesempeno): number {
  return tema.regular + tema.malo;
}

// ¿Qué? Temas ordenados por cuántas auditorías salieron Regular o Malo, de más
//       a menos; a igual cantidad, el que tiene más auditorías, y luego el nombre.
// ¿Para qué? Es el orden del ranking "Temas del período": arriba va lo que más
//           hay que reforzar.
export function rankingTemas(temas: TemaDesempeno[]): TemaDesempeno[] {
  return [...temas].sort(
    (a, b) => regularOMalo(b) - regularOMalo(a) || totalTema(b) - totalTema(a) || a.tema.localeCompare(b.tema),
  );
}

// ¿Qué? El primero del ranking, solo si de verdad tiene alguna auditoría Regular o Malo.
export function temaAReforzar(temas: TemaDesempeno[]): TemaDesempeno | null {
  const primero = rankingTemas(temas)[0];
  return primero && regularOMalo(primero) > 0 ? primero : null;
}

// ¿Qué? Porcentaje (entero) de auditorías Bueno en el período; null si no hay ninguna.
export function porcentajeBueno(desempeno: DesempenoConjunto): number | null {
  if (desempeno.total === 0) return null;
  const buenas = desempeno.semanas.reduce((suma, s) => suma + s.bueno, 0);
  return Math.round((buenas / desempeno.total) * 100);
}

// ¿Qué? El lunes de la semana más reciente con auditorías; si ninguna tiene,
//       el de la semana en curso (la última del período).
// ¿Para qué? Es la semana que se abre sola debajo de la gráfica.
export function lunesInicial(semanas: SemanaDesempeno[]): string | null {
  const conAuditorias = [...semanas].reverse().find((s) => totalSemana(s) > 0);
  return (conAuditorias ?? semanas[semanas.length - 1])?.lunes ?? null;
}

// ¿Qué? Extremos de una semana, ya escritos ("14 sep" y "20 sep"), de lunes a domingo.
export function rangoSemana(lunes: string, locale?: string): { desde: string; hasta: string } {
  const domingo = isoToDateInputUTC(domingoDeLunesUTC(lunes).toISOString());
  return { desde: formatearDiaMes(lunes, locale), hasta: formatearDiaMes(domingo, locale) };
}
