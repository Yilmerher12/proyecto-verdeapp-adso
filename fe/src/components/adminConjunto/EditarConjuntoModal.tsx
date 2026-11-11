import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";
import { editarMiConjunto, type ConjuntoAdministrado } from "@/lib/conjuntoPanelApi";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { NIT_MAX_LENGTH, TOTAL_APARTAMENTOS_MAX } from "@/lib/validacion";

/**
 * ¿Qué? Ventana para editar los dos datos del conjunto que el Admin sí puede cambiar: NIT y cantidad de apartamentos.
 * ¿Para qué? Issue #595: antes el formulario reemplazaba todo el contenido del conjunto (cobertura, código, avisos,
 *           recicladores) y la tarjeta cambiaba de forma. Son dos campos y una sola decisión: va en una ventana corta,
 *           con el panel quieto detrás.
 * ¿Impacto? Nombre, dirección y localidad no se editan: vienen verificados del dataset oficial de Bogotá y solo se
 *           corrigen re-importándolo (issue #180). Si el guardado falla, el error sale dentro de la ventana y lo
 *           escrito se conserva para reintentar. Al guardar se avisa a la tarjeta (onGuardado), que cierra la ventana.
 */
export function EditarConjuntoModal({
  conjunto,
  onClose,
  onGuardado,
}: {
  conjunto: ConjuntoAdministrado;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const { t } = useTranslation();
  const id = conjunto.id_conjunto_residencial;
  const [nit, setNit] = useState(conjunto.nit || "");
  const [total, setTotal] = useState(conjunto.total_apartamentos ? String(conjunto.total_apartamentos) : "");
  const [errorTotal, setErrorTotal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    // ¿Qué? Vacío = "sin definir"; si hay texto, debe ser un entero entre 1 y el tope.
    const totalTexto = total.trim();
    const totalNumero = totalTexto === "" ? null : Number(totalTexto);
    if (totalNumero !== null && (!Number.isInteger(totalNumero) || totalNumero < 1 || totalNumero > TOTAL_APARTAMENTOS_MAX)) {
      setErrorTotal(t("dashboards.adminConjunto.editForm.totalInvalid", { max: TOTAL_APARTAMENTOS_MAX }));
      return;
    }
    setErrorTotal(null);
    setError(null);
    setGuardando(true);
    try {
      await editarMiConjunto(id, { nit: nit || null, total_apartamentos: totalNumero });
      onGuardado();
    } catch (err) {
      console.error("Error al editar conjunto", err);
      setError(t("dashboards.adminConjunto.editForm.errorMessage"));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal onClose={onClose} closeOnBackdrop={false} wide aria-label={t("dashboards.adminConjunto.editForm.title")}>
      <form onSubmit={guardar} noValidate className="space-y-4 p-6 sm:p-8">
        <div>
          <h2 className="flex items-center gap-2 pr-8 text-lg font-bold text-gray-900 dark:text-white">
            <Pencil className="icon-md shrink-0 text-accent-600" aria-hidden="true" />
            {t("dashboards.adminConjunto.editForm.title")}
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("dashboards.adminConjunto.editForm.optionalHint")}</p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {/*
          ¿Qué? Antes este formulario también dejaba editar nombre_conjunto y direccion.
          ¿Para qué? Issue #180: esos dos datos vienen ya verificados desde el dataset oficial de Bogotá — un Admin
                    de Conjunto no debería poder sobreescribirlos sin control ni rastro.
          ¿Impacto? El NIT sigue editable porque el dataset oficial no lo trae — es el único dato que de verdad falta
                    completar.
        */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`nit-${id}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("dashboards.adminConjunto.editForm.nit")}
            </label>
            <input
              id={`nit-${id}`}
              type="text"
              value={nit}
              onChange={(e) => setNit(e.target.value)}
              maxLength={NIT_MAX_LENGTH}
              className="focus-ring mt-1.5 w-full rounded-lg border border-edge bg-white p-2.5 text-gray-900 dark:border-night-edge dark:bg-night-field dark:text-white"
            />
          </div>
          <div>
            <label htmlFor={`total-${id}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("dashboards.adminConjunto.editForm.totalApartments")}
            </label>
            <input
              id={`total-${id}`}
              type="number"
              inputMode="numeric"
              min={1}
              max={TOTAL_APARTAMENTOS_MAX}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              aria-invalid={!!errorTotal}
              aria-describedby={`total-ayuda-${id}`}
              className={`focus-ring mt-1.5 w-full rounded-lg border bg-white p-2.5 text-gray-900 dark:bg-night-field dark:text-white ${
 errorTotal ? "border-red-500 dark:border-red-400" : "border-edge dark:border-night-edge"
 }`}
            />
            <p id={`total-ayuda-${id}`} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("dashboards.adminConjunto.editForm.totalHelp")}
            </p>
            {errorTotal && (
              <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-300">
                {errorTotal}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-night-line">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" isLoading={guardando}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
