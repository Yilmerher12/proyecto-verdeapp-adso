import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Megaphone, Paperclip } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/api/axios";
import { verFeedComunicados, type Comunicado, type TipoComunicado } from "@/lib/comunicadosApi";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";

// ¿Qué? Mismo criterio de color que en el panel del Admin de Conjunto —
//       Urgente en rojo para que salte a la vista de inmediato (CA-028.2).
const TIPO_ESTILO: Record<TipoComunicado, string> = {
  INFORMATIVO: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  URGENTE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  CONVOCATORIA: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  MANTENIMIENTO: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  RECICLAJE: "bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400",
};

/**
 * ¿Qué? Feed de comunicados activos del conjunto (RQF-014, HU-028) —
 *       compartida entre Residente y Reciclador, porque ambos ven lo mismo
 *       (el backend ya filtra qué comunicados les corresponde según su rol).
 * ¿Para qué? Un reciclador puede estar autorizado en varios conjuntos, así
 *           que cada tarjeta muestra a qué conjunto pertenece el aviso.
 */
export function ComunicadosFeedPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    verFeedComunicados()
      .then(setComunicados)
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, [user]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-6">
      <div className="bg-[#f7f9f3] dark:bg-[#1c341b] rounded-2xl border border-gray-100 dark:border-[#2a4d34] p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("comunicados.feed.title")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("comunicados.feed.subtitle")}</p>
      </div>

      {cargando && <LoadingState message={t("common.loading")} />}

      {!cargando && error && <Alert type="error" message={t("common.loadError")} />}

      {!cargando && !error && comunicados.length === 0 && (
        <EmptyState icon={Megaphone} message={t("comunicados.feed.empty")} />
      )}

      <div className="space-y-4">
        {comunicados.map((item) => (
          <article
            key={item.id_comunicado}
            className={`rounded-2xl border bg-[#f7f9f3] p-5 dark:bg-[#1c341b] ${
              item.tipo === "URGENTE"
                ? "border-red-200 dark:border-red-800/40"
                : "border-gray-100 dark:border-[#2a4d34]"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              {item.tipo === "URGENTE" && <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIPO_ESTILO[item.tipo]}`}>
                {t(`comunicados.tipos.${item.tipo}`)}
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-[#0d2116] dark:text-gray-300">
                {item.nombre_conjunto}
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
                // ¿Qué? Si el adjunto viene de un archivo subido a VerdeApp,
                //       el backend devuelve una ruta relativa
                //       (/uploads/adjuntos/...) que hay que completar con la
                //       URL del backend — si viene de un link externo viejo,
                //       ya trae http(s) y se usa tal cual.
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
