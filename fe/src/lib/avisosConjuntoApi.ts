/**
 * Archivo: lib/avisosConjuntoApi.ts
 * Descripción: Llamadas al servidor para los avisos de UN conjunto en el panel del Administrador de Conjunto.
 * ¿Para qué? Issue #595: antes el panel pedía las últimas 30 notificaciones de todos los conjuntos juntos y las
 *           repartía en la pantalla; así los avisos de un conjunto podían desplazar a los de otro. Ahora cada conjunto
 *           pide su propia página (de 10 en 10) y el servidor dice cuántos avisos sin leer tiene cada uno.
 * ¿Impacto? La lista general (`/mis-notificaciones`, la de la campanita y los banners de arriba) no cambia: esta
 *           API es solo para la pestaña "Avisos" y las pastillas de la cabecera de cada conjunto.
 */
import axios from "axios";
import { API_BASE_URL } from "@/api/axios";
import type { NotificacionItem } from "@/lib/notificaciones";

const API_BASE = `${API_BASE_URL}/api/v1/notificaciones`;

// ¿Qué? Avisos por página en la pestaña "Avisos", igual que el resto de listas paginadas del proyecto.
export const AVISOS_POR_PAGINA = 10;

export interface PaginaDeAvisos {
  items: NotificacionItem[];
  total: number;
}

export async function obtenerAvisosDeConjunto(idConjunto: string, limit: number, offset: number): Promise<PaginaDeAvisos> {
  const { data } = await axios.get(`${API_BASE}/por-conjunto/${idConjunto}`, { params: { limit, offset } });
  return data;
}

// ¿Qué? Cuántos avisos sin leer tiene cada conjunto, como { idConjunto: cantidad }. Los conjuntos sin avisos
//       sin leer no aparecen (se leen como 0).
export async function obtenerNoLeidasPorConjunto(): Promise<Record<string, number>> {
  const { data } = await axios.get<{ id_conjunto_residencial: string; count: number }[]>(
    `${API_BASE}/no-leidas-por-conjunto`
  );
  return Object.fromEntries(data.map((fila) => [fila.id_conjunto_residencial, fila.count]));
}

export async function marcarAvisoLeido(idNotificacion: string): Promise<void> {
  await axios.post(`${API_BASE}/${idNotificacion}/leer`, {});
}

// ¿Qué? Issue #436 — "marcar todas" y "limpiar leídas" solo afectan a los avisos de ESE conjunto.
export async function marcarAvisosDelConjuntoLeidos(idConjunto: string): Promise<void> {
  await axios.post(`${API_BASE}/marcar-todas-leidas`, {}, { params: { id_conjunto_residencial: idConjunto } });
}

export async function limpiarAvisosLeidosDelConjunto(idConjunto: string): Promise<void> {
  await axios.delete(`${API_BASE}/limpiar-leidas`, { params: { id_conjunto_residencial: idConjunto } });
}
