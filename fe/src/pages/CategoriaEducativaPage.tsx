import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, ChevronRight, FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { ANCHO_PAGINA } from "@/config/anchoPagina";
import { FRASE_CATEGORIA, ICONOS_CATEGORIAS, ICONO_CATEGORIA_DEFAULT } from "@/config/categoriasEducativas";
import { useAuth } from "@/hooks/useAuth";
import { listarContenido, listarVistos, type ContenidoEducativo } from "@/lib/contenidoEducativoApi";
import { partirEnTarjetas } from "@/lib/muroLeccion";
import {
  agruparPorCategoria,
  modulosDe,
  primeraSinVer,
  progresoDe,
  RUTA_CATALOGO,
  rutaCategoria,
  rutaLeccion,
} from "@/lib/progresoEducativo";

/**
 * ¿Qué? Una categoría de "Aprende a reciclar" como una lista de sus lecciones, en una sola tarjeta: arriba su
 *       cabecera (ícono, nombre, frase, avance y el botón "Empezar" o "Continuar") y debajo una fila por
 *       lección, con su número o su marca de visto, su título y una línea de resumen. Al final, otras
 *       categorías para seguir aprendiendo.
 * ¿Para qué? Antes esta página apilaba todas las lecciones de la categoría y las marcaba como vistas al
 *           cargar. Ahora cada lección vive en su propia página (LeccionEducativaPage) y esta solo ayuda a
 *           elegir cuál abrir (issue #705, docs/gestion-proyecto/rediseno-aprende-a-reciclar.md).
 * ¿Impacto? Entrar aquí ya no marca nada como visto. El avance sale de las lecciones que el Residente abrió
 *           (listarVistos); si esa consulta falla, la lista se ve igual, sin marcas. El orden de las filas es
 *           el orden de lectura que guarda el servidor.
 */
export function CategoriaEducativaPage() {
  const { t } = useTranslation();
  const { categoria } = useParams<{ categoria: string }>();
  const categoriaDecodificada = decodeURIComponent(categoria ?? "");
  const { user } = useAuth();
  const [contenido, setContenido] = useState<ContenidoEducativo[]>([]);
  const [vistos, setVistos] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!user) return;
    listarContenido()
      .then(setContenido)
      .catch(() => setContenido([]))
      .finally(() => setCargando(false));
    listarVistos()
      .then((ids) => setVistos(new Set(ids)))
      .catch(() => setVistos(new Set()));
  }, [user, categoriaDecodificada]);

  const lecciones = useMemo(() => modulosDe(contenido, categoriaDecodificada), [contenido, categoriaDecodificada]);
  const progreso = progresoDe(lecciones, vistos);
  const siguiente = primeraSinVer(lecciones, vistos);
  const porcentaje = progreso.total ? Math.round((progreso.vistos / progreso.total) * 100) : 0;
  const Icono = ICONOS_CATEGORIAS[categoriaDecodificada] ?? ICONO_CATEGORIA_DEFAULT;
  const claveFrase = FRASE_CATEGORIA[categoriaDecodificada];

  // ¿Qué? Las dos categorías que siguen a esta en el orden del catálogo (dando la vuelta al final).
  const otras = useMemo(() => {
    const todas = agruparPorCategoria(contenido).map((c) => c.nombre);
    const i = todas.indexOf(categoriaDecodificada);
    if (i === -1) return todas.slice(0, 2);
    return [1, 2].map((paso) => todas[(i + paso) % todas.length]).filter((n, k, arr) => n !== categoriaDecodificada && arr.indexOf(n) === k);
  }, [contenido, categoriaDecodificada]);

  return (
    <div className={`${ANCHO_PAGINA.lectura} space-y-6 pt-6 pb-12`}>
      {cargando && <Esqueleto mensaje={t("common.loading")} variante="bloque" alto="h-96" />}

      {!cargando && lecciones.length === 0 && (
        <div className="space-y-4">
          <EmptyState icon={FileText} message={t("categoriaEducativa.emptyForCategory")} />
          <Link to={RUTA_CATALOGO} className="touch-target-h mx-auto flex w-fit items-center gap-2 rounded-xl bg-accent-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-600 dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200">
            <ArrowLeft className="icon-sm" aria-hidden="true" />
            {t("categoriaEducativa.back")}
          </Link>
        </div>
      )}

      {lecciones.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white dark:border-night-line dark:bg-night-card" aria-labelledby="titulo-categoria">
          <header className="space-y-4 p-6 sm:p-8">
            <Link to={RUTA_CATALOGO} className="link-text touch-target-h flex w-fit items-center gap-1.5 text-sm font-semibold">
              <ArrowLeft className="icon-sm" aria-hidden="true" />
              {t("categoriaEducativa.back")}
            </Link>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-300/10 dark:text-accent-400" aria-hidden="true">
              <Icono className="icon-md" />
            </span>
            <div className="space-y-1">
              <h1 id="titulo-categoria" className="text-2xl font-bold leading-snug text-gray-900 dark:text-white">
                {categoriaDecodificada}
              </h1>
              {claveFrase && <p className="text-base text-gray-600 dark:text-gray-300">{t(claveFrase)}</p>}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t("categoriaEducativa.lessonCount", { count: progreso.total })} · {t("categoriaEducativa.seenCount", { count: progreso.vistos })}
            </p>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-accent-50 dark:bg-accent-300/10"
              role="progressbar"
              aria-valuenow={progreso.vistos}
              aria-valuemin={0}
              aria-valuemax={progreso.total}
              aria-label={t("categoriaEducativa.progress", { vistos: progreso.vistos, total: progreso.total })}
            >
              <div className="h-full bg-accent-600 dark:bg-accent-300" style={{ width: `${porcentaje}%` }} />
            </div>
            {progreso.estado === "completa" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1 text-sm font-semibold text-accent-700 dark:bg-accent-300/10 dark:text-accent-400">
                <Check className="icon-sm" aria-hidden="true" />
                {t("categoriaEducativa.complete")}
              </span>
            ) : (
              siguiente && (
                <Link
                  to={rutaLeccion(siguiente.id_contenido)}
                  className="touch-target-h inline-flex w-fit max-w-full items-center gap-2 rounded-xl bg-accent-700 px-5 py-2 text-left text-sm font-semibold text-white transition-colors hover:bg-accent-600 dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200"
                >
                  {t(progreso.estado === "sinEmpezar" ? "categoriaEducativa.start" : "categoriaEducativa.continue", { titulo: siguiente.titulo_tema })}
                  <ChevronRight className="icon-sm shrink-0" aria-hidden="true" />
                </Link>
              )
            )}
          </header>

          <ol className="border-t border-gray-100 dark:border-night-line">
            {lecciones.map((leccion, i) => {
              const visto = vistos.has(leccion.id_contenido);
              const resumen = partirEnTarjetas(leccion.cuerpo_texto).introduccion;
              const esSiguiente = siguiente?.id_contenido === leccion.id_contenido;
              return (
                <li key={leccion.id_contenido} className="border-b border-gray-100 p-2 last:border-b-0 dark:border-night-line sm:px-4">
                  <Link
                    to={rutaLeccion(leccion.id_contenido)}
                    className="flex items-center gap-4 rounded-2xl px-4 py-3 transition-colors hover:bg-accent-50 dark:hover:bg-accent-300/10"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        visto
                          ? "bg-accent-50 text-accent-700 dark:bg-accent-300/10 dark:text-accent-400"
                          : "border border-edge text-gray-600 dark:border-night-edge dark:text-gray-300"
                      }`}
                    >
                      {visto ? <Check className="icon-sm" aria-label={t("categoriaEducativa.seen")} /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1 space-y-1">
                      {esSiguiente && progreso.estado !== "completa" && (
                        <span className="inline-block rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-semibold text-accent-700 dark:bg-accent-300/10 dark:text-accent-400">
                          {t("categoriaEducativa.nextHere")}
                        </span>
                      )}
                      <span className="block text-base font-bold leading-snug text-gray-900 dark:text-white">{leccion.titulo_tema}</span>
                      {resumen && <span className="line-clamp-2 block text-sm text-gray-600 dark:text-gray-300">{resumen}</span>}
                      {leccion.url_video && (
                        <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-night-line dark:text-gray-300">
                          {t("categoriaEducativa.withVideo")}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="icon-md shrink-0 text-accent-700 dark:text-accent-400" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {lecciones.length > 0 && otras.length > 0 && (
        <section aria-labelledby="titulo-sigue" className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 dark:border-night-line dark:bg-night-card sm:p-8">
          <h2 id="titulo-sigue" className="text-lg font-bold text-gray-900 dark:text-white">
            {t("categoriaEducativa.keepLearning")}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {otras.map((nombre) => {
              const OtroIcono = ICONOS_CATEGORIAS[nombre] ?? ICONO_CATEGORIA_DEFAULT;
              const fraseOtra = FRASE_CATEGORIA[nombre];
              return (
                <Link
                  key={nombre}
                  to={rutaCategoria(nombre)}
                  className="group flex items-center gap-3 rounded-2xl border border-gray-100 p-4 transition-colors hover:border-accent-300 dark:border-night-line dark:hover:border-accent-400"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-300/10 dark:text-accent-400" aria-hidden="true">
                    <OtroIcono className="icon-md" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-gray-900 dark:text-white">{nombre}</span>
                    {fraseOtra && <span className="block text-xs text-gray-600 dark:text-gray-300">{t(fraseOtra)}</span>}
                  </span>
                  <ChevronRight className="icon-md shrink-0 text-accent-700 dark:text-accent-400" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
