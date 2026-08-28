import axios from "axios";
import { API_BASE_URL } from "@/api/axios";

// ¿Qué? Cliente HTTP dedicado a los endpoints de /api/v1/comunicados (RQF-014).
const API_BASE = `${API_BASE_URL}/api/v1/comunicados`;

export type TipoComunicado = "INFORMATIVO" | "URGENTE" | "CONVOCATORIA" | "MANTENIMIENTO" | "RECICLAJE";
export type DestinatariosComunicado = "RESIDENTES" | "RECICLADORES" | "AMBOS";

export interface Comunicado {
  id_comunicado: string;
  id_conjunto_residencial: string;
  nombre_conjunto: string;
  destinatarios: DestinatariosComunicado;
  tipo: TipoComunicado;
  texto: string;
  url_adjunto: string | null;
  fecha_evento: string | null;
  fecha_expiracion: string;
  created_at: string;
  editado: boolean;
}

export interface CrearComunicadoPayload {
  id_conjunto_residencial: string;
  destinatarios: DestinatariosComunicado;
  tipo: TipoComunicado;
  texto: string;
  url_adjunto?: string | null;
  fecha_evento?: string | null;
  fecha_expiracion?: string | null;
}

export interface EditarComunicadoPayload {
  tipo: TipoComunicado;
  texto: string;
  url_adjunto?: string | null;
  fecha_evento?: string | null;
  fecha_expiracion?: string | null;
}

function authHeaders(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

// ¿Qué? Admin Conjunto — HU-027.
export async function crearComunicado(datos: CrearComunicadoPayload, token: string): Promise<Comunicado> {
  const { data } = await axios.post(API_BASE, datos, authHeaders(token));
  return data;
}

// ¿Qué? Admin Conjunto — todo lo que ha publicado, en todos sus conjuntos.
export async function listarMisComunicados(token: string): Promise<Comunicado[]> {
  const { data } = await axios.get(`${API_BASE}/mis-comunicados`, authHeaders(token));
  return data;
}

// ¿Qué? Admin Conjunto — HU-029.
export async function editarComunicado(
  idComunicado: string,
  datos: EditarComunicadoPayload,
  token: string
): Promise<Comunicado> {
  const { data } = await axios.patch(`${API_BASE}/${idComunicado}`, datos, authHeaders(token));
  return data;
}

// ¿Qué? Admin Conjunto — HU-030.
export async function eliminarComunicado(idComunicado: string, token: string) {
  const { data } = await axios.delete(`${API_BASE}/${idComunicado}`, authHeaders(token));
  return data;
}

// ¿Qué? Residente/Reciclador — HU-028.
export async function verFeedComunicados(token: string): Promise<Comunicado[]> {
  const { data } = await axios.get(`${API_BASE}/feed`, authHeaders(token));
  return data;
}
