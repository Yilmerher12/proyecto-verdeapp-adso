import { REGEX_VIDEO_YOUTUBE } from "@/lib/validacion";

// ¿Qué? Extrae el ID del video de cualquier formato de URL de YouTube
//       (watch?v=, youtu.be/, embed/), con la misma expresión anclada que
//       validan los formularios (REGEX_VIDEO_YOUTUBE).
// ¿Para qué? El Admin pega el link tal cual lo copia del navegador — no
//           debería tener que saber cuál es el formato de embed. Antes la
//           expresión no estaba anclada al inicio: "https://sitio-malo.com/?x=youtu.be/AAAAAAAAAAA"
//           también daba un ID, y el enlace "Ver en YouTube" usaba la URL cruda.
// ¿Impacto? Si la URL no es de YouTube, devuelve null y quien lo usa no pinta
//           nada (issue #400, CN-065). Lo comparten el reproductor (YoutubeEmbed)
//           y "Aprende a reciclar" para la portada del video destacado.
export function extraerIdDeYoutube(url: string): string | null {
  return url.match(REGEX_VIDEO_YOUTUBE)?.[1] ?? null;
}
