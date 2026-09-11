import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/api/axios";
import { Modal } from "@/components/ui/Modal";
import {
  crearPuntoAcopio,
  darDeBajaPuntoAcopio,
  editarPuntoAcopio,
  eliminarPuntoAcopioDefinitivo,
  listarPuntosAcopio,
  reactivarPuntoAcopio,
  type PuntoAcopioAdmin,
  type PuntoAcopioPayload,
} from "@/lib/puntosAcopioApi";

interface Localidad {
  id_localidad: number;
  nombre_localidad: string;
}

const FORM_VACIO: PuntoAcopioPayload = {
  nombre: "",
  direccion: "",
  id_localidad: 0,
  nombre_encargado: "",
  telefono_contacto: "",
};

export function AdminPuntosAcopioPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [puntos, setPuntos] = useState<PuntoAcopioAdmin[]>([]);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [editando, setEditando] = useState<PuntoAcopioAdmin | null>(null);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState<PuntoAcopioPayload>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  const [aDarDeBaja, setADarDeBaja] = useState<PuntoAcopioAdmin | null>(null);
  const [aEliminar, setAEliminar] = useState<PuntoAcopioAdmin | null>(null);

  const cargar = () => {
    if (!user) return;
    setCargando(true);
    listarPuntosAcopio()
      .then(setPuntos)
      .catch(() => setErrorMsg(t("adminPuntosAcopio.loadError")))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
    axios
      .get<Localidad[]>(`${API_BASE_URL}/api/v1/geography/localidades`)
      .then((res) => setLocalidades(res.data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const abrirCrear = () => {
    setForm(FORM_VACIO);
    setCreando(true);
  };

  const abrirEditar = (item: PuntoAcopioAdmin) => {
    setForm({
      nombre: item.nombre,
      direccion: item.direccion,
      id_localidad: item.id_localidad,
      nombre_encargado: item.nombre_encargado ?? "",
      telefono_contacto: item.telefono_contacto ?? "",
    });
    setEditando(item);
  };

  const cerrarFormulario = () => {
    setCreando(false);
    setEditando(null);
    setErrorMsg(null);
  };

  const formularioIncompleto =
    !form.nombre.trim() || !form.direccion.trim() || !form.id_localidad;

  const guardar = async () => {
    if (!user) return;
    if (formularioIncompleto) {
      setErrorMsg(t("adminPuntosAcopio.validation.required"));
      return;
    }
    setGuardando(true);
    setErrorMsg(null);
    const payload: PuntoAcopioPayload = {
      ...form,
      nombre_encargado: form.nombre_encargado?.trim() || null,
      telefono_contacto: form.telefono_contacto?.trim() || null,
    };
    try {
      if (editando) {
        await editarPuntoAcopio(editando.id_punto_acopio, payload);
      } else {
        await crearPuntoAcopio(payload);
      }
      cerrarFormulario();
      cargar();
    } catch {
      setErrorMsg(t("common.saveError"));
    } finally {
      setGuardando(false);
    }
  };

  const confirmarDarDeBaja = async () => {
    if (!user || !aDarDeBaja) return;
    try {
      await darDeBajaPuntoAcopio(aDarDeBaja.id_punto_acopio);
      setADarDeBaja(null);
      cargar();
    } catch {
      setErrorMsg(t("adminPuntosAcopio.deactivateError"));
    }
  };

  const reactivar = async (item: PuntoAcopioAdmin) => {
    if (!user) return;
    try {
      await reactivarPuntoAcopio(item.id_punto_acopio);
      cargar();
    } catch {
      setErrorMsg(t("adminPuntosAcopio.reactivateError"));
    }
  };

  const confirmarEliminar = async () => {
    if (!user || !aEliminar) return;
    try {
      await eliminarPuntoAcopioDefinitivo(aEliminar.id_punto_acopio);
      setAEliminar(null);
      cargar();
    } catch {
      setErrorMsg(t("adminPuntosAcopio.deleteError"));
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-6">
      <div className="flex items-center justify-between bg-white dark:bg-[#132a1c] rounded-2xl border border-gray-100 dark:border-[#2a4d34] p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("adminPuntosAcopio.title")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("adminPuntosAcopio.subtitle")}
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-accent-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("adminPuntosAcopio.newPoint")}
        </button>
      </div>

      {cargando && <p className="text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</p>}

      {!cargando && puntos.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-[#2a4d34]">
          <MapPin className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("adminPuntosAcopio.emptyState")}</p>
        </div>
      )}

      <div className="space-y-3">
        {puntos.map((item) => (
          <div
            key={item.id_punto_acopio}
            className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 dark:border-[#2a4d34] dark:bg-[#132a1c]"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                  {item.nombre}
                </p>
                {!item.activo && (
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-[#2a4d34] dark:text-gray-400">
                    {t("adminPuntosAcopio.inactiveBadge")}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                {item.direccion} — {item.nombre_localidad}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => abrirEditar(item)}
                className="cursor-pointer rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-50 dark:border-[#2a4d34] dark:text-gray-300 dark:hover:bg-[#2a4d34]"
                aria-label={t("adminPuntosAcopio.editAria", { nombre: item.nombre })}
              >
                <Pencil className="h-4 w-4" />
              </button>
              {item.activo ? (
                <button
                  onClick={() => setADarDeBaja(item)}
                  className="cursor-pointer rounded-lg border border-gray-200 p-2 text-red-500 transition-colors hover:bg-red-50 dark:border-[#2a4d34] dark:hover:bg-red-900/20"
                  aria-label={t("adminPuntosAcopio.deactivateAria", { nombre: item.nombre })}
                >
                  <PowerOff className="h-4 w-4" />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => reactivar(item)}
                    className="cursor-pointer rounded-lg border border-gray-200 p-2 text-accent-600 transition-colors hover:bg-accent-50 dark:border-[#2a4d34] dark:text-accent-400 dark:hover:bg-accent-900/20"
                    aria-label={t("adminPuntosAcopio.reactivateAria", { nombre: item.nombre })}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setAEliminar(item)}
                    className="cursor-pointer rounded-lg border border-gray-200 p-2 text-red-500 transition-colors hover:bg-red-50 dark:border-[#2a4d34] dark:hover:bg-red-900/20"
                    aria-label={t("adminPuntosAcopio.deleteAria", { nombre: item.nombre })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {(creando || editando) && (
        <Modal onClose={cerrarFormulario} wide closeOnBackdrop={false} aria-label={editando ? t("adminPuntosAcopio.modal.editTitle") : t("adminPuntosAcopio.newPoint")}>
          <div className="p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {editando ? t("adminPuntosAcopio.modal.editTitle") : t("adminPuntosAcopio.newPoint")}
            </h2>

            {errorMsg && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {errorMsg}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="acopio-nombre" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {t("adminPuntosAcopio.fields.name")} <span className="text-red-500">*</span>
                </label>
                <input
                  id="acopio-nombre"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder={t("adminPuntosAcopio.fields.namePlaceholder")}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="acopio-localidad" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {t("adminPuntosAcopio.fields.locality")} <span className="text-red-500">*</span>
                </label>
                <select
                  id="acopio-localidad"
                  value={form.id_localidad || ""}
                  onChange={(e) => setForm({ ...form, id_localidad: Number(e.target.value) })}
                  className="w-full cursor-pointer rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
                >
                  <option value="" disabled>
                    {t("adminPuntosAcopio.fields.localitySelect")}
                  </option>
                  {localidades.map((l) => (
                    <option key={l.id_localidad} value={l.id_localidad}>
                      {l.nombre_localidad}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="acopio-direccion" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                {t("adminPuntosAcopio.fields.address")} <span className="text-red-500">*</span>
              </label>
              <input
                id="acopio-direccion"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                placeholder={t("adminPuntosAcopio.fields.addressPlaceholder")}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="acopio-encargado" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {t("adminPuntosAcopio.fields.contactName")}
                </label>
                <input
                  id="acopio-encargado"
                  value={form.nombre_encargado ?? ""}
                  onChange={(e) => setForm({ ...form, nombre_encargado: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="acopio-telefono" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {t("adminPuntosAcopio.fields.phone")}
                </label>
                <input
                  id="acopio-telefono"
                  value={form.telefono_contacto ?? ""}
                  onChange={(e) => setForm({ ...form, telefono_contacto: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={cerrarFormulario}
                className="flex-1 cursor-pointer rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-[#2a4d34] dark:text-gray-300 dark:hover:bg-[#2a4d34] transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={guardar}
                disabled={guardando || formularioIncompleto}
                className="flex-1 cursor-pointer rounded-xl bg-accent-700 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
              >
                {guardando
                  ? t("common.saving")
                  : formularioIncompleto
                    ? t("common.formIncomplete")
                    : t("common.save")}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {aDarDeBaja && (
        <Modal onClose={() => setADarDeBaja(null)} aria-label={t("adminPuntosAcopio.modal.deactivateAriaLabel")}>
          <div className="p-6 sm:p-8 max-w-sm mx-auto text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
              <PowerOff className="h-6 w-6 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {t("adminPuntosAcopio.deactivateConfirm.title", { nombre: aDarDeBaja.nombre })}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t("adminPuntosAcopio.deactivateConfirm.warning")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setADarDeBaja(null)}
                className="flex-1 cursor-pointer rounded-xl border border-gray-200 dark:border-[#2a4d34] px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a4d34] transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={confirmarDarDeBaja}
                className="flex-1 cursor-pointer rounded-xl bg-red-500 hover:bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                {t("adminPuntosAcopio.deactivateConfirm.confirm")}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {aEliminar && (
        <Modal onClose={() => setAEliminar(null)} aria-label={t("adminPuntosAcopio.modal.deleteAriaLabel")}>
          <div className="p-6 sm:p-8 max-w-sm mx-auto text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
              <Trash2 className="h-6 w-6 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {t("adminPuntosAcopio.deleteConfirm.title", { nombre: aEliminar.nombre })}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t("adminPuntosAcopio.deleteConfirm.warning")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setAEliminar(null)}
                className="flex-1 cursor-pointer rounded-xl border border-gray-200 dark:border-[#2a4d34] px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a4d34] transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={confirmarEliminar}
                className="flex-1 cursor-pointer rounded-xl bg-red-500 hover:bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                {t("adminPuntosAcopio.deleteConfirm.confirm")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
