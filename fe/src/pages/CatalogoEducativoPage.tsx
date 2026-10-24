import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen, ChevronRight, Play } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { extraerIdDeYoutube } from "@/lib/youtube";
import { IlustracionCategoria } from "@/components/educativo/IlustracionCategoria";
import { TuSemana } from "@/components/educativo/TuSemana";
import { ICONOS_CATEGORIAS, ICONO_CATEGORIA_DEFAULT } from "@/config/categoriasEducativas";
import { listarContenido, type ContenidoEducativo } from "@/lib/contenidoEducativoApi";

/**
 * ¿Qué? "Aprende a reciclar": cómo le fue al conjunto esta semana, una tarjeta con
 *       imagen por categoría y un video destacado.
 * ¿Para qué? Antes eran botones con solo el nombre de cada categoría. Ahora cada
 *           una muestra su dibujo y el título de su lección más reciente.
 * ¿Impacto? Todo sale de datos que ya existen: el contenido completo del
 *           catálogo y la última auditoría del conjunto (la consulta la hace
 *           TuSemana; si falla, el catálogo se ve igual, sin ese bloque).
 */
export function CatalogoEducativoPage() {
  const { t } = useTranslation();
  const [contenido, setContenido] = useState<ContenidoEducativo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarContenido()
      .then(setContenido)
      .catch(() => setError(t("catalogoEducativo.loadError")))
      .finally(() => setCargando(false));
  }, [t]);

  // ¿Qué? Las categorías en el orden en que aparecen (la lista ya viene con lo más reciente primero).
  const categorias = useMemo(() => {
    const porNombre = new Map<string, ContenidoEducativo[]>();
    for (const modulo of contenido) {
      porNombre.set(modulo.modulo_categoria, [...(porNombre.get(modulo.modulo_categoria) ?? []), modulo]);
    }
    return Array.from(porNombre, ([nombre, modulos]) => ({ nombre, modulos }));
  }, [contenido]);

  const destacado = contenido.find((c) => c.url_video && extraerIdDeYoutube(c.url_video));
  const idDestacado = destacado?.url_video ? extraerIdDeYoutube(destacado.url_video) : null;

  return (
    <div className="mx-auto max-w-6xl space-y-10 pt-6 pb-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("catalogoEducativo.title")}</h1>
        <p className="max-w-2xl text-base text-gray-600 dark:text-gray-300">{t("catalogoEducativo.subtitle")}</p>
      </header>

      {cargando && <LoadingState message={t("catalogoEducativo.loading")} />}
      {error && <Alert type="error" message={error} />}

      {!cargando && !error && categorias.length === 0 && (
        <EmptyState icon={BookOpen} message={t("catalogoEducativo.emptyState")} />
      )}

      {!cargando && !error && categorias.length > 0 && (
        <>
          <TuSemana contenido={contenido} />

          <section aria-labelledby="titulo-categorias" className="space-y-5">
            <h2 id="titulo-categorias" className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("catalogoEducativo.categoriesTitle")}
            </h2>
            <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {categorias.map(({ nombre, modulos }) => {
                const Icono = ICONOS_CATEGORIAS[nombre] ?? ICONO_CATEGORIA_DEFAULT;
                return (
                  <Link
                    key={nombre}
                    to={`/catalogo-educativo/${encodeURIComponent(nombre)}`}
                    className="group flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white transition-transform hover:-translate-y-0.5 dark:border-night-line dark:bg-night-card"
                  >
                    <div className="relative h-44 bg-accent-50 dark:bg-accent-300/10" aria-hidden="true">
                      <IlustracionCategoria categoria={nombre} />
                      <span className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-accent-700 shadow dark:bg-night-card dark:text-accent-400">
                        <Icono className="icon-md" />
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-6">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {nombre}
                      </span>
                      <span className="text-lg font-bold leading-snug text-gray-900 dark:text-white">
                        {modulos[0].titulo_tema}
                      </span>
                      <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-accent-700 dark:text-accent-400">
                        {t("catalogoEducativo.viewLesson")}
                        <ChevronRight className="icon-md transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {destacado && idDestacado && (
            <section aria-labelledby="titulo-destacado" className="space-y-5">
              <h2 id="titulo-destacado" className="text-2xl font-bold text-gray-900 dark:text-white">
                {t("catalogoEducativo.featuredTitle")}
              </h2>
              <Link
                to={`/catalogo-educativo/${encodeURIComponent(destacado.modulo_categoria)}`}
                className="flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white transition-transform hover:-translate-y-0.5 dark:border-night-line dark:bg-night-card md:flex-row"
              >
                <span className="relative block aspect-video bg-gray-900 md:w-1/2" aria-hidden="true">
                  <img src={`https://img.youtube.com/vi/${idDestacado}/hqdefault.jpg`} alt="" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-red-600 shadow-lg">
                      <Play className="icon-lg fill-current" />
                    </span>
                  </span>
                </span>
                <span className="flex flex-1 flex-col justify-center gap-3 p-8">
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent-700 dark:text-accent-400">
                    {destacado.modulo_categoria}
                  </span>
                  <span className="text-2xl font-bold leading-snug text-gray-900 dark:text-white">{destacado.titulo_tema}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-700 dark:text-accent-400">
                    {t("catalogoEducativo.featuredCta")}
                    <ChevronRight className="icon-md" aria-hidden="true" />
                  </span>
                </span>
              </Link>
            </section>
          )}
        </>
      )}
    </div>
  );
}
