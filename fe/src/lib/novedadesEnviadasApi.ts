import axios from "axios";
import { API_BASE_URL } from "@/api/axios";

const API_BASE = `${API_BASE_URL}/api/v1/novedades-enviadas`;

export type EstadoSoporte = "NUEVA" | "EN_REVISION" | "RESUELTA";
export type PrioridadSoporte = "ALTA" | "MEDIA" | "BAJA";

export interface NovedadEnviada {
  id: string;
  texto: string;
  url_imagen: string | null;
  estado: EstadoSoporte;
  nombre_conjunto: string | null;
  respuesta: string | null;
  respondida_at: string | null;
  created_at: string;
}

// ¿Qué? Novedades que Residente, Reciclador o Admin de Conjunto le ENVÍAN al
//       Admin Sistema — no confundir con novedadesApi.ts (RQF-015), que son
//       los avisos que el Admin Sistema publica hacia todos.
// ¿Impacto? Issue #512: `motivo` es la clave del motivo elegido; de ahí el
//          backend calcula la prioridad (el autor nunca la elige).
export async function enviarNovedad(payload: {
  texto: string;
  motivo?: string | null;
  url_imagen?: string | null;
  id_conjunto_residencial?: string | null;
}) {
  const { data } = await axios.post(API_BASE, payload);
  return data;
}

export interface PaginaDeNovedadesEnviadas {
  items: NovedadEnviada[];
  total: number;
}

// ¿Qué? Issue #399 — "Historial de novedades" se pide de a páginas (limit/offset), igual
//       que la bandeja del Admin Sistema y los comunicados.
export async function misNovedadesEnviadas(
  limit: number,
  offset: number,
): Promise<PaginaDeNovedadesEnviadas> {
  const { data } = await axios.get(`${API_BASE}/mias`, { params: { limit, offset } });
  return data;
}

// ¿Qué? Issue #512 — una fila de la bandeja "Soporte técnico" del Admin Sistema.
export interface SoporteItem {
  id: string;
  origen: string;
  nombre_autor: string;
  nombre_conjunto: string;
  texto: string;
  url_imagen: string | null;
  estado: EstadoSoporte;
  prioridad: PrioridadSoporte;
  respuesta: string | null;
  respondida_at: string | null;
  created_at: string;
}

export interface PaginaDeSoporte {
  items: SoporteItem[];
  total: number;
}

// ¿Qué? Sin `estado` el backend trae lo pendiente (NUEVA y EN_REVISION); con
//       `estado: "RESUELTA"` trae el historial de lo ya atendido.
export async function listarSoporte(
  limit: number,
  offset: number,
  estado?: EstadoSoporte,
  prioridad?: PrioridadSoporte,
): Promise<PaginaDeSoporte> {
  const { data } = await axios.get(`${API_BASE}/soporte`, { params: { limit, offset, estado, prioridad } });
  return data;
}

// ¿Qué? Cambia estado, prioridad y/o respuesta; escribir una respuesta sin
//       estado la deja RESUELTA y le avisa al autor.
export async function actualizarSoporte(
  id: string,
  cambios: { estado?: EstadoSoporte; prioridad?: PrioridadSoporte; respuesta?: string },
) {
  const { data } = await axios.patch(`${API_BASE}/soporte/${id}`, cambios);
  return data;
}
