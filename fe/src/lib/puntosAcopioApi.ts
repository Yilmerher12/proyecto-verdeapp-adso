import axios from "axios";
import { API_BASE_URL } from "@/api/axios";

// ¿Qué? Cliente HTTP dedicado a /api/v1/admin/puntos-acopio (RQF-011).
// ¿Para qué? Gestión (crear/editar/dar de baja) exclusiva del Admin Sistema —
//           distinto del cliente de solo lectura que usan Residentes y
//           Recicladores en DirectorioPage.tsx.
const API_BASE = `${API_BASE_URL}/api/v1/admin/puntos-acopio`;

export interface PuntoAcopioAdmin {
  id_punto_acopio: string;
  nombre: string;
  direccion: string;
  id_localidad: number;
  nombre_localidad: string;
  nombre_encargado: string | null;
  telefono_contacto: string | null;
  activo: boolean;
  // ¿Qué? Ruta de la foto del punto (/uploads/adjuntos/...); null si no tiene.
  url_foto: string | null;
  // ¿Qué? Datos del inventario de la UAESP (issue #664); null en los puntos creados a mano.
  //       Solo de lectura: el formulario de edición no los envía.
  organizacion: string | null;
  correo_contacto: string | null;
}

export type FiltroEstadoPunto = "todos" | "activos" | "baja";

// ¿Qué? Una página del listado y cuántos puntos hay en total con esos filtros.
export interface PaginaPuntosAcopio {
  items: PuntoAcopioAdmin[];
  total: number;
}

// ¿Qué? Conteos de TODOS los puntos, sin filtros (cabecera, chips de estado y localidades con puntos).
export interface ResumenPuntosAcopio {
  total: number;
  activos: number;
  de_baja: number;
  localidades: { id_localidad: number; nombre_localidad: string }[];
}

export type PuntoAcopioPayload = {
  nombre: string;
  direccion: string;
  id_localidad: number;
  nombre_encargado: string | null;
  telefono_contacto: string | null;
  // ¿Qué? Foto del punto, ya subida con subirAdjunto; null o vacío es "sin foto".
  url_foto?: string | null;
  // ¿Qué? Solo al editar: por qué se hace el cambio. El backend lo guarda
  //       como un comentario del punto, no como un campo del punto.
  motivo_cambio?: string | null;
};

export interface ComentarioPunto {
  id_comentario: string;
  texto: string;
  created_at: string;
  autor: string | null;
}

export interface FiltrosPuntosAcopio {
  q: string;
  estado: FiltroEstadoPunto;
  idLocalidad: number | "";
  limit: number;
  offset: number;
}

// ¿Qué? Pide una página al servidor: la búsqueda y los filtros se aplican allá (issue #664).
export async function listarPuntosAcopio(filtros: FiltrosPuntosAcopio): Promise<PaginaPuntosAcopio> {
  const { data } = await axios.get(API_BASE, {
    params: {
      q: filtros.q || undefined,
      estado: filtros.estado,
      id_localidad: filtros.idLocalidad || undefined,
      limit: filtros.limit,
      offset: filtros.offset,
    },
  });
  return data;
}

export async function obtenerResumenPuntosAcopio(): Promise<ResumenPuntosAcopio> {
  const { data } = await axios.get(`${API_BASE}/resumen`);
  return data;
}

export async function crearPuntoAcopio(payload: PuntoAcopioPayload): Promise<PuntoAcopioAdmin> {
  const { data } = await axios.post(API_BASE, payload);
  return data;
}

export async function editarPuntoAcopio(
  id: string,
  payload: PuntoAcopioPayload
): Promise<PuntoAcopioAdmin> {
  const { data } = await axios.put(`${API_BASE}/${id}`, payload);
  return data;
}

export async function darDeBajaPuntoAcopio(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/${id}`);
}

// ¿Qué? El contrapeso de darDeBajaPuntoAcopio — vuelve a marcarlo activo.
export async function reactivarPuntoAcopio(id: string): Promise<PuntoAcopioAdmin> {
  const { data } = await axios.post(`${API_BASE}/${id}/reactivar`, {});
  return data;
}

// ¿Qué? Distinto de darDeBajaPuntoAcopio — borra el registro por completo.
// ¿Para qué? Dar de baja es para un punto real que dejó de operar (se
//           conserva como historial). Esto es para limpiar un registro
//           que nunca debió existir (una prueba, un duplicado). El
//           backend solo lo permite si el punto ya está dado de baja.
export async function eliminarPuntoAcopioDefinitivo(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/${id}/definitivo`);
}

export async function listarComentarios(id: string): Promise<ComentarioPunto[]> {
  const { data } = await axios.get(`${API_BASE}/${id}/comentarios`);
  return data;
}

export async function agregarComentario(id: string, texto: string): Promise<ComentarioPunto> {
  const { data } = await axios.post(`${API_BASE}/${id}/comentarios`, { texto });
  return data;
}
