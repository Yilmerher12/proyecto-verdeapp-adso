import axios from "axios";
import { API_BASE_URL } from "@/api/axios";

// ¿Qué? Cliente HTTP para el endpoint genérico de subida de imágenes
//       adjuntas (comunicados/novedades) — POST /api/v1/uploads/adjunto.
const API_BASE = `${API_BASE_URL}/api/v1/uploads`;

function authHeaders(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

/**
 * ¿Qué? Sube un archivo de imagen y devuelve la URL pública ya servida
 *       por el backend (/uploads/adjuntos/...).
 * ¿Para qué? Reemplaza el link externo que antes había que escribir a
 *           mano en comunicados/novedades — la URL que devuelve esta
 *           función se guarda tal cual en el campo url_adjunto.
 */
export async function subirAdjunto(archivo: File, token: string): Promise<string> {
  const formData = new FormData();
  formData.append("archivo", archivo);
  const response = await axios.post<{ url: string }>(`${API_BASE}/adjunto`, formData, authHeaders(token));
  return response.data.url;
}
