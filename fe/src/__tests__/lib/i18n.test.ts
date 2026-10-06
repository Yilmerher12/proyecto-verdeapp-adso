/**
 * Archivo: __tests__/lib/i18n.test.ts
 * Descripción: El atributo lang de <html> sigue al idioma activo.
 * ¿Impacto? Antes quedaba fijo en "es" (index.html): con la app en inglés,
 *           el lector de pantalla pronunciaba el inglés como español.
 */

import i18n from "@/i18n";

describe("i18n — atributo lang de <html>", () => {
  afterEach(async () => {
    await i18n.changeLanguage("es");
  });

  it("cambia a 'en' al pasar la app a inglés y vuelve a 'es'", async () => {
    await i18n.changeLanguage("en");
    expect(document.documentElement.lang).toBe("en");

    await i18n.changeLanguage("es");
    expect(document.documentElement.lang).toBe("es");
  });
});
