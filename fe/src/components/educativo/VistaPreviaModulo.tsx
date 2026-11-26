import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { MuroLeccion } from "@/components/educativo/MuroLeccion";
import { Pestanas } from "@/components/ui/Pestanas";
import { imagenPropiaSegura } from "@/lib/enlaceSeguro";
import { partirEnTarjetas } from "@/lib/muroLeccion";
import type { ContenidoEducativo } from "@/lib/contenidoEducativoApi";
import { PanelPestana } from "@/components/ui/PanelPestana";

type DatosModulo = Pick<
  ContenidoEducativo,
  "modulo_categoria" | "titulo_tema" | "cuerpo_texto" | "url_video" | "url_guia" | "url_imagen"
>;

type Pestana = "leccion" | "catalogo";

/**
 * ¿Qué? Vista previa del editor de módulos (issue #620): el módulo como lo verá el Residente, en dos pestañas — "Lección" (la tarjeta
 *       única de la lección) y "Fila de la lista" (cómo aparece en la lista de lecciones de su categoría, issue #705).
 * ¿Para qué? Antes iba sobre un panel blanco con tarjetas blancas (no se distinguían), no mostraba la portada cuando el módulo tenía
 *           video (la lección muestra el video, no la portada) y su rótulo "en vivo" chocaba con la X del modal.
 * ¿Impacto? El marco usa el fondo gris del área de contenido que ve el Residente (claro y oscuro), así las tarjetas blancas se leen
 *           como en la app real. Es el mismo MuroLeccion de la página del Residente; la tarjeta del catálogo copia la de
 *           "Sigue aprendiendo". El rótulo deja sitio a la X (pr-12).
 */
export function VistaPreviaModulo({ modulo }: { modulo: DatosModulo }) {
  const { t } = useTranslation();
  const p = "adminContenidoEducativo.preview";
  const [pestana, setPestana] = useState<Pestana>("leccion");
  const portada = imagenPropiaSegura(modulo.url_imagen);
  const categoria = modulo.modulo_categoria || t(`${p}.categoryPlaceholder`);
  const titulo = modulo.titulo_tema || t(`${p}.titlePlaceholder`);
  const resumen = partirEnTarjetas(modulo.cuerpo_texto).introduccion;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-12">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t(`${p}.label`)}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{t(`${p}.updates`)}</span>
      </div>

      <Pestanas
        ariaLabel={t(`${p}.tabsLabel`)}
        idBase="vista-previa-tab"
        idPanel="vista-previa-panel"
        activa={pestana}
        onCambiar={setPestana}
        compacta
        pestanas={[
          { id: "leccion", etiqueta: t(`${p}.tabLesson`) },
          { id: "catalogo", etiqueta: t(`${p}.tabCatalog`) },
        ]}
      />

      <PanelPestana id="vista-previa-panel" labelledBy={`vista-previa-tab-${pestana}`} claveActiva={pestana} className="rounded-2xl bg-gray-200 p-4 dark:bg-night-page">
        {pestana === "leccion" ? (
          modulo.cuerpo_texto.trim() ? (
            <MuroLeccion modulo={{ ...modulo, titulo_tema: titulo }} />
          ) : (
            <p className="text-sm italic text-gray-500 dark:text-gray-400">{t(`${p}.bodyPlaceholder`)}</p>
          )
        ) : (
          <div className="space-y-2">
            <div className="rounded-3xl border border-gray-100 bg-white dark:border-night-line dark:bg-night-card">
              <div className="flex items-center gap-4 px-5 py-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-edge text-sm font-semibold text-gray-600 dark:border-night-edge dark:text-gray-300">
                  1
                </span>
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{categoria}</span>
                  <span className="block text-base font-bold leading-snug text-gray-900 dark:text-white">{titulo}</span>
                  {resumen && <span className="line-clamp-2 block text-sm text-gray-600 dark:text-gray-300">{resumen}</span>}
                  {modulo.url_video && (
                    <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-night-line dark:text-gray-300">
                      {t("categoriaEducativa.withVideo")}
                    </span>
                  )}
                </span>
                <ChevronRight className="icon-md shrink-0 text-accent-700 dark:text-accent-400" aria-hidden="true" />
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300">{portada ? t(`${p}.catalogHint`) : t(`${p}.catalogNoCover`)}</p>
          </div>
        )}
      </PanelPestana>
    </div>
  );
}
