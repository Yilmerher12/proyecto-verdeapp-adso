/**
 * Archivo: lib/dateFormat.ts
 * Descripción: Formato de fechas compartido por toda la app.
 * ¿Para qué? Issue #275 — el mismo cálculo (con su lógica de zona horaria)
 *           estaba copiado letra por letra en AdminNovedadesPage.tsx y
 *           AdminConjuntoComunicadosPage.tsx, y otras 5 pantallas más
 *           formateaban "created_at" cada una a su manera. Centralizarlo
 *           aquí evita que la misma clase de dato se vea distinto según
 *           la pantalla.
 */

// ¿Qué? Muestra la fecha en UTC, no en la zona horaria del navegador.
// ¿Para qué? Para Convocatoria, el backend calcula la expiración como
//           "medianoche UTC del día siguiente al evento" — si se muestra
//           en hora local de Bogotá (UTC-5), esa medianoche UTC cae la
//           noche ANTERIOR en hora local, y la fecha mostrada retrocede
//           un día respecto a la que el admin realmente eligió.
export function formatearFechaUTC(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { timeZone: "UTC" });
}

// ¿Qué? "created_at" es un instante real (con hora), no una fecha elegida a
//       mano como "fecha_expiracion" — se muestra en la zona horaria del
//       navegador, sin el truco de UTC de formatearFechaUTC.
export function formatearFechaCreacion(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

// ¿Qué? Igual que formatearFechaUTC, pero en formato YYYY-MM-DD (lo que
//       espera un <input type="date">) — se usa para precargar la fecha
//       de expiración actual al abrir un formulario de edición, con el
//       mismo criterio de UTC para no mostrar un día distinto al real.
export function isoToDateInputUTC(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
