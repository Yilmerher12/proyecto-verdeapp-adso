import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Archive, Check, ClipboardList, Download, ExternalLink, Plus, Trash2, Undo2, X } from "lucide-react";
import { enlaceAdjuntoSeguro } from "@/lib/enlaceSeguro";
import { formatearFechaCreacion } from "@/lib/dateFormat";
import { descargarArchivo } from "@/lib/descargarArchivo";
import { rangoDelPeriodo, type PeriodoDescarga, type RangoFechas } from "@/lib/periodosDescarga";
import { DESVINCULACION_MOTIVO_MAX_LENGTH } from "@/lib/validacion";
import {
  cambiarEstadoItemAgenda,
  contarHistorialAgenda,
  crearItemAgenda,
  descargarHistorialAgenda,
  eliminarItemAgenda,
  listarAgenda,
  listarAgendaArchivada,
  nombreArchivoHistorialAgenda,
  obtenerMisConjuntos,
  type ConjuntoAdministrado,
  type ConteoDescargaAgenda,
  type FiltroDescargaAgenda,
  type FormatoDescargaAgenda,
  type ItemAgenda,
} from "@/lib/conjuntoPanelApi";
import { usePaginacion } from "@/hooks/usePaginacion";
import { Alert } from "@/components/ui/Alert";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ContadorCaracteres } from "@/components/ui/ContadorCaracteres";
import { EmptyState } from "@/components/ui/EmptyState";
import { ImagenAdjuntaField } from "@/components/ui/ImagenAdjuntaField";
import { InsigniaAccionImagen } from "@/components/ui/InsigniaAccionImagen";
import { InputField } from "@/components/ui/InputField";
import { LoadingState } from "@/components/ui/LoadingState";
import { Modal } from "@/components/ui/Modal";
import { Paginacion } from "@/components/ui/Paginacion";
import { Spinner } from "@/components/ui/Spinner";

// ¿Qué? Issue #435 — temas del historial por página, igual que "Mis envíos" de novedades.
const TAMANO_PAGINA = 10;

// ¿Qué? Milisegundos que la ventana "Descargar agenda" espera, desde el último cambio de filtro, antes de contar.
// ¿Para qué? Si el usuario cambia el período y luego los temas, se pide el conteo una sola vez.
const ESPERA_CONTEO_MS = 400;

// ¿Qué? Color de cada nota; se reparte por turnos para que no todas se vean iguales.
//       Mismos matices que ya usan los tipos de comunicado, con su versión oscura.
const COLORES_NOTA = [
  "border-amber-100 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/20",
  "border-accent-100 bg-accent-50 dark:border-accent-900/30 dark:bg-accent-900/20",
  "border-blue-100 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/20",
  "border-purple-100 bg-purple-50 dark:border-purple-900/30 dark:bg-purple-900/20",
];

type Vista = "porTratar" | "archivadas";

const SIN_FECHAS: RangoFechas = { desde: "", hasta: "" };

/**
 * ¿Qué? Agenda interna del Admin de Conjunto (RQF-020, HU-046): los temas que
 *       le piden y quiere llevar al comité, como notas. "Por tratar" son los
 *       pendientes; al resolverlos se ARCHIVAN y pasan a "Archivadas", que
 *       hace de historial. Una pestaña por cada conjunto que administra.
 * ¿Para qué? Antes los temas resueltos se borraban y los aplazados quedaban
 *           "en espera"; ahora nada se pierde sin querer: se archiva, y se
 *           puede devolver a "Por tratar".
 * ¿Impacto? Privada: nunca llega al Admin Sistema. Los pendientes de todos
 *          los conjuntos se cargan juntos para que cada pestaña muestre su
 *          contador; el historial se pide por páginas solo del conjunto activo.
 */
export function AdminConjuntoAgendaPage() {
  const { t } = useTranslation();
  const [conjuntos, setConjuntos] = useState<ConjuntoAdministrado[]>([]);
  const [pendientes, setPendientes] = useState<Record<string, ItemAgenda[]>>({});
  const [idConjunto, setIdConjunto] = useState("");
  const [vista, setVista] = useState<Vista>("porTratar");
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [archivadas, setArchivadas] = useState<ItemAgenda[]>([]);
  const [totalArchivadas, setTotalArchivadas] = useState(0);
  const paginacion = usePaginacion(TAMANO_PAGINA, totalArchivadas);
  const { offset, pagina, irAAnterior, reiniciar } = paginacion;

  // ¿Qué? Último tema archivado, para ofrecer "Deshacer" en el aviso.
  const [recienArchivado, setRecienArchivado] = useState<ItemAgenda | null>(null);

  const [agregando, setAgregando] = useState(false);
  const [texto, setTexto] = useState("");
  const [urlEvidencia, setUrlEvidencia] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);

  const [aBorrar, setABorrar] = useState<ItemAgenda | null>(null);
  const [borrando, setBorrando] = useState(false);
  // ¿Qué? Id del tema cuyo estado se está cambiando (archivar, restaurar o deshacer).
  // ¿Para qué? Issue #458: antes el botón no mostraba nada mientras tardaba y se
  //           podía tocar dos veces.
  const [cambiandoId, setCambiandoId] = useState<string | null>(null);
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null);

  // ¿Qué? Issues #479 y #480 — descarga del historial (CSV o PDF): ventana con los filtros y el formato.
  const [descargaAbierta, setDescargaAbierta] = useState(false);
  const [formatoDescarga, setFormatoDescarga] = useState<FormatoDescargaAgenda>("csv");
  const [periodoDescarga, setPeriodoDescarga] = useState<PeriodoDescarga>("TODO");
  const [fechasDescarga, setFechasDescarga] = useState<RangoFechas>(SIN_FECHAS);
  const [estadoDescarga, setEstadoDescarga] = useState<FiltroDescargaAgenda["estado"]>("TODOS");
  const [errorRango, setErrorRango] = useState<string | null>(null);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);
  const [bajando, setBajando] = useState(false);
  const [descargado, setDescargado] = useState(false);
  // ¿Qué? Último conteo recibido, con la clave de los filtros con que se pidió; "datos" es null si falló.
  // ¿Para qué? Si la clave ya no coincide con los filtros actuales, el número es viejo y no se muestra.
  const [conteo, setConteo] = useState<{ clave: string; datos: ConteoDescargaAgenda | null } | null>(null);

  const cargarPendientes = useCallback(() => {
    obtenerMisConjuntos()
      .then(async (lista) => {
        const listas = await Promise.all(lista.map((c) => listarAgenda(c.id_conjunto_residencial)));
        const porConjunto: Record<string, ItemAgenda[]> = {};
        lista.forEach((c, i) => {
          porConjunto[c.id_conjunto_residencial] = listas[i];
        });
        setConjuntos(lista);
        setPendientes(porConjunto);
        // ¿Qué? Si el conjunto elegido ya no existe (o aún no hay ninguno elegido) se vuelve al primero.
        setIdConjunto((actual) =>
          lista.some((c) => c.id_conjunto_residencial === actual) ? actual : (lista[0]?.id_conjunto_residencial ?? "")
        );
        setErrorCarga(false);
      })
      .catch(() => setErrorCarga(true))
      .finally(() => setCargando(false));
  }, []);

  const cargarArchivadas = useCallback(() => {
    if (!idConjunto) return;
    listarAgendaArchivada(idConjunto, TAMANO_PAGINA, offset)
      .then((p) => {
        setArchivadas(p.items);
        setTotalArchivadas(p.total);
      })
      .catch(() => setErrorCarga(true));
  }, [idConjunto, offset]);

  useEffect(() => {
    cargarPendientes();
  }, [cargarPendientes]);

  useEffect(() => {
    cargarArchivadas();
  }, [cargarArchivadas]);

  // ¿Qué? Si se vació la última página del historial (se restauró o borró su único tema), se retrocede una.
  useEffect(() => {
    if (archivadas.length === 0 && totalArchivadas > 0 && pagina > 0) irAAnterior();
  }, [archivadas, totalArchivadas, pagina, irAAnterior]);

  const recargarTodo = () => {
    cargarPendientes();
    cargarArchivadas();
  };

  const elegirConjunto = (id: string) => {
    setIdConjunto(id);
    reiniciar();
    setRecienArchivado(null);
  };

  const porTratar = pendientes[idConjunto] ?? [];

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
      setVista("porTratar");
      cargarPendientes();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setErrorGuardar(err.message || t("agenda.errorDefault"));
    } finally {
      setGuardando(false);
    }
  };

  // ¿Qué? "Temas" ya viene con lo que se está viendo: "Archivadas" en esa pestaña, "Por tratar" en la otra.
  // ¿Para qué? Quien descarga desde una pestaña casi siempre quiere lo que ve; si quiere otra cosa, lo cambia.
  const abrirDescarga = () => {
    setEstadoDescarga(vista === "archivadas" ? "ARCHIVADA" : "PENDIENTE");
    setDescargado(false);
    setConteo(null);
    setDescargaAbierta(true);
  };

  const cerrarDescarga = () => {
    setDescargaAbierta(false);
    setFormatoDescarga("csv");
    setPeriodoDescarga("TODO");
    setFechasDescarga(SIN_FECHAS);
    setErrorRango(null);
    setErrorDescarga(null);
  };

  // ¿Qué? El rango al revés se avisa en el campo "Hasta" al salir de él, no con un aviso genérico.
  const mensajeRango = (f: RangoFechas) =>
    f.desde && f.hasta && f.desde > f.hasta ? t("agenda.download.rangeError") : null;

  // ¿Qué? Con "Personalizado", "Descargar" espera las dos fechas y que no estén al revés; con los demás
  //       períodos nunca hay nada que completar. Las fechas del período se calculan en lib/periodosDescarga.ts.
  const rango = rangoDelPeriodo(periodoDescarga, fechasDescarga);
  const faltanFechas = periodoDescarga === "PERSONALIZADO" && (!fechasDescarga.desde || !fechasDescarga.hasta);
  const fechasAlReves = periodoDescarga === "PERSONALIZADO" && !!mensajeRango(fechasDescarga);

  // ¿Qué? Cuántos temas se van a descargar, pedido al backend cuando el usuario deja de cambiar los filtros.
  // ¿Para qué? Avisar el número (y el tope de archivo) ANTES de pulsar "Descargar", no con un 400 después.
  // ¿Impacto? No se pide con fechas incompletas o al revés (no hay nada válido que contar). El setConteo corre
  //           dentro del temporizador y la respuesta de un filtro anterior se descarta (vigente), así que un
  //           conteo lento nunca pisa al del filtro actual.
  const puedeContar = descargaAbierta && !faltanFechas && !fechasAlReves;
  const claveConteo = `${idConjunto}|${estadoDescarga}|${rango.desde}|${rango.hasta}`;
  useEffect(() => {
    if (!puedeContar) return;
    let vigente = true;
    const temporizador = setTimeout(() => {
      const recibir = (datos: ConteoDescargaAgenda | null) => {
        if (vigente) setConteo({ clave: claveConteo, datos });
      };
      contarHistorialAgenda(idConjunto, { estado: estadoDescarga, desde: rango.desde, hasta: rango.hasta })
        .then(recibir)
        .catch(() => recibir(null));
    }, ESPERA_CONTEO_MS);
    return () => {
      vigente = false;
      clearTimeout(temporizador);
    };
  }, [puedeContar, claveConteo, idConjunto, estadoDescarga, rango.desde, rango.hasta]);

  // ¿Qué? Solo vale el conteo pedido con los filtros de ahora; si falló no se muestra nada ni se bloquea
  //       la descarga (el backend igual valida el tope).
  const conteoVigente = conteo?.clave === claveConteo ? conteo.datos : null;
  const contando = puedeContar && conteo?.clave !== claveConteo;
  const pasaDelMaximo = !!conteoVigente && conteoVigente.total > conteoVigente.maximo;

  const descargar = async () => {
    setBajando(true);
    setErrorDescarga(null);
    try {
      const archivo = await descargarHistorialAgenda(idConjunto, { estado: estadoDescarga, ...rango }, formatoDescarga);
      const conjunto = conjuntos.find((c) => c.id_conjunto_residencial === idConjunto);
      descargarArchivo(
        archivo,
        nombreArchivoHistorialAgenda(conjunto?.nombre_conjunto ?? "conjunto", rango.desde, rango.hasta, formatoDescarga)
      );
      cerrarDescarga();
      setDescargado(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setErrorDescarga(err.message || t("agenda.download.error"));
    } finally {
      setBajando(false);
    }
  };

  const cambiarEstado = async (item: ItemAgenda, estado: ItemAgenda["estado"]) => {
    setError(null);
    setCambiandoId(item.id);
    try {
      await cambiarEstadoItemAgenda(idConjunto, item.id, estado);
      recargarTodo();
      return true;
    } catch {
      setError(t("agenda.actionError"));
      return false;
    } finally {
      setCambiandoId(null);
    }
  };

  const archivar = async (item: ItemAgenda) => {
    if (await cambiarEstado(item, "ARCHIVADA")) setRecienArchivado(item);
  };

  // ¿Qué? Al restaurar un tema el aviso de "archivado" ya no aplica, se quita.
  const restaurar = async (item: ItemAgenda) => {
    setRecienArchivado(null);
    await cambiarEstado(item, "PENDIENTE");
  };

  const deshacerArchivado = async () => {
    if (!recienArchivado) return;
    const item = recienArchivado;
    setRecienArchivado(null);
    await cambiarEstado(item, "PENDIENTE");
  };

  const confirmarBorrar = async () => {
    if (!aBorrar) return;
    setBorrando(true);
    setErrorBorrar(null);
    try {
      await eliminarItemAgenda(idConjunto, aBorrar.id);
      if (recienArchivado?.id === aBorrar.id) setRecienArchivado(null);
      setABorrar(null);
      recargarTodo();
    } catch {
      setErrorBorrar(t("agenda.actionError"));
    } finally {
      setBorrando(false);
    }
  };

  const botonBorrar = (item: ItemAgenda) => (
    <button
      type="button"
      onClick={() => setABorrar(item)}
      aria-label={t("agenda.delete")}
      title={t("agenda.delete")}
      className="cursor-pointer rounded-lg border border-gray-200 bg-white/60 p-1.5 text-red-500 transition-colors hover:bg-red-50 dark:border-night-line dark:bg-transparent dark:hover:bg-red-900/20"
    >
      <Trash2 className="icon-sm" />
    </button>
  );

  const nota = (item: ItemAgenda, indice: number) => {
    const urlFoto = enlaceAdjuntoSeguro(item.url_evidencia);
    return (
      <li
        key={item.id}
        className={`flex flex-col gap-3 rounded-2xl border p-4 shadow-sm ${COLORES_NOTA[indice % COLORES_NOTA.length]}`}
      >
        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
          {formatearFechaCreacion(item.created_at)}
        </span>
        {urlFoto && (
          <a
            href={urlFoto}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("agenda.viewPhoto")}
            title={t("agenda.viewPhoto")}
            className="focus-ring relative block cursor-pointer rounded-xl"
          >
            <img
              src={urlFoto}
              alt=""
              className="h-32 w-full rounded-xl border border-gray-200 object-cover dark:border-night-line"
            />
            <InsigniaAccionImagen icono={ExternalLink} />
          </a>
        )}
        <p className="flex-1 whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200">{item.texto}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => archivar(item)}
            disabled={cambiandoId === item.id}
            aria-busy={cambiandoId === item.id}
            className="disabled:cursor-not-allowed disabled:opacity-60 flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-night-line dark:bg-night-card dark:text-gray-300 dark:hover:bg-night-hover"
          >
            {cambiandoId === item.id ? <Spinner size="sm" /> : <Archive className="icon-sm" />}
            {t("agenda.archive")}
          </button>
          {botonBorrar(item)}
        </div>
      </li>
    );
  };

  const filaArchivada = (item: ItemAgenda) => {
    const urlFoto = enlaceAdjuntoSeguro(item.url_evidencia);
    return (
      <li
        key={item.id}
        className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-night-line dark:bg-night-card"
      >
        {urlFoto ? (
          <a
            href={urlFoto}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("agenda.viewPhoto")}
            title={t("agenda.viewPhoto")}
            className="focus-ring relative shrink-0 cursor-pointer rounded-xl"
          >
            <img src={urlFoto} alt="" className="h-14 w-14 rounded-xl border border-gray-200 object-cover dark:border-night-line" />
            <InsigniaAccionImagen icono={ExternalLink} />
          </a>
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-night-field dark:text-gray-400">
            <Archive className="icon-md" />
          </div>
        )}
        <div className="min-w-0 flex-1 basis-60">
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            {t("agenda.createdOn", { fecha: formatearFechaCreacion(item.created_at) })}
            {item.archivado_en && ` · ${t("agenda.archivedOn", { fecha: formatearFechaCreacion(item.archivado_en) })}`}
          </span>
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-300">{item.texto}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => restaurar(item)}
            disabled={cambiandoId === item.id}
            aria-busy={cambiandoId === item.id}
            className="disabled:cursor-not-allowed disabled:opacity-60 flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-night-line dark:bg-transparent dark:text-gray-300 dark:hover:bg-night-hover"
          >
            {cambiandoId === item.id ? <Spinner size="sm" /> : <Undo2 className="icon-sm" />}
            {t("agenda.restore")}
          </button>
          {botonBorrar(item)}
        </div>
      </li>
    );
  };

  const boton = (activo: boolean) =>
    `flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
      activo
        ? "bg-white text-accent-800 shadow-sm dark:bg-night-card dark:text-accent-400"
        : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
    }`;

  const contador = (activo: boolean) =>
    `rounded-full px-2 py-0.5 text-[11px] ${
      activo ? "bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400" : "bg-gray-200 text-gray-600 dark:bg-night-field dark:text-gray-300"
    }`;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-night-line dark:bg-night-card">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("agenda.title")}</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-gray-400">{t("agenda.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={abrirDescarga}
            disabled={!idConjunto}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-night-line dark:bg-transparent dark:text-gray-300 dark:hover:bg-night-hover"
          >
            <Download className="icon-md" />
            {t("agenda.download.button")}
          </button>
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
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {descargado && <Alert type="success" message={t("agenda.download.success")} onClose={() => setDescargado(false)} />}

      {recienArchivado && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-800 dark:border-accent-900/40 dark:bg-accent-900/20 dark:text-accent-300"
        >
          <span className="flex-1">{t("agenda.archivedToast")}</span>
          <button
            type="button"
            onClick={deshacerArchivado}
            disabled={cambiandoId !== null}
            className="disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer rounded-lg border border-accent-300 bg-white px-3 py-1 text-xs font-semibold text-accent-800 transition-colors hover:bg-accent-100 dark:border-accent-800 dark:bg-transparent dark:text-accent-300 dark:hover:bg-accent-900/30"
          >
            {t("agenda.undo")}
          </button>
          <button
            type="button"
            onClick={() => setRecienArchivado(null)}
            aria-label={t("common.close")}
            title={t("common.close")}
            className="cursor-pointer rounded-lg p-1 transition-colors hover:bg-accent-100 dark:hover:bg-accent-900/30"
          >
            <X className="icon-sm" />
          </button>
        </div>
      )}

      {cargando ? (
        <LoadingState message={t("common.loading")} />
      ) : errorCarga ? (
        <Alert type="error" message={t("common.loadError")} />
      ) : conjuntos.length === 0 ? (
        <EmptyState icon={ClipboardList} message={t("agenda.noConjuntos")} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {conjuntos.length > 1 ? (
              <div role="tablist" aria-label={t("agenda.conjuntoTabs")} className="flex flex-wrap gap-2">
                {conjuntos.map((c) => {
                  const activo = c.id_conjunto_residencial === idConjunto;
                  const cuantos = (pendientes[c.id_conjunto_residencial] ?? []).length;
                  return (
                    <button
                      key={c.id_conjunto_residencial}
                      type="button"
                      role="tab"
                      aria-selected={activo}
                      onClick={() => elegirConjunto(c.id_conjunto_residencial)}
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
                        {cuantos}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <span />
            )}

            <div
              role="tablist"
              aria-label={t("agenda.viewTabs")}
              className="inline-flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-night-inset"
            >
              <button type="button" role="tab" aria-selected={vista === "porTratar"} onClick={() => setVista("porTratar")} className={boton(vista === "porTratar")}>
                {t("agenda.pendingTitle")}
                <span className={contador(vista === "porTratar")}>{porTratar.length}</span>
              </button>
              <button type="button" role="tab" aria-selected={vista === "archivadas"} onClick={() => setVista("archivadas")} className={boton(vista === "archivadas")}>
                {t("agenda.archivedTitle")}
                <span className={contador(vista === "archivadas")}>{totalArchivadas}</span>
              </button>
            </div>
          </div>

          {vista === "porTratar" ? (
            porTratar.length === 0 ? (
              <EmptyState icon={ClipboardList} message={t("agenda.emptyPending")} />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{porTratar.map(nota)}</ul>
            )
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("agenda.archivedHint")}</p>
              {archivadas.length === 0 ? (
                <EmptyState icon={Archive} message={t("agenda.emptyArchived")} />
              ) : (
                <>
                  <ul className="space-y-3">{archivadas.map(filaArchivada)}</ul>
                  <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-night-line dark:bg-night-card">
                    <Paginacion
                      desde={paginacion.desde}
                      hasta={paginacion.hasta}
                      total={totalArchivadas}
                      pagina={paginacion.pagina}
                      totalPaginas={paginacion.totalPaginas}
                      puedeAnterior={paginacion.puedeAnterior}
                      puedeSiguiente={paginacion.puedeSiguiente}
                      onAnterior={paginacion.irAAnterior}
                      onSiguiente={paginacion.irASiguiente}
                    />
                  </div>
                </>
              )}
            </div>
          )}
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

      {descargaAbierta && (
        <Modal onClose={cerrarDescarga} closeOnBackdrop={false} aria-label={t("agenda.download.title")}>
          <div className="space-y-4 p-6 sm:p-8">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("agenda.download.title")}</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("agenda.download.description")}</p>
            </div>
            {errorDescarga && <Alert type="error" message={errorDescarga} onClose={() => setErrorDescarga(null)} />}
            {/* ¿Qué? Formato: dos opciones pegadas (CSV o PDF) en vez de un desplegable — son solo dos y así se ven a la vez.
                ¿Para qué? Botones de radio nativos: el teclado (flechas) y el lector de pantalla funcionan solos. */}
            <fieldset>
              <legend className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("agenda.download.formatLabel")}
              </legend>
              <div className="inline-flex overflow-hidden rounded-lg border border-gray-300 dark:border-night-line">
                {(["csv", "pdf"] as const).map((formato) => (
                  <label
                    key={formato}
                    className={`has-focus-visible:ring-2 has-focus-visible:ring-inset has-focus-visible:ring-accent-500 flex cursor-pointer items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-colors ${
                      formato === "pdf" ? "border-l border-gray-300 dark:border-night-line" : ""
                    } ${
                      formatoDescarga === formato
                        ? "bg-accent-700 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-night-field dark:text-gray-300 dark:hover:bg-night-hover"
                    }`}
                  >
                    <input
                      type="radio"
                      name="agenda-descarga-formato"
                      value={formato}
                      checked={formatoDescarga === formato}
                      onChange={() => setFormatoDescarga(formato)}
                      className="sr-only"
                    />
                    {/* ¿Qué? El visto marca la opción elegida además del color (RNF-005.2: no depender solo del color). */}
                    {formatoDescarga === formato && <Check className="icon-sm" aria-hidden="true" />}
                    {t(formato === "csv" ? "agenda.download.formatCsv" : "agenda.download.formatPdf")}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="agenda-descarga-periodo" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("agenda.download.periodLabel")}
              </label>
              <select
                id="agenda-descarga-periodo"
                value={periodoDescarga}
                onChange={(e) => {
                  setPeriodoDescarga(e.target.value as PeriodoDescarga);
                  setErrorRango(null);
                }}
                className="block w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 dark:border-night-line dark:bg-night-field dark:text-gray-100"
              >
                <option value="TODO">{t("agenda.download.periodAll")}</option>
                <option value="ESTE_MES">{t("agenda.download.periodThisMonth")}</option>
                <option value="MES_PASADO">{t("agenda.download.periodLastMonth")}</option>
                <option value="PERSONALIZADO">{t("agenda.download.periodCustom")}</option>
              </select>
              {periodoDescarga !== "TODO" && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("agenda.download.dateRuleHint")}</p>
              )}
            </div>
            {periodoDescarga === "PERSONALIZADO" && (
              <div>
                <div className="grid gap-x-4 sm:grid-cols-2">
                  <InputField
                    label={t("agenda.download.fromLabel")}
                    name="agenda-descarga-desde"
                    type="date"
                    value={fechasDescarga.desde}
                    onChange={(e) => setFechasDescarga({ ...fechasDescarga, desde: e.target.value })}
                    onBlur={() => setErrorRango(mensajeRango(fechasDescarga))}
                  />
                  <InputField
                    label={t("agenda.download.toLabel")}
                    name="agenda-descarga-hasta"
                    type="date"
                    value={fechasDescarga.hasta}
                    onChange={(e) => setFechasDescarga({ ...fechasDescarga, hasta: e.target.value })}
                    onBlur={() => setErrorRango(mensajeRango(fechasDescarga))}
                    error={errorRango ?? undefined}
                  />
                </div>
                {faltanFechas && <p className="-mt-2 text-xs text-gray-500 dark:text-gray-400">{t("agenda.download.customHint")}</p>}
              </div>
            )}
            <div>
              <label htmlFor="agenda-descarga-estado" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("agenda.download.stateLabel")}
              </label>
              <select
                id="agenda-descarga-estado"
                value={estadoDescarga}
                onChange={(e) => setEstadoDescarga(e.target.value as FiltroDescargaAgenda["estado"])}
                className="block w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 dark:border-night-line dark:bg-night-field dark:text-gray-100"
              >
                <option value="TODOS">{t("agenda.download.stateAll")}</option>
                <option value="PENDIENTE">{t("agenda.download.statePending")}</option>
                <option value="ARCHIVADA">{t("agenda.download.stateArchived")}</option>
              </select>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("agenda.download.limitHint")}</p>
            {/* ¿Qué? Región "polite": el lector de pantalla anuncia el número cuando llega, sin interrumpir.
                ¿Para qué? Si pasa del máximo, el motivo queda escrito junto al botón apagado (no solo en gris). */}
            <p
              aria-live="polite"
              className={`min-h-5 text-sm font-medium ${
                pasaDelMaximo ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {contando && t("agenda.download.counting")}
              {conteoVigente &&
                (pasaDelMaximo
                  ? t("agenda.download.overLimit", { total: conteoVigente.total, max: conteoVigente.maximo })
                  : t("agenda.download.count", { count: conteoVigente.total }))}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cerrarDescarga}
                className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-night-line dark:bg-transparent dark:text-gray-300 dark:hover:bg-night-hover"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={descargar}
                disabled={bajando || faltanFechas || fechasAlReves || pasaDelMaximo}
                aria-busy={bajando}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-accent-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bajando ? <Spinner size="sm" /> : <Download className="icon-sm" />}
                {bajando ? t("agenda.download.downloading") : t("agenda.download.confirm")}
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
