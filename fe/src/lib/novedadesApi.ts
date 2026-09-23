import axios from "axios";
import { API_BASE_URL } from "@/api/axios";

// ¿Qué? Cliente HTTP dedicado a los endpoints de /api/v1/novedades (RQF-015).
const API_BASE = `${API_BASE_URL}/api/v1/novedades`;

export type AlcanceNovedad = "TODOS" | "RESIDENTES" | "RECICLADORES" | "ADMIN_CONJUNTO";

export interface ConjuntoDestino {
  id_conjunto_residencial: string;
  nombre_conjunto: string;
}

export interface Novedad {
  id_novedad: string;
  alcance: AlcanceNovedad;
  texto: string;
  url_adjunto: string | null;
  url_video: string | null;
  // ¿Qué? Vacía = la novedad llega a todos los conjuntos del alcance; con
  //       uno o varios, solo a esos (ver models/novedad.py en el backend).
  conjuntos: ConjuntoDestino[];
  fecha_expiracion: string;
  created_at: string;
  editado: boolean;
  archivada: boolean;
}

export interface CrearNovedadPayload {
  alcance: AlcanceNovedad;
  texto: string;
  url_adjunto?: string | null;
  url_video?: string | null;
  // ¿Qué? Ids de los conjuntos elegidos; vacía o sin mandar = todos.
  conjuntos?: string[];
  fecha_expiracion?: string | null;
}

// ¿Qué? A propósito sin alcance ni conjuntos — a quién llega
//       una novedad se decide al publicarla (CA-034.2), no se edita después.
export interface EditarNovedadPayload {
  texto: string;
  url_adjunto?: string | null;
  url_video?: string | null;
  fecha_expiracion?: string | null;
}

// ¿Qué? Admin Sistema — HU-032.
export async function crearNovedad(datos: CrearNovedadPayload): Promise<Novedad> {
  const { data } = await axios.post(API_BASE, datos);
  return data;
}

export interface PaginaDeNovedades {
  items: Novedad[];
  total: number;
}

// ¿Qué? Admin Sistema — historial completo, activas y archivadas (CA-035.4).
// ¿Para qué? Issue #227 — antes traía todo el historial de una sola vez;
//           ahora se pide de a páginas (limit/offset), igual que ya hacen
//           los listados de admin.py.
export interface FiltrosNovedades {
  alcance?: AlcanceNovedad;
  incluirArchivadas?: boolean;
  search?: string;
}

// ¿Qué? Los filtros viajan al backend (no se aplican en el navegador):
//       con la lista paginada, filtrar aquí solo revisaría las 8 filas de
//       la página visible.
export async function listarTodasLasNovedades(
  limit: number,
  offset: number,
  filtros: FiltrosNovedades = {}
): Promise<PaginaDeNovedades> {
  const { data } = await axios.get(`${API_BASE}/todas`, {
    params: {
      limit,
      offset,
      alcance: filtros.alcance || undefined,
      incluir_archivadas: filtros.incluirArchivadas ?? true,
      search: filtros.search?.trim() || undefined,
    },
  });
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
