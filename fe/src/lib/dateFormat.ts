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

// ¿Qué? El lunes (en UTC) de la semana que contiene esta fecha, en formato
//       YYYY-MM-DD — mismo criterio UTC del resto de este archivo, para que
//       coincida con cómo el backend recorta la semana
//       (GET /auditorias-conjunto/admin?lunes=, RQF-018).
// ¿Para qué? El panel de "Calificaciones por conjunto" navega semana a
//           semana; este lunes es justo lo que se manda como parámetro.
export function lunesUTC(fecha: Date = new Date()): string {
  const dia = fecha.getUTCDay(); // 0 domingo .. 6 sábado
  const offset = (dia + 6) % 7; // lunes = 0 días de diferencia
  const lunes = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate() - offset));
  return isoToDateInputUTC(lunes.toISOString());
}

// ¿Qué? El domingo que le corresponde a un lunes dado (mismo par que usa
//       el backend para el límite superior de la semana).
export function domingoDeLunesUTC(lunesIso: string): Date {
  const [y, m, d] = lunesIso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 6));
}

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// ¿Qué? "14–20 sep" o, si la semana cruza de mes, "28 ago – 3 sep".
export function rangoSemanaUTC(lunesIso: string): string {
  const [, m1Str, d1Str] = lunesIso.split("-");
  const m1 = Number(m1Str), d1 = Number(d1Str);
  const domingo = domingoDeLunesUTC(lunesIso);
  const m2 = domingo.getUTCMonth();
  const d2 = domingo.getUTCDate();
  if (m1 - 1 === m2) return `${d1}–${d2} ${MESES_CORTOS[m2]}`;
  return `${d1} ${MESES_CORTOS[m1 - 1]} – ${d2} ${MESES_CORTOS[m2]}`;
}
