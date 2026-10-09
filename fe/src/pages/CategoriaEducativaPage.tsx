import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { enlaceAdjuntoSeguro } from "@/lib/enlaceSeguro";
import { YoutubeEmbed } from "@/components/ui/YoutubeEmbed";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ICONOS_CATEGORIAS, ICONO_CATEGORIA_DEFAULT } from "@/config/categoriasEducativas";
import { COMPONENTES_MARKDOWN } from "@/config/contenidoEducativoMarkdown";
import {
  listarContenido,
  type ContenidoEducativo,
} from "@/lib/contenidoEducativoApi";

export function CategoriaEducativaPage() {
  const { t } = useTranslation();
  const { categoria } = useParams<{ categoria: string }>();
  const categoriaDecodificada = decodeURIComponent(categoria ?? "");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contenido, setContenido] = useState<ContenidoEducativo[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!user) return;
    listarContenido()
      .then(setContenido)
      .finally(() => setCargando(false));
  }, [user]);

  const temas = contenido.filter((c) => c.modulo_categoria === categoriaDecodificada);
  // ¿Qué? Se desestructura del objeto (no se llama como función) a propósito
  //       — ESLint marca como error asignar el RESULTADO DE UNA FUNCIÓN a una
  //       variable con mayúscula inicial usada como JSX ("static-components"),
  //       aunque el ícono elegido sea siempre una referencia estable.
  const Icono = ICONOS_CATEGORIAS[categoriaDecodificada] ?? ICONO_CATEGORIA_DEFAULT;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pt-6">
      <button
        onClick={() => navigate("/catalogo-educativo")}
        className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      >
        <ArrowLeft className="icon-md" />
        {t("categoriaEducativa.back")}
      </button>

      <div className="flex items-center gap-3 bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line p-6 shadow-sm">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-900/30 dark:text-accent-500">
          <Icono className="icon-lg" />
        </span>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{categoriaDecodificada}</h1>
      </div>

      {cargando && <LoadingState message={t("common.loading")} />}

      {!cargando && temas.length === 0 && (
        <EmptyState icon={FileText} message={t("categoriaEducativa.emptyForCategory")} />
      )}

      <div className="space-y-4">
        {temas.map((item) => (
          <div
            key={item.id_contenido}
            className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-night-line dark:bg-night-card"
          >
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{item.titulo_tema}</h2>
            <ReactMarkdown components={COMPONENTES_MARKDOWN}>{item.cuerpo_texto}</ReactMarkdown>

            {item.url_video && <YoutubeEmbed url={item.url_video} titulo={item.titulo_tema} />}

            {enlaceAdjuntoSeguro(item.url_guia) && (
              <a
                // ¿Qué? enlaceAdjuntoSeguro completa la ruta relativa de un
                //       archivo subido (/uploads/adjuntos/...) con la URL del
                //       backend y deja pasar solo https://; si el enlace no
                //       es seguro devuelve null y no se pinta (issue #400).
                href={enlaceAdjuntoSeguro(item.url_guia) ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex w-fit items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-night-line dark:text-gray-200 dark:hover:bg-night-hover"
              >
                <FileText className="icon-md shrink-0" />
                {t("categoriaEducativa.viewGuide")}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
