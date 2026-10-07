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
    // ¿Qué? Issue #400 (CN-052): ".." y "/" escritos en forma codificada.
    "/uploads/%2e%2e/api/v1/users/me",
    "/uploads/%2E%2E/api/v1/users/me",
    "/uploads/adjuntos%2f..%2fmain.py",
  ])("rechaza %s", (url) => {
    expect(enlaceAdjuntoSeguro(url)).toBeNull();
  });

  it("no rechaza un %2f dentro de un enlace https:// externo", () => {
    expect(enlaceAdjuntoSeguro("https://ejemplo.com/ruta%2fcodificada")).toBe("https://ejemplo.com/ruta%2fcodificada");
  });
});
