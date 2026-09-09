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
}

export type PuntoAcopioPayload = {
  nombre: string;
  direccion: string;
  id_localidad: number;
  nombre_encargado: string | null;
  telefono_contacto: string | null;
};

export async function listarPuntosAcopio(): Promise<PuntoAcopioAdmin[]> {
  const { data } = await axios.get(API_BASE);
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
