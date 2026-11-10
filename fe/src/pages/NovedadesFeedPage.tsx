import { ANCHO_PAGINA } from "@/config/anchoPagina";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Newspaper, Paperclip } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RoleId } from "@/types/auth";
import { usePaginacion } from "@/hooks/usePaginacion";
import { enlaceAdjuntoSeguro } from "@/lib/enlaceSeguro";
import { verFeedNovedades, type Novedad } from "@/lib/novedadesApi";
import { formatearFechaCreacion } from "@/lib/dateFormat";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Paginacion } from "@/components/ui/Paginacion";
import { YoutubeEmbed } from "@/components/ui/YoutubeEmbed";
import { MisNovedadesEnviadas, NovedadEnviadaForm } from "@/components/NovedadesEnviadas";
import { Pestanas } from "@/components/ui/Pestanas";
import { TextoRecortable } from "@/components/ui/TextoRecortable";

// ¿Qué? Novedades por página en "Avisos del sistema", igual que "Historial de novedades" (issue #399).
const TAMANO_PAGINA = 10;

// ¿Qué? Una novedad no tiene título, solo texto — el reproductor de video
//       necesita uno (accesibilidad), así que se usa un recorte corto del texto.
function resumirTitulo(texto: string): string {
  return texto.length > 60 ? `${texto.slice(0, 60)}…` : texto;
}

/**
 * ¿Qué? Soporte técnico (RQF-015, HU-033): las novedades activas de la plataforma, una consulta al equipo de VerdeApp y
 *       el historial de lo que ya enviaste. Compartida entre Residente, Reciclador y Admin de Conjunto, porque
 *       los tres ven lo mismo (el backend ya filtra según su rol).
 * ¿Para qué? Issue #632: las tres pestañas y su contenido viven en UNA tarjeta (antes las pestañas flotaban sobre el
 *           fondo y cada aviso era una tarjeta suelta con la paginación en otra caja). Las novedades se piden al servidor
 *           de 10 en 10.
 * ¿Impacto? A diferencia del feed de Comunicados (por conjunto), aquí no hay ningún dato de conjunto que mostrar —
 *           son avisos de toda la plataforma. La barra de paginación se ve siempre. El ancho depende del rol (ver abajo).
 */
export function NovedadesFeedPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  // ¿Qué? Ancho de la página según el rol: el Admin de Conjunto usa el ancho normal (80 rem); el Residente y el Reciclador, el de
  //       lectura (48 rem).
  // ¿Para qué? Issue #632 — cada rol debe ver Soporte técnico del mismo ancho que la pantalla que tiene justo arriba en su menú:
  //           al Residente y al Reciclador les queda junto a Comunicados (48 rem); al Admin de Conjunto, junto a su Comunicados
  //           de administración (80 rem). Con 48 rem para todos, al Admin le sobraba espacio al lado.
  // ¿Impacto? Ver docs/gestion-proyecto/decision-ancho-de-paginas.md (sección 6).
  const anchoPagina = user?.role_id === RoleId.ADMIN_CONJUNTO ? ANCHO_PAGINA.normal : ANCHO_PAGINA.lectura;
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [pestana, setPestana] = useState<"recibidas" | "escribir" | "mias">("recibidas");
  const [versionEnvios, setVersionEnvios] = useState(0);
  const paginacion = usePaginacion(TAMANO_PAGINA, total);
  const { offset } = paginacion;

  // ¿Qué? Al cambiar de página no se vuelve a mostrar "cargando": se queda la lista anterior hasta que llega la nueva.
  useEffect(() => {
    if (!user) return;
    verFeedNovedades(TAMANO_PAGINA, offset)
      .then((pagina) => {
        setNovedades(pagina.items);
        setTotal(pagina.total);
        setError(false);
      })
      // ¿Qué? Antes solo se hacía console.error y la UI caía en el mismo
      //       bloque de "no hay novedades" que un feed vacío de verdad.
      // ¿Impacto? Un token vencido o el servidor caído se veían exactamente
      //           igual que "no hay nada nuevo" — ahora hay un aviso propio.
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, [user, offset]);

  return (
    <div className={`${anchoPagina} space-y-6 pt-6`}>
      <div className="bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("novedades.feed.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("novedades.feed.subtitle")}
        </p>
      </div>

      {/* ¿Qué? Una sola tarjeta: las pestañas subrayadas arriba y, debajo, lo que muestra cada una (filas separadas por
                una línea, o el formulario) con la paginación como pie.
          ¿Para qué? Issue #632 — antes las pestañas eran píldoras sueltas y cada aviso una tarjeta aparte. */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-night-line dark:bg-night-card">
        <Pestanas
          variante="subrayadas"
          className="mx-5"
          idBase="soporte-tab"
          idPanel="soporte-panel"
          pestanas={[
            { id: "recibidas", etiqueta: t("novedadesEnviadas.tabReceived") },
            { id: "escribir", etiqueta: t("novedadesEnviadas.tabWrite") },
            { id: "mias", etiqueta: t("novedadesEnviadas.tabMine") },
          ]}
          activa={pestana}
          onCambiar={setPestana}
          ariaLabel={t("novedades.feed.title")}
        />

        <div id="soporte-panel" role="tabpanel" aria-labelledby={`soporte-tab-${pestana}`}>
          {pestana === "escribir" && (
            <NovedadEnviadaForm onEnviada={() => setVersionEnvios((v) => v + 1)} />
          )}

          {pestana === "mias" && <MisNovedadesEnviadas version={versionEnvios} />}

          {pestana === "recibidas" && (
            <>
              {cargando && (
                <div className="p-5">
                  <LoadingState message={t("common.loading")} />
                </div>
              )}

              {!cargando && error && (
                <div className="p-5">
                  <Alert type="error" message={t("common.loadError")} />
                </div>
              )}

              {!cargando && !error && novedades.length === 0 && (
                <div className="p-5">
                  <EmptyState icon={Newspaper} message={t("novedades.feed.empty")} />
                </div>
              )}

              {novedades.length > 0 && (
                <ul className="divide-y divide-gray-200 dark:divide-night-line">
                  {novedades.map((item) => (
                    <li key={item.id_novedad} className="px-5 py-4">
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
                    </li>
                  ))}
                </ul>
              )}

              {total > 0 && (
                <Paginacion
                  desde={paginacion.desde}
                  hasta={paginacion.hasta}
                  total={total}
                  pagina={paginacion.pagina}
                  totalPaginas={paginacion.totalPaginas}
                  puedeAnterior={paginacion.puedeAnterior}
                  puedeSiguiente={paginacion.puedeSiguiente}
                  onAnterior={paginacion.irAAnterior}
                  onSiguiente={paginacion.irASiguiente}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
