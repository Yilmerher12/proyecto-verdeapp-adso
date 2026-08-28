import axios from "axios";
import { API_BASE_URL } from "@/api/axios";

const API_BASE = `${API_BASE_URL}/api/v1/conjunto-panel`;

export interface ConjuntoAdministrado {
  id_conjunto_residencial: string;
  nombre_conjunto: string;
  nit: string | null;
  direccion: string;
  nombre_localidad: string;
  tiene_solicitud_pendiente: boolean;
}

export async function obtenerMisConjuntos(token: string): Promise<ConjuntoAdministrado[]> {
  const { data } = await axios.get(`${API_BASE}/mis-conjuntos`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function editarMiConjunto(
  idConjunto: string,
  datos: { nombre_conjunto: string; nit: string | null; direccion: string },
  token: string
) {
  const { data } = await axios.patch(
    `${API_BASE}/mis-conjuntos/${idConjunto}`,
    datos,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

// ¿Qué? RQF-016 (HU-022): pide dejar de administrar un conjunto que hoy administro.
// ¿Para qué? El motivo es opcional — queda pendiente hasta que el Admin Sistema la resuelva.
export async function solicitarDesvinculacion(
  idConjunto: string,
  motivo: string | undefined,
  token: string
) {
  const { data } = await axios.post(
    `${API_BASE}/mis-conjuntos/${idConjunto}/solicitar-desvinculacion`,
    { motivo: motivo || null },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}