import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import { enlaceAdjuntoSeguro } from "@/lib/enlaceSeguro";
import { useAuth } from "@/hooks/useAuth";
import { RoleId } from "@/types/auth";
import { obtenerMisConjuntos, type ConjuntoAdministrado } from "@/lib/conjuntoPanelApi";
import {
  enviarNovedad,
  misNovedadesEnviadas,
  type NovedadEnviada,
} from "@/lib/novedadesEnviadasApi";
import { formatearFechaCreacion } from "@/lib/dateFormat";
import { DESVINCULACION_MOTIVO_MAX_LENGTH } from "@/lib/validacion";
import { Alert } from "@/components/ui/Alert";
import { ContadorCaracteres } from "@/components/ui/ContadorCaracteres";
import { EmptyState } from "@/components/ui/EmptyState";
import { ImagenAdjuntaField } from "@/components/ui/ImagenAdjuntaField";
import { LoadingState } from "@/components/ui/LoadingState";
import { Paginacion } from "@/components/ui/Paginacion";
import { usePaginacion } from "@/hooks/usePaginacion";

// ¿Qué? Issue #399 — novedades por página en "Mis envíos".
const TAMANO_PAGINA = 10;

/**
 * ¿Qué? Formulario para ENVIARLE una novedad (texto + imagen opcional) al
 *       Administrador del Sistema — lo usan Residente, Reciclador y Admin
 *       de Conjunto, el mismo para los tres.
 * ¿Para qué? Canal de abajo hacia arriba: el nombre, el conjunto y la
 *           unidad salen de la cuenta, nadie los escribe. Le llega al
 *           Admin Sistema en "Solicitudes pendientes".
 * ¿Impacto? Solo un Admin de Conjunto con más de un conjunto ve el selector
 *          de conjunto (para decir de cuál habla).
 */
export function NovedadEnviadaForm({ onEnviada }: { onEnviada: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [texto, setTexto] = useState("");
  const [urlImagen, setUrlImagen] = useState("");
  const [conjuntos, setConjuntos] = useState<ConjuntoAdministrado[]>([]);
  const [idConjunto, setIdConjunto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const esAdminConjunto = user?.role_id === RoleId.ADMIN_CONJUNTO;

  useEffect(() => {
    if (!esAdminConjunto) return;
    obtenerMisConjuntos()
      .then(setConjuntos)
      .catch(() => setConjuntos([]));
  }, [esAdminConjunto]);

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    setExito(false);
    try {
      await enviarNovedad({
        texto: texto.trim(),
        url_imagen: urlImagen || null,
        id_conjunto_residencial: idConjunto || null,
      });
      setTexto("");
      setUrlImagen("");
      setExito(true);
      onEnviada();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || t("novedadesEnviadas.errorDefault"));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-night-line dark:bg-night-card">
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          {t("novedadesEnviadas.formTitle")}
        </h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t("novedadesEnviadas.formHint")}
        </p>
      </div>

      {exito && (
        <Alert
          type="success"
          message={t("novedadesEnviadas.sentMessage")}
          onClose={() => setExito(false)}
        />
      )}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {esAdminConjunto && conjuntos.length > 1 && (
        <div>
          <label
            htmlFor="novedad-conjunto"
            className="text-xs font-bold text-gray-600 dark:text-gray-400"
          >
            {t("novedadesEnviadas.conjuntoLabel")}
          </label>
          <select
            id="novedad-conjunto"
            value={idConjunto}
            onChange={(e) => setIdConjunto(e.target.value)}
            className="mt-1 w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-accent-500 dark:border-night-line dark:bg-night-field dark:text-white"
          >
            <option value="">{t("novedadesEnviadas.conjuntoAny")}</option>
            {conjuntos.map((c) => (
              <option key={c.id_conjunto_residencial} value={c.id_conjunto_residencial}>
                {c.nombre_conjunto}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label
          htmlFor="novedad-texto"
          className="text-xs font-bold text-gray-600 dark:text-gray-400"
        >
          {t("novedadesEnviadas.textLabel")}
        </label>
        <textarea
          id="novedad-texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={DESVINCULACION_MOTIVO_MAX_LENGTH}
          rows={4}
          aria-describedby="novedad-contador"
          placeholder={t("novedadesEnviadas.textPlaceholder")}
          className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm text-gray-900 outline-none transition-colors focus:ring-2 focus:ring-accent-500 dark:border-night-line dark:bg-night-field dark:text-white"
        />
        <ContadorCaracteres
          id="novedad-contador"
          actual={texto.length}
          max={DESVINCULACION_MOTIVO_MAX_LENGTH}
        />
      </div>

      <ImagenAdjuntaField
        label={t("novedadesEnviadas.imageLabel")}
        value={urlImagen}
        onChange={setUrlImagen}
      />

      <button
        type="button"
        onClick={enviar}
        disabled={enviando || !texto.trim()}
        className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-accent-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Send className="icon-sm" />
        {enviando ? t("novedadesEnviadas.sending") : t("novedadesEnviadas.send")}
      </button>
    </div>
  );
}

/**
 * ¿Qué? Las novedades que YO envié, con su estado (enviada / vista por el
 *       Admin Sistema).
 */
export function MisNovedadesEnviadas({ version }: { version: number }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<NovedadEnviada[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const paginacion = usePaginacion(TAMANO_PAGINA, total);
  const { offset } = paginacion;

  // ¿Qué? Al cambiar de página no se vuelve a mostrar "cargando": se queda la
  //       lista anterior hasta que llega la nueva (solo la 1.ª carga muestra el estado de carga).
  useEffect(() => {
    misNovedadesEnviadas(TAMANO_PAGINA, offset)
      .then((pagina) => {
        setItems(pagina.items);
        setTotal(pagina.total);
      })
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, [version, offset]);

  if (cargando) return <LoadingState message={t("common.loading")} />;
  if (error) return <Alert type="error" message={t("common.loadError")} />;
  if (items.length === 0)
    return <EmptyState icon={Send} message={t("novedadesEnviadas.mineEmpty")} />;

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {items.map((n) => (
          <li
            key={n.id}
            className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-night-line dark:bg-night-card"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  n.estado === "VISTA"
                    ? "bg-gray-100 text-gray-600 dark:bg-night-field dark:text-gray-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                }`}
              >
                {n.estado === "VISTA"
                  ? t("novedadesEnviadas.stateSeen")
                  : t("novedadesEnviadas.stateNew")}
              </span>
              <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                {formatearFechaCreacion(n.created_at)}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm text-gray-800 dark:text-gray-200">
              {n.texto}
            </p>
            {enlaceAdjuntoSeguro(n.url_imagen) && (
              <img
                src={enlaceAdjuntoSeguro(n.url_imagen) ?? undefined}
                alt=""
                className="mt-2 h-20 w-20 rounded-xl border border-gray-200 object-cover dark:border-night-line"
              />
            )}
          </li>
        ))}
      </ul>
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-night-line dark:bg-night-card">
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
      </div>
    </div>
  );
}
