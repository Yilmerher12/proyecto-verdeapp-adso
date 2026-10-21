// ¿Qué? Los períodos que se pueden elegir al descargar la agenda (HU-049) y las fechas que le
//       corresponden a cada uno.
// ¿Para qué? Que el caso normal ("todo", "este mes", "mes pasado") no obligue a escribir fechas:
//           solo "Personalizado" muestra los campos de fecha.
// ¿Impacto? "Hoy" se toma en hora de Bogotá, igual que las fechas que recibe el backend; con la
//           hora del navegador, alguien conectado desde otra zona vería el mes cambiar un día
//           antes o después.
export type PeriodoDescarga = "TODO" | "ESTE_MES" | "MES_PASADO" | "PERSONALIZADO";

export interface RangoFechas {
  desde: string;
  hasta: string;
}

const dosDigitos = (n: number) => String(n).padStart(2, "0");

// ¿Qué? La fecha de hoy en Bogotá como "AAAA-MM-DD" ("en-CA" es el idioma que ya la escribe así).
export function hoyEnBogota(ahora: Date = new Date()): string {
  return ahora.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

// ¿Qué? "Todo" no manda fechas (vacías = sin límite); "Este mes" y "Mes pasado" van del primer al último día
//       de ese mes; "Personalizado" usa las fechas escritas.
export function rangoDelPeriodo(periodo: PeriodoDescarga, personalizado: RangoFechas, hoy: string = hoyEnBogota()): RangoFechas {
  if (periodo === "PERSONALIZADO") return personalizado;
  if (periodo === "TODO") return { desde: "", hasta: "" };

  const [anioHoy, mesHoy] = hoy.split("-").map(Number);
  // Date.UTC acepta el mes 0 (enero del mes pasado = diciembre del año anterior) sin ajustes a mano.
  const primero = new Date(Date.UTC(anioHoy, mesHoy - 1 - (periodo === "MES_PASADO" ? 1 : 0), 1));
  const anio = primero.getUTCFullYear();
  const mes = primero.getUTCMonth() + 1;
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return { desde: `${anio}-${dosDigitos(mes)}-01`, hasta: `${anio}-${dosDigitos(mes)}-${dosDigitos(ultimoDia)}` };
}
