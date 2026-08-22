import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Megaphone, Paperclip } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { verFeedNovedades, type Novedad } from "@/lib/novedadesApi";

/**
 * ¿Qué? Feed de novedades activas de la plataforma (RQF-015, HU-033) —
 *       compartida entre Residente, Reciclador y Admin de Conjunto, porque
 *       los tres ven lo mismo (el backend ya filtra según su rol).
 * ¿Para qué? A diferencia del feed de Comunicados (por conjunto), aquí no
 *           hay ningún dato de conjunto que mostrar — son avisos de toda
 *           la plataforma.
 */
export function NovedadesFeedPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    verFeedNovedades(accessToken)
      .then(setNovedades)
      .catch((err) => console.error("Error cargando novedades", err))
      .finally(() => setCargando(false));
  }, [accessToken]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-6">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("novedades.feed.title")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("novedades.feed.subtitle")}</p>
      </div>

      {cargando && <p className="text-sm text-gray-400">{t("common.loading")}</p>}

      {!cargando && novedades.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-800">
          <Megaphone className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-400">{t("novedades.feed.empty")}</p>
        </div>
      )}

      <div className="space-y-4">
        {novedades.map((item) => (
          <article
            key={item.id_novedad}
            className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                {t(`novedades.alcances.${item.alcance}`)}
              </span>
              {item.editado && (
                <span className="text-xs italic text-gray-400">{t("comunicados.editedBadge")}</span>
              )}
              <span className="ml-auto text-xs text-gray-400">
                {new Date(item.created_at).toLocaleDateString()}
              </span>
            </div>

            <p className="mt-3 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{item.texto}</p>

            {item.url_adjunto && (
              <a
                href={item.url_adjunto}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-800 dark:text-green-400"
              >
                <Paperclip className="h-3.5 w-3.5" />
                {t("comunicados.viewAttachment")}
              </a>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
