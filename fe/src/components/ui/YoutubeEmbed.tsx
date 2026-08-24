import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";

interface YoutubeEmbedProps {
  url: string;
  titulo: string;
}

// ¿Qué? Extrae el ID del video de cualquier formato de URL de YouTube
//       (watch?v=, youtu.be/, embed/).
// ¿Para qué? El Admin pega el link tal cual lo copia del navegador — no
//           debería tener que saber cuál es el formato de embed.
// ¿Impacto? Si la URL no es de YouTube, devuelve null y el frontend cae
//           en un link normal en vez de romper la página.
function extraerIdDeYoutube(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return match ? match[1] : null;
}

/**
 * ¿Qué? Reproductor de YouTube con "facade": primero se ve solo la miniatura
 *       y un botón de play — el <iframe> pesado de YouTube (que trae su
 *       propio JavaScript) solo se carga cuando el usuario hace clic.
 * ¿Para qué? Cargar la miniatura es casi instantáneo; cargar el reproductor
 *           completo de YouTube de entrada es lo que hacía sentir el video
 *           lento antes. Además, youtube-nocookie.com es la versión de
 *           YouTube con privacidad mejorada (no usa cookies de seguimiento
 *           hasta que el usuario decide reproducir).
 * ¿Impacto? El link "Ver en YouTube" solo se muestra ANTES de reproducir —
 *           una vez que el video está cargado, el propio reproductor de
 *           YouTube ya trae su ícono para abrirlo en YouTube directo, así
 *           que mostrar los dos sería redundante.
 */
export function YoutubeEmbed({ url, titulo }: YoutubeEmbedProps) {
  const [reproduciendo, setReproduciendo] = useState(false);
  const id = extraerIdDeYoutube(url);

  if (!id) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-accent-700 hover:underline dark:text-accent-500"
      >
        <ExternalLink className="h-4 w-4 shrink-0" />
        Ver video
      </a>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-900">
        {reproduciendo ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
            title={titulo}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setReproduciendo(true)}
            className="group relative h-full w-full"
            aria-label={`Reproducir video: ${titulo}`}
          >
            <img
              src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
              alt=""
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-lg transition-transform group-hover:scale-110">
                <Play className="h-6 w-6 fill-current" />
              </span>
            </span>
          </button>
        )}
      </div>
      {!reproduciendo && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-fit items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-accent-600 dark:text-gray-400 dark:hover:text-accent-500"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          Ver en YouTube
        </a>
      )}
    </div>
  );
}
