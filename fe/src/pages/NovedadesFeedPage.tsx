import { ANCHO_PAGINA } from "@/config/anchoPagina";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Newspaper, Paperclip } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { enlaceAdjuntoSeguro } from "@/lib/enlaceSeguro";
import { verFeedNovedades, type Novedad } from "@/lib/novedadesApi";
import { formatearFechaCreacion } from "@/lib/dateFormat";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { YoutubeEmbed } from "@/components/ui/YoutubeEmbed";
import { MisNovedadesEnviadas, NovedadEnviadaForm } from "@/components/NovedadesEnviadas";
import { Pestanas } from "@/components/ui/Pestanas";
import { TextoRecortable } from "@/components/ui/TextoRecortable";

// ¿Qué? Una novedad no tiene título, solo texto — el reproductor de video
//       necesita uno (accesibilidad), así que se usa un recorte corto del texto.
function resumirTitulo(texto: string): string {
  return texto.length > 60 ? `${texto.slice(0, 60)}…` : texto;
}

/**
 * ¿Qué? Feed de novedades activas de la plataforma (RQF-015, HU-033) —
 *       compartida entre Residente, Reciclador y Admin de Conjunto, porque
 *       los tres ven lo mismo (el backend ya filtra según su rol).
 * ¿Para qué? A diferencia del feed de Comunicados (por conjunto), aquí no
 *           hay ningún dato de conjunto que mostrar — son avisos de toda
 *           la plataforma.
 */
export function NovedadesFeedPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [pestana, setPestana] = useState<"recibidas" | "escribir" | "mias">("recibidas");
  const [versionEnvios, setVersionEnvios] = useState(0);

  useEffect(() => {
    if (!user) return;
    verFeedNovedades()
      .then(setNovedades)
      // ¿Qué? Antes solo se hacía console.error y la UI caía en el mismo
      //       bloque de "no hay novedades" que un feed vacío de verdad.
      // ¿Impacto? Un token vencido o el servidor caído se veían exactamente
      //           igual que "no hay nada nuevo" — ahora hay un aviso propio.
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, [user]);

  return (
    // ¿Qué? Ancho de lectura (48 rem), el mismo de Comunicados cuando hay pocos avisos.
    // ¿Para qué? La página es una lista corta de textos y un formulario de un solo campo: a 80 rem
    //           quedaba muy alargada y no se parecía a Comunicados, que está justo al lado en el menú.
    // ¿Impacto? Soporte técnico y Comunicados se ven del mismo tamaño en las 3 pestañas.
    <div className={`${ANCHO_PAGINA.lectura} space-y-6 pt-6`}>
      <div className="bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("novedades.feed.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("novedades.feed.subtitle")}
        </p>
      </div>

      {/* ¿Qué? Pestañas compartidas, en dos columnas cuando el espacio es angosto: "Avisos del sistema" y
                "Escribir novedad" arriba y "Historial de novedades" abajo, a todo el ancho.
          ¿Para qué? Antes se envolvían y la tercera quedaba sola a la izquierda. Tres columnas partirían
                    "Historial de novedades" en 3 líneas. */}
      <Pestanas
        dosColumnas
        pestanas={[
          { id: "recibidas", etiqueta: t("novedadesEnviadas.tabReceived") },
          { id: "escribir", etiqueta: t("novedadesEnviadas.tabWrite") },
          { id: "mias", etiqueta: t("novedadesEnviadas.tabMine") },
        ]}
        activa={pestana}
        onCambiar={setPestana}
        ariaLabel={t("novedades.feed.title")}
      />

      {pestana === "escribir" && (
        <NovedadEnviadaForm onEnviada={() => setVersionEnvios((v) => v + 1)} />
      )}

      {pestana === "mias" && <MisNovedadesEnviadas version={versionEnvios} />}

      {pestana === "recibidas" && (
        <>
          {cargando && <LoadingState message={t("common.loading")} />}

          {!cargando && error && <Alert type="error" message={t("common.loadError")} />}

          {!cargando && !error && novedades.length === 0 && (
            <EmptyState icon={Newspaper} message={t("novedades.feed.empty")} />
          )}

          <div className="space-y-4">
            {novedades.map((item) => (
              <article
                key={item.id_novedad}
                className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-night-line dark:bg-night-card"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-400/15 dark:text-purple-300">
                    {t(`novedades.alcances.${item.alcance}`)}
                  </span>
                  {item.editado && (
                    <span className="text-xs italic text-gray-500 dark:text-gray-400">
                      {t("comunicados.editedBadge")}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                    {formatearFechaCreacion(item.created_at)}
                  </span>
                </div>

                <TextoRecortable
                  texto={item.texto}
                  className="mt-3 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line"
                />

                {item.url_video && (
                  <YoutubeEmbed url={item.url_video} titulo={resumirTitulo(item.texto)} />
                )}

                {enlaceAdjuntoSeguro(item.url_adjunto) && (
                  <a
                    // ¿Qué? Igual que en ComunicadosFeedPage.tsx: enlaceAdjuntoSeguro
                    //       completa la ruta relativa de un archivo subido y
                    //       devuelve null si el enlace no es seguro (issue #400).
                    href={enlaceAdjuntoSeguro(item.url_adjunto) ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-text mt-3 inline-flex items-center gap-1.5 text-xs"
                  >
                    <Paperclip className="icon-sm" />
                    {t("comunicados.viewAttachment")}
                  </a>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
