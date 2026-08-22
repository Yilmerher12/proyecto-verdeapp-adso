import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { YoutubeEmbed } from "@/components/ui/YoutubeEmbed";
import { ICONOS_CATEGORIAS, ICONO_CATEGORIA_DEFAULT } from "@/config/categoriasEducativas";
import {
  listarContenido,
  type ContenidoEducativo,
} from "@/lib/contenidoEducativoApi";

export function CategoriaEducativaPage() {
  const { t } = useTranslation();
  const { categoria } = useParams<{ categoria: string }>();
  const categoriaDecodificada = decodeURIComponent(categoria ?? "");
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [contenido, setContenido] = useState<ContenidoEducativo[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    listarContenido(accessToken)
      .then(setContenido)
      .finally(() => setCargando(false));
  }, [accessToken]);

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
        className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("categoriaEducativa.back")}
      </button>

      <div className="flex items-center gap-3 bg-white dark:bg-[#132a1c] rounded-2xl border border-gray-100 dark:border-[#2a4d34] p-6 shadow-sm">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-900/30 dark:text-accent-500">
          <Icono className="h-5.5 w-5.5" />
        </span>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{categoriaDecodificada}</h1>
      </div>

      {cargando && <p className="text-sm text-gray-400">{t("common.loading")}</p>}

      {!cargando && temas.length === 0 && (
        <p className="text-sm text-gray-400">{t("categoriaEducativa.emptyForCategory")}</p>
      )}

      <div className="space-y-4">
        {temas.map((item) => (
          <div
            key={item.id_contenido}
            className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-[#2a4d34] dark:bg-[#132a1c]"
          >
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{item.titulo_tema}</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">
              {item.cuerpo_texto}
            </p>

            {item.url_video && <YoutubeEmbed url={item.url_video} titulo={item.titulo_tema} />}

            {item.url_guia && (
              <a
                href={item.url_guia}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex w-fit items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-[#2a4d34] dark:text-gray-200 dark:hover:bg-[#2a4d34]"
              >
                <FileText className="h-4 w-4 shrink-0" />
                {t("categoriaEducativa.viewGuide")}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
