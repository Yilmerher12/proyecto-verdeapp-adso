import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { usePolling } from "@/hooks/usePolling";
import { usePaginacion } from "@/hooks/usePaginacion";
import {
  AVISOS_POR_PAGINA,
  limpiarAvisosLeidosDelConjunto,
  marcarAvisoLeido,
  marcarAvisosDelConjuntoLeidos,
  obtenerAvisosDeConjunto,
} from "@/lib/avisosConjuntoApi";
import type { NotificacionItem } from "@/lib/notificaciones";
import { notificarNotificacionesActualizadas, onCambioDesdeCampanita } from "@/lib/notificationEvents";
import { FilaNotificacion } from "@/components/dashboard/NotificationFeed";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Paginacion } from "@/components/ui/Paginacion";

/**
 * ¿Qué? Pestaña "Avisos" de UN conjunto: los avisos que le llegaron al Admin por ese conjunto (reportes de residentes y
 *       recicladores y respuestas de VerdeApp), de 10 en 10, con "Marcar leídas" y "Limpiar leídas" que solo afectan a
 *       este conjunto.
 * ¿Para qué? Issue #595: antes se repartían en la pantalla las últimas 30 notificaciones de todos los conjuntos juntos
 *           (los avisos de un conjunto podían desplazar a los de otro), sin paginar, con una tarjeta propia dentro de
 *           otra y el nombre del conjunto repetido en cada fila. Ahora cada conjunto pide su página al servidor.
 * ¿Impacto? Solo pide y refresca (cada 20 s, y al instante si algo cambió desde la campanita) mientras la pestaña está
 *           activa. `onCambio` avisa al panel de que los contadores de la cabecera pueden haber cambiado. La barra de
 *           paginación solo aparece cuando hay más de una página. El aviso de "auditoría publicada" no sale aquí (lo
 *           muestra un banner aparte, arriba del panel).
 */
export function AvisosConjunto({
  idConjunto,
  activa,
  onCambio,
}: {
  idConjunto: string;
  activa: boolean;
  onCambio: () => void;
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState<NotificacionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [errorAccion, setErrorAccion] = useState(false);
  const paginacion = usePaginacion(AVISOS_POR_PAGINA, total);
  const { offset } = paginacion;

  const cargar = () => {
    obtenerAvisosDeConjunto(idConjunto, AVISOS_POR_PAGINA, offset)
      .then((pagina) => {
        setItems(pagina.items);
        setTotal(pagina.total);
        setError(false);
        // ¿Qué? Si se limpiaron las leídas y esta página ya no existe, se vuelve a la primera.
        if (pagina.items.length === 0 && pagina.total > 0 && offset > 0) paginacion.reiniciar();
      })
      // ¿Qué? Como esto también corre cada 20 s, el aviso desaparece solo apenas una carga siguiente funcione.
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  };

  // ¿Qué? reiniciarCon: al cambiar de página se vuelve a pedir al instante y se rearma el temporizador.
  usePolling(cargar, { enabled: activa, onExternalTrigger: onCambioDesdeCampanita, reiniciarCon: offset });

  const marcarLeida = async (id: string) => {
    try {
      await marcarAvisoLeido(id);
      setItems((previos) => previos.map((n) => (n.id === id ? { ...n, leida: true } : n)));
      notificarNotificacionesActualizadas();
      onCambio();
    } catch {
      setErrorAccion(true);
    }
  };

  const marcarTodas = async () => {
    try {
      await marcarAvisosDelConjuntoLeidos(idConjunto);
      setItems((previos) => previos.map((n) => ({ ...n, leida: true })));
      notificarNotificacionesActualizadas();
      onCambio();
    } catch {
      setErrorAccion(true);
    }
  };

  const limpiarLeidas = async () => {
    try {
      await limpiarAvisosLeidosDelConjunto(idConjunto);
      // ¿Qué? Con otra página abierta, volver a la primera ya vuelve a pedir; en la primera hay que pedir a mano.
      if (offset === 0) cargar();
      else paginacion.reiniciar();
      onCambio();
    } catch {
      setErrorAccion(true);
    }
  };

  if (cargando) return <LoadingState message={t("common.loading")} />;
  if (error && items.length === 0) return <Alert type="error" message={t("common.loadError")} />;

  const hayNoLeidas = items.some((n) => !n.leida);
  const hayLeidas = items.some((n) => n.leida);

  return (
    <div className="space-y-3">
      {error && <Alert type="error" message={t("common.loadError")} />}
      {errorAccion && <Alert type="error" message={t("common.actionError")} onClose={() => setErrorAccion(false)} />}

      {total === 0 ? (
        <EmptyState icon={Bell} message={t("dashboards.adminConjunto.avisosSection.empty")} />
      ) : (
        // ¿Qué? De borde a borde de la tarjeta del conjunto (margen negativo): las filas y la paginación llegan hasta
        //       los bordes, como una lista dentro de la tarjeta y no una tarjeta dentro de otra.
        <div className="-mx-4 -mb-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 pb-3">
            <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              {t("dashboards.adminConjunto.avisosSection.description")}
            </p>
            <div className="flex items-center gap-3">
              {hayNoLeidas && (
                <button type="button" onClick={marcarTodas} className="link-text text-xs">
                  {t("notificationFeed.markAllRead")}
                </button>
              )}
              {hayLeidas && (
                <button
                  type="button"
                  onClick={limpiarLeidas}
                  className="focus-ring cursor-pointer rounded text-xs font-medium text-gray-500 underline underline-offset-2 transition-colors hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                >
                  {t("notificationFeed.clearRead")}
                </button>
              )}
            </div>
          </div>

          <ul
            aria-label={t("dashboards.adminConjunto.avisosSection.title")}
            className="divide-y divide-gray-200 border-t border-gray-200 dark:divide-night-line dark:border-night-line"
          >
            {items.map((n) => (
              <FilaNotificacion
                key={n.id}
                n={n}
                accentHighlight="bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-400/10 dark:hover:bg-amber-400/15"
                mostrarConjunto={false}
                onMarkRead={marcarLeida}
              />
            ))}
          </ul>

          {total > AVISOS_POR_PAGINA && (
            <Paginacion
              desde={paginacion.desde}
              hasta={paginacion.hasta}
              total={total}
              pagina={paginacion.pagina}
              totalPaginas={paginacion.totalPaginas}
              puedeAnterior={paginacion.puedeAnterior}
              puedeSiguiente={paginacion.puedeSiguiente}
              onAnterior={paginacion.irAAnterior}
              onSiguiente={paginacion.irASiguiente}
            />
          )}
        </div>
      )}
    </div>
  );
}
