/**
 * ¿Qué? Una lección (un módulo del catálogo educativo) dibujada como UNA sola tarjeta, de arriba abajo:
 *       título, video (o portada), la introducción, las secciones con su subtítulo y su lista, y al pie el
 *       botón de la guía oficial y la fuente como una línea de texto pequeña.
 * ¿Para qué? Antes era un "muro" de tarjetas sueltas: el título flotaba sobre el fondo, las tarjetas se
 *           estiraban a la misma altura y dejaban huecos, el mismo ícono se repetía en todas y la fuente
 *           ocupaba una tarjeta entera (issue #705, docs/gestion-proyecto/rediseno-aprende-a-reciclar.md).
 *           La usan dos lugares: la página de la lección del Residente (LeccionEducativaPage) y la vista
 *           previa del formulario del Administrador del Sistema.
 * ¿Impacto? El texto se parte con lib/muroLeccion.ts: la introducción es el primer párrafo sin título, cada
 *           párrafo con título es una sección y el último párrafo sin título es el cierre. Una sección
 *           titulada "Fuente" que va al final es la fuente de la lección y no una sección más. Solo se muestran imágenes subidas a VerdeApp (imagenPropiaSegura):
 *           cualquier otra no se pinta. Una <img> suelta dentro de un párrafo tampoco (COMPONENTES_MARKDOWN
 *           la descarta).
 */
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import { YoutubeEmbed } from "@/components/ui/YoutubeEmbed";
import { COMPONENTES_MARKDOWN } from "@/config/contenidoEducativoMarkdown";
import { enlaceAdjuntoSeguro, imagenPropiaSegura } from "@/lib/enlaceSeguro";
import { partesDeLeccion } from "@/lib/muroLeccion";
import type { ContenidoEducativo } from "@/lib/contenidoEducativoApi";

export type DatosLeccion = Pick<
  ContenidoEducativo,
  "modulo_categoria" | "titulo_tema" | "cuerpo_texto" | "url_video" | "url_guia" | "url_imagen"
>;

export function MuroLeccion({
  modulo,
  nivelTitulo = 2,
  encabezado,
}: {
  modulo: DatosLeccion;
  /** ¿Qué? 1 en la página de la lección (su único h1); 2 cuando va dentro de una ventana, como la vista previa. */
  nivelTitulo?: 1 | 2;
  /** ¿Qué? Algo que va arriba del título, dentro de la misma tarjeta: la página de la lección pone aquí su ruta de navegación. */
  encabezado?: ReactNode;
}) {
  const { t } = useTranslation();
  const { introduccion, secciones, cierre, fuente } = partesDeLeccion(modulo.cuerpo_texto);
  const portada = imagenPropiaSegura(modulo.url_imagen);
  const guia = enlaceAdjuntoSeguro(modulo.url_guia);
  const Titulo = nivelTitulo === 1 ? "h1" : "h2";

  return (
    <article
      aria-label={modulo.titulo_tema}
      className="rounded-3xl border border-gray-100 bg-white p-6 dark:border-night-line dark:bg-night-card sm:p-8"
    >
      {encabezado && <div className="mb-5">{encabezado}</div>}

      <Titulo className="text-2xl font-bold leading-snug text-gray-900 dark:text-white">{modulo.titulo_tema}</Titulo>

      {modulo.url_video ? (
        <YoutubeEmbed url={modulo.url_video} titulo={modulo.titulo_tema} />
      ) : (
        portada && (
          <img src={portada} alt="" className="mt-4 aspect-video w-full rounded-xl border border-gray-100 object-cover dark:border-night-line" />
        )
      )}

      {introduccion && (
        <div className="mt-5 text-base [&_p]:text-base">
          <ReactMarkdown components={COMPONENTES_MARKDOWN}>{introduccion}</ReactMarkdown>
        </div>
      )}

      {secciones.map((seccion, i) => {
        const imagen = imagenPropiaSegura(seccion.imagen);
        return (
          <section key={`${i}-${seccion.titulo ?? "sin-titulo"}`} className="mt-6 border-t border-gray-100 pt-6 dark:border-night-line">
            {seccion.titulo && <h3 className="mb-2 text-base font-bold text-gray-900 dark:text-white">{seccion.titulo}</h3>}
            {imagen && <img src={imagen} alt="" className="mb-3 h-48 w-full rounded-xl object-cover" />}
            <ReactMarkdown components={COMPONENTES_MARKDOWN}>{seccion.texto}</ReactMarkdown>
          </section>
        );
      })}

      {cierre && (
        <div className="mt-6 rounded-2xl bg-accent-50 p-4 dark:bg-accent-300/10">
          <ReactMarkdown components={COMPONENTES_MARKDOWN}>{cierre}</ReactMarkdown>
        </div>
      )}

      {(guia || fuente) && (
        <footer className="mt-6 space-y-3 border-t border-gray-100 pt-6 dark:border-night-line">
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
          {fuente && (
            <div className="text-xs text-gray-500 dark:text-gray-400 [&_p]:text-xs [&_p]:text-gray-500 dark:[&_p]:text-gray-400">
              <span className="font-semibold">{fuente.titulo}: </span>
              <ReactMarkdown components={{ ...COMPONENTES_MARKDOWN, p: (props) => <span {...props} /> }}>{fuente.texto}</ReactMarkdown>
            </div>
          )}
        </footer>
      )}
    </article>
  );
}
