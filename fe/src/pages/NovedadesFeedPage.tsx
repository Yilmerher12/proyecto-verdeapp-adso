import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Megaphone, Paperclip } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/api/axios";
import { verFeedNovedades, type Novedad } from "@/lib/novedadesApi";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";

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
  const { user } = useAuth();
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    verFeedNovedades()
      .then(setNovedades)
      // ¿Qué? Antes solo se hacía console.error y la UI caía en el mismo
      //       bloque de "no hay novedades" que un feed vacío de verdad.
      // ¿Impacto? Un token vencido o el servidor caído se veían exactamente
      //           igual que "no hay nada nuevo" — ahora hay un aviso propio.
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, [user]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-6">
      <div className="bg-[#f7f9f3] dark:bg-[#1c341b] rounded-2xl border border-gray-100 dark:border-[#2a4d34] p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("novedades.feed.title")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("novedades.feed.subtitle")}</p>
      </div>

      {cargando && <LoadingState message={t("common.loading")} />}

      {!cargando && error && <Alert type="error" message={t("common.loadError")} />}

      {!cargando && !error && novedades.length === 0 && (
        <EmptyState icon={Megaphone} message={t("novedades.feed.empty")} />
      )}

      <div className="space-y-4">
        {novedades.map((item) => (
          <article
            key={item.id_novedad}
            className="rounded-2xl border border-gray-100 bg-[#f7f9f3] p-5 dark:border-[#2a4d34] dark:bg-[#1c341b]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                {t(`novedades.alcances.${item.alcance}`)}
              </span>
              {item.editado && (
                <span className="text-xs italic text-gray-500 dark:text-gray-400">{t("comunicados.editedBadge")}</span>
              )}
              <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                {new Date(item.created_at).toLocaleDateString()}
              </span>
            </div>

            <p className="mt-3 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{item.texto}</p>

            {item.url_adjunto && (
              <a
                // ¿Qué? Igual que en ComunicadosFeedPage.tsx: un adjunto
                //       subido como archivo devuelve una ruta relativa que
                //       hay que completar con la URL del backend.
                href={item.url_adjunto.startsWith("http") ? item.url_adjunto : `${API_BASE_URL}${item.url_adjunto}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent-700 transition-colors hover:text-accent-800 dark:text-accent-400"
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
