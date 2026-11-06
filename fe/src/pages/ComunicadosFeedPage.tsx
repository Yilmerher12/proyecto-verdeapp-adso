import { ANCHO_PAGINA } from "@/config/anchoPagina";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TriangleAlert, Megaphone, Paperclip } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { enlaceAdjuntoSeguro } from "@/lib/enlaceSeguro";
import { verFeedComunicados, type Comunicado, type TipoComunicado } from "@/lib/comunicadosApi";
import { MINIMO_PARA_ORGANIZAR, organizarComunicados } from "@/lib/organizarComunicados";
import { formatearFechaCreacion } from "@/lib/dateFormat";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { TextoRecortable } from "@/components/ui/TextoRecortable";

// ¿Qué? Mismo criterio de color que en el panel del Admin de Conjunto —
//       Urgente en rojo para que salte a la vista de inmediato (CA-028.2).
const TIPO_ESTILO: Record<TipoComunicado, string> = {
  INFORMATIVO: "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
  URGENTE: "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300",
  CONVOCATORIA: "bg-purple-100 text-purple-700 dark:bg-purple-400/15 dark:text-purple-300",
  MANTENIMIENTO: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200",
  RECICLAJE: "bg-accent-100 text-accent-700 dark:bg-accent-300/10 dark:text-accent-400",
};

// ¿Qué? Orden fijo de los filtros por tipo (solo salen los tipos que de verdad hay).
const ORDEN_TIPOS: TipoComunicado[] = ["URGENTE", "INFORMATIVO", "CONVOCATORIA", "MANTENIMIENTO", "RECICLAJE"];

function TarjetaComunicado({ item, fijado }: { item: Comunicado; fijado: boolean }) {
  const { t } = useTranslation();
  return (
    <article
      className={`rounded-2xl border p-5 ${
        fijado
          ? "border-red-200 bg-red-50 dark:border-red-400/30 dark:bg-red-400/10"
          : item.tipo === "URGENTE"
            ? "border-red-200 bg-white dark:border-red-400/30 dark:bg-night-card"
            : "border-gray-100 bg-white dark:border-night-line dark:bg-night-card"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {item.tipo === "URGENTE" && <TriangleAlert className="icon-md text-red-600 dark:text-red-300" />}
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIPO_ESTILO[item.tipo]}`}>
          {t(`comunicados.tipos.${item.tipo}`)}
        </span>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-night-inset dark:text-gray-300">
          {item.nombre_conjunto}
        </span>
        {item.editado && (
          <span className="text-xs italic text-gray-500 dark:text-gray-400">{t("comunicados.editedBadge")}</span>
        )}
        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">{formatearFechaCreacion(item.created_at)}</span>
      </div>

      <TextoRecortable texto={item.texto} className="mt-3 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line" />

      {enlaceAdjuntoSeguro(item.url_adjunto) && (
        <a
          // ¿Qué? enlaceAdjuntoSeguro completa la ruta relativa de un
          //       archivo subido (/uploads/adjuntos/...) con la URL del
          //       backend y deja pasar solo https://; si el enlace no
          //       es seguro devuelve null y no se pinta (issue #400).
          href={enlaceAdjuntoSeguro(item.url_adjunto) ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="link-text mt-3 inline-flex items-center gap-1.5 text-xs"
        >
          <Paperclip className="icon-sm" />
          {t("comunicados.viewAttachment")}
        </a>
      )}
    </article>
  );
}

/**
 * ¿Qué? Feed de comunicados activos del conjunto (RQF-014, HU-028) —
 *       compartida entre Residente y Reciclador, porque ambos ven lo mismo
 *       (el backend ya filtra qué comunicados les corresponde según su rol).
 * ¿Para qué? Un reciclador puede estar autorizado en varios conjuntos, así
 *           que cada tarjeta muestra a qué conjunto pertenece el aviso.
 *           Los urgentes se fijan arriba; con 4 o más comunicados se agrega el
 *           filtro por tipo y los encabezados "Esta semana" y "Anteriores".
 * ¿Impacto? El ancho de la lista siempre se limita a 48 rem (una línea de
 *           texto muy larga se lee mal en pantallas anchas), tenga los avisos que tenga.
 */
export function ComunicadosFeedPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState<TipoComunicado | null>(null);

  useEffect(() => {
    if (!user) return;
    verFeedComunicados()
      .then(setComunicados)
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, [user]);

  const organizar = comunicados.length >= MINIMO_PARA_ORGANIZAR;
  const { fijados, estaSemana, anteriores } = useMemo(
    () => organizarComunicados(comunicados, organizar ? tipoFiltro : null),
    [comunicados, organizar, tipoFiltro]
  );
  const tiposPresentes = ORDEN_TIPOS.filter((tipo) => comunicados.some((c) => c.tipo === tipo));

  return (
    // ¿Qué? Siempre el ancho de lectura (48 rem), igual que Soporte técnico.
    // ¿Para qué? Antes pasaba a 80 rem con 4 o más comunicados, y la pantalla se ensanchaba sola cuando el
    //           Admin de Conjunto publicaba el cuarto aviso. Los filtros y los grupos "Esta semana" y
    //           "Anteriores" caben igual en 48 rem (los filtros se envuelven).
    // ¿Impacto? Comunicados y Soporte técnico (Residente, Reciclador y Admin de Conjunto) se ven del mismo
    //           tamaño siempre. Ver docs/gestion-proyecto/decision-ancho-de-paginas.md.
    <div className={`${ANCHO_PAGINA.lectura} space-y-6 pt-6`}>
      <div className="bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("comunicados.feed.title")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("comunicados.feed.subtitle")}</p>
      </div>

      {cargando && <LoadingState message={t("common.loading")} />}

      {!cargando && error && <Alert type="error" message={t("common.loadError")} />}

      {!cargando && !error && comunicados.length === 0 && (
        <EmptyState icon={Megaphone} message={t("comunicados.feed.empty")} />
      )}

      {organizar && (
        <div role="group" aria-label={t("comunicados.feed.filtroLabel")} className="flex flex-wrap gap-2">
          {[null, ...tiposPresentes].map((tipo) => {
            const activo = tipoFiltro === tipo;
            return (
              <button
                key={tipo ?? "todos"}
                type="button"
                aria-pressed={activo}
                onClick={() => setTipoFiltro(tipo)}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activo
                    ? "border-accent-700 bg-accent-700 text-white dark:border-accent-300 dark:bg-accent-300 dark:text-accent-950"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-night-line dark:bg-night-card dark:text-gray-300 dark:hover:bg-night-hover"
                }`}
              >
                {tipo ? t(`comunicados.tipos.${tipo}`) : t("comunicados.feed.filtroTodos")}
              </button>
            );
          })}
        </div>
      )}

      {fijados.length > 0 && (
        <div className="space-y-4">
          {fijados.map((item) => (
            <TarjetaComunicado key={item.id_comunicado} item={item} fijado />
          ))}
        </div>
      )}

      {organizar ? (
        <>
          {estaSemana.length > 0 && (
            <section aria-labelledby="comunicados-esta-semana" className="space-y-3">
              <h2 id="comunicados-esta-semana" className="px-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                {t("comunicados.feed.estaSemana")}
              </h2>
              {estaSemana.map((item) => (
                <TarjetaComunicado key={item.id_comunicado} item={item} fijado={false} />
              ))}
            </section>
          )}
          {anteriores.length > 0 && (
            <section aria-labelledby="comunicados-anteriores" className="space-y-3">
              <h2 id="comunicados-anteriores" className="px-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                {t("comunicados.feed.anteriores")}
              </h2>
              {anteriores.map((item) => (
                <TarjetaComunicado key={item.id_comunicado} item={item} fijado={false} />
              ))}
            </section>
          )}
        </>
      ) : (
        <div className="space-y-4">
          {[...estaSemana, ...anteriores].map((item) => (
            <TarjetaComunicado key={item.id_comunicado} item={item} fijado={false} />
          ))}
        </div>
      )}
    </div>
  );
}
