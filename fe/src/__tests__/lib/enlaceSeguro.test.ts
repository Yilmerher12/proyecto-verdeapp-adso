/**
 * Archivo: __tests__/lib/enlaceSeguro.test.ts
 * Descripción: Tests de enlaceAdjuntoSeguro (issue #369, CN-041).
 * ¿Para qué? Verificar que un enlace guardado con "@sitio-malo.com" o un
 *           http:// sin cifrar nunca llegue a un href o a un <img>.
 */

import { describe, expect, it } from "vitest";
import { API_BASE_URL } from "@/api/axios";
import { enlaceAdjuntoSeguro } from "@/lib/enlaceSeguro";

describe("enlaceAdjuntoSeguro", () => {
  it("completa un archivo subido a VerdeApp con la URL del backend", () => {
    expect(enlaceAdjuntoSeguro("/uploads/adjuntos/f.jpg")).toBe(`${API_BASE_URL}/uploads/adjuntos/f.jpg`);
  });

  it("deja tal cual un enlace https://", () => {
    expect(enlaceAdjuntoSeguro("https://ejemplo.com/f.jpg")).toBe("https://ejemplo.com/f.jpg");
  });

  it.each([
    null,
    "",
    "@sitio-malo.com/login",
    "http://sitio-malo.com/f.jpg",
    "//sitio-malo.com/f.jpg",
    "javascript:alert(1)",
    "/uploads/../main.py",
  ])("rechaza %s", (url) => {
    expect(enlaceAdjuntoSeguro(url)).toBeNull();
  });
});
