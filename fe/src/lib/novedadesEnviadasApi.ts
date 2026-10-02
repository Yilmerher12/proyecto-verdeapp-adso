import axios from "axios";
import { API_BASE_URL } from "@/api/axios";

const API_BASE = `${API_BASE_URL}/api/v1/novedades-enviadas`;

export interface NovedadEnviada {
  id: string;
  texto: string;
  url_imagen: string | null;
  estado: "NUEVA" | "VISTA";
  nombre_conjunto: string | null;
  created_at: string;
}

// ¿Qué? Novedades que Residente, Reciclador o Admin de Conjunto le ENVÍAN al
//       Admin Sistema — no confundir con novedadesApi.ts (RQF-015), que son
//       los avisos que el Admin Sistema publica hacia todos.
export async function enviarNovedad(payload: {
  texto: string;
  url_imagen?: string | null;
  id_conjunto_residencial?: string | null;
}) {
  const { data } = await axios.post(API_BASE, payload);
  return data;
}

export async function misNovedadesEnviadas(): Promise<NovedadEnviada[]> {
  const { data } = await axios.get(`${API_BASE}/mias`);
  return data;
}
