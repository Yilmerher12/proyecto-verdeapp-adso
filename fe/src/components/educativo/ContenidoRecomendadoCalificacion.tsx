import { useTranslation } from "react-i18next";
import { Eye } from "lucide-react";
import type { AuditoriaAdmin } from "@/lib/auditoriaConjuntoApi";
import type { ContenidoEducativo } from "@/lib/contenidoEducativoApi";

interface ContenidoRecomendadoCalificacionProps {
  auditoria: AuditoriaAdmin;
  modulos: ContenidoEducativo[];
  /** Abre el módulo (lo lleva a la pestaña Módulos) y cierra el modal de la calificación. */
  onAbrirModulo: (idContenido: string) => void;
}

/**
 * ¿Qué? La sección "Contenido recomendado" que el Admin del Sistema ve al pie de la ficha de una calificación
 *       (issue #619): a cuántos residentes se avisó y las lecciones del tema, cada una con un botón que abre el módulo.
 *       Si la calificación es Buena, explica por qué no hay recomendación.
 * ¿Para qué? El resto de roles ven la ficha sin esta parte; solo el Admin del Sistema decide a quién enviar contenido.
 * ¿Impacto? "Avisados" es 0 en una calificación Buena (RQF-013), así que con 0 se muestra la explicación, no un error.
 */
export function ContenidoRecomendadoCalificacion({ auditoria, modulos, onAbrirModulo }: ContenidoRecomendadoCalificacionProps) {
  const { t } = useTranslation();
  const p = "adminContenidoEducativo";
  const delTema = modulos.filter((m) => m.modulo_categoria === auditoria.tema_educativo);

  return (
    <section>
      <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t(`${p}.ratingPanel.recommendedContent`)}</h4>
      {auditoria.avisados > 0 ? (
        <>
          <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">{t(`${p}.week.notified`, { count: auditoria.avisados })}</p>
          <div className="flex flex-col gap-1.5">
            {delTema.map((m) => (
              <button
                key={m.id_contenido}
                type="button"
                onClick={() => onAbrirModulo(m.id_contenido)}
                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 text-left text-sm text-gray-800 transition-colors hover:bg-gray-50 dark:border-night-line dark:bg-night-card dark:text-gray-200 dark:hover:bg-night-hover"
              >
                {m.titulo_tema}
                <Eye className="icon-sm shrink-0 text-gray-500 dark:text-gray-400" />
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t(`${p}.ratingPanel.noRecommendationHint`)}</p>
      )}
    </section>
  );
}
