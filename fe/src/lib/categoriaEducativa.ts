// ¿Qué? Cuentas de texto para el campo "Categoría" del editor de módulos (issue #620).
// ¿Para qué? Una categoría no existe por sí sola: es el texto que trae cada módulo (`modulo_categoria`). Escrita a mano,
//           "Residuos Orgánicos", "residuos organicos" y "Residuos  orgánicos" serían tres categorías distintas en el catálogo del
//           Residente y tres temas distintos para calificar. Se comparan sin mayúsculas, sin tildes y con los espacios juntos.
// ¿Impacto? Solo decide si un nombre ya existe; no cambia lo que se guarda ni el backend.

export function normalizarCategoria(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ¿Qué? El nombre de la categoría ya creada que coincide con el texto escrito (null si no hay ninguna igual).
export function categoriaDuplicada(texto: string, categorias: string[]): string | null {
  const buscada = normalizarCategoria(texto);
  if (!buscada) return null;
  return categorias.find((c) => normalizarCategoria(c) === buscada) ?? null;
}
