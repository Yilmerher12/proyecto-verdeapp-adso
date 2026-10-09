/**
 * Archivo: __tests__/components/AuditoriaResultadoModal.test.tsx
 * Descripción: Tests del detalle de una auditoría (fotos de evidencia).
 * ¿Para qué? Issue #400 (CN-048): las fotos pasan por enlaceAdjuntoSeguro —
 *           una ruta insegura ("..", "%2e%2e", otro esquema) no se pinta.
 */
import { render, screen } from "@testing-library/react";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { API_BASE_URL } from "@/api/axios";
import { AuditoriaResultadoModal } from "@/components/dashboard/AuditoriaResultadoModal";
import type { AuditoriaConjunto } from "@/lib/auditoriaConjuntoApi";

const mockObtenerAuditoria = vi.fn();

vi.mock("@/lib/auditoriaConjuntoApi", () => ({
  obtenerAuditoria: (...args: unknown[]) => mockObtenerAuditoria(...args),
}));

const AUDITORIA: AuditoriaConjunto = {
  id_auditoria: "a1",
  id_conjunto_residencial: "c1",
  nombre_conjunto: "Los Alpes",
  nivel_desempeno: "BUENA",
  tema_educativo: "Separación en la fuente",
  descripcion: null,
  ruta_evidencia: "/uploads/evidencias-auditoria/foto1.jpg",
  ruta_evidencia_2: null,
  ruta_evidencia_3: null,
  created_at: "2026-09-22T10:00:00Z",
  nombre_reciclador: "Juan",
};

describe("AuditoriaResultadoModal — fotos de evidencia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pinta la foto subida con la URL del backend", async () => {
    mockObtenerAuditoria.mockResolvedValue(AUDITORIA);
    render(<AuditoriaResultadoModal idAuditoria="a1" onClose={vi.fn()} />);

    expect(await screen.findByRole("img", { name: "Foto de evidencia de la auditoría" })).toHaveAttribute(
      "src",
      `${API_BASE_URL}/uploads/evidencias-auditoria/foto1.jpg`
    );
  });

  it("no pinta una foto con ruta insegura, pero sí las demás", async () => {
    mockObtenerAuditoria.mockResolvedValue({
      ...AUDITORIA,
      ruta_evidencia: "/uploads/%2e%2e/api/v1/users/me",
      ruta_evidencia_2: "/uploads/evidencias-auditoria/foto2.jpg",
    });
    render(<AuditoriaResultadoModal idAuditoria="a1" onClose={vi.fn()} />);

    const fotos = await screen.findAllByRole("img", { name: "Foto de evidencia de la auditoría" });
    expect(fotos).toHaveLength(1);
    expect(fotos[0]).toHaveAttribute("src", `${API_BASE_URL}/uploads/evidencias-auditoria/foto2.jpg`);
  });
});
