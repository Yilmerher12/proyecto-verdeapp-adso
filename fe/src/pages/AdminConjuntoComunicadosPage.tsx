import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Megaphone, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Modal } from "@/components/ui/Modal";
import { obtenerMisConjuntos, type ConjuntoAdministrado } from "@/lib/conjuntoPanelApi";
import {
  crearComunicado,
  editarComunicado,
  eliminarComunicado,
  listarMisComunicados,
  type Comunicado,
  type DestinatariosComunicado,
  type TipoComunicado,
} from "@/lib/comunicadosApi";

interface FormState {
  id_conjunto_residencial: string | "";
  destinatarios: DestinatariosComunicado;
  tipo: TipoComunicado;
  texto: string;
  url_adjunto: string;
  fecha_evento: string;
  fecha_expiracion: string;
}

const FORM_VACIO: FormState = {
  id_conjunto_residencial: "",
  destinatarios: "AMBOS",
  tipo: "INFORMATIVO",
  texto: "",
  url_adjunto: "",
  fecha_evento: "",
  fecha_expiracion: "",
};

const TIPOS: TipoComunicado[] = ["INFORMATIVO", "URGENTE", "CONVOCATORIA", "MANTENIMIENTO", "RECICLAJE"];
const DESTINATARIOS: DestinatariosComunicado[] = ["RESIDENTES", "RECICLADORES", "AMBOS"];

// ¿Qué? Muestra la fecha en UTC, no en la zona horaria del navegador.
// ¿Para qué? Para Convocatoria, el backend calcula la expiración como
//           "medianoche UTC del día siguiente al evento" — si se muestra
//           en hora local de Bogotá (UTC-5), esa medianoche UTC cae la
//           noche ANTERIOR en hora local, y la fecha mostrada retrocede
//           un día respecto a la que el admin realmente eligió.
function formatearFechaUTC(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { timeZone: "UTC" });
}

// ¿Qué? Igual que formatearFechaUTC, pero en formato YYYY-MM-DD (lo que
//       espera un <input type="date">) — se usa para precargar la fecha
//       de expiración actual al abrir el formulario de edición, con el
//       mismo criterio de UTC para no mostrar un día distinto al real.
function isoToDateInputUTC(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ¿Qué? Color por tipo — Urgente en rojo para que salte a la vista, igual
//       que en el feed que ven residentes/recicladores.
const TIPO_ESTILO: Record<TipoComunicado, string> = {
  INFORMATIVO: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  URGENTE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  CONVOCATORIA: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  MANTENIMIENTO: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  RECICLAJE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

/**
 * ¿Qué? Panel del Administrador de Conjunto para publicar, editar y
 *       eliminar comunicados (RQF-014, HU-027/029/030).
 * ¿Para qué? Un mismo admin puede manejar varios conjuntos — por eso al
 *           crear un comunicado hay que elegir para cuál es, y la lista
 *           muestra el nombre del conjunto en cada tarjeta.
 */
export function AdminConjuntoComunicadosPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();

  const [conjuntos, setConjuntos] = useState<ConjuntoAdministrado[]>([]);
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Comunicado | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  const [aEliminar, setAEliminar] = useState<Comunicado | null>(null);

  const cargar = () => {
    if (!accessToken) return;
    setCargando(true);
    Promise.all([obtenerMisConjuntos(accessToken), listarMisComunicados(accessToken)])
      .then(([listaConjuntos, listaComunicados]) => {
        setConjuntos(listaConjuntos);
        setComunicados(listaComunicados);
      })
      .catch((err) => console.error("Error cargando comunicados", err))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, [accessToken]);

  const abrirCrear = () => {
    setForm({ ...FORM_VACIO, id_conjunto_residencial: conjuntos[0]?.id_conjunto_residencial ?? "" });
    setCreando(true);
  };

  const abrirEditar = (item: Comunicado) => {
    setForm({
      id_conjunto_residencial: item.id_conjunto_residencial,
      destinatarios: item.destinatarios,
      tipo: item.tipo,
      texto: item.texto,
      url_adjunto: item.url_adjunto ?? "",
      fecha_evento: item.fecha_evento ?? "",
      // ¿Qué? Se precarga con la expiración ACTUAL del comunicado (no
      //       vacío) — si no la tocas, se reenvía tal cual al guardar.
      fecha_expiracion: isoToDateInputUTC(item.fecha_expiracion),
    });
    setEditando(item);
  };

  const cerrarFormulario = () => {
    setCreando(false);
    setEditando(null);
    setErrorMsg(null);
  };

  const guardar = async () => {
    if (!accessToken) return;
    if (!form.texto.trim()) {
      setErrorMsg(t("comunicados.admin.validation.textoRequerido"));
      return;
    }
    if (creando && !form.id_conjunto_residencial) {
      setErrorMsg(t("comunicados.admin.validation.conjuntoRequerido"));
      return;
    }
    if (form.tipo === "CONVOCATORIA" && !form.fecha_evento) {
      setErrorMsg(t("comunicados.admin.validation.fechaEventoRequerida"));
      return;
    }

    setGuardando(true);
    setErrorMsg(null);
    const fechaExpiracion = form.fecha_expiracion ? `${form.fecha_expiracion}T23:59:59` : null;

    try {
      if (editando) {
        await editarComunicado(
          editando.id_comunicado,
          {
            tipo: form.tipo,
            texto: form.texto.trim(),
            url_adjunto: form.url_adjunto.trim() || null,
            fecha_evento: form.tipo === "CONVOCATORIA" ? form.fecha_evento : null,
            fecha_expiracion: fechaExpiracion,
          },
          accessToken
        );
      } else {
        await crearComunicado(
          {
            id_conjunto_residencial: form.id_conjunto_residencial as string,
            destinatarios: form.destinatarios,
            tipo: form.tipo,
            texto: form.texto.trim(),
            url_adjunto: form.url_adjunto.trim() || null,
            fecha_evento: form.tipo === "CONVOCATORIA" ? form.fecha_evento : null,
            fecha_expiracion: fechaExpiracion,
          },
          accessToken
        );
      }
      cerrarFormulario();
      cargar();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || t("common.saveError"));
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!accessToken || !aEliminar) return;
    try {
      await eliminarComunicado(aEliminar.id_comunicado, accessToken);
      setAEliminar(null);
      cargar();
    } catch {
      setErrorMsg(t("comunicados.admin.deleteError"));
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-6">
      <div className="flex items-center justify-between bg-white dark:bg-[#132a1c] rounded-2xl border border-gray-100 dark:border-[#2a4d34] p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("comunicados.admin.title")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("comunicados.admin.subtitle")}</p>
        </div>
        <button
          onClick={abrirCrear}
          disabled={conjuntos.length === 0}
          className="flex items-center gap-1.5 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {t("comunicados.admin.newButton")}
        </button>
      </div>

      {cargando && <p className="text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</p>}

      {!cargando && conjuntos.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("comunicados.admin.noConjuntos")}</p>
      )}

      {!cargando && comunicados.length === 0 && conjuntos.length > 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-[#2a4d34]">
          <Megaphone className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("comunicados.admin.emptyState")}</p>
        </div>
      )}

      <div className="space-y-3">
        {comunicados.map((item) => (
          <div
            key={item.id_comunicado}
            className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-[#2a4d34] dark:bg-[#132a1c]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIPO_ESTILO[item.tipo]}`}>
                    {t(`comunicados.tipos.${item.tipo}`)}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-[#1f4029] dark:text-gray-300">
                    {item.nombre_conjunto}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t(`comunicados.destinatarios.${item.destinatarios}`)}
                  </span>
                  {item.editado && (
                    <span className="text-xs italic text-gray-500 dark:text-gray-400">{t("comunicados.editedBadge")}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{item.texto}</p>
                {item.url_adjunto && (
                  <a
                    href={item.url_adjunto}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-800 dark:text-green-400"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    {t("comunicados.viewAttachment")}
                  </a>
                )}
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {t("comunicados.admin.expiraEl", { fecha: formatearFechaUTC(item.fecha_expiracion) })}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => abrirEditar(item)}
                  className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 dark:border-[#2a4d34] dark:text-gray-300 dark:hover:bg-[#2a4d34]"
                  aria-label={t("comunicados.admin.editAria")}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setAEliminar(item)}
                  className="rounded-lg border border-gray-200 p-2 text-red-500 hover:bg-red-50 dark:border-[#2a4d34] dark:hover:bg-red-900/20"
                  aria-label={t("comunicados.admin.deleteAria")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(creando || editando) && (
        <Modal
          onClose={cerrarFormulario}
          wide
          aria-label={editando ? t("comunicados.admin.editTitle") : t("comunicados.admin.newButton")}
        >
          <div className="p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {editando ? t("comunicados.admin.editTitle") : t("comunicados.admin.newButton")}
            </h2>

            {errorMsg && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {errorMsg}
              </p>
            )}

            {!editando && (
              <>
                <div>
                  <label htmlFor="comunicado-conjunto" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    {t("comunicados.admin.fields.conjunto")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="comunicado-conjunto"
                    value={form.id_conjunto_residencial}
                    onChange={(e) => setForm({ ...form, id_conjunto_residencial: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
                  >
                    {conjuntos.map((c) => (
                      <option key={c.id_conjunto_residencial} value={c.id_conjunto_residencial}>
                        {c.nombre_conjunto}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  {/* ¿Qué? "Destinatarios" no es un <select>/<input> único, es un
                      grupo de botones — un <label htmlFor> no aplica aquí.
                      ¿Para qué? role="group" + aria-labelledby es la forma
                                correcta de asociar un texto descriptivo a un
                                grupo de controles (WAI-ARIA), en vez de un
                                <label> huérfano que no apunta a nada. */}
                  <span id="comunicado-destinatarios-label" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    {t("comunicados.admin.fields.destinatarios")} <span className="text-red-500">*</span>
                  </span>
                  <div role="group" aria-labelledby="comunicado-destinatarios-label" className="flex gap-2">
                    {DESTINATARIOS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setForm({ ...form, destinatarios: d })}
                        className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
                          form.destinatarios === d
                            ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : "border-gray-200 text-gray-600 hover:border-green-300 dark:border-[#2a4d34] dark:text-gray-300"
                        }`}
                      >
                        {t(`comunicados.destinatarios.${d}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {editando && (
              <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-[#1f4029]/60">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("comunicados.admin.fields.conjunto")} · {t("comunicados.admin.fields.destinatarios")}
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {editando.nombre_conjunto} · {t(`comunicados.destinatarios.${editando.destinatarios}`)}
                </p>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{t("comunicados.admin.destinatariosNoEditable")}</p>
              </div>
            )}

            <div>
              <label htmlFor="comunicado-tipo" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                {t("comunicados.admin.fields.tipo")} <span className="text-red-500">*</span>
              </label>
              <select
                id="comunicado-tipo"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoComunicado })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
              >
                {TIPOS.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {t(`comunicados.tipos.${tipo}`)}
                  </option>
                ))}
              </select>
            </div>

            {form.tipo === "CONVOCATORIA" && (
              <div>
                <label htmlFor="comunicado-fecha-evento" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {t("comunicados.admin.fields.fechaEvento")} <span className="text-red-500">*</span>
                </label>
                <input
                  id="comunicado-fecha-evento"
                  type="date"
                  value={form.fecha_evento}
                  onChange={(e) => setForm({ ...form, fecha_evento: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
                />
              </div>
            )}

            <div>
              <label htmlFor="comunicado-texto" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                {t("comunicados.admin.fields.texto")} <span className="text-red-500">*</span>
              </label>
              <textarea
                id="comunicado-texto"
                value={form.texto}
                onChange={(e) => setForm({ ...form, texto: e.target.value })}
                rows={5}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="comunicado-url-adjunto" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                {t("comunicados.admin.fields.urlAdjunto")}
              </label>
              <input
                id="comunicado-url-adjunto"
                value={form.url_adjunto}
                onChange={(e) => setForm({ ...form, url_adjunto: e.target.value })}
                placeholder={t("comunicados.admin.fields.urlAdjuntoPlaceholder")}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="comunicado-fecha-expiracion" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                {t("comunicados.admin.fields.fechaExpiracion")}
              </label>
              <input
                id="comunicado-fecha-expiracion"
                type="date"
                value={form.fecha_expiracion}
                onChange={(e) => setForm({ ...form, fecha_expiracion: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
              />
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{t("comunicados.admin.fields.fechaExpiracionHint")}</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={cerrarFormulario}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-[#2a4d34] dark:text-gray-300 dark:hover:bg-[#2a4d34] transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="flex-1 rounded-xl bg-green-700 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-60 transition-colors"
              >
                {guardando ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {aEliminar && (
        <Modal onClose={() => setAEliminar(null)} aria-label={t("comunicados.admin.deleteConfirm.ariaLabel")}>
          <div className="p-6 sm:p-8 max-w-sm mx-auto text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
              <AlertTriangle className="h-6 w-6 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {t("comunicados.admin.deleteConfirm.title")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t("comunicados.admin.deleteConfirm.warning")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setAEliminar(null)}
                className="flex-1 rounded-xl border border-gray-200 dark:border-[#2a4d34] px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a4d34] transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={confirmarEliminar}
                className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                {t("comunicados.admin.deleteConfirm.confirm")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
