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

function authHeaders(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

// ¿Qué? Admin Sistema — HU-032.
export async function crearNovedad(datos: CrearNovedadPayload, token: string): Promise<Novedad> {
  const { data } = await axios.post(API_BASE, datos, authHeaders(token));
  return data;
}

// ¿Qué? Admin Sistema — historial completo, activas y archivadas (CA-035.4).
export async function listarTodasLasNovedades(token: string): Promise<Novedad[]> {
  const { data } = await axios.get(`${API_BASE}/todas`, authHeaders(token));
  return data;
}

// ¿Qué? Admin Sistema — HU-034.
export async function editarNovedad(idNovedad: string, datos: EditarNovedadPayload, token: string): Promise<Novedad> {
  const { data } = await axios.patch(`${API_BASE}/${idNovedad}`, datos, authHeaders(token));
  return data;
}

// ¿Qué? Admin Sistema — HU-035. No existe "desarchivar" (CA-035.3).
export async function archivarNovedad(idNovedad: string, token: string) {
  const { data } = await axios.post(`${API_BASE}/${idNovedad}/archivar`, {}, authHeaders(token));
  return data;
}

// ¿Qué? Residente/Reciclador/Admin Conjunto — HU-033.
export async function verFeedNovedades(token: string): Promise<Novedad[]> {
  const { data } = await axios.get(`${API_BASE}/feed`, authHeaders(token));
  return data;
}
