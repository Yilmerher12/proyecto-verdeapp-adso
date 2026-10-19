import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ClipboardList, Clock, Plus, Trash2 } from "lucide-react";
import { enlaceAdjuntoSeguro } from "@/lib/enlaceSeguro";
import { formatearFechaCreacion } from "@/lib/dateFormat";
import { DESVINCULACION_MOTIVO_MAX_LENGTH } from "@/lib/validacion";
import {
  cambiarEstadoItemAgenda,
  crearItemAgenda,
  eliminarItemAgenda,
  listarAgenda,
  obtenerMisConjuntos,
  type ConjuntoAdministrado,
  type ItemAgenda,
} from "@/lib/conjuntoPanelApi";
import { Alert } from "@/components/ui/Alert";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ContadorCaracteres } from "@/components/ui/ContadorCaracteres";
import { EmptyState } from "@/components/ui/EmptyState";
import { ImagenAdjuntaField } from "@/components/ui/ImagenAdjuntaField";
import { LoadingState } from "@/components/ui/LoadingState";
import { Modal } from "@/components/ui/Modal";

/**
 * ¿Qué? Agenda interna del Admin de Conjunto (RQF-020, HU-046): los temas
 *       que le piden y quiere llevar al comité, en dos columnas — "Por
 *       tratar" y "En espera" — con una pestaña por cada conjunto que administra.
 * ¿Para qué? Antes vivía escondida dentro del acordeón de cada conjunto en
 *           el Panel principal; como opción propia del menú se encuentra
 *           sin buscar y se ve de un vistazo qué queda por tratar.
 * ¿Impacto? Es la misma funcionalidad y los mismos endpoints de siempre (por
 *          conjunto, privada, sin fecha de caducidad). Nunca llega al Admin
 *          Sistema. Las agendas de todos los conjuntos se cargan juntas para
 *          que cada pestaña muestre su contador sin otra petición.
 */
export function AdminConjuntoAgendaPage() {
  const { t } = useTranslation();
  const [conjuntos, setConjuntos] = useState<ConjuntoAdministrado[]>([]);
  const [agendas, setAgendas] = useState<Record<string, ItemAgenda[]>>({});
  const [idConjunto, setIdConjunto] = useState("");
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [agregando, setAgregando] = useState(false);
  const [texto, setTexto] = useState("");
  const [urlEvidencia, setUrlEvidencia] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);

  const [aBorrar, setABorrar] = useState<ItemAgenda | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null);

  const cargar = useCallback(() => {
    obtenerMisConjuntos()
      .then(async (lista) => {
        const listas = await Promise.all(lista.map((c) => listarAgenda(c.id_conjunto_residencial)));
        const porConjunto: Record<string, ItemAgenda[]> = {};
        lista.forEach((c, i) => {
          porConjunto[c.id_conjunto_residencial] = listas[i];
        });
        setConjuntos(lista);
        setAgendas(porConjunto);
        // ¿Qué? Si el conjunto elegido ya no existe (o aún no hay ninguno elegido) se vuelve al primero.
        setIdConjunto((actual) =>
          lista.some((c) => c.id_conjunto_residencial === actual) ? actual : (lista[0]?.id_conjunto_residencial ?? "")
        );
        setErrorCarga(false);
      })
      .catch(() => setErrorCarga(true))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const items = agendas[idConjunto] ?? [];
  const porTratar = items.filter((i) => i.estado === "PENDIENTE");
  const enEspera = items.filter((i) => i.estado === "EN_ESPERA");

  const cerrarFormulario = () => {
    setAgregando(false);
    setTexto("");
    setUrlEvidencia("");
    setErrorGuardar(null);
  };

  const guardar = async () => {
    setGuardando(true);
    setErrorGuardar(null);
    try {
      await crearItemAgenda(idConjunto, { texto: texto.trim(), url_evidencia: urlEvidencia || null });
      cerrarFormulario();
      cargar();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setErrorGuardar(err.message || t("agenda.errorDefault"));
    } finally {
      setGuardando(false);
    }
  };

  const alternarEstado = async (item: ItemAgenda) => {
    setError(null);
    try {
      await cambiarEstadoItemAgenda(idConjunto, item.id, item.estado === "PENDIENTE" ? "EN_ESPERA" : "PENDIENTE");
      cargar();
    } catch {
      setError(t("agenda.actionError"));
    }
  };

  const confirmarBorrar = async () => {
    if (!aBorrar) return;
    setBorrando(true);
    setErrorBorrar(null);
    try {
      await eliminarItemAgenda(idConjunto, aBorrar.id);
      setABorrar(null);
      cargar();
    } catch {
      setErrorBorrar(t("agenda.actionError"));
    } finally {
      setBorrando(false);
    }
  };

  const tarjeta = (item: ItemAgenda) => {
    const urlFoto = enlaceAdjuntoSeguro(item.url_evidencia);
    return (
      <li
        key={item.id}
        className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-night-line dark:bg-night-card"
      >
        <div className="flex items-start gap-3">
          {urlFoto && (
            <a
              href={urlFoto}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("agenda.viewPhoto")}
              className="shrink-0 cursor-pointer"
            >
              <img
                src={urlFoto}
                alt=""
                className="h-16 w-16 rounded-xl border border-gray-200 object-cover dark:border-night-line"
              />
            </a>
          )}
          <div className="min-w-0 flex-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400">{formatearFechaCreacion(item.created_at)}</span>
            <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200">{item.texto}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => alternarEstado(item)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-night-line dark:bg-transparent dark:text-gray-300 dark:hover:bg-night-hover"
          >
            {item.estado === "PENDIENTE" && <Clock className="icon-sm" />}
            {item.estado === "PENDIENTE" ? t("agenda.putOnHold") : t("agenda.backToPending")}
          </button>
          <button
            type="button"
            onClick={() => setABorrar(item)}
            aria-label={t("agenda.delete")}
            className="cursor-pointer rounded-lg border border-gray-200 p-1.5 text-red-500 transition-colors hover:bg-red-50 dark:border-night-line dark:hover:bg-red-900/20"
          >
            <Trash2 className="icon-sm" />
          </button>
        </div>
      </li>
    );
  };

  const columna = (titulo: string, lista: ItemAgenda[], vacio: string, iconoVacio: typeof Clock) => (
    <section
      aria-label={titulo}
      className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-night-line dark:bg-night-inset/40"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">{titulo}</h2>
        <span className="rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-bold text-accent-700 dark:bg-accent-900/30 dark:text-accent-400">
          {lista.length}
        </span>
      </div>
      {lista.length === 0 ? <EmptyState icon={iconoVacio} message={vacio} /> : <ul className="space-y-3">{lista.map(tarjeta)}</ul>}
    </section>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-night-line dark:bg-night-card">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("agenda.title")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("agenda.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setAgregando(true)}
          disabled={!idConjunto}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-accent-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="icon-md" />
          {t("agenda.add")}
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {cargando ? (
        <LoadingState message={t("common.loading")} />
      ) : errorCarga ? (
        <Alert type="error" message={t("common.loadError")} />
      ) : conjuntos.length === 0 ? (
        <EmptyState icon={ClipboardList} message={t("agenda.noConjuntos")} />
      ) : (
        <>
          {conjuntos.length > 1 && (
            <div role="tablist" aria-label={t("agenda.conjuntoTabs")} className="flex flex-wrap gap-2">
              {conjuntos.map((c) => {
                const activo = c.id_conjunto_residencial === idConjunto;
                const pendientes = (agendas[c.id_conjunto_residencial] ?? []).filter((i) => i.estado === "PENDIENTE").length;
                return (
                  <button
                    key={c.id_conjunto_residencial}
                    type="button"
                    role="tab"
                    aria-selected={activo}
                    onClick={() => setIdConjunto(c.id_conjunto_residencial)}
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      activo
                        ? "border-accent-700 bg-accent-700 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-night-line dark:bg-night-card dark:text-gray-300 dark:hover:bg-night-hover"
                    }`}
                  >
                    {c.nombre_conjunto}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        activo ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600 dark:bg-night-field dark:text-gray-300"
                      }`}
                    >
                      {pendientes}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {columna(t("agenda.pendingTitle"), porTratar, t("agenda.emptyPending"), ClipboardList)}
            {columna(t("agenda.waitingTitle"), enEspera, t("agenda.emptyWaiting"), Clock)}
          </div>
        </>
      )}

      {agregando && (
        <Modal onClose={cerrarFormulario} closeOnBackdrop={false} aria-label={t("agenda.formTitle")}>
          <div className="space-y-4 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("agenda.formTitle")}</h2>
            {errorGuardar && <Alert type="error" message={errorGuardar} onClose={() => setErrorGuardar(null)} />}
            <div>
              <label htmlFor="agenda-texto" className="text-xs font-bold text-gray-600 dark:text-gray-400">
                {t("agenda.textLabel")}
              </label>
              <textarea
                id="agenda-texto"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                maxLength={DESVINCULACION_MOTIVO_MAX_LENGTH}
                rows={3}
                aria-describedby="agenda-contador"
                placeholder={t("agenda.textPlaceholder")}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm text-gray-900 outline-none transition-colors focus:ring-2 focus:ring-accent-500 dark:border-night-line dark:bg-night-field dark:text-white"
              />
              <ContadorCaracteres id="agenda-contador" actual={texto.length} max={DESVINCULACION_MOTIVO_MAX_LENGTH} />
            </div>
            <ImagenAdjuntaField label={t("agenda.evidenceLabel")} value={urlEvidencia} onChange={setUrlEvidencia} />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cerrarFormulario}
                className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-night-line dark:bg-transparent dark:text-gray-300 dark:hover:bg-night-hover"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={guardar}
                disabled={guardando || !texto.trim()}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-accent-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check className="icon-sm" />
                {guardando ? t("common.saving") : t("agenda.save")}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {aBorrar && (
        <ConfirmModal
          icon={Trash2}
          variant="danger"
          ariaLabel={t("agenda.deleteTitle")}
          title={t("agenda.deleteTitle")}
          description={t("agenda.deleteWarning")}
          error={errorBorrar}
          isConfirming={borrando}
          confirmLabel={t("agenda.deleteConfirm")}
          confirmingLabel={t("agenda.deleting")}
          onConfirm={confirmarBorrar}
          onClose={() => setABorrar(null)}
        />
      )}
    </div>
  );
}
