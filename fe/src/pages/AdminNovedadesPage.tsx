import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Archive, Megaphone, Paperclip, Pencil, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Modal } from "@/components/ui/Modal";
import {
  archivarNovedad,
  crearNovedad,
  editarNovedad,
  listarTodasLasNovedades,
  type AlcanceNovedad,
  type Novedad,
} from "@/lib/novedadesApi";

interface FormState {
  alcance: AlcanceNovedad;
  texto: string;
  url_adjunto: string;
  fecha_expiracion: string;
}

const FORM_VACIO: FormState = {
  alcance: "TODOS",
  texto: "",
  url_adjunto: "",
  fecha_expiracion: "",
};

const ALCANCES: AlcanceNovedad[] = ["TODOS", "RESIDENTES", "RECICLADORES", "ADMIN_CONJUNTO"];

// ¿Qué? Muestra la fecha en UTC, no en la zona horaria del navegador —
//       mismo criterio que en Comunicados, para que la fecha mostrada no
//       retroceda un día en zonas detrás de UTC (ej. Bogotá, UTC-5).
function formatearFechaUTC(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { timeZone: "UTC" });
}

function isoToDateInputUTC(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * ¿Qué? Panel del Administrador del Sistema para publicar, editar y
 *       archivar novedades generales de la plataforma (RQF-015,
 *       HU-032/034/035).
 * ¿Para qué? A diferencia de Comunicados (por conjunto), aquí el alcance
 *           es un rol de TODA la plataforma — no hay selector de conjunto.
 */
export function AdminNovedadesPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();

  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Novedad | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => {
    if (!accessToken) return;
    setCargando(true);
    listarTodasLasNovedades(accessToken)
      .then(setNovedades)
      .catch((err) => console.error("Error cargando novedades", err))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, [accessToken]);

  const abrirCrear = () => {
    setForm(FORM_VACIO);
    setCreando(true);
  };

  const abrirEditar = (item: Novedad) => {
    setForm({
      alcance: item.alcance,
      texto: item.texto,
      url_adjunto: item.url_adjunto ?? "",
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
      setErrorMsg(t("novedades.admin.validation.textoRequerido"));
      return;
    }

    setGuardando(true);
    setErrorMsg(null);
    const fechaExpiracion = form.fecha_expiracion ? `${form.fecha_expiracion}T23:59:59` : null;

    try {
      if (editando) {
        await editarNovedad(
          editando.id_novedad,
          { texto: form.texto.trim(), url_adjunto: form.url_adjunto.trim() || null, fecha_expiracion: fechaExpiracion },
          accessToken
        );
      } else {
        await crearNovedad(
          {
            alcance: form.alcance,
            texto: form.texto.trim(),
            url_adjunto: form.url_adjunto.trim() || null,
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

  const archivar = async (item: Novedad) => {
    if (!accessToken) return;
    try {
      await archivarNovedad(item.id_novedad, accessToken);
      cargar();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || t("novedades.admin.archiveError"));
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-6">
      <div className="flex items-center justify-between bg-white dark:bg-[#132a1c] rounded-2xl border border-gray-100 dark:border-[#2a4d34] p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("novedades.admin.title")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("novedades.admin.subtitle")}</p>
        </div>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("novedades.admin.newButton")}
        </button>
      </div>

      {errorMsg && !creando && !editando && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {errorMsg}
        </p>
      )}

      {cargando && <p className="text-sm text-gray-400">{t("common.loading")}</p>}

      {!cargando && novedades.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-[#2a4d34]">
          <Megaphone className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-400">{t("novedades.admin.emptyState")}</p>
        </div>
      )}

      <div className="space-y-3">
        {novedades.map((item) => (
          <div
            key={item.id_novedad}
            className={`rounded-2xl border bg-white p-4 dark:bg-[#132a1c] ${
              item.archivada ? "border-gray-100 opacity-60 dark:border-[#2a4d34]" : "border-gray-100 dark:border-[#2a4d34]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                    {t(`novedades.alcances.${item.alcance}`)}
                  </span>
                  {item.archivada && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-[#1f4029] dark:text-gray-300">
                      {t("novedades.archivedBadge")}
                    </span>
                  )}
                  {item.editado && (
                    <span className="text-xs italic text-gray-400">{t("comunicados.editedBadge")}</span>
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
                <p className="mt-2 text-xs text-gray-400">
                  {t("novedades.admin.expiraEl", { fecha: formatearFechaUTC(item.fecha_expiracion) })}
                </p>
              </div>
              {!item.archivada && (
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => abrirEditar(item)}
                    className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 dark:border-[#2a4d34] dark:text-gray-300 dark:hover:bg-[#2a4d34]"
                    aria-label={t("novedades.admin.editAria")}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => archivar(item)}
                    className="rounded-lg border border-gray-200 p-2 text-amber-600 hover:bg-amber-50 dark:border-[#2a4d34] dark:hover:bg-amber-900/20"
                    aria-label={t("novedades.admin.archiveAria")}
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {(creando || editando) && (
        <Modal
          onClose={cerrarFormulario}
          wide
          aria-label={editando ? t("novedades.admin.editTitle") : t("novedades.admin.newButton")}
        >
          <div className="p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {editando ? t("novedades.admin.editTitle") : t("novedades.admin.newButton")}
            </h2>

            {errorMsg && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {errorMsg}
              </p>
            )}

            {!editando ? (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {t("novedades.admin.fields.alcance")} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ALCANCES.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setForm({ ...form, alcance: a })}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
                        form.alcance === a
                          ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                          : "border-gray-200 text-gray-600 hover:border-green-300 dark:border-[#2a4d34] dark:text-gray-300"
                      }`}
                    >
                      {t(`novedades.alcances.${a}`)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-[#1f4029]/60">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("novedades.admin.fields.alcance")}
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {t(`novedades.alcances.${editando.alcance}`)}
                </p>
                <p className="mt-1 text-[11px] text-gray-400">{t("novedades.admin.alcanceNoEditable")}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                {t("novedades.admin.fields.texto")} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.texto}
                onChange={(e) => setForm({ ...form, texto: e.target.value })}
                rows={5}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                {t("novedades.admin.fields.urlAdjunto")}
              </label>
              <input
                value={form.url_adjunto}
                onChange={(e) => setForm({ ...form, url_adjunto: e.target.value })}
                placeholder={t("comunicados.admin.fields.urlAdjuntoPlaceholder")}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                {t("novedades.admin.fields.fechaExpiracion")}
              </label>
              <input
                type="date"
                value={form.fecha_expiracion}
                onChange={(e) => setForm({ ...form, fecha_expiracion: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
              />
              <p className="mt-1 text-[11px] text-gray-400">{t("novedades.admin.fields.fechaExpiracionHint")}</p>
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
                className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-60 transition-colors"
              >
                {guardando ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
