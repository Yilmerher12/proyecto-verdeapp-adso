import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { MuroLeccion } from "@/components/educativo/MuroLeccion";
import { ANCHO_PAGINA } from "@/config/anchoPagina";
import { useAuth } from "@/hooks/useAuth";
import { listarContenido, marcarVistos, type ContenidoEducativo } from "@/lib/contenidoEducativoApi";
import { modulosDe, RUTA_CATALOGO, rutaCategoria, rutaLeccion, vecinosDe } from "@/lib/progresoEducativo";

/**
 * ¿Qué? Una lección de "Aprende a reciclar" en su propia página: la ruta arriba (migas de pan), la lección
 *       como una sola tarjeta y, abajo, "Anterior" y "Siguiente" dentro de su categoría.
 * ¿Para qué? Antes todas las lecciones de una categoría se apilaban en una página y entrar a ella las marcaba
 *           todas como vistas. Ahora cada lección tiene su dirección, y se marca como vista solo la que se
 *           abre (issue #705, docs/gestion-proyecto/rediseno-aprende-a-reciclar.md).
 * ¿Impacto? Si falla la llamada que marca "visto", la página se ve igual: solo no queda la marca y se
 *           reintenta la próxima vez. Si la lección ya no existe (la eliminó el Administrador), se avisa
 *           con un botón al catálogo. En celular la ruta se reduce a "‹ categoría" (NN/g: en pantallas
 *           pequeñas, solo el nivel padre).
 */
export function LeccionEducativaPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [contenido, setContenido] = useState<ContenidoEducativo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  // ¿Qué? La lista se pide una sola vez: "Anterior" y "Siguiente" cambian de lección sin volver a pedirla.
  useEffect(() => {
    if (!user) return;
    listarContenido()
      .then(setContenido)
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, [user]);

  const leccion = contenido.find((c) => c.id_contenido === id);
  const idLeccion = leccion?.id_contenido;

  // ¿Qué? Se marca como vista la lección que se abre, cada vez que cambia (no todas las de su categoría).
  useEffect(() => {
    if (idLeccion) marcarVistos([idLeccion]).catch(() => undefined);
  }, [idLeccion]);
  const { anterior, siguiente } = useMemo(
    () =>
      leccion
        ? vecinosDe(modulosDe(contenido, leccion.modulo_categoria), leccion.id_contenido)
        : { anterior: undefined, siguiente: undefined },
    [contenido, leccion]
  );

  return (
    <div className={`${ANCHO_PAGINA.lectura} space-y-6 pt-6 pb-12`}>
      {cargando && <Esqueleto mensaje={t("common.loading")} variante="bloque" alto="h-96" />}

      {!cargando && error && (
        <>
          <Alert type="error" message={t("leccionEducativa.loadError")} />
          <Link to={RUTA_CATALOGO} className="touch-target-h mx-auto flex w-fit items-center gap-2 rounded-xl bg-accent-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-600 dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200">
            <ArrowLeft className="icon-sm" aria-hidden="true" />
            {t("categoriaEducativa.back")}
          </Link>
        </>
      )}

      {!cargando && !error && !leccion && (
        <div className="space-y-4">
          <EmptyState icon={FileText} message={t("leccionEducativa.unavailable")} />
          <Link to={RUTA_CATALOGO} className="touch-target-h mx-auto flex w-fit items-center gap-2 rounded-xl bg-accent-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-600 dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200">
            <ArrowLeft className="icon-sm" aria-hidden="true" />
            {t("categoriaEducativa.back")}
          </Link>
        </div>
      )}

      {!cargando && !error && leccion && (
        <>
          <MuroLeccion
            nivelTitulo={1}
            modulo={leccion}
            encabezado={
              <nav aria-label={t("leccionEducativa.breadcrumb")}>
                <ol className="hidden min-w-0 items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 sm:flex">
                  <li className="shrink-0">
                    <Link to={RUTA_CATALOGO} className="link-text font-semibold">
                      {t("catalogoEducativo.title")}
                    </Link>
                  </li>
                  <ChevronRight className="icon-sm shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                  <li className="min-w-0 truncate">
                    <Link to={rutaCategoria(leccion.modulo_categoria)} className="link-text font-semibold">
                      {leccion.modulo_categoria}
                    </Link>
                  </li>
                  <ChevronRight className="icon-sm shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                  <li aria-current="page" className="min-w-0 flex-1 truncate">
                    {leccion.titulo_tema}
                  </li>
                </ol>
                <Link to={rutaCategoria(leccion.modulo_categoria)} className="link-text touch-target-h flex w-fit items-center gap-1.5 text-sm font-semibold sm:hidden">
                  <ChevronLeft className="icon-sm" aria-hidden="true" />
                  {leccion.modulo_categoria}
                </Link>
              </nav>
            }
          />

          {(anterior || siguiente) && (
            <nav aria-label={t("leccionEducativa.neighbours")} className="flex flex-col gap-4 sm:flex-row">
              {anterior ? (
                <Link to={rutaLeccion(anterior.id_contenido)} className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 transition-colors hover:border-accent-300 dark:border-night-line dark:bg-night-card dark:hover:border-accent-400">
                  <ChevronLeft className="icon-md shrink-0 text-accent-700 dark:text-accent-400" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t("leccionEducativa.previous")}
                    </span>
                    <span className="block text-sm font-bold text-gray-900 dark:text-white">{anterior.titulo_tema}</span>
                  </span>
                </Link>
              ) : (
                <span className="hidden flex-1 sm:block" />
              )}
              {siguiente && (
                <Link to={rutaLeccion(siguiente.id_contenido)} className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 transition-colors hover:border-accent-300 dark:border-night-line dark:bg-night-card dark:hover:border-accent-400 justify-between text-right">
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t("leccionEducativa.next")}
                    </span>
                    <span className="block text-sm font-bold text-gray-900 dark:text-white">{siguiente.titulo_tema}</span>
                  </span>
                  <ChevronRight className="icon-md shrink-0 text-accent-700 dark:text-accent-400" aria-hidden="true" />
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
