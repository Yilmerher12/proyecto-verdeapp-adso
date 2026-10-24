import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, ChevronRight, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { IlustracionCategoria } from "@/components/educativo/IlustracionCategoria";
import { MuroLeccion } from "@/components/educativo/MuroLeccion";
import { listarContenido, marcarVistos, type ContenidoEducativo } from "@/lib/contenidoEducativoApi";

/**
 * ¿Qué? Una categoría de "Aprende a reciclar" como un muro: cada lección con su
 *       video, "De qué trata" y una tarjeta por párrafo, y al final otras
 *       categorías para seguir aprendiendo.
 * ¿Para qué? Antes era una lista de módulos con el texto seguido, sin imágenes y
 *           con el espacio muy apretado. Aquí también se deja constancia de que
 *           el Residente abrió la lección ("Visto").
 * ¿Impacto? Al cargar, los módulos de la categoría se marcan como vistos en el
 *           servidor. Si esa llamada falla, la página se ve igual: solo no queda
 *           la marca, y se reintenta la próxima vez que abra la categoría. El
 *           texto de cada módulo se parte en tarjetas con lib/muroLeccion.ts y se
 *           dibuja con MuroLeccion.
 */
export function CategoriaEducativaPage() {
  const { t } = useTranslation();
  const { categoria } = useParams<{ categoria: string }>();
  const categoriaDecodificada = decodeURIComponent(categoria ?? "");
  const { user } = useAuth();
  const [contenido, setContenido] = useState<ContenidoEducativo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [visto, setVisto] = useState(false);

  useEffect(() => {
    if (!user) return;
    listarContenido()
      .then((lista) => {
        setContenido(lista);
        const ids = lista.filter((c) => c.modulo_categoria === categoriaDecodificada).map((c) => c.id_contenido);
        if (ids.length === 0) return;
        marcarVistos(ids)
          .then(() => setVisto(true))
          .catch(() => setVisto(false));
      })
      .finally(() => setCargando(false));
  }, [user, categoriaDecodificada]);

  const temas = contenido.filter((c) => c.modulo_categoria === categoriaDecodificada);
  const otras = useMemo(() => {
    const nombres = Array.from(new Set(contenido.map((c) => c.modulo_categoria))).filter(
      (n) => n !== categoriaDecodificada
    );
    return nombres.slice(0, 2).map((nombre) => ({ nombre, modulo: contenido.find((c) => c.modulo_categoria === nombre)! }));
  }, [contenido, categoriaDecodificada]);

  const conVideo = temas.filter((c) => c.url_video).length;
  const conGuia = temas.filter((c) => c.url_guia).length;

  return (
    <div className="mx-auto max-w-6xl space-y-9 pt-6 pb-12">
      <Link
        to="/catalogo-educativo"
        className="link-text touch-target-h flex w-fit items-center gap-1.5 text-sm font-semibold"
      >
        <ArrowLeft className="icon-sm" aria-hidden="true" />
        {t("categoriaEducativa.back")}
      </Link>

      <header className="space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-accent-700 dark:text-accent-400">
          {categoriaDecodificada}
        </span>
        <h1 className="max-w-3xl text-3xl font-bold leading-tight text-gray-900 dark:text-white">
          {temas.length === 1 ? temas[0].titulo_tema : categoriaDecodificada}
        </h1>
        {temas.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            {visto && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1 font-semibold text-accent-700 dark:bg-accent-300/10 dark:text-accent-400">
                <Check className="icon-sm" aria-hidden="true" />
                {t("categoriaEducativa.seen")}
              </span>
            )}
            <span>
              {t("categoriaEducativa.lessonCount", { count: temas.length })} ·{" "}
              {t("categoriaEducativa.videoCount", { count: conVideo })} ·{" "}
              {t("categoriaEducativa.guideCount", { count: conGuia })}
            </span>
          </div>
        )}
      </header>

      {cargando && <LoadingState message={t("common.loading")} />}

      {!cargando && temas.length === 0 && (
        <EmptyState icon={FileText} message={t("categoriaEducativa.emptyForCategory")} />
      )}

      <div className="space-y-14">
        {temas.map((item) => (
          <MuroLeccion key={item.id_contenido} modulo={item} mostrarTitulo={temas.length > 1} />
        ))}
      </div>

      {otras.length > 0 && (
        <section aria-labelledby="titulo-sigue" className="space-y-5">
          <h2 id="titulo-sigue" className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("categoriaEducativa.keepLearning")}
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {otras.map(({ nombre, modulo }) => (
              <Link
                key={nombre}
                to={`/catalogo-educativo/${encodeURIComponent(nombre)}`}
                className="group flex overflow-hidden rounded-3xl border border-gray-100 bg-white transition-transform hover:-translate-y-0.5 dark:border-night-line dark:bg-night-card"
              >
                <span className="block w-36 shrink-0 bg-accent-50 dark:bg-accent-300/10" aria-hidden="true">
                  <IlustracionCategoria categoria={nombre} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 p-5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{nombre}</span>
                  <span className="text-base font-bold leading-snug text-gray-900 dark:text-white">{modulo.titulo_tema}</span>
                </span>
                <ChevronRight className="icon-md my-auto mr-4 shrink-0 text-accent-700 dark:text-accent-400" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
