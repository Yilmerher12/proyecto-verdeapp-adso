/**
 * Archivo: lib/mapsLink.ts
 * Descripción: Arma el enlace de búsqueda de Google Maps para una dirección.
 * ¿Para qué? El Admin Sistema comprueba que la dirección de un punto de acopio
 *           quedó bien escrita; el Directorio de Residentes y Recicladores
 *           reutilizará este mismo enlace para "Cómo llegar".
 * ¿Impacto? Es un enlace de búsqueda (no necesita clave, ni backend, ni
 *           coordenadas): Google interpreta el texto, y agregar la localidad
 *           y "Bogotá" evita que confunda la dirección con otra ciudad.
 */
export function googleMapsUrl(direccion: string, localidad: string): string {
  const consulta = `${direccion}, ${localidad}, Bogotá, Colombia`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
}
