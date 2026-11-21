import { useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { FileText, Maximize2, Send } from "lucide-react";
import { InsigniaAccionImagen } from "@/components/ui/InsigniaAccionImagen";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { Modal } from "@/components/ui/Modal";
import { Pestanas } from "@/components/ui/Pestanas";
import { YoutubeEmbed } from "@/components/ui/YoutubeEmbed";
import { COMPONENTES_MARKDOWN } from "@/config/contenidoEducativoMarkdown";
import { NIVELES_DESEMPENO } from "@/config/nivelesDesempeno";
import type { ContenidoEducativo } from "@/lib/contenidoEducativoApi";
import type { Destinatario } from "@/lib/destinatariosModulo";
import { formatearFechaCreacion } from "@/lib/dateFormat";
import { enlaceAdjuntoSeguro } from "@/lib/enlaceSeguro";
import { PanelPestana } from "@/components/ui/PanelPestana";

type Pestana = "vista" | "recomendado";

// ¿Qué? La guía de apoyo puede ser una imagen subida, un PDF subido, o un link externo escrito a mano (GuiaApoyoField
//       admite las 3 formas) — solo las imágenes se pueden mostrar integradas con una <img>; un PDF (o un link cuyo
//       tipo no se puede saber sin descargarlo) se queda como el botón "Ver guía de apoyo" de siempre.
const EXTENSIONES_IMAGEN_GUIA = [".jpg", ".jpeg", ".png", ".webp"];
function esImagenGuia(url: string): boolean {
  const limpia = url.split("?")[0].split("#")[0].toLowerCase();
  return EXTENSIONES_IMAGEN_GUIA.some((ext) => limpia.endsWith(ext));
}

interface ModuloEducativoModalProps {
  modulo: ContenidoEducativo;
  destinatarios: Destinatario[];
  cargandoEnvios: boolean;
  onClose: () => void;
}

/**
 * ¿Qué? Modal para VER un módulo del catálogo educativo (issue #619): arriba su categoría, título y fecha, y dos pestañas,
 *       "Vista previa" (el módulo como lo ve el Residente) y "Recomendado a (N)" (qué conjuntos lo recibieron).
 * ¿Para qué? Antes era un panel angosto pegado a un lado con todo apilado. Aquí pulsar la fila de la lista sirve solo para
 *           MIRAR; las acciones (enviar, editar y eliminar) viven únicamente en el menú de tres puntos de la fila, para que
 *           cada acción tenga un solo lugar.
 * ¿Impacto? Solo muestra, no cambia nada. La foto de la guía se amplía en un modal encima (layer="stacked").
 */
export function ModuloEducativoModal({ modulo, destinatarios, cargandoEnvios, onClose }: ModuloEducativoModalProps) {
  const { t } = useTranslation();
  const p = "adminContenidoEducativo";
  const [pestana, setPestana] = useState<Pestana>("vista");
  const [guiaAmpliada, setGuiaAmpliada] = useState(false);
  const urlGuia = enlaceAdjuntoSeguro(modulo.url_guia);

  return (
    <Modal onClose={onClose} wide aria-label={t(`${p}.modulePanel.ariaLabel`, { titulo: modulo.titulo_tema })}>
      <div className="p-6 pr-14">
        <span className="text-xs font-semibold uppercase tracking-wide text-accent-700 dark:text-accent-500">{modulo.modulo_categoria}</span>
        <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{modulo.titulo_tema}</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatearFechaCreacion(modulo.fecha_publicacion)}</p>
      </div>

      <div className="px-6">
        <Pestanas
          ariaLabel={t(`${p}.modulePanel.tabsLabel`)}
          idBase="modulo-tab"
          idPanel="modulo-panel"
          activa={pestana}
          onCambiar={setPestana}
          compacta
          pestanas={[
            { id: "vista", etiqueta: t(`${p}.modulePanel.preview`) },
            { id: "recomendado", etiqueta: t(`${p}.modulePanel.recommendedTab`, { count: destinatarios.length }) },
          ]}
        />
      </div>

      <PanelPestana id="modulo-panel" labelledBy={`modulo-tab-${pestana}`} claveActiva={pestana} className="p-6">
        {pestana === "vista" ? (
          <>
            <ReactMarkdown components={COMPONENTES_MARKDOWN}>{modulo.cuerpo_texto}</ReactMarkdown>
            {modulo.url_video && <YoutubeEmbed url={modulo.url_video} titulo={modulo.titulo_tema} />}
            {urlGuia &&
              (esImagenGuia(modulo.url_guia!) ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setGuiaAmpliada(true)}
                    className="group relative block w-full cursor-pointer overflow-hidden rounded-2xl border border-gray-100 dark:border-night-line"
                    aria-label={t(`${p}.ratingPanel.enlarge`)}
                    title={t(`${p}.ratingPanel.enlarge`)}
                  >
                    <img src={urlGuia} alt="" className="max-h-64 w-full object-cover" />
                    <InsigniaAccionImagen icono={Maximize2} />
                  </button>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{t(`${p}.modulePanel.guideImageHint`)}</p>
                </div>
              ) : (
                <a
                  href={urlGuia}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex w-fit items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-night-line dark:text-gray-200 dark:hover:bg-night-hover"
                >
                  <FileText className="icon-md shrink-0" />
                  {t("categoriaEducativa.viewGuide")}
                </a>
              ))}
          </>
        ) : cargandoEnvios ? (
          <Esqueleto mensaje={t("common.loading")} variante="filas" cantidad={3} />
        ) : destinatarios.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t(`${p}.modulePanel.noneYet`)}</p>
        ) : (
          <ul className="space-y-2">
            {destinatarios.map((d) => {
              const nivel = d.tipo === "auto" && d.nivel ? NIVELES_DESEMPENO[d.nivel] : null;
              return (
                <li
                  key={d.id_conjunto_residencial}
                  className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2 text-sm first:border-t-0 first:pt-0 dark:border-night-line"
                >
                  <span className="flex-1 font-semibold text-gray-900 dark:text-white">{d.nombre_conjunto}</span>
                  {nivel && d.nivel ? (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${nivel.claseBadge}`}>
                      <nivel.icon className="icon-sm" />
                      {t(`dashboards.reciclador.auditoria.niveles.${d.nivel.toLowerCase()}`)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-purple-700 dark:bg-purple-400/15 dark:text-purple-200">
                      <Send className="icon-sm" />
                      {t(`${p}.modulePanel.sentManually`)}
                    </span>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatearFechaCreacion(d.fecha)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </PanelPestana>

      {guiaAmpliada && urlGuia && (
        <Modal onClose={() => setGuiaAmpliada(false)} layer="stacked" wide aria-label={t(`${p}.ratingPanel.enlarge`)}>
          <img src={urlGuia} alt="" className="max-h-[80vh] w-full rounded-2xl object-contain" />
        </Modal>
      )}
    </Modal>
  );
}
