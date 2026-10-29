/**
 * Archivo: lib/normalizarTexto.ts
 * Descripción: Pasa un texto a minúsculas y sin tildes.
 * ¿Para qué? Que el buscador de puntos de acopio encuentre "Engativá" al escribir
 *           "engativa", igual en el Directorio y en la gestión del Admin.
 */
export const normalizarTexto = (texto: string): string => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
