import { ANCHO_PAGINA } from "@/config/anchoPagina";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen, Check, ChevronRight, Play } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { extraerIdDeYoutube } from "@/lib/youtube";
import { IlustracionCategoria } from "@/components/educativo/IlustracionCategoria";
import { TuSemana } from "@/components/educativo/TuSemana";
import { FRASE_CATEGORIA, ICONOS_CATEGORIAS, ICONO_CATEGORIA_DEFAULT } from "@/config/categoriasEducativas";
import { imagenPropiaSegura } from "@/lib/enlaceSeguro";
import { listarContenido, listarVistos, type ContenidoEducativo } from "@/lib/contenidoEducativoApi";
import { agruparPorCategoria, progresoDe, rutaCategoria, rutaLeccion } from "@/lib/progresoEducativo";

/**
 * ¿Qué? "Aprende a reciclar" en tres tarjetas, cada una con su título adentro: (1) el encabezado con "Tu
 *       semana" y "Tu avance", (2) las categorías de aprendizaje y (3) el video destacado.
 * ¿Para qué? Antes eran siete bloques sueltos: cinco tarjetas solo con un título, separadas de lo que
 *           titulan. Una tarjeta por tema deja claro qué va con qué (issue #705,
 *           docs/gestion-proyecto/rediseno-aprende-a-reciclar.md). Cada categoría dice de qué trata y
 *           cuánto lleva el Residente.
 * ¿Impacto? Sale de dos fuentes: el contenido completo del catálogo y las lecciones vistas (la auditoría
 *           la consulta TuSemana por su cuenta). Si falla la lista de vistas, el catálogo se ve igual, sin
 *           avance; si falla la auditoría, sin ese bloque. El video destacado abre la lección donde está.
 */
export function CatalogoEducativoPage() {
  const { t } = useTranslation();
  const [contenido, setContenido] = useState<ContenidoEducativo[]>([]);
  const [vistos, setVistos] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarContenido()
      .then(setContenido)
      .catch(() => setError(t("catalogoEducativo.loadError")))
      .finally(() => setCargando(false));
    listarVistos()
      .then((ids) => setVistos(new Set(ids)))
      .catch(() => setVistos(new Set()));
  }, [t]);

  const categorias = useMemo(() => agruparPorCategoria(contenido), [contenido]);

  // ¿Qué? El primer módulo con un video de YouTube, en el orden del catálogo.
  const destacado = categorias.flatMap((c) => c.modulos).find((m) => m.url_video && extraerIdDeYoutube(m.url_video));
  const idDestacado = destacado?.url_video ? extraerIdDeYoutube(destacado.url_video) : null;
  const totalVistas = contenido.filter((c) => vistos.has(c.id_contenido)).length;
  const porcentaje = contenido.length ? Math.round((totalVistas / contenido.length) * 100) : 0;

  const tarjeta = "rounded-3xl border border-gray-100 bg-white p-6 dark:border-night-line dark:bg-night-card sm:p-8";

  return (
    <div className={`${ANCHO_PAGINA.normal} space-y-8 pt-6 pb-12`}>
      {cargando && <Esqueleto mensaje={t("catalogoEducativo.loading")} variante="tarjetas" cantidad={9} alto="h-80" />}
      {error && <Alert type="error" message={error} />}

      {!cargando && !error && categorias.length === 0 && (
        <EmptyState icon={BookOpen} message={t("catalogoEducativo.emptyState")} />
      )}

      {!cargando && !error && categorias.length > 0 && (
        <>
          <section className={`${tarjeta} space-y-6`} aria-labelledby="titulo-aprende">
            <header className="space-y-2">
              <h1 id="titulo-aprende" className="text-2xl font-bold text-gray-900 dark:text-white">
                {t("catalogoEducativo.title")}
              </h1>
              <p className="max-w-2xl text-base text-gray-600 dark:text-gray-300">{t("catalogoEducativo.subtitle")}</p>
            </header>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
              <div className="min-w-0 lg:flex-[1.7]">
                <TuSemana contenido={contenido} vistos={vistos} />
              </div>
              <section
                aria-label={t("catalogoEducativo.progress.title")}
                className="flex flex-col justify-center gap-4 rounded-2xl border border-gray-100 p-6 dark:border-night-line lg:flex-1"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t("catalogoEducativo.progress.title")}
                </span>
                <p className="text-base text-gray-600 dark:text-gray-300">
                  <span className="mr-2 text-2xl font-bold text-accent-700 dark:text-accent-400">{totalVistas}</span>
                  {t("catalogoEducativo.progress.of", { total: contenido.length })}
                </p>
                <div
                  className="h-2.5 overflow-hidden rounded-full bg-accent-50 dark:bg-accent-300/10"
                  role="progressbar"
                  aria-valuenow={totalVistas}
                  aria-valuemin={0}
                  aria-valuemax={contenido.length}
                  aria-label={t("catalogoEducativo.progress.title")}
                >
                  <div className="h-full bg-accent-600 dark:bg-accent-300" style={{ width: `${porcentaje}%` }} />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("catalogoEducativo.progress.hint")}</p>
              </section>
            </div>
          </section>

          <section aria-labelledby="titulo-categorias" className={`${tarjeta} space-y-5`}>
            <h2 id="titulo-categorias" className="text-lg font-bold text-gray-900 dark:text-white">
              {t("catalogoEducativo.categoriesTitle")}
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {categorias.map(({ nombre, modulos }) => {
                const Icono = ICONOS_CATEGORIAS[nombre] ?? ICONO_CATEGORIA_DEFAULT;
                const portada = imagenPropiaSegura(modulos.find((m) => m.url_imagen)?.url_imagen);
                const progreso = progresoDe(modulos, vistos);
                const claveFrase = FRASE_CATEGORIA[nombre];
                return (
                  <Link
                    key={nombre}
                    to={rutaCategoria(nombre)}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-transform hover:-translate-y-0.5 dark:border-night-line dark:bg-night-card"
                  >
                    <div className="relative h-36 bg-accent-50 dark:bg-accent-300/10" aria-hidden="true">
                      {portada ? (
                        <img src={portada} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <IlustracionCategoria categoria={nombre} />
                      )}
                      <span className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-accent-700 shadow dark:bg-night-card dark:text-accent-400">
                        <Icono className="icon-md" />
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      <span className="text-base font-bold leading-snug text-gray-900 dark:text-white">{nombre}</span>
                      {claveFrase && <span className="text-sm text-gray-600 dark:text-gray-300">{t(claveFrase)}</span>}
                      <div className="mt-auto space-y-2 pt-3">
                        <div
                          className="h-2 overflow-hidden rounded-full bg-accent-50 dark:bg-accent-300/10"
                          role="progressbar"
                          aria-valuenow={progreso.vistos}
                          aria-valuemin={0}
                          aria-valuemax={progreso.total}
                          aria-label={t("categoriaEducativa.progress", { vistos: progreso.vistos, total: progreso.total })}
                        >
                          <div
                            className="h-full bg-accent-600 dark:bg-accent-300"
                            style={{ width: `${progreso.total ? Math.round((progreso.vistos / progreso.total) * 100) : 0}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          {progreso.estado === "completa" ? (
                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-700 dark:text-accent-400">
                              <Check className="icon-sm" aria-hidden="true" />
                              {t("categoriaEducativa.complete")}
                            </span>
                          ) : (
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              {progreso.estado === "sinEmpezar"
                                ? t("categoriaEducativa.notStarted")
                                : t("categoriaEducativa.progress", { vistos: progreso.vistos, total: progreso.total })}
                            </span>
                          )}
                          <ChevronRight className="icon-md shrink-0 text-accent-700 transition-transform group-hover:translate-x-0.5 dark:text-accent-400" aria-hidden="true" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {destacado && idDestacado && (
            <section aria-labelledby="titulo-destacado" className={`${tarjeta} space-y-5`}>
              <h2 id="titulo-destacado" className="text-lg font-bold text-gray-900 dark:text-white">
                {t("catalogoEducativo.featuredTitle")}
              </h2>
              <Link
                to={rutaLeccion(destacado.id_contenido)}
                className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 transition-transform hover:-translate-y-0.5 dark:border-night-line md:flex-row"
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
