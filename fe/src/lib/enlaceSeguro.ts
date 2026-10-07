/**
 * Archivo: lib/enlaceSeguro.ts
 * ¿Qué? Arma la URL completa de un adjunto solo si es un archivo subido a
 *       VerdeApp (/uploads/...) o un enlace https://. Cualquier otra cosa
 *       devuelve null y la pantalla no muestra el enlace ni la imagen.
 * ¿Para qué? Issue #369 (CN-041): `${API_BASE_URL}${url}` con un url como
 *           "@sitio-malo.com/login" queda "http://localhost:8000@sitio-malo.com/login",
 *           y el navegador abre sitio-malo.com. Mismas reglas que
 *           validar_enlace_adjunto del backend (be/app/utils/enlaces.py).
 * ¿Impacto? Segunda barrera: protege también los datos que se guardaron
 *           antes de que el backend validara estos campos.
 */
import { API_BASE_URL } from "@/api/axios";

// ¿Qué? "%2e" es un "." y "%2f" es una "/" escritos en forma codificada.
// ¿Para qué? Issue #400 (CN-052): "/uploads/%2e%2e/api/v1/..." no contiene
//           ".." escrito, pero el navegador lo decodifica y lo resuelve a una
//           ruta distinta del mismo sitio. Solo se revisa en la rama /uploads/:
//           en un enlace https:// externo "%2f" es normal y rechazarlo
//           bloquearía enlaces válidos.
// ¿Impacto? Mismas reglas que validar_enlace_adjunto del backend.
const RUTA_CODIFICADA = /%2[ef]/i;

export function enlaceAdjuntoSeguro(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/uploads/") && !url.includes("..") && !RUTA_CODIFICADA.test(url)) {
    return `${API_BASE_URL}${url}`;
  }
  if (url.startsWith("https://")) return url;
  return null;
}
