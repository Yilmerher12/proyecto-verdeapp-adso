import type { AuditoriaAdmin, NivelDesempeno } from "@/lib/auditoriaConjuntoApi";
import type { ContenidoEducativo, EnvioContenido } from "@/lib/contenidoEducativoApi";

// ¿Qué? Destinatario ya resuelto de un módulo — une las auditorías Regular o Malo (automáticas) con los envíos
//       manuales, sin repetir un mismo conjunto dos veces.
// ¿Para qué? Si un conjunto tiene ambas, se queda la calificación (trae más contexto: el semáforo y quién la hizo) —
//           el envío manual solo se muestra para los conjuntos que no tienen ya una calificación de ese tema.
// ¿Impacto? Issue #619: vivía dentro de AdminContenidoEducativoPage; se movió aquí para que la lista de módulos, el
//           modal de ver y el chip "Recomendado a N conjuntos" cuenten exactamente lo mismo.
export interface Destinatario {
  id_conjunto_residencial: string;
  nombre_conjunto: string;
  tipo: "auto" | "manual";
  nivel?: NivelDesempeno;
  fecha: string;
}

export function destinatariosAutoDe(modulo: ContenidoEducativo, auditorias: AuditoriaAdmin[]): Destinatario[] {
  const vistos = new Set<string>();
  const out: Destinatario[] = [];
  const ordenadas = [...auditorias]
    .filter((a) => a.tema_educativo === modulo.modulo_categoria && a.nivel_desempeno !== "BUENA")
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  for (const a of ordenadas) {
    if (vistos.has(a.id_conjunto_residencial)) continue;
    vistos.add(a.id_conjunto_residencial);
    out.push({
      id_conjunto_residencial: a.id_conjunto_residencial,
      nombre_conjunto: a.nombre_conjunto,
      tipo: "auto",
      nivel: a.nivel_desempeno,
      fecha: a.created_at,
    });
  }
  return out;
}

export function combinarConEnvios(auto: Destinatario[], envios: EnvioContenido[]): Destinatario[] {
  const vistos = new Set(auto.map((d) => d.id_conjunto_residencial));
  const manuales: Destinatario[] = envios
    .filter((e) => !vistos.has(e.id_conjunto_residencial))
    .map((e) => ({
      id_conjunto_residencial: e.id_conjunto_residencial,
      nombre_conjunto: e.nombre_conjunto,
      tipo: "manual" as const,
      fecha: e.created_at,
    }));
  return [...auto, ...manuales];
}
