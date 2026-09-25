/**
 * Archivo: components/PuntoAcopioForm.tsx
 * Descripción: Formulario de un punto de acopio (nombre, localidad, dirección,
 *              encargado y teléfono), con su validación por campo.
 * ¿Para qué? Lo usan dos lugares del panel del Admin Sistema: la ventana de
 *           "Nuevo punto de acopio" y la edición dentro del panel lateral. Antes
 *           el formulario vivía dentro de AdminPuntosAcopioPage.
 * ¿Impacto? Al editar, agrega "Motivo del cambio" (opcional): el backend lo
 *           guarda como un comentario del punto, para dejar constancia de por
 *           qué cambió (ej. nuevo encargado o dueño).
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/Alert";
import { InputField } from "@/components/ui/InputField";
import type { PuntoAcopioPayload } from "@/lib/puntosAcopioApi";

interface Localidad {
  id_localidad: number;
  nombre_localidad: string;
}

interface PuntoAcopioFormProps {
  inicial: PuntoAcopioPayload;
  localidades: Localidad[];
  esEdicion: boolean;
  guardando: boolean;
  errorMsg: string | null;
  onErrorClose: () => void;
  onSubmit: (payload: PuntoAcopioPayload) => void;
  onCancel: () => void;
}

export function PuntoAcopioForm({
  inicial,
  localidades,
  esEdicion,
  guardando,
  errorMsg,
  onErrorClose,
  onSubmit,
  onCancel,
}: PuntoAcopioFormProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<PuntoAcopioPayload>(inicial);
  const [motivo, setMotivo] = useState("");
  // ¿Qué? Issue #13 (hallazgo U8 de la auditoría) — cada campo se valida al
  //       salir de él (onBlur), igual que los formularios de auth.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ¿Qué? Limpia el error de un campo apenas el usuario vuelve a escribir en él.
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

  const mensajeDe = (campo: "nombre" | "direccion" | "id_localidad"): string => {
    if (campo === "nombre" && !form.nombre.trim()) return t("adminPuntosAcopio.validation.nameRequired");
    if (campo === "direccion" && !form.direccion.trim()) return t("adminPuntosAcopio.validation.addressRequired");
    if (campo === "id_localidad" && !form.id_localidad) return t("adminPuntosAcopio.validation.localityRequired");
    return "";
  };

  const validarCampo = (campo: "nombre" | "direccion" | "id_localidad") => {
    const mensaje = mensajeDe(campo);
    setFieldErrors((prev) => (mensaje ? { ...prev, [campo]: mensaje } : prev));
  };

  const formularioIncompleto = !form.nombre.trim() || !form.direccion.trim() || !form.id_localidad;

  const guardar = () => {
    const errores: Record<string, string> = {};
    for (const campo of ["nombre", "direccion", "id_localidad"] as const) {
      const mensaje = mensajeDe(campo);
      if (mensaje) errores[campo] = mensaje;
    }
    if (Object.keys(errores).length > 0) {
      setFieldErrors(errores);
      return;
    }
    onSubmit({
      ...form,
      nombre_encargado: form.nombre_encargado?.trim() || null,
      telefono_contacto: form.telefono_contacto?.trim() || null,
      ...(esEdicion ? { motivo_cambio: motivo.trim() || null } : {}),
    });
  };

  // ¿Qué? Aviso en vivo cuando el encargado deja de ser el que estaba guardado.
  // ¿Para qué? Es el cambio más delicado (cambio de dueño/encargado): se ve
  //            claro antes de guardar, y anima a explicar el motivo.
  const encargadoAntes = inicial.nombre_encargado ?? "";
  const encargadoAhora = form.nombre_encargado?.trim() ?? "";
  const cambioEncargado = esEdicion && encargadoAhora !== encargadoAntes;

  return (
    <div className="space-y-4">
      {errorMsg && <Alert type="error" message={errorMsg} onClose={onErrorClose} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <label htmlFor="acopio-localidad" className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
            {t("adminPuntosAcopio.fields.locality")} <span className="text-red-500">*</span>
          </label>
          <select
            id="acopio-localidad"
            value={form.id_localidad || ""}
            onChange={(e) => actualizarCampo("id_localidad", Number(e.target.value))}
            onBlur={() => validarCampo("id_localidad")}
            aria-invalid={!!fieldErrors.id_localidad}
            aria-describedby={fieldErrors.id_localidad ? "acopio-localidad-error" : undefined}
            className={`w-full cursor-pointer rounded-xl border bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 dark:bg-[#1a3324] dark:text-white ${
              fieldErrors.id_localidad
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-400"
                : "border-gray-200 focus:border-accent-500 focus:ring-accent-500/20 dark:border-[#23392b]"
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      {cambioEncargado && (
        <p className="-mt-2 text-xs font-semibold text-accent-700 dark:text-accent-400">
          {t("adminPuntosAcopio.form.managerChanged", {
            antes: encargadoAntes || t("adminPuntosAcopio.noManager"),
            despues: encargadoAhora || t("adminPuntosAcopio.noManager"),
          })}
        </p>
      )}

      {esEdicion && (
        <div>
          <label htmlFor="acopio-motivo" className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
            {t("adminPuntosAcopio.form.changeReason")}{" "}
            <span className="font-normal text-gray-400">{t("adminPuntosAcopio.form.changeReasonHint")}</span>
          </label>
          <textarea
            id="acopio-motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder={t("adminPuntosAcopio.form.changeReasonPlaceholder")}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500/20 dark:border-[#23392b] dark:bg-[#1a3324] dark:text-white"
          />
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 cursor-pointer rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-[#23392b] dark:text-gray-300 dark:hover:bg-[#23392b]"
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || formularioIncompleto}
          className="flex-1 cursor-pointer rounded-xl bg-accent-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {guardando ? t("common.saving") : formularioIncompleto ? t("common.formIncomplete") : t("common.save")}
        </button>
      </div>
    </div>
  );
}
