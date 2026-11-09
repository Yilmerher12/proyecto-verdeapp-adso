import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { IlustracionCategoria } from "@/components/educativo/IlustracionCategoria";
import { MuroLeccion } from "@/components/educativo/MuroLeccion";
import { Pestanas } from "@/components/ui/Pestanas";
import { imagenPropiaSegura } from "@/lib/enlaceSeguro";
import type { ContenidoEducativo } from "@/lib/contenidoEducativoApi";

type DatosModulo = Pick<
  ContenidoEducativo,
  "modulo_categoria" | "titulo_tema" | "cuerpo_texto" | "url_video" | "url_guia" | "url_imagen"
>;

type Pestana = "leccion" | "catalogo";

/**
 * ¿Qué? Vista previa del editor de módulos (issue #620): el módulo como lo verá el Residente, en dos pestañas — "Lección" (el muro de
 *       tarjetas) y "Tarjeta del catálogo" (la tarjeta de la lista de "Aprende a reciclar", donde se ve la portada).
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-12">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t(`${p}.label`)}</span>
        <span className="text-[0.6875rem] text-gray-500 dark:text-gray-400">{t(`${p}.updates`)}</span>
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

      <div
        id="vista-previa-panel"
        role="tabpanel"
        aria-labelledby={`vista-previa-tab-${pestana}`}
        className="rounded-2xl bg-gray-200 p-4 dark:bg-night-page"
      >
        {pestana === "leccion" ? (
          modulo.cuerpo_texto.trim() ? (
            <MuroLeccion compacto mostrarTitulo modulo={{ ...modulo, titulo_tema: titulo }} />
          ) : (
            <p className="text-sm italic text-gray-500 dark:text-gray-400">{t(`${p}.bodyPlaceholder`)}</p>
          )
        ) : (
          <div className="space-y-2">
            <div className="flex overflow-hidden rounded-3xl border border-gray-100 bg-white dark:border-night-line dark:bg-night-card">
              <span className="block w-28 shrink-0 bg-accent-50 dark:bg-accent-300/10" aria-hidden="true">
                {portada ? (
                  <img src={portada} alt="" className="h-full w-full object-cover" />
                ) : (
                  <IlustracionCategoria categoria={modulo.modulo_categoria} />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{categoria}</span>
                <span className="text-base font-bold leading-snug text-gray-900 dark:text-white">{titulo}</span>
              </span>
              <ChevronRight className="icon-md my-auto mr-3 shrink-0 text-accent-700 dark:text-accent-400" aria-hidden="true" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300">{portada ? t(`${p}.catalogHint`) : t(`${p}.catalogNoCover`)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
