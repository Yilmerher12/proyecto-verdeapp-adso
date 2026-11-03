/**
 * Archivo: __tests__/lib/organizarComunicados.test.ts
 * ¿Para qué? El feed de comunicados fija los urgentes arriba (máximo 3) y separa el resto en
 *           "esta semana" y "anteriores". Si esta lógica se rompe, un aviso urgente queda enterrado.
 */
import { describe, it, expect } from "vitest";
import { organizarComunicados, MAXIMO_URGENTES_FIJADOS } from "@/lib/organizarComunicados";
import type { Comunicado, TipoComunicado } from "@/lib/comunicadosApi";

const AHORA = new Date("2026-10-30T12:00:00Z");
const haceDias = (dias: number) => new Date(AHORA.getTime() - dias * 24 * 60 * 60 * 1000).toISOString();

function comunicado(id: string, tipo: TipoComunicado, dias: number): Comunicado {
  return {
    id_comunicado: id,
    id_conjunto_residencial: "c1",
    nombre_conjunto: "Conjunto",
    destinatarios: "AMBOS",
    tipo,
    texto: `Texto ${id}`,
    url_adjunto: null,
    fecha_evento: null,
    fecha_expiracion: "2099-12-31T00:00:00Z",
    created_at: haceDias(dias),
    editado: false,
  };
}

describe("organizarComunicados", () => {
  it("fija los urgentes arriba aunque sean más viejos que otros avisos", () => {
    const r = organizarComunicados(
      [comunicado("info", "INFORMATIVO", 1), comunicado("urgente", "URGENTE", 5)],
      null,
      AHORA
    );
    expect(r.fijados.map((c) => c.id_comunicado)).toEqual(["urgente"]);
    expect(r.estaSemana.map((c) => c.id_comunicado)).toEqual(["info"]);
  });

  it(`fija como máximo ${MAXIMO_URGENTES_FIJADOS} urgentes; los demás siguen en la lista por fecha`, () => {
    const urgentes = ["a", "b", "c", "d"].map((id, i) => comunicado(id, "URGENTE", i + 1));
    const r = organizarComunicados(urgentes, null, AHORA);
    expect(r.fijados).toHaveLength(MAXIMO_URGENTES_FIJADOS);
    expect(r.fijados.map((c) => c.id_comunicado)).toEqual(["a", "b", "c"]);
    expect(r.estaSemana.map((c) => c.id_comunicado)).toEqual(["d"]);
  });

  it("separa 'esta semana' (últimos 7 días) de 'anteriores' y ordena del más nuevo al más viejo", () => {
    const r = organizarComunicados(
      [comunicado("viejo", "RECICLAJE", 20), comunicado("nuevo", "RECICLAJE", 1), comunicado("medio", "RECICLAJE", 6)],
      null,
      AHORA
    );
    expect(r.estaSemana.map((c) => c.id_comunicado)).toEqual(["nuevo", "medio"]);
    expect(r.anteriores.map((c) => c.id_comunicado)).toEqual(["viejo"]);
  });

  it("el filtro por tipo se aplica a todo, también a los urgentes fijados", () => {
    const todos = [comunicado("u", "URGENTE", 1), comunicado("r", "RECICLAJE", 2), comunicado("m", "MANTENIMIENTO", 3)];

    const reciclaje = organizarComunicados(todos, "RECICLAJE", AHORA);
    expect(reciclaje.fijados).toEqual([]);
    expect(reciclaje.estaSemana.map((c) => c.id_comunicado)).toEqual(["r"]);

    const urgente = organizarComunicados(todos, "URGENTE", AHORA);
    expect(urgente.fijados.map((c) => c.id_comunicado)).toEqual(["u"]);
    expect(urgente.estaSemana).toEqual([]);
  });

  it("no modifica la lista original", () => {
    const original = [comunicado("a", "INFORMATIVO", 10), comunicado("b", "INFORMATIVO", 1)];
    organizarComunicados(original, null, AHORA);
    expect(original.map((c) => c.id_comunicado)).toEqual(["a", "b"]);
  });
});
