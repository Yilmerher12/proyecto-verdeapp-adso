/**
 * Archivo: __tests__/lib/muroLeccion.test.ts
 * Descripción: Pruebas de la partición del texto de un módulo en tarjetas del muro.
 * ¿Para qué? El muro depende de reconocer títulos e introducción en un texto
 *           libre que escribe el Administrador; estas pruebas fijan las reglas con
 *           textos como los de los 6 módulos reales. Las imágenes escritas dentro del texto
 *           se ignoran hasta que existan las imágenes propias del Administrador.
 */
import { describe, expect, it } from "vitest";
import { partirEnTarjetas } from "@/lib/muroLeccion";

const IMAGEN = "/uploads/adjuntos/0b9c1a0e-3f4d-4c52-9b57-6f1f2a3b4c5d.png";

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

    expect(muro.tarjetas).toEqual([{ titulo: "Bolsa blanca", texto: "material limpio y seco." }]);
  });

  it("reconoce un subtítulo ## solo en su línea como título de la tarjeta que sigue", () => {
    const muro = partirEnTarjetas("Introducción del tema.\n\n## Antes de reciclar\n\nEnjuaga los envases.");

    expect(muro.tarjetas).toEqual([{ titulo: "Antes de reciclar", texto: "Enjuaga los envases." }]);
  });

  it("una imagen sola en su línea se ignora: no es tarjeta ni se pega a ninguna", () => {
    const texto = `Introducción del tema.

![blanca](${IMAGEN})

Bolsa blanca: limpio y seco.

![externa](https://sitio-malo.com/pixel.png)

Bolsa negra: ordinarios.`;

    const muro = partirEnTarjetas(texto);

    expect(muro.tarjetas).toEqual([
      { titulo: "Bolsa blanca", texto: "limpio y seco." },
      { titulo: "Bolsa negra", texto: "ordinarios." },
    ]);
    expect(JSON.stringify(muro)).not.toContain("uploads");
    expect(JSON.stringify(muro)).not.toContain("sitio-malo");
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

  it("acepta saltos de línea de Windows y espacios sobrantes", () => {
    const muro = partirEnTarjetas("Intro.\r\n\r\n   \r\nBolsa verde: orgánicos.\r\n");

    expect(muro.introduccion).toBe("Intro.");
    expect(muro.tarjetas[0].titulo).toBe("Bolsa verde");
  });

  it("un texto vacío no rompe nada", () => {
    expect(partirEnTarjetas("")).toEqual({ introduccion: null, tarjetas: [], cierre: null });
  });
});
