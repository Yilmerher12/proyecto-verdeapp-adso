import axios from "axios";
import { API_BASE_URL } from "@/api/axios";

// ¿Qué? Cliente HTTP para el endpoint genérico de subida de imágenes
//       adjuntas (comunicados/novedades) — POST /api/v1/uploads/adjunto.
const API_BASE = `${API_BASE_URL}/api/v1/uploads`;

function authHeaders(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

/**
 * ¿Qué? Sube un archivo (imagen, o también PDF si se pide) y devuelve la
 *       URL pública ya servida por el backend (/uploads/adjuntos/...).
 * ¿Para qué? Reemplaza el link externo que antes había que escribir a
 *           mano en comunicados/novedades/contenido educativo — la URL
 *           que devuelve esta función se guarda tal cual en el campo
 *           url_adjunto/url_guia. `permitirPdf` es false por defecto:
 *           solo la guía de apoyo del contenido educativo lo necesita en
 *           true — comunicados y novedades siguen aceptando solo imagen.
 */
export async function subirAdjunto(
  archivo: File,
  token: string,
  opciones?: { permitirPdf?: boolean }
): Promise<string> {
  const formData = new FormData();
  formData.append("archivo", archivo);
  const url = opciones?.permitirPdf ? `${API_BASE}/adjunto?permitir_pdf=true` : `${API_BASE}/adjunto`;
  const response = await axios.post<{ url: string }>(url, formData, authHeaders(token));
  return response.data.url;
}
