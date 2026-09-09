import axios from "axios";
import { API_BASE_URL } from "@/api/axios";

// ¿Qué? Cliente HTTP dedicado a los endpoints de /api/v1/novedades (RQF-015).
const API_BASE = `${API_BASE_URL}/api/v1/novedades`;

export type AlcanceNovedad = "TODOS" | "RESIDENTES" | "RECICLADORES" | "ADMIN_CONJUNTO";

export interface Novedad {
  id_novedad: string;
  alcance: AlcanceNovedad;
  texto: string;
  url_adjunto: string | null;
  fecha_expiracion: string;
  created_at: string;
  editado: boolean;
  archivada: boolean;
}

export interface CrearNovedadPayload {
  alcance: AlcanceNovedad;
  texto: string;
  url_adjunto?: string | null;
  fecha_expiracion?: string | null;
}

export interface EditarNovedadPayload {
  texto: string;
  url_adjunto?: string | null;
  fecha_expiracion?: string | null;
}

// ¿Qué? Admin Sistema — HU-032.
export async function crearNovedad(datos: CrearNovedadPayload): Promise<Novedad> {
  const { data } = await axios.post(API_BASE, datos);
  return data;
}

// ¿Qué? Admin Sistema — historial completo, activas y archivadas (CA-035.4).
export async function listarTodasLasNovedades(): Promise<Novedad[]> {
  const { data } = await axios.get(`${API_BASE}/todas`);
  return data;
}

// ¿Qué? Admin Sistema — HU-034.
export async function editarNovedad(idNovedad: string, datos: EditarNovedadPayload): Promise<Novedad> {
  const { data } = await axios.patch(`${API_BASE}/${idNovedad}`, datos);
  return data;
}

// ¿Qué? Admin Sistema — HU-035. No existe "desarchivar" (CA-035.3).
export async function archivarNovedad(idNovedad: string) {
  const { data } = await axios.post(`${API_BASE}/${idNovedad}/archivar`, {});
  return data;
}

// ¿Qué? Residente/Reciclador/Admin Conjunto — HU-033.
export async function verFeedNovedades(): Promise<Novedad[]> {
  const { data } = await axios.get(`${API_BASE}/feed`);
  return data;
}
