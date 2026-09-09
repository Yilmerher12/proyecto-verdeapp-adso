import axios from "axios";
import { API_BASE_URL } from "@/api/axios";

// ¿Qué? Cliente HTTP dedicado a /api/v1/contenido-educativo.
// ¿Para qué? Centralizar las llamadas del catálogo educativo (RQF-004/RQF-010)
//           en un solo lugar, igual que el resto de los módulos de la app.
const API_BASE = `${API_BASE_URL}/api/v1/contenido-educativo`;

export interface ContenidoEducativo {
  id_contenido: string;
  modulo_categoria: string;
  titulo_tema: string;
  cuerpo_texto: string;
  url_video: string | null;
  url_guia: string | null;
  fecha_publicacion: string;
}

export type ContenidoEducativoPayload = Omit<
  ContenidoEducativo,
  "id_contenido" | "fecha_publicacion"
>;

export async function listarContenido(): Promise<ContenidoEducativo[]> {
  const { data } = await axios.get(API_BASE);
  return data;
}

export async function crearContenido(payload: ContenidoEducativoPayload): Promise<ContenidoEducativo> {
  const { data } = await axios.post(API_BASE, payload);
  return data;
}

export async function editarContenido(
  id: string,
  payload: ContenidoEducativoPayload
): Promise<ContenidoEducativo> {
  const { data } = await axios.put(`${API_BASE}/${id}`, payload);
  return data;
}

export async function eliminarContenido(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/${id}`);
}
