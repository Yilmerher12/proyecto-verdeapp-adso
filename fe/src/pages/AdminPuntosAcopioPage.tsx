import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/api/axios";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Alert } from "@/components/ui/Alert";
import { InputField } from "@/components/ui/InputField";
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
  // ¿Qué? Issue #6 (hallazgo F1 de la auditoría) — mismo problema que
  //       AdminContenidoEducativoPage: errorMsg solo se veía dentro del
  //       modal de crear/editar, nunca en la carga inicial.
  const [cargaError, setCargaError] = useState(false);

  const [editando, setEditando] = useState<PuntoAcopioAdmin | null>(null);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState<PuntoAcopioPayload>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  // ¿Qué? Issue #13 (hallazgo U8 de la auditoría) — antes solo había un
  //       Alert genérico al enviar ("Nombre, dirección y localidad son
  //       obligatorios"), sin decir cuál campo en concreto. Ahora cada
  //       campo se valida al salir de él (onBlur), igual que ya hacen
  //       los formularios de auth (RegisterPage, etc.).
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [aDarDeBaja, setADarDeBaja] = useState<PuntoAcopioAdmin | null>(null);
  const [aEliminar, setAEliminar] = useState<PuntoAcopioAdmin | null>(null);

  const cargar = useCallback(() => {
    if (!user) return;
    setCargando(true);
    setCargaError(false);
    listarPuntosAcopio()
      .then(setPuntos)
      .catch(() => setCargaError(true))
      .finally(() => setCargando(false));
  }, [user]);

  // ¿Qué? Issue #225 — "cargar" faltaba en las dependencias; se silenciaba
  //       la advertencia en vez de arreglarla. Envolverla en useCallback
  //       (arriba) la vuelve estable salvo cuando "user" o "t" cambian de
  //       verdad, así que agregarla aquí no dispara peticiones de más.
  useEffect(() => {
    cargar();
    axios
      .get<Localidad[]>(`${API_BASE_URL}/api/v1/geography/localidades`)
      .then((res) => setLocalidades(res.data))
      .catch(() => {});
  }, [cargar]);

  const abrirCrear = () => {
    setForm(FORM_VACIO);
    setFieldErrors({});
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
    setFieldErrors({});
    setEditando(item);
  };

  const cerrarFormulario = () => {
    setCreando(false);
    setEditando(null);
    setErrorMsg(null);
    setFieldErrors({});
  };

  // ¿Qué? Limpia el error de un campo apenas el usuario vuelve a escribir
  //       en él — mismo criterio que RegisterPage.handleChange.
  const actualizarCampo = <K extends keyof PuntoAcopioPayload>(campo: K, valor: PuntoAcopioPayload[K]) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (fieldErrors[campo]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[campo];
        return copy;
      });
    }
  };

  const validarCampo = (campo: "nombre" | "direccion" | "id_localidad") => {
    let mensaje = "";
    if (campo === "nombre" && !form.nombre.trim()) mensaje = t("adminPuntosAcopio.validation.nameRequired");
    if (campo === "direccion" && !form.direccion.trim()) mensaje = t("adminPuntosAcopio.validation.addressRequired");
    if (campo === "id_localidad" && !form.id_localidad) mensaje = t("adminPuntosAcopio.validation.localityRequired");
    setFieldErrors((prev) => (mensaje ? { ...prev, [campo]: mensaje } : prev));
  };

  const formularioIncompleto =
    !form.nombre.trim() || !form.direccion.trim() || !form.id_localidad;

  const guardar = async () => {
    if (!user) return;
    const errores: Record<string, string> = {};
    if (!form.nombre.trim()) errores.nombre = t("adminPuntosAcopio.validation.nameRequired");
    if (!form.direccion.trim()) errores.direccion = t("adminPuntosAcopio.validation.addressRequired");
    if (!form.id_localidad) errores.id_localidad = t("adminPuntosAcopio.validation.localityRequired");
    if (Object.keys(errores).length > 0) {
      setFieldErrors(errores);
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
      <div className="flex items-center justify-between bg-[#f7f9f3] dark:bg-[#1c341b] rounded-2xl border border-gray-100 dark:border-[#2a4d34] p-6 shadow-sm">
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

      {cargando && <LoadingState message={t("common.loading")} />}
      {!cargando && cargaError && <Alert type="error" message={t("adminPuntosAcopio.loadError")} />}

      {!cargando && !cargaError && puntos.length === 0 && (
        <EmptyState icon={MapPin} message={t("adminPuntosAcopio.emptyState")} />
      )}

      <div className="space-y-3">
        {puntos.map((item) => (
          <div
            key={item.id_punto_acopio}
            className="flex items-center justify-between rounded-2xl border border-gray-100 bg-[#f7f9f3] p-4 dark:border-[#2a4d34] dark:bg-[#1c341b]"
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

            {errorMsg && <Alert type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InputField
                label={t("adminPuntosAcopio.fields.name")}
                name="nombre"
                value={form.nombre}
                onChange={(e) => actualizarCampo("nombre", e.target.value)}
                onBlur={() => validarCampo("nombre")}
                placeholder={t("adminPuntosAcopio.fields.namePlaceholder")}
                error={fieldErrors.nombre}
              />

              <div>
                <label htmlFor="acopio-localidad" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {t("adminPuntosAcopio.fields.locality")} <span className="text-red-500">*</span>
                </label>
                <select
                  id="acopio-localidad"
                  value={form.id_localidad || ""}
                  onChange={(e) => actualizarCampo("id_localidad", Number(e.target.value))}
                  onBlur={() => validarCampo("id_localidad")}
                  aria-invalid={!!fieldErrors.id_localidad}
                  aria-describedby={fieldErrors.id_localidad ? "acopio-localidad-error" : undefined}
                  className={`w-full cursor-pointer rounded-xl border bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 dark:bg-[#1f4029] dark:text-white ${
                    fieldErrors.id_localidad
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-400"
                      : "border-gray-200 focus:border-accent-500 focus:ring-accent-500/20 dark:border-[#2a4d34]"
                  }`}
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
                {fieldErrors.id_localidad && (
                  <p id="acopio-localidad-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                    {fieldErrors.id_localidad}
                  </p>
                )}
              </div>
            </div>

            <InputField
              label={t("adminPuntosAcopio.fields.address")}
              name="direccion"
              value={form.direccion}
              onChange={(e) => actualizarCampo("direccion", e.target.value)}
              onBlur={() => validarCampo("direccion")}
              placeholder={t("adminPuntosAcopio.fields.addressPlaceholder")}
              error={fieldErrors.direccion}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InputField
                label={t("adminPuntosAcopio.fields.contactName")}
                name="nombre_encargado"
                value={form.nombre_encargado ?? ""}
                onChange={(e) => actualizarCampo("nombre_encargado", e.target.value)}
              />

              <InputField
                label={t("adminPuntosAcopio.fields.phone")}
                name="telefono_contacto"
                value={form.telefono_contacto ?? ""}
                onChange={(e) => actualizarCampo("telefono_contacto", e.target.value)}
              />
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
        <ConfirmModal
          icon={PowerOff}
          variant="danger"
          ariaLabel={t("adminPuntosAcopio.modal.deactivateAriaLabel")}
          title={t("adminPuntosAcopio.deactivateConfirm.title", { nombre: aDarDeBaja.nombre })}
          description={t("adminPuntosAcopio.deactivateConfirm.warning")}
          confirmLabel={t("adminPuntosAcopio.deactivateConfirm.confirm")}
          onConfirm={confirmarDarDeBaja}
          onClose={() => setADarDeBaja(null)}
        />
      )}

      {aEliminar && (
        <ConfirmModal
          icon={Trash2}
          variant="danger"
          ariaLabel={t("adminPuntosAcopio.modal.deleteAriaLabel")}
          title={t("adminPuntosAcopio.deleteConfirm.title", { nombre: aEliminar.nombre })}
          description={t("adminPuntosAcopio.deleteConfirm.warning")}
          confirmLabel={t("adminPuntosAcopio.deleteConfirm.confirm")}
          onConfirm={confirmarEliminar}
          onClose={() => setAEliminar(null)}
        />
      )}
    </div>
  );
}
