/**
 * Archivo: __tests__/lib/uploadsApi.test.ts
 * Descripción: Pruebas de subirAdjunto — el porcentaje de avance de la subida.
 * ¿Para qué? Issue #458: la barra de progreso de las subidas se alimenta de
 *           `onProgress`; sin esto solo se vería un círculo girando.
 * ¿Impacto? Si el porcentaje se calcula mal, la barra miente sobre cuánto falta.
 */
import { subirAdjunto } from "@/lib/uploadsApi";

const mockPost = vi.fn();

vi.mock("axios", () => ({
  default: { post: (...args: unknown[]) => mockPost(...args) },
}));
vi.mock("@/api/axios", () => ({ API_BASE_URL: "http://api.test" }));

const archivo = new File(["x"], "foto.png", { type: "image/png" });

describe("subirAdjunto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValue({ data: { url: "/uploads/adjuntos/a.png" } });
  });

  it("devuelve la URL que responde el backend", async () => {
    await expect(subirAdjunto(archivo)).resolves.toBe("/uploads/adjuntos/a.png");
  });

  it("reporta el porcentaje real de la subida, redondeado", async () => {
    const onProgress = vi.fn();
    await subirAdjunto(archivo, { onProgress });

    const config = mockPost.mock.calls[0][2] as { onUploadProgress: (e: { loaded: number; total?: number }) => void };
    config.onUploadProgress({ loaded: 50, total: 200 });
    config.onUploadProgress({ loaded: 2, total: 3 });

    expect(onProgress).toHaveBeenNthCalledWith(1, 25);
    expect(onProgress).toHaveBeenNthCalledWith(2, 67);
  });

  it("no falla ni reporta si el navegador no sabe el total", async () => {
    const onProgress = vi.fn();
    await subirAdjunto(archivo, { onProgress });

    const config = mockPost.mock.calls[0][2] as { onUploadProgress: (e: { loaded: number; total?: number }) => void };
    config.onUploadProgress({ loaded: 10 });

    expect(onProgress).not.toHaveBeenCalled();
  });

  it("sin onProgress sigue funcionando igual", async () => {
    await subirAdjunto(archivo, { permitirDocumentos: true });

    expect(mockPost.mock.calls[0][0]).toContain("permitir_documentos=true");
    const config = mockPost.mock.calls[0][2] as { onUploadProgress: (e: { loaded: number; total: number }) => void };
    expect(() => config.onUploadProgress({ loaded: 1, total: 2 })).not.toThrow();
  });
});
