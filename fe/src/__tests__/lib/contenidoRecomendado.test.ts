/**
 * Archivo: __tests__/lib/contenidoRecomendado.test.ts
 * Descripción: Tests de a dónde lleva una notificación de contenido recomendado (RQF-013, issue #705).
 * ¿Para qué? El aviso manual abre la lección que eligió el Administrador; el automático solo conoce la categoría
 *            y abre la primera lección sin ver (o la lista, si ya las vio todas).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { rutaDeContenidoRecomendado } from "@/lib/contenidoRecomendado";
import type { NotificacionItem } from "@/lib/notificaciones";
import type { ContenidoEducativo } from "@/lib/contenidoEducativoApi";

const mockObtenerAuditoria = vi.fn();
const mockListarContenido = vi.fn();
const mockListarVistos = vi.fn();

vi.mock("@/lib/auditoriaConjuntoApi", () => ({
  obtenerAuditoria: (...args: unknown[]) => mockObtenerAuditoria(...args),
}));
vi.mock("@/lib/contenidoEducativoApi", () => ({
  listarContenido: (...args: unknown[]) => mockListarContenido(...args),
  listarVistos: (...args: unknown[]) => mockListarVistos(...args),
}));

const CATEGORIA = "Residuos peligrosos del hogar";
const base = { modulo_categoria: CATEGORIA, cuerpo_texto: "x", url_video: null, url_guia: null, url_imagen: null, fecha_publicacion: "2026-11-26" };
const contenido: ContenidoEducativo[] = [
  { ...base, id_contenido: "m2", titulo_tema: "Segundo", orden: 2 },
  { ...base, id_contenido: "m1", titulo_tema: "Primero", orden: 1 },
];

const aviso = (tipo: string, id_referencia: string | null): NotificacionItem =>
  ({ id_notificacion: "n1", tipo, mensaje: "m", id_referencia, leida: false, created_at: "2026-11-26T10:00:00Z" }) as unknown as NotificacionItem;

describe("rutaDeContenidoRecomendado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObtenerAuditoria.mockResolvedValue({ tema_educativo: CATEGORIA });
    mockListarContenido.mockResolvedValue(contenido);
    mockListarVistos.mockResolvedValue([]);
  });

  it("devuelve null si la notificación no trae referencia", async () => {
    expect(await rutaDeContenidoRecomendado(aviso("CONTENIDO_RECOMENDADO", null))).toBeNull();
  });

  it("devuelve null si no es una notificación de contenido", async () => {
    expect(await rutaDeContenidoRecomendado(aviso("NOVEDAD", "x"))).toBeNull();
  });

  describe("aviso manual del Administrador", () => {
    it("abre directo la lección que él envió, sin consultar nada", async () => {
      expect(await rutaDeContenidoRecomendado(aviso("CONTENIDO_RECOMENDADO_MANUAL", "m2"))).toBe("/catalogo-educativo/leccion/m2");
      expect(mockListarContenido).not.toHaveBeenCalled();
      expect(mockObtenerAuditoria).not.toHaveBeenCalled();
    });
  });

  describe("aviso automático después de una auditoría", () => {
    it("abre la primera lección de esa categoría que no se ha visto", async () => {
      mockListarVistos.mockResolvedValue(["m1"]);

      expect(await rutaDeContenidoRecomendado(aviso("CONTENIDO_RECOMENDADO", "aud-1"))).toBe("/catalogo-educativo/leccion/m2");
      expect(mockObtenerAuditoria).toHaveBeenCalledWith("aud-1");
    });

    it("sin ninguna vista, abre la primera en el orden de lectura", async () => {
      expect(await rutaDeContenidoRecomendado(aviso("CONTENIDO_RECOMENDADO", "aud-1"))).toBe("/catalogo-educativo/leccion/m1");
    });

    it("si ya vio todas, lleva a la lista de la categoría", async () => {
      mockListarVistos.mockResolvedValue(["m1", "m2"]);

      expect(await rutaDeContenidoRecomendado(aviso("CONTENIDO_RECOMENDADO", "aud-1"))).toBe(
        `/catalogo-educativo/${encodeURIComponent(CATEGORIA)}`
      );
    });

    it("si no se pueden consultar las vistas, las trata como ninguna vista", async () => {
      mockListarVistos.mockRejectedValue(new Error("falló"));

      expect(await rutaDeContenidoRecomendado(aviso("CONTENIDO_RECOMENDADO", "aud-1"))).toBe("/catalogo-educativo/leccion/m1");
    });

    it("si no se puede consultar el catálogo, lleva a la lista de la categoría", async () => {
      mockListarContenido.mockRejectedValue(new Error("falló"));

      expect(await rutaDeContenidoRecomendado(aviso("CONTENIDO_RECOMENDADO", "aud-1"))).toBe(
        `/catalogo-educativo/${encodeURIComponent(CATEGORIA)}`
      );
    });
  });
});
