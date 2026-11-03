/**
 * Archivo: lib/organizarComunicados.ts
 * ¿Qué? Ordena los comunicados del feed: los urgentes quedan fijados arriba (máximo 3) y el
 *       resto se separa en "esta semana" y "anteriores".
 * ¿Para qué? Un aviso urgente (ej: un corte de agua) no puede quedar enterrado bajo avisos más
 *           nuevos pero menos importantes, y una lista larga se lee mejor con encabezados por fecha.
 * ¿Impacto? Solo ordena y agrupa: no cambia qué comunicados ve cada rol (eso lo decide el backend).
 */
import type { Comunicado, TipoComunicado } from "@/lib/comunicadosApi";

// ¿Qué? Desde cuántos comunicados se muestran filtros por tipo y encabezados por fecha.
// ¿Para qué? Con 1 o 2 avisos serían ruido: no hay nada que filtrar ni que agrupar.
export const MINIMO_PARA_ORGANIZAR = 4;

export const MAXIMO_URGENTES_FIJADOS = 3;

const MS_POR_SEMANA = 7 * 24 * 60 * 60 * 1000;

export interface ComunicadosOrganizados {
  fijados: Comunicado[];
  estaSemana: Comunicado[];
  anteriores: Comunicado[];
}

export function organizarComunicados(
  comunicados: Comunicado[],
  tipo: TipoComunicado | null = null,
  ahora: Date = new Date()
): ComunicadosOrganizados {
  const filtrados = (tipo ? comunicados.filter((c) => c.tipo === tipo) : comunicados)
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const fijados = filtrados.filter((c) => c.tipo === "URGENTE").slice(0, MAXIMO_URGENTES_FIJADOS);
  const resto = filtrados.filter((c) => !fijados.includes(c));

  const limite = ahora.getTime() - MS_POR_SEMANA;
  return {
    fijados,
    estaSemana: resto.filter((c) => new Date(c.created_at).getTime() >= limite),
    anteriores: resto.filter((c) => new Date(c.created_at).getTime() < limite),
  };
}
