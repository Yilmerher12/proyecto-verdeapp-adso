/**
 * Archivo: __tests__/lib/muroLeccion.test.ts
 * Descripción: Pruebas de la partición del texto de un módulo en tarjetas del muro.
 * ¿Para qué? El muro depende de reconocer títulos, imágenes e introducción en un texto
 *           libre que escribe el Administrador; estas pruebas fijan las reglas con
 *           textos como los de los 6 módulos reales.
 */
import { describe, expect, it } from "vitest";
import { partirEnTarjetas } from "@/lib/muroLeccion";

const IMAGEN_A = "/uploads/adjuntos/0b9c1a0e-3f4d-4c52-9b57-6f1f2a3b4c5d.png";
const IMAGEN_B = "/uploads/adjuntos/7d1e2f3a-4b5c-4d6e-8f70-a1b2c3d4e5f6.jpg";

describe("partirEnTarjetas", () => {
  it("con el texto real del código de colores: intro, tres tarjetas con título y un cierre", () => {
    const texto = [
      "En Bogotá la separación de residuos en la fuente se hace con tres colores de bolsa, unificados a nivel nacional.",
      "Bolsa blanca: material aprovechable, limpio y seco. Aquí van el papel, el cartón y el plástico.",
      "Bolsa negra: residuos ordinarios que ya no se pueden aprovechar.",
      "Bolsa verde: residuos orgánicos aprovechables, como cáscaras y restos de comida.",
      "Separar bien en el hogar es el primer paso de toda la cadena de reciclaje.",
    ].join("\n\n");

    const muro = partirEnTarjetas(texto);

    expect(muro.introduccion).toMatch(/^En Bogotá la separación/);
    expect(muro.tarjetas.map((t) => t.titulo)).toEqual(["Bolsa blanca", "Bolsa negra", "Bolsa verde"]);
    expect(muro.tarjetas[0].texto).toBe("material aprovechable, limpio y seco. Aquí van el papel, el cartón y el plástico.");
    expect(muro.cierre).toBe("Separar bien en el hogar es el primer paso de toda la cadena de reciclaje.");
  });

  it("reconoce el título en negrita al inicio del párrafo", () => {
    const muro = partirEnTarjetas("Introducción del tema.\n\n**Bolsa blanca:** material limpio y seco.");

    expect(muro.tarjetas).toEqual([{ titulo: "Bolsa blanca", texto: "material limpio y seco.", imagen: null }]);
  });

  it("reconoce un subtítulo ## solo en su línea como título de la tarjeta que sigue", () => {
    const muro = partirEnTarjetas("Introducción del tema.\n\n## Antes de reciclar\n\nEnjuaga los envases.");

    expect(muro.tarjetas).toEqual([{ titulo: "Antes de reciclar", texto: "Enjuaga los envases.", imagen: null }]);
  });

  it("una imagen sola en su línea se pega a la tarjeta que viene después", () => {
    const texto = `Introducción del tema.\n\n![blanca](${IMAGEN_A})\n\nBolsa blanca: limpio y seco.\n\n![negra](${IMAGEN_B})\n\nBolsa negra: ordinarios.`;

    const muro = partirEnTarjetas(texto);

    expect(muro.tarjetas.map((t) => [t.titulo, t.imagen])).toEqual([
      ["Bolsa blanca", IMAGEN_A],
      ["Bolsa negra", IMAGEN_B],
    ]);
  });

  it("una oración larga con dos puntos en medio no se toma como título", () => {
    const muro = partirEnTarjetas(
      "Introducción.\n\nLos recicladores de oficio recogen, transportan y comercializan material, y esto es clave: sin ellos no hay cadena."
    );

    expect(muro.tarjetas[0].titulo).toBeNull();
  });

  it("un texto de un solo párrafo es solo introducción", () => {
    const muro = partirEnTarjetas("Un solo párrafo con todo el contenido del módulo.");

    expect(muro).toEqual({ introduccion: "Un solo párrafo con todo el contenido del módulo.", tarjetas: [], cierre: null });
  });

  it("si el primer párrafo trae título, no hay introducción", () => {
    const muro = partirEnTarjetas("Papel y cartón: deben estar secos.\n\nPlástico: enjuagar los envases.");

    expect(muro.introduccion).toBeNull();
    expect(muro.tarjetas).toHaveLength(2);
  });

  it("un último párrafo con imagen no se toma como cierre", () => {
    const muro = partirEnTarjetas(`Introducción.\n\nBolsa blanca: limpio.\n\n![x](${IMAGEN_A})\n\nUn párrafo final con su imagen.`);

    expect(muro.cierre).toBeNull();
    expect(muro.tarjetas[1].imagen).toBe(IMAGEN_A);
  });

  it("acepta saltos de línea de Windows y espacios sobrantes", () => {
    const muro = partirEnTarjetas("Intro.\r\n\r\n   \r\nBolsa verde: orgánicos.\r\n");

    expect(muro.introduccion).toBe("Intro.");
    expect(muro.tarjetas[0].titulo).toBe("Bolsa verde");
  });

  it("un texto vacío no rompe nada", () => {
    expect(partirEnTarjetas("")).toEqual({ introduccion: null, tarjetas: [], cierre: null });
  });
});
