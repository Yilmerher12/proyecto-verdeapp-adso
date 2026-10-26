/**
 * Archivo: components/educativo/MuroLeccion.tsx
 * ¿Qué? Una lección (un módulo del catálogo educativo) dibujada como un "muro":
 *       arriba el video (o la portada, o el dibujo de la categoría) y "De qué trata",
 *       y debajo una tarjeta por cada párrafo del texto, con su imagen si la tiene.
 * ¿Para qué? La usan dos lugares con exactamente el mismo dibujo: la página del
 *           Residente (CategoriaEducativaPage) y la vista previa del formulario
 *           del Administrador del Sistema, para que lo que ve al escribir sea lo
 *           que verá el residente.
 * ¿Impacto? El texto se parte con lib/muroLeccion.ts. Solo se muestran imágenes
 *           subidas a VerdeApp (imagenPropiaSegura): cualquier otra no se pinta. Una
 *           <img> suelta dentro de un párrafo tampoco (COMPONENTES_MARKDOWN la descarta).
 */
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import { YoutubeEmbed } from "@/components/ui/YoutubeEmbed";
import { IlustracionCategoria } from "@/components/educativo/IlustracionCategoria";
import { ICONOS_CATEGORIAS, ICONO_CATEGORIA_DEFAULT } from "@/config/categoriasEducativas";
import { COMPONENTES_MARKDOWN } from "@/config/contenidoEducativoMarkdown";
import { enlaceAdjuntoSeguro, imagenPropiaSegura } from "@/lib/enlaceSeguro";
import { partirEnTarjetas } from "@/lib/muroLeccion";
import type { ContenidoEducativo } from "@/lib/contenidoEducativoApi";

type DatosLeccion = Pick<
  ContenidoEducativo,
  "modulo_categoria" | "titulo_tema" | "cuerpo_texto" | "url_video" | "url_guia" | "url_imagen"
>;

export function MuroLeccion({
  modulo,
  mostrarTitulo = false,
  compacto = false,
}: {
  modulo: DatosLeccion;
  mostrarTitulo?: boolean;
  /** ¿Qué? Una sola columna sin importar el ancho de la ventana: la vista previa del formulario es angosta. */
  compacto?: boolean;
}) {
  const { t } = useTranslation();
  const { introduccion, tarjetas, cierre } = partirEnTarjetas(modulo.cuerpo_texto);
  const Icono = ICONOS_CATEGORIAS[modulo.modulo_categoria] ?? ICONO_CATEGORIA_DEFAULT;
  const portada = imagenPropiaSegura(modulo.url_imagen);
  const guia = enlaceAdjuntoSeguro(modulo.url_guia);

  return (
    <section className="space-y-6" aria-label={modulo.titulo_tema}>
      {mostrarTitulo && (
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{modulo.titulo_tema}</h2>
      )}

      <div className={`flex flex-col gap-6 ${compacto ? "" : "lg:flex-row lg:items-stretch"}`}>
        <div className={`min-w-0 ${compacto ? "" : "lg:flex-[1.4]"}`}>
          {modulo.url_video ? (
            <YoutubeEmbed url={modulo.url_video} titulo={modulo.titulo_tema} />
          ) : (
            <div className="aspect-video overflow-hidden rounded-3xl border border-gray-100 bg-accent-50 dark:border-night-line dark:bg-accent-300/10">
              {portada ? (
                <img src={portada} alt="" className="h-full w-full object-cover" />
              ) : (
                <IlustracionCategoria categoria={modulo.modulo_categoria} />
              )}
            </div>
          )}
        </div>

        {(introduccion || guia) && (
          <div className={`flex min-w-0 flex-col justify-center gap-4 rounded-3xl border border-gray-100 bg-white p-6 dark:border-night-line dark:bg-night-card ${compacto ? "" : "lg:flex-1"}`}>
            {introduccion && (
              <>
                <span className="text-xs font-semibold uppercase tracking-wide text-accent-700 dark:text-accent-400">
                  {t("leccionMuro.about")}
                </span>
                <ReactMarkdown components={COMPONENTES_MARKDOWN}>{introduccion}</ReactMarkdown>
              </>
            )}
            {guia && (
              <a
                href={guia}
                target="_blank"
                rel="noopener noreferrer"
                className="touch-target-h inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl bg-accent-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-600 dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200"
              >
                {t("leccionMuro.openGuide")}
                <ExternalLink className="icon-sm" aria-hidden="true" />
              </a>
            )}
          </div>
        )}
      </div>

      {tarjetas.length > 0 && (
        <div className={`grid grid-cols-1 gap-6 ${compacto ? "" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {tarjetas.map((tarjeta, i) => {
            const imagen = imagenPropiaSegura(tarjeta.imagen);
            return (
              <article
                key={`${i}-${tarjeta.titulo ?? "sin-titulo"}`}
                className="flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white dark:border-night-line dark:bg-night-card"
              >
                {imagen ? (
                  <img src={imagen} alt="" className="h-48 w-full object-cover" />
                ) : (
                  <div className="flex h-12 items-center px-6 pt-6" aria-hidden="true">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-300/10 dark:text-accent-400">
                      <Icono className="icon-md" />
                    </span>
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2 p-6">
                  {tarjeta.titulo && (
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{tarjeta.titulo}</h3>
                  )}
                  <ReactMarkdown components={COMPONENTES_MARKDOWN}>{tarjeta.texto}</ReactMarkdown>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {cierre && (
        <div className="rounded-3xl border border-gray-100 bg-accent-50 p-6 dark:border-night-line dark:bg-accent-300/10">
          <ReactMarkdown components={COMPONENTES_MARKDOWN}>{cierre}</ReactMarkdown>
        </div>
      )}
    </section>
  );
}
