import axios from "axios";
import { API_BASE_URL } from "@/api/axios";

// ¿Qué? Cliente HTTP para el endpoint genérico de subida de imágenes
//       adjuntas (comunicados/novedades) — POST /api/v1/uploads/adjunto.
const API_BASE = `${API_BASE_URL}/api/v1/uploads`;

function authHeaders(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

/**
 * ¿Qué? Sube un archivo (imagen, o también PDF/Word/Excel si se pide) y
 *       devuelve la URL pública ya servida por el backend
 *       (/uploads/adjuntos/...).
 * ¿Para qué? Reemplaza el link externo que antes había que escribir a
 *           mano en comunicados/novedades/contenido educativo — la URL
 *           que devuelve esta función se guarda tal cual en el campo
 *           url_adjunto/url_guia. `permitirDocumentos` es false por
 *           defecto: solo la guía de apoyo del contenido educativo y los
 *           adjuntos de comunicados lo necesitan en true — novedades
 *           sigue aceptando solo imagen.
 */
export async function subirAdjunto(
  archivo: File,
  token: string,
  opciones?: { permitirDocumentos?: boolean }
): Promise<string> {
  const formData = new FormData();
  formData.append("archivo", archivo);
  const url = opciones?.permitirDocumentos
    ? `${API_BASE}/adjunto?permitir_documentos=true`
    : `${API_BASE}/adjunto`;
  const response = await axios.post<{ url: string }>(url, formData, authHeaders(token));
  return response.data.url;
}
