import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Megaphone, Paperclip } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { verFeedComunicados, type Comunicado, type TipoComunicado } from "@/lib/comunicadosApi";

// ¿Qué? Mismo criterio de color que en el panel del Admin de Conjunto —
//       Urgente en rojo para que salte a la vista de inmediato (CA-028.2).
const TIPO_ESTILO: Record<TipoComunicado, string> = {
  INFORMATIVO: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  URGENTE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  CONVOCATORIA: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  MANTENIMIENTO: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  RECICLAJE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
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
  const { accessToken } = useAuth();
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    verFeedComunicados(accessToken)
      .then(setComunicados)
      .catch((err) => console.error("Error cargando comunicados", err))
      .finally(() => setCargando(false));
  }, [accessToken]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-6">
      <div className="bg-white dark:bg-[#132a1c] rounded-2xl border border-gray-100 dark:border-[#2a4d34] p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("comunicados.feed.title")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("comunicados.feed.subtitle")}</p>
      </div>

      {cargando && <p className="text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</p>}

      {!cargando && comunicados.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-[#2a4d34]">
          <Megaphone className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("comunicados.feed.empty")}</p>
        </div>
      )}

      <div className="space-y-4">
        {comunicados.map((item) => (
          <article
            key={item.id_comunicado}
            className={`rounded-2xl border bg-white p-5 dark:bg-[#132a1c] ${
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
