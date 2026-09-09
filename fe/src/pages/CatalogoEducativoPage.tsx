import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ICONOS_CATEGORIAS, ICONO_CATEGORIA_DEFAULT } from "@/config/categoriasEducativas";
import {
  listarContenido,
  type ContenidoEducativo,
} from "@/lib/contenidoEducativoApi";

// ¿Qué? Página de entrada del catálogo educativo (HU-005): una tarjeta por
//       categoría, no el contenido completo de una vez.
// ¿Para qué? Con muchas categorías y temas, mostrar todo el texto y todos
//           los videos en una sola pantalla abruma al usuario. Aquí el
//           residente elige primero QUÉ tema le interesa, y en
//           CategoriaEducativaPage ve el detalle de esa categoría sola.
// ¿Impacto? No requiere ningún cambio de backend — la categoría ya agrupa
//           el contenido en la base de datos, esto es solo cómo se navega.
export function CatalogoEducativoPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [contenido, setContenido] = useState<ContenidoEducativo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    listarContenido(accessToken)
      .then(setContenido)
      .catch(() => setError(t("catalogoEducativo.loadError")))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const categorias = Array.from(new Set(contenido.map((c) => c.modulo_categoria)));

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-6">
      <div className="bg-white dark:bg-[#132a1c] rounded-2xl border border-gray-100 dark:border-[#2a4d34] p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("catalogoEducativo.title")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("catalogoEducativo.subtitle")}
        </p>
      </div>

      {cargando && <p className="text-sm text-gray-500 dark:text-gray-400">{t("catalogoEducativo.loading")}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!cargando && !error && categorias.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-[#2a4d34]">
          <BookOpen className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("catalogoEducativo.emptyState")}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categorias.map((categoria) => {
          const Icono = ICONOS_CATEGORIAS[categoria] ?? ICONO_CATEGORIA_DEFAULT;
          const temas = contenido.filter((c) => c.modulo_categoria === categoria).length;

          return (
            <button
              key={categoria}
              onClick={() => navigate(`/catalogo-educativo/${encodeURIComponent(categoria)}`)}
              className="group flex cursor-pointer items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 text-left transition-colors hover:border-accent-200 hover:bg-accent-50/40 dark:border-[#2a4d34] dark:bg-[#132a1c] dark:hover:border-accent-800 dark:hover:bg-accent-900/10"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-900/30 dark:text-accent-500">
                <Icono className="h-5.5 w-5.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-gray-900 dark:text-white">
                  {categoria}
                </span>
                <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                  {temas} {temas === 1 ? t("catalogoEducativo.tema") : t("catalogoEducativo.temas")}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 dark:text-gray-600" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
